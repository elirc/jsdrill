/**
 * Builds a drill session.
 *
 * The default mix is 60% overdue reviews (spaced repetition earns its
 * keep) and 40% new material from unlocked levels, then interleaved so
 * consecutive items rarely come from the same track — interleaving is
 * what makes retrieval effortful, and effortful retrieval is what sticks.
 */
import { db, schema } from "@/lib/db";
import { eq, and, lte, inArray, asc, sql } from "drizzle-orm";
import type { DrillItem, Item, Level, SessionSpec, SessionSummary } from "@/types";

export const DEFAULT_USER_ID = "default-user";

type ItemRow = typeof schema.items.$inferSelect;

export async function buildSession(
  spec: SessionSpec,
  userId: string = DEFAULT_USER_ID
): Promise<SessionSummary> {
  const size = Math.max(1, Math.min(spec.size, 40));
  const nowIso = new Date().toISOString();

  // Interview mode is a different shape: no reviews, wide coverage,
  // biased toward things the learner has actually unlocked.
  if (spec.mode === "interview") {
    const items = pickInterviewSet(size, userId);
    return {
      items: enrich(items, userId, new Set()),
      spec: { ...spec, size },
      newCount: items.length,
      reviewCount: 0,
    };
  }

  const scopeIds = scopedItemIds(spec, userId);
  const scoped = scopeIds === null ? null : new Set(scopeIds);

  // ─── 1. Overdue reviews ───
  const dueCards = db
    .select()
    .from(schema.userCards)
    .where(and(eq(schema.userCards.userId, userId), lte(schema.userCards.due, nowIso)))
    .orderBy(asc(schema.userCards.due))
    .all()
    .filter((c) => (scoped ? scoped.has(c.itemId) : true));

  const reviewBudget =
    spec.mode === "weak" ? size : Math.ceil(size * 0.6);
  const reviewIds = dueCards.slice(0, reviewBudget).map((c) => c.itemId);

  const reviewItems = reviewIds.length
    ? sortByIds(
        db.select().from(schema.items).where(inArray(schema.items.id, reviewIds)).all(),
        reviewIds
      )
    : [];

  // ─── 2. Fill with unseen items ───
  const seenIds = new Set(
    db
      .select({ itemId: schema.userCards.itemId })
      .from(schema.userCards)
      .where(eq(schema.userCards.userId, userId))
      .all()
      .map((c) => c.itemId)
  );

  const remaining = size - reviewItems.length;
  let newItems: ItemRow[] = [];

  if (remaining > 0 && spec.mode !== "weak") {
    const unlocked = unlockedLevelByTrack(userId);

    newItems = db
      .select()
      .from(schema.items)
      .where(eq(schema.items.isPublished, true))
      .all()
      .filter((i) => {
        if (seenIds.has(i.id)) return false;
        if (scoped && !scoped.has(i.id)) return false;
        // A module- or level-scoped session ignores the level gate:
        // the learner asked for it explicitly.
        if (spec.mode === "module" || spec.mode === "level") return true;
        return i.level <= (unlocked.get(i.trackId) ?? 1);
      });

    newItems = spreadAcrossModules(newItems).slice(0, remaining);
  }

  // ─── 3. If still short, allow already-seen items that aren't due ───
  let filler: ItemRow[] = [];
  const stillShort = size - reviewItems.length - newItems.length;
  if (stillShort > 0) {
    const chosen = new Set([...reviewItems, ...newItems].map((i) => i.id));
    filler = db
      .select()
      .from(schema.items)
      .where(eq(schema.items.isPublished, true))
      .all()
      .filter((i) => !chosen.has(i.id) && (scoped ? scoped.has(i.id) : true));
    filler = shuffle(filler).slice(0, stillShort);
  }

  const reviewIdSet = new Set(reviewItems.map((i) => i.id));
  const combined = interleaveByTrack([...reviewItems, ...newItems, ...filler]);

  return {
    items: enrich(combined, userId, reviewIdSet),
    spec: { ...spec, size },
    newCount: newItems.length,
    reviewCount: reviewItems.length,
  };
}

// ─── Scoping ───

