/**
 * Progress and analytics.
 *
 * "Mastery" blends two things: how much of a track you have *seen*
 * (coverage) and how well it has *stuck* (retention, via FSRS
 * stability). Coverage alone rewards clicking through; retention
 * alone punishes you for starting something new.
 */
import { db, schema } from "@/lib/db";
import { eq, and, lte, desc, inArray } from "drizzle-orm";
import { isMastered, MASTERY_STABILITY_DAYS } from "./fsrs";
import { parseIdeas } from "./sessionBuilder";
import { today } from "./utils";
import type {
  ConceptStrength,
  DashboardData,
  DayActivity,
  Level,
  ModuleProgress,
  TrackProgress,
} from "@/types";

export const DEFAULT_USER_ID = "default-user";

type CardRow = typeof schema.userCards.$inferSelect;

function cardsByItem(userId: string): Map<string, CardRow> {
  return new Map(
    db
      .select()
      .from(schema.userCards)
      .where(eq(schema.userCards.userId, userId))
      .all()
      .map((c) => [c.itemId, c])
  );
}

/**
 * 0–100. Each seen item contributes its retention (stability capped at
 * the mastery threshold); unseen items contribute nothing.
 */
function masteryScore(itemIds: string[], cards: Map<string, CardRow>): number {
  if (itemIds.length === 0) return 0;
  let total = 0;
  for (const id of itemIds) {
    const card = cards.get(id);
    if (!card || card.reps === 0) continue;
    const retention = Math.min(1, card.stability / MASTERY_STABILITY_DAYS);
    const accuracy = card.totalCount > 0 ? card.correctCount / card.totalCount : 0;
    // Weight retention more heavily; accuracy stops a lucky guess
    // from reading as mastery.
    total += retention * 0.7 + accuracy * 0.3;
  }
  return Math.round((total / itemIds.length) * 100);
}

// ─── Tracks ───

export function trackProgress(userId: string = DEFAULT_USER_ID): TrackProgress[] {
  const nowIso = new Date().toISOString();
  const tracks = db.select().from(schema.tracks).orderBy(schema.tracks.sortOrder).all();
  const items = db.select().from(schema.items).all();
  const cards = cardsByItem(userId);

  const levels = new Map(
    db
      .select()
      .from(schema.userTrackProgress)
      .where(eq(schema.userTrackProgress.userId, userId))
      .all()
      .map((p) => [p.trackId, p.currentLevel])
  );

  return tracks.map((track) => {
    const trackItems = items.filter((i) => i.trackId === track.id);
    const ids = trackItems.map((i) => i.id);

    let seen = 0;
    let mastered = 0;
    let due = 0;
    let correct = 0;
    let attempts = 0;

    for (const id of ids) {
      const card = cards.get(id);
      if (!card || card.reps === 0) continue;
      seen++;
      if (isMastered(card)) mastered++;
      if (card.due <= nowIso) due++;
      correct += card.correctCount;
      attempts += card.totalCount;
    }

    return {
      trackId: track.id,
      trackName: track.name,
      trackSlug: track.slug,
      trackIcon: track.icon,
      trackColor: track.color,
      currentLevel: (levels.get(track.id) ?? 1) as Level,
      totalItems: ids.length,
      seenItems: seen,
      masteredItems: mastered,
      dueItems: due,
      mastery: masteryScore(ids, cards),
      accuracy: attempts > 0 ? Math.round((correct / attempts) * 100) : 0,
    };
  });
}

// ─── Modules ───

export function moduleProgress(
  trackId: string,
  userId: string = DEFAULT_USER_ID
): ModuleProgress[] {
  const nowIso = new Date().toISOString();
  const modules = db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.trackId, trackId))
    .all()
    .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.sortOrder - b.sortOrder));

  const items = db
    .select()
    .from(schema.items)
    .where(eq(schema.items.trackId, trackId))
    .all();
  const cards = cardsByItem(userId);

  const unlockedLevel =
    db
      .select()
      .from(schema.userTrackProgress)
      .where(
        and(
          eq(schema.userTrackProgress.userId, userId),
          eq(schema.userTrackProgress.trackId, trackId)
        )
      )
      .get()?.currentLevel ?? 1;

  return modules.map((m) => {
    const ids = items.filter((i) => i.moduleId === m.id).map((i) => i.id);

    let seen = 0;
    let mastered = 0;
    let due = 0;
    for (const id of ids) {
      const card = cards.get(id);
      if (!card || card.reps === 0) continue;
      seen++;
      if (isMastered(card)) mastered++;
      if (card.due <= nowIso) due++;
    }

    return {
      moduleId: m.id,
      moduleSlug: m.slug,
      title: m.title,
      summary: m.summary,
      keyIdeas: parseIdeas(m.keyIdeas),
      level: m.level as Level,
      trackId: m.trackId,
      totalItems: ids.length,
      seenItems: seen,
      masteredItems: mastered,
      dueItems: due,
      mastery: masteryScore(ids, cards),
      // Later levels are visible but flagged; drilling them is still
      // allowed — locking people out of content they want is worse
      // than letting them find it hard.
      locked: m.level > unlockedLevel,
    };
  });
}

