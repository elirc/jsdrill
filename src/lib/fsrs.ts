/**
 * Spaced repetition scheduling.
 *
 * FSRS wants a 1–4 rating per review. We derive it from how the
 * learner actually did: correctness first, then partial credit and
 * speed as the tie-breakers. `short` items are self-rated, so the
 * learner's own judgement is passed straight through.
 */
import {
  createEmptyCard,
  fsrs,
  generatorParameters,
  Rating,
  State,
  type Card,
  type Grade as FsrsRating,
} from "ts-fsrs";
import type { Grade, Item, Response } from "@/types";

const scheduler = fsrs(
  generatorParameters({
    // Target 90% recall — the usual default, and a reasonable
    // trade-off between review load and retention.
    request_retention: 0.9,
    enable_fuzz: true,
  })
);

export { Rating, State };
export type { FsrsRating };

export function createNewCard(): Card {
  return createEmptyCard();
}

/**
 * Map a grade onto an FSRS rating.
 *
 * Again (1) — wrong, or barely scraped it
 * Hard (2)  — right but slow, or only partial credit
 * Good (3)  — right, at a normal pace
 * Easy (4)  — right, quickly, and it was not a first exposure
 */
export function ratingFor(
  item: Item,
  grade: Grade,
  timeSpent: number,
  reps: number
): FsrsRating {
  // Self-graded items: trust the learner.
  if (grade.selfGraded) {
    const selfRating = Math.round(grade.score * 3) + 1;
    return Math.min(4, Math.max(1, selfRating)) as FsrsRating;
  }

  if (!grade.correct) {
    // Partial credit on a multi-part item still counts as a lapse,
    // but a near-miss shouldn't be treated identically to a blank.
    return grade.score >= 0.75 ? Rating.Hard : Rating.Again;
  }

  const budget = item.estSeconds || 45;

  // Slower than 1.6× the budget: correct, but not fluent yet.
  if (timeSpent > budget * 1.6) return Rating.Hard;

  // Fast, confident, and not the first time seeing it.
  if (timeSpent < budget * 0.5 && reps > 0) return Rating.Easy;

  return Rating.Good;
}

export function scheduleNext(card: Card, rating: FsrsRating, at = new Date()) {
  const scheduling = scheduler.repeat(card, at);
  return scheduling[rating].card;
}

/** The interval FSRS chose, in whole days, for display. */
export function intervalDays(card: Card, from = new Date()): number {
  const ms = card.due.getTime() - from.getTime();
  return Math.max(0, Math.round(ms / 86_400_000));
}

export function formatInterval(card: Card, from = new Date()): string {
  const ms = card.due.getTime() - from.getTime();
  const minutes = Math.round(ms / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hr`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"}`;
  return `${(days / 365).toFixed(1)} years`;
}

// ─── DB <-> Card mapping ───

export type CardRow = {
  stability: number;
  difficulty: number;
  due: string;
  reps: number;
  lapses: number;
  state: number;
  lastReview: string | null;
};

export function cardFromDb(row: CardRow): Card {
  return {
    stability: row.stability,
    difficulty: row.difficulty,
    due: new Date(row.due),
    reps: row.reps,
    lapses: row.lapses,
    state: row.state as State,
    last_review: row.lastReview ? new Date(row.lastReview) : undefined,
    elapsed_days: 0,
    scheduled_days: 0,
    learning_steps: 0,
  } as unknown as Card;
}

export function cardToDb(card: Card) {
  return {
    stability: card.stability,
    difficulty: card.difficulty,
    due: card.due.toISOString(),
    reps: card.reps,
    lapses: card.lapses,
    state: card.state as number,
    lastReview: card.last_review ? card.last_review.toISOString() : null,
  };
}

/**
 * "Mastered" for progress reporting: reviewed successfully enough
 * that FSRS is scheduling it more than three weeks out.
 */
export const MASTERY_STABILITY_DAYS = 21;

export function isMastered(row: { stability: number; reps: number }): boolean {
  return row.reps > 0 && row.stability >= MASTERY_STABILITY_DAYS;
}

export function isOverdue(due: string, at = new Date()): boolean {
  return new Date(due) <= at;
}

/** Unused but kept explicit: response shape does not affect scheduling. */
export type ScheduleInput = { item: Item; response: Response; grade: Grade };
