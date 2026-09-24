import { describe, expect, it } from "vitest";
import {
  cardFromDb,
  cardToDb,
  createNewCard,
  formatInterval,
  isMastered,
  Rating,
  ratingFor,
  scheduleNext,
} from "@/lib/fsrs";
import type { Grade } from "@/types";
import { makeItem } from "./fixtures";

// estSeconds 40: "slow" is > 64s, "fast" is < 20s.
const item = makeItem("mcq", { choices: [] }, { estSeconds: 40 });
const right: Grade = { correct: true, score: 1 };
const wrong: Grade = { correct: false, score: 0 };

describe("ratingFor", () => {
  it("Again for a wrong answer", () => {
    expect(ratingFor(item, wrong, 30, 0)).toBe(Rating.Again);
  });

  it("Hard for a near miss (>= 75% partial credit)", () => {
    expect(ratingFor(item, { correct: false, score: 0.75 }, 30, 0)).toBe(Rating.Hard);
    expect(ratingFor(item, { correct: false, score: 0.5 }, 30, 0)).toBe(Rating.Again);
  });

  it("Hard for right but slow", () => {
    expect(ratingFor(item, right, 65, 3)).toBe(Rating.Hard);
  });

  it("Good for right at a normal pace", () => {
    expect(ratingFor(item, right, 30, 3)).toBe(Rating.Good);
  });

  it("Easy for right and fast, but only after a first exposure", () => {
    expect(ratingFor(item, right, 10, 2)).toBe(Rating.Easy);
    expect(ratingFor(item, right, 10, 0)).toBe(Rating.Good);
  });

  it("passes self-grades straight through as 1–4", () => {
    const self = (score: number): Grade => ({ correct: score >= 2 / 3, score, selfGraded: true });
    expect(ratingFor(item, self(0), 5, 0)).toBe(Rating.Again);
    expect(ratingFor(item, self(1 / 3), 5, 0)).toBe(Rating.Hard);
    expect(ratingFor(item, self(2 / 3), 500, 0)).toBe(Rating.Good);
    expect(ratingFor(item, self(1), 500, 0)).toBe(Rating.Easy);
  });
});

describe("scheduling round trip", () => {
  it("schedules further out for Good than for Again, and survives the DB mapping", () => {
    const at = new Date("2026-01-01T12:00:00Z");
    const again = scheduleNext(createNewCard(), Rating.Again, at);
    const good = scheduleNext(createNewCard(), Rating.Good, at);
    expect(good.due.getTime()).toBeGreaterThanOrEqual(again.due.getTime());

    const row = cardToDb(good);
    const back = cardFromDb(row);
    expect(back.due.toISOString()).toBe(row.due);
    expect(back.reps).toBe(good.reps);
    expect(formatInterval(good, at)).toMatch(/min|hr|day/);
  });

  it("mastery needs both a review and three weeks of stability", () => {
    expect(isMastered({ reps: 0, stability: 30 })).toBe(false);
    expect(isMastered({ reps: 2, stability: 21 })).toBe(true);
    expect(isMastered({ reps: 2, stability: 20 })).toBe(false);
  });
});