/** Share of the current level that must be answered correctly to progress. */
export const UNLOCK_COVERAGE = 0.8;
/** Accuracy required across that level's attempts. */
export const UNLOCK_ACCURACY = 0.7;

/**
 * Unlock the next level in a track once the learner has worked through
 * the current one competently.
 *
 * The gate is **coverage plus accuracy**, deliberately not FSRS
 * stability: stability only grows across real elapsed days, so gating
 * on it would keep the roadmap shut for weeks no matter how well
 * someone was doing. Retention is still tracked — it drives the
 * mastery percentage and the review schedule — but it should not stop
 * a learner reaching material they are ready for.
 *
 * Returns the new level if it changed.
 */
export function maybeUnlockNextLevel(
  trackId: string,
  userId: string = DEFAULT_USER_ID
): Level | null {
  const progress = db
    .select()
    .from(schema.userTrackProgress)
    .where(
      and(
        eq(schema.userTrackProgress.userId, userId),
        eq(schema.userTrackProgress.trackId, trackId)
      )
    )
    .get();

  if (!progress || progress.currentLevel >= 4) return null;

  const levelItems = db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.trackId, trackId), eq(schema.items.level, progress.currentLevel)))
    .all();

  if (levelItems.length === 0) return null;

  const cards = cardsByItem(userId);

  let answeredCorrectly = 0;
  let correct = 0;
  let attempts = 0;

  for (const item of levelItems) {
    const card = cards.get(item.id);
    if (!card || card.reps === 0) continue;
    if (card.correctCount > 0) answeredCorrectly++;
    correct += card.correctCount;
    attempts += card.totalCount;
  }

  const coverage = answeredCorrectly / levelItems.length;
  const accuracy = attempts > 0 ? correct / attempts : 0;

  if (coverage < UNLOCK_COVERAGE || accuracy < UNLOCK_ACCURACY) return null;

  const next = (progress.currentLevel + 1) as Level;
  db.update(schema.userTrackProgress)
    .set({ currentLevel: next, levelUnlockedAt: new Date().toISOString() })
    .where(eq(schema.userTrackProgress.id, progress.id))
    .run();

  return next;
}

// ─── Concepts ───

export function conceptStrengths(userId: string = DEFAULT_USER_ID): ConceptStrength[] {
  const concepts = db.select().from(schema.concepts).all();
  const links = db.select().from(schema.itemConcepts).all();
  const cards = cardsByItem(userId);

  const itemsByConcept = new Map<string, string[]>();
  for (const link of links) {
    const list = itemsByConcept.get(link.conceptId) ?? [];
    list.push(link.itemId);
    itemsByConcept.set(link.conceptId, list);
  }

  return concepts
    .map((concept) => {
      const ids = itemsByConcept.get(concept.id) ?? [];
      let seen = 0;
      let stability = 0;
      let correct = 0;
      let attempts = 0;

      for (const id of ids) {
        const card = cards.get(id);
        if (!card || card.reps === 0) continue;
        seen++;
        stability += card.stability;
        correct += card.correctCount;
        attempts += card.totalCount;
      }

      const avgStability = seen > 0 ? stability / seen : 0;
      const accuracy = attempts > 0 ? Math.round((correct / attempts) * 100) : 0;

      let strength: ConceptStrength["strength"] = "none";
      if (seen > 0) {
        if (avgStability >= MASTERY_STABILITY_DAYS && accuracy >= 80) strength = "strong";
        else if (avgStability >= 5 && accuracy >= 60) strength = "learning";
        else strength = "shaky";
      }

      return {
        conceptId: concept.id,
        conceptName: concept.name,
        conceptSlug: concept.slug,
        totalItems: ids.length,
        seenItems: seen,
        accuracy,
        averageStability: Math.round(avgStability * 10) / 10,
        strength,
      };
    })
    .filter((c) => c.totalItems > 0);
}

// ─── Streak ───

export function recomputeStreak(userId: string = DEFAULT_USER_ID): number {
  const days = new Set(
    db
      .select({ createdAt: schema.attempts.createdAt })
      .from(schema.attempts)
      .where(eq(schema.attempts.userId, userId))
      .all()
      .map((a) => a.createdAt.slice(0, 10))
  );

  if (days.size === 0) return 0;

  // Count back from today; a gap yesterday with activity today still
  // counts as a streak of 1, which is the behaviour people expect.
  let streak = 0;
  const cursor = new Date();
  if (!days.has(cursor.toISOString().slice(0, 10))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(cursor.toISOString().slice(0, 10))) return 0;
  }

  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  db.update(schema.users)
    .set({
      streakCount: streak,
      longestStreak: Math.max(streak, user?.longestStreak ?? 0),
      lastActiveDate: today(),
    })
    .where(eq(schema.users.id, userId))
    .run();

  return streak;
}