/** `null` means "no restriction". */
function scopedItemIds(spec: SessionSpec, userId: string): string[] | null {
  if (spec.mode === "module" && spec.moduleId) {
    return db
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(eq(schema.items.moduleId, spec.moduleId))
      .all()
      .map((r) => r.id);
  }

  if (spec.mode === "track" && spec.trackId) {
    const rows = db
      .select({ id: schema.items.id, level: schema.items.level })
      .from(schema.items)
      .where(eq(schema.items.trackId, spec.trackId))
      .all();
    const unlocked = unlockedLevelByTrack(userId).get(spec.trackId) ?? 1;
    return rows.filter((r) => r.level <= unlocked).map((r) => r.id);
  }

  if (spec.mode === "level" && spec.level) {
    return db
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(eq(schema.items.level, spec.level))
      .all()
      .map((r) => r.id);
  }

  if (spec.mode === "weak") {
    // Items whose card has a poor hit rate or low stability.
    return db
      .select()
      .from(schema.userCards)
      .where(eq(schema.userCards.userId, userId))
      .all()
      .filter(
        (c) =>
          c.totalCount > 0 &&
          (c.correctCount / c.totalCount < 0.7 || c.lapses > 0 || c.stability < 7)
      )
      .map((c) => c.itemId);
  }

  return null;
}

function unlockedLevelByTrack(userId: string): Map<string, number> {
  const rows = db
    .select()
    .from(schema.userTrackProgress)
    .where(eq(schema.userTrackProgress.userId, userId))
    .all();
  return new Map(rows.map((r) => [r.trackId, r.currentLevel]));
}

// ─── Interview mode ───

/**
 * A mock interview: broad coverage, weighted toward the levels the
 * learner has reached, and never more than two items from one module.
 */
function pickInterviewSet(size: number, userId: string): ItemRow[] {
  const unlocked = unlockedLevelByTrack(userId);

  const eligible = db
    .select()
    .from(schema.items)
    .where(eq(schema.items.isPublished, true))
    .all()
    .filter((i) => i.level <= Math.min(4, (unlocked.get(i.trackId) ?? 1) + 1));

  const pool = eligible.length >= size ? eligible : db.select().from(schema.items).all();

  // Round-robin across tracks so no single technology dominates.
  const byTrack = new Map<string, ItemRow[]>();
  for (const item of shuffle(pool)) {
    const list = byTrack.get(item.trackId) ?? [];
    list.push(item);
    byTrack.set(item.trackId, list);
  }

  const picked: ItemRow[] = [];
  const perModule = new Map<string, number>();
  const queues = shuffle([...byTrack.values()]);

  while (picked.length < size && queues.some((q) => q.length > 0)) {
    for (const queue of queues) {
      if (picked.length >= size) break;
      while (queue.length > 0) {
        const candidate = queue.shift()!;
        const used = perModule.get(candidate.moduleId) ?? 0;
        if (used < 2) {
          perModule.set(candidate.moduleId, used + 1);
          picked.push(candidate);
          break;
        }
      }
    }
  }

  return picked;
}

// ─── Ordering ───

/** Round-robin across modules so a session is not five items from one topic. */
function spreadAcrossModules(items: ItemRow[]): ItemRow[] {
  const byModule = new Map<string, ItemRow[]>();
  for (const item of items) {
    const list = byModule.get(item.moduleId) ?? [];
    list.push(item);
    byModule.set(item.moduleId, list);
  }

  // Easier items first within a module, so a new module opens gently.
  for (const list of byModule.values()) {
    list.sort((a, b) => a.difficulty - b.difficulty);
  }

  const queues = shuffle([...byModule.values()]);
  const out: ItemRow[] = [];
  while (queues.some((q) => q.length > 0)) {
    for (const q of queues) {
      const next = q.shift();
      if (next) out.push(next);
    }
  }
  return out;
}

/** Avoid consecutive items from the same track where possible. */
function interleaveByTrack(items: ItemRow[]): ItemRow[] {
  const pool = shuffle(items);
  const out: ItemRow[] = [];

  while (pool.length > 0) {
    const lastTrack = out[out.length - 1]?.trackId;
    let index = pool.findIndex((i) => i.trackId !== lastTrack);
    if (index === -1) index = 0;
    out.push(pool.splice(index, 1)[0]);
  }

  return out;
}

// ─── Enrichment ───

