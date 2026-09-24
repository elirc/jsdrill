/**
 * Builds a drill session.
 *
 * The default mix is 60% overdue reviews (spaced repetition earns its
 * keep) and 40% new material from unlocked levels, then interleaved so
 * consecutive items rarely come from the same track — interleaving is
 * what makes retrieval effortful, and effortful retrieval is what sticks.
 */
import { db, schema } from "@/lib/db";
import { eq, and, lte, inArray, sql } from "drizzle-orm";
import type { DrillItem, Item, Level, SessionSpec, SessionSummary } from "@/types";
import { DEFAULT_USER_ID } from "./user";

export { DEFAULT_USER_ID };

type ItemRow = typeof schema.items.$inferSelect;
type CardRow = typeof schema.userCards.$inferSelect;

/** Upper bound on a session, whatever the query string asks for. */
export const MAX_SESSION_SIZE = 40;

export async function buildSession(
  spec: SessionSpec,
  userId: string = DEFAULT_USER_ID
): Promise<SessionSummary> {
  const requested = Number.isFinite(spec.size) ? Math.floor(spec.size) : 12;
  const size = Math.max(1, Math.min(requested, MAX_SESSION_SIZE));
  const nowIso = new Date().toISOString();

  // One read of each table per request; everything below filters in
  // memory. The curriculum is a few hundred rows, so this is far
  // cheaper than the half-dozen overlapping full-table queries it
  // replaces.
  const published = db
    .select()
    .from(schema.items)
    .where(eq(schema.items.isPublished, true))
    .all();
  const itemById = new Map(published.map((i) => [i.id, i]));
  const unlocked = unlockedLevelByTrack(userId);

  // Interview mode is a different shape: no reviews, wide coverage,
  // biased toward things the learner has actually unlocked.
  if (spec.mode === "interview") {
    const items = pickInterviewSet(size, published, unlocked);
    return {
      items: enrich(items, userId, new Set()),
      spec: { ...spec, size },
      newCount: items.length,
      reviewCount: 0,
    };
  }

  const cards = db
    .select()
    .from(schema.userCards)
    .where(eq(schema.userCards.userId, userId))
    .all()
    // Cards for unpublished (removed) content are kept for history but
    // never scheduled again.
    .filter((c) => itemById.has(c.itemId));

  const scoped = scopedItemIds(spec, published, cards, unlocked);
  const inScope = (id: string) => (scoped ? scoped.has(id) : true);

  // ─── 1. Overdue reviews, most overdue first ───
  const dueCards = cards
    .filter((c) => c.due <= nowIso && inScope(c.itemId))
    .sort((a, b) => (a.due < b.due ? -1 : a.due > b.due ? 1 : 0));

  const reviewBudget = spec.mode === "weak" ? size : Math.ceil(size * 0.6);
  const reviewItems = dueCards
    .slice(0, reviewBudget)
    .map((c) => itemById.get(c.itemId))
    .filter((i): i is ItemRow => i !== undefined);

  // ─── 2. Fill with unseen items ───
  const seenIds = new Set(cards.map((c) => c.itemId));
  // A module- or level-scoped session ignores the level gate: the
  // learner asked for it explicitly.
  const ignoresGate = spec.mode === "module" || spec.mode === "level";
  const withinGate = (i: ItemRow) => ignoresGate || i.level <= (unlocked.get(i.trackId) ?? 1);

  const remaining = size - reviewItems.length;
  let newItems: ItemRow[] = [];

  if (remaining > 0 && spec.mode !== "weak") {
    newItems = spreadAcrossModules(
      published.filter((i) => !seenIds.has(i.id) && inScope(i.id) && withinGate(i))
    ).slice(0, remaining);
  }

  // ─── 3. If still short, allow already-seen items that aren't due ───
  // Filler is limited to *seen* items plus whatever the level gate
  // allows. It used to draw from every published item, so once the
  // unlocked material ran out a mixed session quietly served unseen
  // Level-4 questions to a beginner.
  let filler: ItemRow[] = [];
  const stillShort = size - reviewItems.length - newItems.length;
  if (stillShort > 0) {
    const chosen = new Set([...reviewItems, ...newItems].map((i) => i.id));
    filler = shuffle(
      published.filter(
        (i) => !chosen.has(i.id) && inScope(i.id) && (seenIds.has(i.id) || withinGate(i))
      )
    ).slice(0, stillShort);
  }

  const reviewIdSet = new Set(reviewItems.map((i) => i.id));
  const combined = easiestFirstWithinModule(
    interleaveByTrack([...reviewItems, ...newItems, ...filler])
  );

  return {
    items: enrich(combined, userId, reviewIdSet),
    spec: { ...spec, size },
    newCount: newItems.length,
    reviewCount: reviewItems.length,
  };
}

// ─── Scoping ───

/** `null` means "no restriction". */
function scopedItemIds(
  spec: SessionSpec,
  published: ItemRow[],
  cards: CardRow[],
  unlocked: Map<string, number>
): Set<string> | null {
  if (spec.mode === "module" && spec.moduleId) {
    return new Set(published.filter((i) => i.moduleId === spec.moduleId).map((i) => i.id));
  }

  if (spec.mode === "track" && spec.trackId) {
    const level = unlocked.get(spec.trackId) ?? 1;
    return new Set(
      published.filter((i) => i.trackId === spec.trackId && i.level <= level).map((i) => i.id)
    );
  }

  if (spec.mode === "level" && spec.level) {
    return new Set(published.filter((i) => i.level === spec.level).map((i) => i.id));
  }

  if (spec.mode === "weak") {
    // Items whose card has a poor hit rate or low stability.
    return new Set(
      cards
        .filter(
          (c) =>
            c.totalCount > 0 &&
            (c.correctCount / c.totalCount < 0.7 || c.lapses > 0 || c.stability < 7)
        )
        .map((c) => c.itemId)
    );
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
function pickInterviewSet(
  size: number,
  published: ItemRow[],
  unlocked: Map<string, number>
): ItemRow[] {
  const eligible = published.filter(
    (i) => i.level <= Math.min(4, (unlocked.get(i.trackId) ?? 1) + 1)
  );

  // Too little unlocked to fill the run: widen to everything published
  // (never to unpublished content).
  const pool = eligible.length >= size ? eligible : published;

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

/**
 * Interleaving shuffles, which would undo "easier first within a
 * module". Put that back without moving anything between slots: each
 * module keeps the positions it was given, and its items are re-dealt
 * into them easiest first. Same module means same track, so the
 * no-two-in-a-row-from-one-track property is untouched.
 */
function easiestFirstWithinModule(items: ItemRow[]): ItemRow[] {
  const byModule = new Map<string, number[]>();
  items.forEach((item, index) => {
    const slots = byModule.get(item.moduleId) ?? [];
    slots.push(index);
    byModule.set(item.moduleId, slots);
  });

  const out = [...items];
  for (const slots of byModule.values()) {
    if (slots.length < 2) continue;
    const sorted = slots.map((i) => items[i]).sort((a, b) => a.difficulty - b.difficulty);
    slots.forEach((slot, k) => {
      out[slot] = sorted[k];
    });
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

/** How many (published) items are due right now. */
export function dueCount(userId: string = DEFAULT_USER_ID): number {
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

// ─── Utilities ───

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
