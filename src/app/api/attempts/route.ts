import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateId, now } from "@/lib/utils";
import { grade } from "@/lib/grader";
import { serverGradeOptions } from "@/lib/executor.server";
import {
  cardFromDb,
  cardToDb,
  createNewCard,
  formatInterval,
  ratingFor,
  Rating,
  scheduleNext,
} from "@/lib/fsrs";
import { toItem } from "@/lib/sessionBuilder";
import { maybeUnlockNextLevel, recomputeStreak } from "@/lib/progress";
import { DEFAULT_USER_ID } from "@/lib/user";
import { fail, isFiniteNumber, isRecord, ok, parseJson, serverError, type Checked } from "@/lib/api";
import {
  ITEM_KINDS,
  LEVEL_META,
  type Response as DrillResponse,
  type SessionMode,
} from "@/types";

const MODES: SessionMode[] = ["mixed", "track", "module", "level", "weak", "interview"];

/** A learner's code submission; generous, but not a megabyte of it. */
const MAX_CODE_CHARS = 50_000;
/** Longest time an attempt can claim, in seconds. */
const MAX_TIME_SPENT = 3600;

type AttemptBody = {
  itemId: string;
  response: DrillResponse;
  /** Seconds; `undefined` when the client did not say. */
  timeSpent: number | undefined;
  mode: string;
  attempt: 1 | 2;
};

/**
 * Validates the envelope and the response's *shape*. Whether the answer
 * is right is the grader's job; this only guarantees it will not throw
 * on, say, `values: null` or `order: "abc"`.
 */
function checkBody(body: unknown): Checked<AttemptBody> {
  if (!isRecord(body)) return { error: "Body must be a JSON object" };
  const { itemId, response, timeSpent, mode, attempt } = body;

  if (typeof itemId !== "string" || !itemId || itemId.length > 200 || !isRecord(response)) {
    return { error: "itemId and response are required" };
  }
  if (!ITEM_KINDS.includes(response.kind as (typeof ITEM_KINDS)[number])) {
    return { error: "response.kind is not a known item kind" };
  }
  const shapeError = checkResponseShape(response);
  if (shapeError) return { error: shapeError };

  return {
    value: {
      itemId,
      response: response as DrillResponse,
      // Anything that is not a real number is treated as "not reported".
      timeSpent: isFiniteNumber(timeSpent)
        ? Math.round(Math.max(0, Math.min(timeSpent, MAX_TIME_SPENT)))
        : undefined,
      mode: typeof mode === "string" && MODES.includes(mode as SessionMode) ? mode : "mixed",
      attempt: attempt === 2 ? 2 : 1,
    },
  };
}

function checkResponseShape(r: Record<string, unknown>): string | null {
  const nullableString = (v: unknown) => v === null || typeof v === "string";
  const strings = (v: unknown) =>
    Array.isArray(v) && v.length <= 100 && v.every((x) => typeof x === "string");

  switch (r.kind) {
    case "mcq":
    case "predict-output":
      return nullableString(r.choiceId) ? null : "response.choiceId must be a string or null";
    case "multi":
      return strings(r.choiceIds) ? null : "response.choiceIds must be an array of strings";
    case "truefalse":
      return r.value === null || typeof r.value === "boolean"
        ? null
        : "response.value must be a boolean or null";
    case "fill-blank":
      return isRecord(r.values) &&
        Object.values(r.values).every((v) => typeof v === "string" && v.length <= 1000)
        ? null
        : "response.values must map blank ids to strings";
    case "order":
      return strings(r.order) ? null : "response.order must be an array of step ids";
    case "code":
      return typeof r.code === "string" && r.code.length <= MAX_CODE_CHARS
        ? null
        : `response.code must be a string of at most ${MAX_CODE_CHARS} characters`;
    case "short":
      return (r.text === undefined || typeof r.text === "string") &&
        (r.selfRating === null || [1, 2, 3, 4].includes(r.selfRating as number))
        ? null
        : "response.selfRating must be 1–4 or null";
    default:
      return "response.kind is not a known item kind";
  }
}

