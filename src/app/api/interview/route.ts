import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { generateId, now } from "@/lib/utils";
import { DEFAULT_USER_ID } from "@/lib/user";
import {
  clamp,
  isFiniteNumber,
  isRecord,
  isStringArray,
  ok,
  parseJson,
  serverError,
  type Checked,
} from "@/lib/api";
import type { InterviewScore } from "@/types";

/** A scorecard is a few hundred bytes; this is room for a very long run. */
const MAX_SCORE_BYTES = 32 * 1024;

export async function GET() {
  try {
    const runs = db
      .select()
      .from(schema.interviewRuns)
      .where(eq(schema.interviewRuns.userId, DEFAULT_USER_ID))
      .orderBy(desc(schema.interviewRuns.createdAt))
      .limit(10)
      .all();

    return ok(runs.map((r) => ({ ...r, score: parseScore(r.score) })));
  } catch (error) {
    return serverError("Failed to load interview runs", error);
  }
}

/** One corrupt row should not take the whole history down with it. */
function parseScore(json: string): InterviewScore | Record<string, never> {
  try {
    const parsed = JSON.parse(json);
    return isRecord(parsed) ? (parsed as InterviewScore) : {};
  } catch {
    return {};
  }
}

function checkScore(body: unknown): Checked<InterviewScore> {
  if (!isRecord(body)) return { error: "Body must be an interview score object" };
  const { total, correct, accuracy, seconds, byTrack, verdict, weakSpots } = body;

  for (const [name, v] of Object.entries({ total, correct, seconds })) {
    if (v !== undefined && !isFiniteNumber(v)) return { error: `${name} must be a number` };
  }
  if (byTrack !== undefined && !Array.isArray(byTrack)) return { error: "byTrack must be an array" };
  if (weakSpots !== undefined && !isStringArray(weakSpots)) {
    return { error: "weakSpots must be an array of strings" };
  }

  const t = Math.round(clamp((total as number | undefined) ?? 0, 0, 10_000));
  const c = Math.round(clamp((correct as number | undefined) ?? 0, 0, t));
  return {
    value: {
      ...(body as InterviewScore),
      total: t,
      correct: c,
      accuracy: isFiniteNumber(accuracy) ? clamp(accuracy, 0, 100) : t > 0 ? Math.round((c / t) * 100) : 0,
      seconds: Math.round(clamp((seconds as number | undefined) ?? 0, 0, 24 * 3600)),
      byTrack: (byTrack as InterviewScore["byTrack"] | undefined) ?? [],
      verdict: typeof verdict === "string" ? verdict.slice(0, 500) : "",
      weakSpots: (weakSpots as string[] | undefined) ?? [],
    },
  };
}

export async function POST(request: Request) {
  const parsed = await parseJson(request, checkScore, MAX_SCORE_BYTES);
  if (parsed.response) return parsed.response;
  const score = parsed.value;

  try {
    db.insert(schema.interviewRuns)
      .values({
        id: generateId(),
        userId: DEFAULT_USER_ID,
        score: JSON.stringify(score),
        total: score.total,
        correct: score.correct,
        seconds: score.seconds,
        createdAt: now(),
      })
      .run();

    return ok();
  } catch (error) {
    return serverError("Failed to save interview run", error);
  }
}