// ─── Dashboard ───

export function dashboard(userId: string = DEFAULT_USER_ID): DashboardData {
  const nowIso = new Date().toISOString();
  const attempts = db
    .select()
    .from(schema.attempts)
    .where(eq(schema.attempts.userId, userId))
    .all();

  const cards = db
    .select()
    .from(schema.userCards)
    .where(eq(schema.userCards.userId, userId))
    .all();

  const totalItems = db.select().from(schema.items).all().length;
  const correctAttempts = attempts.filter((a) => a.correct).length;
  const secondsDrilled = attempts.reduce((sum, a) => sum + a.timeSpent, 0);

  // ─── Activity, last 120 days ───
  const activityMap = new Map<string, { count: number; correct: number }>();
  for (const a of attempts) {
    const date = a.createdAt.slice(0, 10);
    const entry = activityMap.get(date) ?? { count: 0, correct: 0 };
    entry.count++;
    if (a.correct) entry.correct++;
    activityMap.set(date, entry);
  }

  const activity: DayActivity[] = [];
  const cursor = new Date();
  cursor.setDate(cursor.getDate() - 119);
  for (let i = 0; i < 120; i++) {
    const key = cursor.toISOString().slice(0, 10);
    const entry = activityMap.get(key);
    activity.push({ date: key, count: entry?.count ?? 0, correct: entry?.correct ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }

  // ─── Review forecast, next 14 days ───
  const forecastMap = new Map<string, number>();
  for (const card of cards) {
    const key = card.due.slice(0, 10);
    forecastMap.set(key, (forecastMap.get(key) ?? 0) + 1);
  }
  const forecast: { date: string; count: number }[] = [];
  const fCursor = new Date();
  for (let i = 0; i < 14; i++) {
    const key = fCursor.toISOString().slice(0, 10);
    // Everything overdue lands on day 0.
    const count =
      i === 0
        ? cards.filter((c) => c.due <= nowIso).length
        : forecastMap.get(key) ?? 0;
    forecast.push({ date: key, count });
    fCursor.setDate(fCursor.getDate() + 1);
  }

  // ─── Recent misses ───
  const missed = db
    .select()
    .from(schema.attempts)
    .where(and(eq(schema.attempts.userId, userId), eq(schema.attempts.correct, false)))
    .orderBy(desc(schema.attempts.createdAt))
    .limit(8)
    .all();

  const missedItemIds = [...new Set(missed.map((m) => m.itemId))];
  const missedItems = missedItemIds.length
    ? db.select().from(schema.items).where(inArray(schema.items.id, missedItemIds)).all()
    : [];
  const itemById = new Map(missedItems.map((i) => [i.id, i]));
  const trackById = new Map(db.select().from(schema.tracks).all().map((t) => [t.id, t]));

  const recentMisses = missed
    .map((m) => {
      const item = itemById.get(m.itemId);
      const track = item ? trackById.get(item.trackId) : undefined;
      return item
        ? {
            itemId: item.id,
            prompt: item.prompt,
            trackName: track?.name ?? "",
            trackColor: track?.color ?? "#6366f1",
            at: m.createdAt,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const concepts = conceptStrengths(userId);
  const weakest = concepts
    .filter((c) => c.seenItems > 0 && c.strength !== "strong")
    .sort((a, b) => a.accuracy - b.accuracy || a.averageStability - b.averageStability)
    .slice(0, 6);

  return {
    stats: {
      totalAttempts: attempts.length,
      correctAttempts,
      accuracy:
        attempts.length > 0 ? Math.round((correctAttempts / attempts.length) * 100) : 0,
      itemsSeen: cards.filter((c) => c.reps > 0).length,
      itemsMastered: cards.filter(isMastered).length,
      totalItems,
      dueNow: cards.filter((c) => c.due <= nowIso).length,
      streak: recomputeStreak(userId),
      minutesDrilled: Math.round(secondsDrilled / 60),
    },
    trackProgress: trackProgress(userId),
    activity,
    conceptStrengths: concepts,
    weakest,
    forecast,
    recentMisses,
  };
}

/** Items answered today, for the daily goal ring. */
export function answeredToday(userId: string = DEFAULT_USER_ID): number {
  const prefix = today();
  return db
    .select()
    .from(schema.attempts)
    .where(eq(schema.attempts.userId, userId))
    .all()
    .filter((a) => a.createdAt.startsWith(prefix)).length;
}

export function overdueCount(userId: string = DEFAULT_USER_ID): number {
  return db
    .select()
    .from(schema.userCards)
    .where(
      and(
        eq(schema.userCards.userId, userId),
        lte(schema.userCards.due, new Date().toISOString())
      )
    )
    .all().length;
}
