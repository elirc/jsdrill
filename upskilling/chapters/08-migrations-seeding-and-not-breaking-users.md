# 08: Migrations, seeding and not breaking users

> Files: `src/lib/db/seed.ts` (`createTables`, `migrate`, `seed`), `src/lib/db/schema.ts`, `src/lib/db/index.ts`, `package.json` (`db:seed`, `db:reset`), `drizzle.config.ts`

## Two kinds of data in one file

`reps.db` holds two very different kinds of data:

- **Content**: tracks, modules, items, concepts, item-concept links. Its source of truth is `src/content/**`. The database copy is a cache and can be regenerated at any time.
- **User state**: `attempts`, `user_cards` (FSRS state), `user_track_progress`, `users` (streaks), `bookmarks`, `interview_runs`. Its source of truth *is* the database. It exists nowhere else. Lose it and the learner loses weeks of spaced-repetition history.

Every design decision in `seed.ts` follows from one rule: **refresh content freely, and never harm user state.** The header comment says so directly:

```ts
/**
 * Content is the source of truth: tracks, modules, items and concepts
 * are upserted by their deterministic ids, so re-running picks up
 * content edits without touching user progress (attempts, cards, streaks).
 */
```

## Deterministic ids

Ids are derived from authored slugs, not generated:

```ts
const trackId  = `track-${track.slug}`;
const moduleId = `mod-${m.slug}`;
const itemId   = `item-${item.id}`;
// concepts: `concept-${c.slug}`; progress rows: `utp-${DEFAULT_USER_ID}-${track.slug}`
```

If `seed()` generated a UUID per item on each run, every re-seed would create new items, and every `user_cards.item_id` would point at a row that no longer means the same thing. With deterministic ids, "the item `js-async-retry`" is the same row forever, so the learner's card for it survives any number of content edits.

The price: **an authored id is now a permanent public key.** Rename `js-async-retry` to `js-retry` and the seeder sees one removal and one new item. Until 2026-09-23 pruning then *deleted* the old one and the learner's history for it went with it (below). Today the old item is unpublished and its history is kept, but it stays attached to the old id: the renamed item starts with a fresh card. Treat content ids like database primary keys: never rename, only add.

## Upsert, not insert

Every content row is written with `onConflictDoUpdate`:

```ts
db.insert(schema.items).values({ id: itemId, …, createdAt: timestamp, updatedAt: timestamp })
  .onConflictDoUpdate({
    target: schema.items.id,
    set: { kind: item.kind, prompt: item.prompt, payload: JSON.stringify(item.payload), …,
           updatedAt: timestamp },   // note: createdAt is NOT in the update set
  })
  .run();
```

So `npm run db:seed` is **idempotent**. Run it once or fifty times and the content tables end up identical. Idempotence is what makes a script safe to run whenever you're unsure, in CI, or after a failed half-run.

User-state rows are handled differently: `onConflictDoNothing()`. The default user and the per-track `user_track_progress` rows are *created if missing, never overwritten*. A re-seed must never reset someone's level to 1.

Concept links are **replaced**, not merged:

```ts
// Re-link concepts so removals in content take effect.
db.run(sql`DELETE FROM item_concepts WHERE item_id = ${itemId}`);
```

An upsert can add a link but can't express "this link is gone". Delete-then-insert for a small child collection is the simple, correct way to sync it.

## Pruning, and what it cost

Without pruning, an item deleted from content would live on in the database, still scheduled and still shown to learners. The `author_id IS NULL` guard limits pruning to built-in curriculum (the schema comment: `authorId … // null = built-in curriculum`), leaving room for user-authored items later.

### The original: a hard delete (`6f06762` to `c027fca`)

```ts
const removed = sqlite
  .prepare(`DELETE FROM items WHERE author_id IS NULL AND id NOT IN (${placeholders})`)
  .run(...validItemIds);
```

Now follow the foreign keys. `src/lib/db/index.ts` and `seed.ts` both run `sqlite.pragma("foreign_keys = ON")`, and `attempts.item_id` and `user_cards.item_id` are declared `ON DELETE CASCADE`. **Pruning an item silently deleted every attempt and card for it.** For an item that is truly retired, that is arguably right. For an accidental rename, it is data loss that nobody sees. The first draft of this chapter asked for at least one of: a dry run, a soft delete, or a rename map.

### Today: a soft delete (2026-09-23)

The seeder now unpublishes instead of deleting. In `seed()` in `src/lib/db/seed.ts`:

```ts
// ─── Unpublish content removed from the source files ───
// Soft delete: see the header comment. json_each keeps this one bound
// parameter however large the curriculum grows.
const removed = sqlite
  .prepare(
    `UPDATE items SET is_published = 0, updated_at = ?
     WHERE author_id IS NULL AND is_published = 1
       AND id NOT IN (SELECT value FROM json_each(?))`
  )
  .run(timestamp, JSON.stringify([...seenItemIds]));
```

The file's header comment gives the reason: *"a hard delete — say, after renaming an item id — would silently erase the learner's history for it. Unpublished items drop out of sessions and every progress total; if the id comes back, so does the history."* The upsert sets `isPublished: true` again when an id returns to content. The report line now reads *"unpublished N item(s) no longer in content (history kept)"*.

Three details are worth copying:

- **Every reader has to respect the flag, or a soft delete is just a bug.** The gap the first draft pointed out, that the overdue-review query did not filter on `isPublished`, is closed: `buildSession()` loads published items once and drops cards whose item is not among them (*"Cards for unpublished (removed) content are kept for history but never scheduled again"*). `progress.ts` has the same rule in its header (*"every total here filters on `isPublished`"*), and `dueCount()`, `overdueCount()`, `/api/items` and the module page filter too.
- **One bound parameter instead of hundreds.** The old query built one `?` per item. `json_each(?)` takes the whole list as one JSON array, so the statement does not grow with the curriculum.
- **One transaction.** The header says *"The whole run is one transaction: a failure part-way leaves the database exactly as it was."*

