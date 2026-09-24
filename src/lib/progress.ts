/**
 * Progress and analytics.
 *
 * "Mastery" blends two things: how much of a track you have *seen*
 * (coverage) and how well it has *stuck* (retention, via FSRS
 * stability). Coverage alone rewards clicking through; retention
 * alone punishes you for starting something new.
 *
 * Only **published** items count. Content removed from the source
 * files is unpublished by the seed rather than deleted (deleting would
 * cascade away the learner's attempts and cards), so every total here
 * filters on `isPublished`.
 *
 * Day bucketing (streaks, today's count, the activity map, the review
 * forecast) uses the *local* calendar day — see `localDateKey`.
 */
import { db, schema } from "@/lib/db";
import { eq, and, lte, gte, lt, desc, inArray, sql } from "drizzle-orm";
import { isMastered, MASTERY_STABILITY_DAYS } from "./fsrs";
import { parseIdeas } from "./sessionBuilder";
import { addLocalDays, localDateKey, startOfLocalDay } from "./utils";
import { DEFAULT_USER_ID } from "./user";
import type {
  ConceptStrength,
  DashboardData,
  DayActivity,
  Level,
  ModuleProgress,
  TrackProgress,
} from "@/types";

export { DEFAULT_USER_ID };

type CardRow = typeof schema.userCards.$inferSelect;
type ItemRow = typeof schema.items.$inferSelect;

/** Just the item columns the analytics need — no payloads or prose. */
type ItemLite = Pick<ItemRow, "id" | "trackId" | "moduleId" | "level">;

/**
 * Data several analytics share. Loading it once per request (and
 * passing it down) replaces the old pattern where `dashboard()` read
 * the whole `user_cards` table four times and `items` twice.
 */
export type ProgressContext = {
  cards: Map<string, CardRow>;
  items: ItemLite[];
};

function publishedItems(trackId?: string): ItemLite[] {
  const cols = {
    id: schema.items.id,
    trackId: schema.items.trackId,
    moduleId: schema.items.moduleId,
    level: schema.items.level,
  };
  const published = eq(schema.items.isPublished, true);
  return db
    .select(cols)
    .from(schema.items)
    .where(trackId ? and(published, eq(schema.items.trackId, trackId)) : published)
    .all();
}

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

export function loadProgressContext(userId: string = DEFAULT_USER_ID): ProgressContext {
  return { cards: cardsByItem(userId), items: publishedItems() };
}