function enrich(rows: ItemRow[], userId: string, reviewIds: Set<string>): DrillItem[] {
  if (rows.length === 0) return [];

  const trackIds = [...new Set(rows.map((r) => r.trackId))];
  const moduleIds = [...new Set(rows.map((r) => r.moduleId))];
  const itemIds = rows.map((r) => r.id);

  const tracks = new Map(
    db
      .select()
      .from(schema.tracks)
      .where(inArray(schema.tracks.id, trackIds))
      .all()
      .map((t) => [t.id, t])
  );

  const modules = new Map(
    db
      .select()
      .from(schema.modules)
      .where(inArray(schema.modules.id, moduleIds))
      .all()
      .map((m) => [m.id, m])
  );

  const links = db
    .select({
      itemId: schema.itemConcepts.itemId,
      id: schema.concepts.id,
      name: schema.concepts.name,
      slug: schema.concepts.slug,
    })
    .from(schema.itemConcepts)
    .innerJoin(schema.concepts, eq(schema.itemConcepts.conceptId, schema.concepts.id))
    .where(inArray(schema.itemConcepts.itemId, itemIds))
    .all();

  const conceptsByItem = new Map<string, { id: string; name: string; slug: string }[]>();
  for (const link of links) {
    const list = conceptsByItem.get(link.itemId) ?? [];
    list.push({ id: link.id, name: link.name, slug: link.slug });
    conceptsByItem.set(link.itemId, list);
  }

  const repsByItem = new Map(
    db
      .select({ itemId: schema.userCards.itemId, reps: schema.userCards.reps })
      .from(schema.userCards)
      .where(
        and(eq(schema.userCards.userId, userId), inArray(schema.userCards.itemId, itemIds))
      )
      .all()
      .map((c) => [c.itemId, c.reps])
  );

  // Modules the learner has never answered anything from: the drill
  // shows their key ideas before the first question, so a new topic
  // opens with a primer rather than cold.
  const touchedModules = new Set(
    db
      .select({ moduleId: schema.items.moduleId })
      .from(schema.userCards)
      .innerJoin(schema.items, eq(schema.userCards.itemId, schema.items.id))
      .where(and(eq(schema.userCards.userId, userId), inArray(schema.items.moduleId, moduleIds)))
      .all()
      .map((r) => r.moduleId)
  );

  return rows.map((row) => {
    const track = tracks.get(row.trackId);
    const mod = modules.get(row.moduleId);
    const firstTime = !touchedModules.has(row.moduleId);
    return {
      ...toItem(row),
      trackName: track?.name ?? "Unknown",
      trackSlug: track?.slug ?? "",
      trackColor: track?.color ?? "#6366f1",
      moduleTitle: mod?.title ?? "",
      moduleSlug: mod?.slug ?? "",
      moduleSummary: mod?.summary ?? "",
      moduleKeyIdeas: firstTime && mod ? parseIdeas(mod.keyIdeas) : null,
      concepts: conceptsByItem.get(row.id) ?? [],
      isReview: reviewIds.has(row.id),
      reps: repsByItem.get(row.id) ?? 0,
    };
  });
}

export function parseIdeas(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toItem(row: ItemRow): Item {
  return {
    id: row.id,
    kind: row.kind as Item["kind"],
    trackId: row.trackId,
    moduleId: row.moduleId,
    level: row.level as Level,
    prompt: row.prompt,
    code: row.code ?? undefined,
    lang: (row.lang as Item["lang"]) ?? undefined,
    payload: JSON.parse(row.payload),
    explanation: row.explanation,
    interviewTip: row.interviewTip ?? undefined,
    conceptIds: [],
    estSeconds: row.estSeconds,
    difficulty: row.difficulty as 1 | 2 | 3,
  };
}

/** How many items are due right now. */
export function dueCount(userId: string = DEFAULT_USER_ID): number {
  const row = db
    .select({ n: sql<number>`count(*)` })
    .from(schema.userCards)
    .where(
      and(
        eq(schema.userCards.userId, userId),
        lte(schema.userCards.due, new Date().toISOString())
      )
    )
    .get();
  return row?.n ?? 0;
}

// ─── Utilities ───

function sortByIds<T extends { id: string }>(rows: T[], ids: string[]): T[] {
  const order = new Map(ids.map((id, i) => [id, i]));
  return [...rows].sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