What is still missing: a **dry run**, and a **rename map** (`renamedFrom: "js-retry"` on the new item, so the seeder moves the card and attempts across). Modules and tracks removed from content are kept rather than deleted, and hidden by the progress queries once they have no published items. Knowing the edges of your own cleanup code is part of owning it.

## The additive migration (c027fca)

`c027fca` added `keyIdeas` to modules. New databases get the column from `CREATE TABLE IF NOT EXISTS modules (… key_ideas TEXT NOT NULL DEFAULT '[]' …)`. But `CREATE TABLE IF NOT EXISTS` **does nothing if the table already exists**, so an existing learner's database would never get the column, and the first `SELECT` on it would crash the app. Telling them to run `npm run db:reset` would wipe their progress.

So `createTables()` calls `migrate()` first. In `c027fca` it looked like this:

```ts
/** Additive column migrations for databases created by earlier versions. */
function migrate() {
  const hasModules = sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='modules'").get();
  if (!hasModules) return;                                  // fresh DB: CREATE TABLE handles it
  const columns = sqlite.prepare("PRAGMA table_info(modules)").all() as { name: string }[];
  if (!columns.some((c) => c.name === "key_ideas")) {
    sqlite.exec("ALTER TABLE modules ADD COLUMN key_ideas TEXT NOT NULL DEFAULT '[]'");
  }
}
```

Properties worth copying:

- **Additive only.** Adding a nullable or defaulted column is backward compatible. Old code ignores it, and old rows get the default. `NOT NULL DEFAULT '[]'` is legal in `ADD COLUMN` because a default exists.
- **Idempotent.** It checks the current state (`PRAGMA table_info`) before acting, so running it twice is harmless.
- **Ordered correctly.** It runs before `CREATE TABLE IF NOT EXISTS`, and skips a fresh database entirely.
- **Followed by the upsert**, which fills in the real `key_ideas` for every module, so the default `'[]'` never reaches the learner.

### The generalised version (2026-09-23)

A hand-written check per column does not scale: the next person to add a column has to remember to add a migration too. The current `migrate()` removes that step. It builds the **current** schema (`SCHEMA_DDL`) in an in-memory SQLite database, compares each existing table's columns with it through `PRAGMA table_info`, and runs `ALTER TABLE … ADD COLUMN` for anything missing, carrying over `NOT NULL` and the default. If a missing column *can't* be added in place (a primary key, or `NOT NULL` with no default), it throws and says to run `npm run db:reset` rather than guessing.

It keeps every property above: additive only, idempotent, run before the DDL. And it makes the rule mechanical: **any new column must be addable in place, or the seeder refuses loudly.** That is a good example of turning a convention into a check.

## What a grown-up version needs

This is fine for one additive column. It won't scale, and a senior engineer should be able to say why:

1. **The schema is defined twice.** Drizzle's `schema.ts` and the raw DDL in `SCHEMA_DDL` (run by `createTables()`) must agree by hand. The generalised `migrate()` makes `SCHEMA_DDL` the source of truth for columns, which raises the stakes of the two drifting apart. `drizzle.config.ts` and `drizzle-kit` are installed but not used for migrations. Pick one source of truth: generate SQL migrations from `schema.ts` with `drizzle-kit generate`, or drop Drizzle's schema down to query typing only.
2. **No migration ledger.** There is no `schema_migrations` table recording what has run. Each migration has to detect its own state. That works for "add column if missing", but not for "backfill X", which you can't detect after the fact.
3. **Non-additive changes need expand/contract.** Renaming `key_ideas` to `ideas` in one step breaks every running reader. The safe sequence: **expand** (add `ideas` and backfill from `key_ideas`), **migrate readers and writers** to `ideas` (dual-write while both exist), then **contract** (drop `key_ideas`) in a later release. SQLite adds friction: `DROP COLUMN` needs 3.35+, and many changes need the create-copy-rename table dance. Exercise 5 asks you to do this.
4. **Backups before migrating user state.** `reps.db` is the only copy of the learner's history. A migration that touches user tables should copy the file first (`VACUUM INTO 'reps.backup.db'`).

## Try it yourself

1. Make a database from the parent of `c027fca` (`git stash; git checkout 6f06762; npm run db:reset`). Answer a few questions, go back to your branch, and run `npm run db:seed`. Confirm with `PRAGMA table_info(modules)` that `key_ideas` exists, and that `SELECT count(*) FROM attempts` is unchanged.
2. Run `npm run db:seed` twice and diff `SELECT * FROM items ORDER BY id` between runs. Only `updated_at` should change. Explain why `created_at` doesn't.
3. Prove the soft delete: answer `js-async-retry` once, rename its id in `javascript.ts`, re-seed, and query `attempts` for the old id (still there) and `items.is_published` for it (0). Rename it back, re-seed, and confirm the card is live again. Then run the same steps on `c027fca` to see the cascade, and write the dry-run flag described above.
4. Sketch the three-release expand/contract plan for renaming `user_cards.total_count` to `attempt_count`.

> **Junior vs senior**
>
> **Junior:** "I added a column to `CREATE TABLE`. If it breaks, run `db:reset`." Generates UUIDs on each seed. Deletes rows that aren't in the source anymore.
>
> **Senior:** "Content is a cache and user state is sacred. Deterministic ids, idempotent upserts, `DoNothing` for user rows, additive migrations that check state first. And I know my cleanup code's blast radius: a hard delete cascades into attempts, so removal is a soft delete that every reader respects."