function groupBy<T>(rows: T[], key: (row: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = out.get(k);
    if (list) list.push(row);
    else out.set(k, [row]);
  }
  return out;
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

/** Seen / mastered / due / tallies over a set of item ids. */
function tally(ids: string[], cards: Map<string, CardRow>, nowIso: string) {
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
  return { seen, mastered, due, correct, attempts };
}

// ─── Tracks ───

export function trackProgress(
  userId: string = DEFAULT_USER_ID,
  ctx: ProgressContext = loadProgressContext(userId)
): TrackProgress[] {
  const nowIso = new Date().toISOString();
  const tracks = db.select().from(schema.tracks).orderBy(schema.tracks.sortOrder).all();
  const itemsByTrack = groupBy(ctx.items, (i) => i.trackId);

  const levels = new Map(
    db
      .select()
      .from(schema.userTrackProgress)
      .where(eq(schema.userTrackProgress.userId, userId))
      .all()
      .map((p) => [p.trackId, p.currentLevel])
  );

  return (
    tracks
      // A track whose content was removed keeps its row (so history
      // survives) but has nothing published: hide it.
      .filter((track) => itemsByTrack.has(track.id))
      .map((track) => {
        const ids = (itemsByTrack.get(track.id) ?? []).map((i) => i.id);
        const t = tally(ids, ctx.cards, nowIso);

        return {
          trackId: track.id,
          trackName: track.name,
          trackSlug: track.slug,
          trackIcon: track.icon,
          trackColor: track.color,
          currentLevel: (levels.get(track.id) ?? 1) as Level,
          totalItems: ids.length,
          seenItems: t.seen,
          masteredItems: t.mastered,
          dueItems: t.due,
          mastery: masteryScore(ids, ctx.cards),
          accuracy: t.attempts > 0 ? Math.round((t.correct / t.attempts) * 100) : 0,
        };
      })
  );
}

// ─── Modules ───

export function moduleProgress(
  trackId: string,
  userId: string = DEFAULT_USER_ID,
  cards: Map<string, CardRow> = cardsByItem(userId)
): ModuleProgress[] {
  const nowIso = new Date().toISOString();
  const modules = db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.trackId, trackId))
    .all()
    .sort((a, b) => (a.level !== b.level ? a.level - b.level : a.sortOrder - b.sortOrder));

  const itemsByModule = groupBy(publishedItems(trackId), (i) => i.moduleId);

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

  return (
    modules
      // Modules removed from content keep their row but lose their items.
      .filter((m) => itemsByModule.has(m.id))
      .map((m) => {
        const ids = (itemsByModule.get(m.id) ?? []).map((i) => i.id);
        const t = tally(ids, cards, nowIso);

        return {
          moduleId: m.id,
          moduleSlug: m.slug,
          title: m.title,
          summary: m.summary,
          keyIdeas: parseIdeas(m.keyIdeas),
          level: m.level as Level,
          trackId: m.trackId,
          totalItems: ids.length,
          seenItems: t.seen,
          masteredItems: t.mastered,
          dueItems: t.due,
          mastery: masteryScore(ids, cards),
          // Later levels are visible but flagged; drilling them is still
          // allowed — locking people out of content they want is worse
          // than letting them find it hard.
          locked: m.level > unlockedLevel,
        };
      })
  );
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
 * A level with **no published items** passes straight through: tracks
 * are allowed to skip a level (web has no L3, for instance), and
 * without this the track would stall on the empty level forever. It
 * keeps going while each successive level already meets the bar (the
 * learner may have drilled ahead via module mode).
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

  const trackItems = publishedItems(trackId);
  if (trackItems.length === 0) return null;
  const byLevel = groupBy(trackItems, (i) => String(i.level));

  const ids = trackItems.map((i) => i.id);
  const cards = new Map(
    db
      .select()
      .from(schema.userCards)
      .where(and(eq(schema.userCards.userId, userId), inArray(schema.userCards.itemId, ids)))
      .all()
      .map((c) => [c.itemId, c])
  );

  const maxContentLevel = Math.max(...trackItems.map((i) => i.level));
  let level = progress.currentLevel;

  while (level < 4 && level < maxContentLevel) {
    const levelItems = byLevel.get(String(level)) ?? [];
    if (levelItems.length > 0 && !meetsUnlockBar(levelItems, cards)) break;
    level++;
  }

  if (level === progress.currentLevel) return null;

  const next = level as Level;
  db.update(schema.userTrackProgress)
    .set({ currentLevel: next, levelUnlockedAt: new Date().toISOString() })
    .where(eq(schema.userTrackProgress.id, progress.id))
    .run();

  return next;
}

function meetsUnlockBar(levelItems: ItemLite[], cards: Map<string, CardRow>): boolean {
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
  return coverage >= UNLOCK_COVERAGE && accuracy >= UNLOCK_ACCURACY;
}

// ─── Concepts ───

