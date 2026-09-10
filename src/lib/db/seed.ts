/**
 * Seeds the curriculum into SQLite.
 *
 * Content is the source of truth: tracks, modules, items and concepts
 * are upserted by their deterministic ids, so re-running picks up
 * content edits without touching user progress (attempts, cards, streaks).
 *
 *   npm run db:seed     — upsert content
 *   npm run db:reset    — delete the database and seed from scratch
 */
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { sql } from "drizzle-orm";
import path from "path";
import * as schema from "./schema";
import { TRACKS, resolveConcepts, contentStats } from "@/content";
import { LEVEL_META, type Level } from "@/types";

const DEFAULT_USER_ID = "default-user";

const dbPath = path.join(process.cwd(), "reps.db");
const sqlite = new Database(dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");
const db = drizzle(sqlite, { schema });

function now() {
  return new Date().toISOString();
}

// ─── Schema (idempotent) ───
function createTables() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tracks (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      tagline TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      color TEXT NOT NULL DEFAULT '#6366f1',
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS modules (
      id TEXT PRIMARY KEY,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      slug TEXT NOT NULL,
      title TEXT NOT NULL,
      level INTEGER NOT NULL DEFAULT 1,
      summary TEXT NOT NULL DEFAULT '',
      brief TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS modules_track_idx ON modules(track_id, level, sort_order);

    CREATE TABLE IF NOT EXISTS concepts (
      id TEXT PRIMARY KEY,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      explanation TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS items (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      module_id TEXT NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
      level INTEGER NOT NULL DEFAULT 1,
      prompt TEXT NOT NULL,
      code TEXT,
      lang TEXT,
      payload TEXT NOT NULL DEFAULT '{}',
      explanation TEXT NOT NULL DEFAULT '',
      interview_tip TEXT,
      est_seconds INTEGER NOT NULL DEFAULT 45,
      difficulty INTEGER NOT NULL DEFAULT 1,
      author_id TEXT,
      is_published INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS items_module_idx ON items(module_id);
    CREATE INDEX IF NOT EXISTS items_track_level_idx ON items(track_id, level);

    CREATE TABLE IF NOT EXISTS item_concepts (
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      concept_id TEXT NOT NULL REFERENCES concepts(id) ON DELETE CASCADE,
      PRIMARY KEY (item_id, concept_id)
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      daily_goal INTEGER NOT NULL DEFAULT 20,
      streak_count INTEGER NOT NULL DEFAULT 0,
      longest_streak INTEGER NOT NULL DEFAULT 0,
      last_active_date TEXT,
      target_role TEXT NOT NULL DEFAULT '',
      settings TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS attempts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      response TEXT NOT NULL DEFAULT '{}',
      correct INTEGER NOT NULL DEFAULT 0,
      score REAL NOT NULL DEFAULT 0,
      time_spent INTEGER NOT NULL DEFAULT 0,
      mode TEXT NOT NULL DEFAULT 'mixed',
      rating INTEGER NOT NULL DEFAULT 3,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS attempts_user_idx ON attempts(user_id, created_at);
    CREATE INDEX IF NOT EXISTS attempts_item_idx ON attempts(user_id, item_id);

    CREATE TABLE IF NOT EXISTS user_cards (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      stability REAL NOT NULL DEFAULT 0,
      difficulty REAL NOT NULL DEFAULT 0,
      due TEXT NOT NULL,
      reps INTEGER NOT NULL DEFAULT 0,
      lapses INTEGER NOT NULL DEFAULT 0,
      state INTEGER NOT NULL DEFAULT 0,
      last_review TEXT,
      correct_count INTEGER NOT NULL DEFAULT 0,
      total_count INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS cards_user_due_idx ON user_cards(user_id, due);
    CREATE INDEX IF NOT EXISTS cards_user_item_idx ON user_cards(user_id, item_id);

    CREATE TABLE IF NOT EXISTS user_track_progress (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      track_id TEXT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
      current_level INTEGER NOT NULL DEFAULT 1,
      level_unlocked_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1
    );
    CREATE INDEX IF NOT EXISTS track_progress_user_idx ON user_track_progress(user_id, track_id);

    CREATE TABLE IF NOT EXISTS bookmarks (
      user_id TEXT NOT NULL REFERENCES users(id),
      item_id TEXT NOT NULL REFERENCES items(id) ON DELETE CASCADE,
      note TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL,
      PRIMARY KEY (user_id, item_id)
    );

    CREATE TABLE IF NOT EXISTS interview_runs (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      score TEXT NOT NULL DEFAULT '{}',
      total INTEGER NOT NULL DEFAULT 0,
      correct INTEGER NOT NULL DEFAULT 0,
      seconds INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );
  `);
}

function seed() {
  const timestamp = now();
  const stats = contentStats();

  createTables();

  // ─── Default user ───
  db.insert(schema.users)
    .values({
      id: DEFAULT_USER_ID,
      name: "You",
      email: "you@local",
      dailyGoal: 20,
      streakCount: 0,
      longestStreak: 0,
      lastActiveDate: null,
      targetRole: "Mid-level full-stack developer (React + .NET)",
      settings: "{}",
      createdAt: timestamp,
    })
    .onConflictDoNothing()
    .run();

  // ─── Concepts ───
  const concepts = resolveConcepts();
  for (const c of concepts) {
    db.insert(schema.concepts)
      .values({
        id: `concept-${c.slug}`,
        slug: c.slug,
        name: c.name,
        description: c.description,
        explanation: c.explanation,
      })
      .onConflictDoUpdate({
        target: schema.concepts.id,
        set: { name: c.name, description: c.description, explanation: c.explanation },
      })
      .run();
  }

  // ─── Tracks / modules / items ───
  const seenItemIds = new Set<string>();

  TRACKS.forEach((track, trackIndex) => {
    const trackId = `track-${track.slug}`;

    db.insert(schema.tracks)
      .values({
        id: trackId,
        slug: track.slug,
        name: track.name,
        tagline: track.tagline,
        description: track.description,
        icon: track.icon,
        color: track.color,
        sortOrder: trackIndex,
      })
      .onConflictDoUpdate({
        target: schema.tracks.id,
        set: {
          name: track.name,
          tagline: track.tagline,
          description: track.description,
          icon: track.icon,
          color: track.color,
          sortOrder: trackIndex,
        },
      })
      .run();

    // Modules sort by level first, then authored order.
    const ordered = [...track.modules].sort((a, b) =>
      a.level !== b.level
        ? a.level - b.level
        : track.modules.indexOf(a) - track.modules.indexOf(b)
    );

    ordered.forEach((m, modIndex) => {
      const moduleId = `mod-${m.slug}`;

      db.insert(schema.modules)
        .values({
          id: moduleId,
          trackId,
          slug: m.slug,
          title: m.title,
          level: m.level,
          summary: m.summary,
          brief: m.brief,
          sortOrder: modIndex,
        })
        .onConflictDoUpdate({
          target: schema.modules.id,
          set: {
            trackId,
            title: m.title,
            level: m.level,
            summary: m.summary,
            brief: m.brief,
            sortOrder: modIndex,
          },
        })
        .run();

      for (const item of m.items) {
        const itemId = `item-${item.id}`;
        if (seenItemIds.has(itemId)) {
          throw new Error(`Duplicate item id across tracks: ${item.id}`);
        }
        seenItemIds.add(itemId);

        db.insert(schema.items)
          .values({
            id: itemId,
            kind: item.kind,
            trackId,
            moduleId,
            level: m.level,
            prompt: item.prompt,
            code: item.code ?? null,
            lang: item.lang ?? null,
            payload: JSON.stringify(item.payload),
            explanation: item.explanation,
            interviewTip: item.interviewTip ?? null,
            estSeconds: item.estSeconds,
            difficulty: item.difficulty,
            authorId: null,
            isPublished: true,
            createdAt: timestamp,
            updatedAt: timestamp,
          })
          .onConflictDoUpdate({
            target: schema.items.id,
            set: {
              kind: item.kind,
              trackId,
              moduleId,
              level: m.level,
              prompt: item.prompt,
              code: item.code ?? null,
              lang: item.lang ?? null,
              payload: JSON.stringify(item.payload),
              explanation: item.explanation,
              interviewTip: item.interviewTip ?? null,
              estSeconds: item.estSeconds,
              difficulty: item.difficulty,
              updatedAt: timestamp,
            },
          })
          .run();

        // Re-link concepts so removals in content take effect.
        db.run(sql`DELETE FROM item_concepts WHERE item_id = ${itemId}`);
        for (const slug of item.conceptIds) {
          db.insert(schema.itemConcepts)
            .values({ itemId, conceptId: `concept-${slug}` })
            .onConflictDoNothing()
            .run();
        }
      }
    });

    // Start every user at level 1 on every track.
    db.insert(schema.userTrackProgress)
      .values({
        id: `utp-${DEFAULT_USER_ID}-${track.slug}`,
        userId: DEFAULT_USER_ID,
        trackId,
        currentLevel: 1,
        levelUnlockedAt: timestamp,
        isActive: true,
      })
      .onConflictDoNothing()
      .run();
  });

  // ─── Prune content removed from the source files ───
  const validItemIds = [...seenItemIds];
  const placeholders = validItemIds.map(() => "?").join(",");
  const removed = sqlite
    .prepare(
      `DELETE FROM items WHERE author_id IS NULL AND id NOT IN (${placeholders})`
    )
    .run(...validItemIds);

  // ─── Report ───
  const kinds = Object.entries(stats.byKind)
    .sort((a, b) => b[1] - a[1])
    .map(([k, n]) => `${k} ${n}`)
    .join(", ");
  const levels = ([1, 2, 3, 4] as Level[])
    .map((l) => `${LEVEL_META[l].short} ${stats.byLevel[l] ?? 0}`)
    .join("  ");

  console.log("");
  console.log("  Reps — curriculum seeded");
  console.log("  ────────────────────────────────────────────");
  console.log(`  tracks    ${stats.tracks}`);
  console.log(`  modules   ${stats.modules}`);
  console.log(`  items     ${stats.items}`);
  console.log(`  concepts  ${concepts.length}`);
  console.log(`  levels    ${levels}`);
  console.log(`  kinds     ${kinds}`);
  if (removed.changes > 0) {
    console.log(`  pruned    ${removed.changes} item(s) no longer in content`);
  }
  console.log("");
}

try {
  seed();
} catch (err) {
  console.error("\n  Seed failed:\n", err);
  process.exit(1);
} finally {
  sqlite.close();
}