/**
 * Records one answer: re-grades it, reschedules the FSRS card, logs the
 * attempt, then checks level unlocks and the streak.
 *
 * Trust boundary (accepted risk: local-first). The server re-grades the
 * *answer*, so a client cannot claim a wrong answer was right. It does
 * trust two things only the client can know:
 * - `attempt` — whether this was the second try after a miss. The
 *   first miss is never posted, so there is nothing server-side to
 *   check it against; a client that always sends `attempt: 1` gets full
 *   credit for second-try successes.
 * - `timeSpent` — clamped to 0..3600s, but a small value can still turn
 *   a Good into an Easy.
 * Reps is a single-user app running on the learner's own machine, so
 * the only person a forged value fools is the one sending it. Posting
 * the first miss (and pairing the second try with it) is the fix if
 * this ever serves more than one user.
 */
export async function POST(request: Request) {
  const parsed = await parseJson(request, checkBody);
  if (parsed.response) return parsed.response;
  const { itemId, response, timeSpent, mode, attempt } = parsed.value;

  try {
    const row = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
    if (!row) return fail("Unknown item", 404);

    const item = toItem(row);

    // Re-grade server-side rather than trusting the client's verdict.
    // Code runs in a vm context with a hard timeout (executor.server).
    const verdict = grade(item, response, serverGradeOptions);

    // A correct answer reached on the second try was a near miss: it
    // counts as answered, but earns partial credit and comes back soon.
    if (attempt === 2) {
      verdict.attempt = 2;
      if (verdict.correct) verdict.score = Math.min(verdict.score, 0.5);
    }
    const seconds = timeSpent ?? 0;
    // With no reported time, rate on correctness alone (as if on pace)
    // rather than reading "0 seconds" as lightning fast.
    const paceSeconds = timeSpent ?? item.estSeconds;
    const timestamp = now();

    // All writes land together or not at all.
    const result = db.transaction((tx) => {
      // ─── FSRS card ───
      let card = tx
        .select()
        .from(schema.userCards)
        .where(
          and(eq(schema.userCards.userId, DEFAULT_USER_ID), eq(schema.userCards.itemId, itemId))
        )
        .get();

      if (!card) {
        const fresh = cardToDb(createNewCard());
        card = {
          id: generateId(),
          userId: DEFAULT_USER_ID,
          itemId,
          correctCount: 0,
          totalCount: 0,
          ...fresh,
        };
        tx.insert(schema.userCards).values(card).run();
      }

      const rating =
        verdict.attempt === 2 && verdict.correct
          ? Rating.Hard
          : ratingFor(item, verdict, paceSeconds, card.reps);
      const updated = scheduleNext(cardFromDb(card), rating);
      const updatedData = cardToDb(updated);

      tx.update(schema.userCards)
        .set({
          ...updatedData,
          correctCount: card.correctCount + (verdict.correct ? 1 : 0),
          totalCount: card.totalCount + 1,
        })
        .where(eq(schema.userCards.id, card.id))
        .run();

      // ─── Attempt ───
      const attemptId = generateId();
      tx.insert(schema.attempts)
        .values({
          id: attemptId,
          userId: DEFAULT_USER_ID,
          itemId,
          response: JSON.stringify(response),
          correct: verdict.correct,
          score: verdict.score,
          timeSpent: seconds,
          mode,
          rating,
          createdAt: timestamp,
        })
        .run();

      return { attemptId, rating, updated, updatedData };
    });

    // ─── Progression ───
    const unlockedLevel = verdict.correct ? maybeUnlockNextLevel(row.trackId) : null;
    const streak = recomputeStreak();

    return ok({
      attemptId: result.attemptId,
      grade: verdict,
      rating: result.rating,
      nextReview: formatInterval(result.updated),
      dueAt: result.updatedData.due,
      streak,
      unlocked: unlockedLevel
        ? { level: unlockedLevel, name: LEVEL_META[unlockedLevel].name }
        : null,
    });
  } catch (error) {
    return serverError("Failed to record attempt", error);
  }
}
