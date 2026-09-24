# Glossary

Terms as they are used in this repository. Each entry names where to see the term in the code.

| Term | Meaning here |
|---|---|
| **Track** | A technology area (JavaScript, React, ASP.NET Core & EF Core, …). `Track` in `src/types/index.ts`; one file per track in `src/content/tracks/`. |
| **Module** | A teachable unit inside a track at one level, with a brief, key ideas and items. `mod()` in `src/content/builder.ts`. |
| **Item** | A single drill question of one of eight kinds. `Item` in `src/types/index.ts`; the `items` table. |
| **Item kind** | The discriminator on an item: `mcq`, `multi`, `truefalse`, `predict-output`, `fill-blank`, `order`, `code`, `short`. `ITEM_KINDS`. |
| **Payload** | The kind-specific part of an item (choices, blanks, tests…), stored as JSON in `items.payload`. |
| **Concept** | A cross-cutting idea (closures, N+1, DI lifetimes) linked many-to-many to items via `item_concepts`. Scored by `conceptStrengths()`. |
| **Level** | One of four progression tiers per track (Fundamentals, Working Dev, CRUD Builder, Production-Ready). `LEVEL_META`. |
| **Key ideas** | 4 to 6 terse bullets per module, shown as a primer and on the cheat sheet. `Module.keyIdeas`; `modules.key_ideas`. |
| **Primer** | A module's key ideas shown above the first question when the learner has never touched that module. `moduleKeyIdeas` in `enrich()`. |
| **DrillItem** | A view model: an `Item` plus the display fields the drill UI needs. Built by `enrich()` in `sessionBuilder.ts`. |
| **Discriminated union** | A union type whose variants share a literal field (`kind`) that TypeScript uses to narrow. `Response` is one. |
| **Exhaustiveness check** | The compiler proving a `switch` handles every variant. Here it works because `grade()` returns `Grade` and has no `default`. |
| **Authoring DSL** | The helper functions (`mcq`, `blank`, `code`, …) used to write content as typed data. `src/content/builder.ts`. |
| **Invariant** | A rule that must always hold, such as "exactly one correct MCQ choice". Checked by `assert()` in the DSL and by `check-content.ts`. |
| **Content linter** | `scripts/check-content.ts`: validates content by running the real grader against each item's own answer key. |
| **Harness** | An optional function expression on a `code` item that drives the learner's function and returns a comparable value. `CodePayload.harness`. |
| **Executor** | `runTests()` in `src/lib/executor.ts`: compiles learner code and runs the tests. The compiler is pluggable (`RunOptions.compile`): `new Function` in the browser, a `node:vm` context on the server (`runTestsServer()` in `src/lib/executor.server.ts`). A correctness harness, not a sandbox. |
| **Sandbox** | An execution environment that isolates untrusted code and can kill it. The executor is *not* one: the vm runner can stop a loop but does not isolate (chapter 04; exercise 11). |
| **Pure function** | Its output depends only on its inputs, with no side effects. `grade()` is pure, so it can run on the client, on the server and in the linter. |
| **Server authority** | The server decides outcomes that matter. `POST /api/attempts` re-grades and ignores any verdict the client sends. |
| **FSRS** | Free Spaced Repetition Scheduler (`ts-fsrs`). It models memory per card and picks the next review date. `src/lib/fsrs.ts`. |
| **Card** | Per-user FSRS state for one item (stability, difficulty, due, reps, lapses). The `user_cards` table. |
| **Stability** | FSRS's estimate, in days, of how long a memory lasts. Drives mastery and scheduling; *not* the unlock gate (bug 5c). |
| **Rating** | The FSRS review outcome: Again 1, Hard 2, Good 3, Easy 4. Derived by `ratingFor()`. |
| **Mastery** | The display metric `0.7 · retention + 0.3 · accuracy`, averaged over every item in scope. `masteryScore()`. |
| **Unlock gate** | Moving to a track's next level needs 80% of the level answered correctly and 70% accuracy. `maybeUnlockNextLevel()`. |
| **Interleaving** | Mixing tracks within a session so consecutive items differ. `interleaveByTrack()`. A desirable difficulty. |
| **Desirable difficulty** | A practice condition that feels harder but improves long-term retention (interleaving, spacing, retrieval). |
| **Retry / second attempt** | One more try after a miss for MCQ, predict-output and fill-blank; half credit, rated Hard. `RETRYABLE_KINDS`. |
| **Self-grading** | The learner rates their own explain-it answer from 1 to 4. `gradeSelf()`; passed through by `ratingFor()`. |
| **Upsert** | Insert, or update on conflict. The seeder upserts content by id (`onConflictDoUpdate`). |
| **Idempotent** | Running it again changes nothing further. `db:seed` and `migrate()` are both designed to be. |
| **Deterministic id** | An id derived from authored data (`item-${item.id}`) rather than generated, so rows keep their identity across re-seeds. |
| **Pruning** | Removing built-in items that are no longer in content. Since 2026-09-23 a soft delete; before that a hard delete that cascaded into attempts and cards (chapter 08). |
| **Additive migration** | A schema change that only adds things (a defaulted column), so old code and old data keep working. `migrate()`. |
| **Expand/contract** | Doing a breaking schema change in phases: add the new thing, move readers and writers across, then remove the old one. |
| **Render purity** | React's rule that rendering must not read clocks or randomness, or cause side effects. Enforced by `react-hooks/purity`. |
| **External store** | State owned outside React (the `data-theme` attribute) and read with `useSyncExternalStore`. `themeStore` in `src/app/app/layout.tsx`. |
| **Prop contract** | An agreed, documented component interface (`revealed: boolean` on `AnswerProps`) that lets people or agents build parts in parallel. |
| **Adversarial review** | Review aimed at breaking the change, done by someone other than its author. |
| **node:vm** | Node's built-in module for running code in a separate V8 context with its own globals. `runInContext(…, { timeout })` can stop a synchronous infinite loop. It is **not** a security boundary: objects passed in from the host lead back to the host (chapter 04). `vmCompile()` in `src/lib/executor.server.ts`. |
| **Test double** | Anything that stands in for a real dependency in a test: a fake, stub or mock. The compiler that throws `TimeoutError` in `executor.test.ts`, passed through `RunOptions.compile`, is one. |
| **Seam** | A place where behaviour can be swapped without editing the code around it. `GradeOptions.runTests` and `RunOptions.compile` are seams; they are what make the executor testable. |
| **Trust boundary** | The line where data from someone you don't control enters. The comment above `POST` in `src/app/api/attempts/route.ts` lists what crosses it unchecked (`attempt`, `timeSpent`). |
| **Soft delete** | Marking a row as removed (`items.is_published = 0`) instead of deleting it, so rows that reference it survive. Every reader must then filter on the flag. The seeder's `UPDATE items SET is_published = 0` in `src/lib/db/seed.ts`. |
| **Barrel file** | A module that only re-exports other modules, so callers import from one path. `src/components/ui/index.tsx` re-exports `Button`, `Card`, `Badge`, `ProgressBar`, `Markdown`, `ErrorState` and the rest from their own files. |
| **Local date key** | A `YYYY-MM-DD` string for the learner's *local* calendar day, not the UTC day. Streaks, today's count, the activity map and the forecast bucket by it. `localDateKey()` in `src/lib/utils.ts`. |
| **Flaky test** | A test that passes or fails without any change to the code, because it depends on something it does not control: time, randomness, ordering, or data left by earlier runs. Bug 5h is one. The cure is to construct preconditions, not hope for them. |
| **Rate limit** | A cap a service puts on how many requests a client may make in a period. On 2026-09-23 an API rate limit stopped three agents mid-task (chapter 10). Design delegated work so a worker that stops at any point leaves the tree consistent. |