export function conceptStrengths(
  userId: string = DEFAULT_USER_ID,
  ctx: ProgressContext = loadProgressContext(userId)
): ConceptStrength[] {
  const concepts = db.select().from(schema.concepts).all();
  const links = db.select().from(schema.itemConcepts).all();
  const published = new Set(ctx.items.map((i) => i.id));

  const itemsByConcept = new Map<string, string[]>();
  for (const link of links) {
    if (!published.has(link.itemId)) continue;
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
        const card = ctx.cards.get(id);
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

/** Local calendar days (`YYYY-MM-DD`) on which the user answered anything. */
function activeDays(userId: string): Set<string> {
  return new Set(
    db
      .select({ createdAt: schema.attempts.createdAt })
      .from(schema.attempts)
      .where(eq(schema.attempts.userId, userId))
      .all()
      .map((a) => localDateKey(a.createdAt))
  );
}

/**
 * Consecutive active local days ending today — or ending yesterday, so
 * a streak is not shown as broken before today's session. Pure: reads
 * only, and takes `now` for testability.
 */
export function streakFromDays(days: Set<string>, now: Date = new Date()): number {
  let cursor = startOfLocalDay(now);
  if (!days.has(localDateKey(cursor))) {
    cursor = addLocalDays(cursor, -1);
    if (!days.has(localDateKey(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(localDateKey(cursor))) {
    streak++;
    cursor = addLocalDays(cursor, -1);
  }
  return streak;
}

/** The current streak, without writing anything. */
export function currentStreak(userId: string = DEFAULT_USER_ID): number {
  return streakFromDays(activeDays(userId));
}

/** Recomputes the streak from attempts and persists it on the user row. */
export function recomputeStreak(
  userId: string = DEFAULT_USER_ID,
  days: Set<string> = activeDays(userId)
): number {
  const streak = streakFromDays(days);
  if (days.size === 0) return 0;

  // ISO-format local keys sort chronologically as strings.
  const lastActive = [...days].sort().at(-1) ?? null;
  const user = db.select().from(schema.users).where(eq(schema.users.id, userId)).get();
  db.update(schema.users)
    .set({
      streakCount: streak,
      longestStreak: Math.max(streak, user?.longestStreak ?? 0),
      // The last day with activity — not "the day someone looked".
      lastActiveDate: lastActive,
    })
    .where(eq(schema.users.id, userId))
    .run();

  return streak;
}

// ─── Dashboard ───

export function dashboard(userId: string = DEFAULT_USER_ID): DashboardData {
  const now = new Date();
  const nowIso = now.toISOString();
  const ctx = loadProgressContext(userId);
  const publishedIds = new Set(ctx.items.map((i) => i.id));

  const attempts = db
    .select({
      correct: schema.attempts.correct,
      timeSpent: schema.attempts.timeSpent,
      createdAt: schema.attempts.createdAt,
    })
    .from(schema.attempts)
    .where(eq(schema.attempts.userId, userId))
    .all();

  // Cards for unpublished items would sit "due" forever; ignore them.
  const cards = [...ctx.cards.values()].filter((c) => publishedIds.has(c.itemId));

  const correctAttempts = attempts.filter((a) => a.correct).length;
  const secondsDrilled = attempts.reduce((sum, a) => sum + a.timeSpent, 0);

  // ─── Activity, last 120 local days ───
  const activityMap = new Map<string, { count: number; correct: number }>();
  for (const a of attempts) {
    const date = localDateKey(a.createdAt);
    const entry = activityMap.get(date) ?? { count: 0, correct: 0 };
    entry.count++;
    if (a.correct) entry.correct++;
    activityMap.set(date, entry);
  }

  const activity: DayActivity[] = [];
  const todayStart = startOfLocalDay(now);
  for (let i = 119; i >= 0; i--) {
    const key = localDateKey(addLocalDays(todayStart, -i));
    const entry = activityMap.get(key);
    activity.push({ date: key, count: entry?.count ?? 0, correct: entry?.correct ?? 0 });
  }

  // ─── Review forecast, next 14 local days ───
  // Day 0 is everything due by the end of today, overdue included —
  // previously cards due later *today* fell through the cracks: not
  // yet overdue, so not in the day-0 count, and day 0 ignored the map.
  const tomorrowIso = addLocalDays(todayStart, 1).toISOString();
  const forecastMap = new Map<string, number>();
  let dueByEndOfToday = 0;
  for (const card of cards) {
    if (card.due < tomorrowIso) dueByEndOfToday++;
    else {
      const key = localDateKey(card.due);
      forecastMap.set(key, (forecastMap.get(key) ?? 0) + 1);
    }
  }
  const forecast: { date: string; count: number }[] = [];
  for (let i = 0; i < 14; i++) {
    const key = localDateKey(addLocalDays(todayStart, i));
    forecast.push({ date: key, count: i === 0 ? dueByEndOfToday : forecastMap.get(key) ?? 0 });
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

  const concepts = conceptStrengths(userId, ctx);
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
      totalItems: ctx.items.length,
      dueNow: cards.filter((c) => c.due <= nowIso).length,
      streak: recomputeStreak(userId, new Set(activityMap.keys())),
      minutesDrilled: Math.round(secondsDrilled / 60),
    },
    trackProgress: trackProgress(userId, ctx),
    activity,
    conceptStrengths: concepts,
    weakest,
    forecast,
    recentMisses,
  };
}

/** Items answered today (local day), for the daily goal ring. */
export function answeredToday(userId: string = DEFAULT_USER_ID): number {
  const start = startOfLocalDay();
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.attempts)
    .where(
      and(
        eq(schema.attempts.userId, userId),
        gte(schema.attempts.createdAt, start.toISOString()),
        lt(schema.attempts.createdAt, addLocalDays(start, 1).toISOString())
      )
    )
    .get();
  return row?.n ?? 0;
}

/** Cards due now, for published items only. */
export function overdueCount(userId: string = DEFAULT_USER_ID): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userCards)
    .innerJoin(schema.items, eq(schema.userCards.itemId, schema.items.id))
    .where(
      and(
        eq(schema.userCards.userId, userId),
        eq(schema.items.isPublished, true),
        lte(schema.userCards.due, new Date().toISOString())
      )
    )
    .get();
  return row?.n ?? 0;
}
