import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and } from "drizzle-orm";
import { generateId, now } from "@/lib/utils";
import { grade } from "@/lib/grader";
import {
  cardFromDb,
  cardToDb,
  createNewCard,
  formatInterval,
  ratingFor,
  scheduleNext,
} from "@/lib/fsrs";
import { toItem } from "@/lib/sessionBuilder";
import { maybeUnlockNextLevel, recomputeStreak } from "@/lib/progress";
import { LEVEL_META, type Response as DrillResponse } from "@/types";

const DEFAULT_USER_ID = "default-user";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { itemId, response, timeSpent, mode } = body as {
      itemId?: string;
      response?: DrillResponse;
      timeSpent?: number;
      mode?: string;
    };

    if (!itemId || !response) {
      return NextResponse.json(
        { success: false, error: "itemId and response are required" },
        { status: 400 }
      );
    }

    const row = db.select().from(schema.items).where(eq(schema.items.id, itemId)).get();
    if (!row) {
      return NextResponse.json({ success: false, error: "Unknown item" }, { status: 404 });
    }

    const item = toItem(row);

    // Re-grade server-side rather than trusting the client's verdict.
    const verdict = grade(item, response);
    const seconds = Math.max(0, Math.min(timeSpent ?? 0, 3600));
    const timestamp = now();

    // ─── FSRS card ───
    let card = db
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
      db.insert(schema.userCards).values(card).run();
    }

    const rating = ratingFor(item, verdict, seconds, card.reps);
    const updated = scheduleNext(cardFromDb(card), rating);
    const updatedData = cardToDb(updated);

    db.update(schema.userCards)
      .set({
        ...updatedData,
        correctCount: card.correctCount + (verdict.correct ? 1 : 0),
        totalCount: card.totalCount + 1,
      })
      .where(eq(schema.userCards.id, card.id))
      .run();

    // ─── Attempt ───
    const attemptId = generateId();
    db.insert(schema.attempts)
      .values({
        id: attemptId,
        userId: DEFAULT_USER_ID,
        itemId,
        response: JSON.stringify(response),
        correct: verdict.correct,
        score: verdict.score,
        timeSpent: seconds,
        mode: mode ?? "mixed",
        rating,
        createdAt: timestamp,
      })
      .run();

    // ─── Progression ───
    const unlockedLevel = verdict.correct ? maybeUnlockNextLevel(row.trackId) : null;
    const streak = recomputeStreak();

    return NextResponse.json({
      success: true,
      data: {
        attemptId,
        grade: verdict,
        rating,
        nextReview: formatInterval(updated),
        dueAt: updatedData.due,
        streak,
        unlocked: unlockedLevel
          ? { level: unlockedLevel, name: LEVEL_META[unlockedLevel].name }
          : null,
      },
    });
  } catch (error) {
    console.error("Attempt recording failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to record attempt" },
      { status: 500 }
    );
  }
}
