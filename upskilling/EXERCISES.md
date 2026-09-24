# Exercises

Thirteen exercises, ordered from junior to senior. Each one uses real code in this repository. Do each on its own branch (`git switch -c ex/NN-name`). An exercise is done when **every acceptance criterion holds and `npm run check` passes** (typecheck, lint, content check and unit tests).

Status as of 2026-09-23. Some of the work these exercises asked for has since been done in the repository itself (see `JOURNAL.md`, 2026-09-23). Those exercises say so at the top and are rewritten so that they still teach something: either compare your solution with the one that landed, or take the next step it did not take. Vitest is set up (`npm test`, tests in `src/lib/__tests__/`), so every exercise can add unit tests.

| # | Exercise | Level | Chapters | Status (2026-09-23) |
|---|---|---|---|---|
| 1 | Unit-test the grader | Junior | 04, 07 | Done in repo; compare |
| 2 | Correlate `kind` and `payload` in `Item` | Junior+ | 02 | Open |
| 3 | The test that would have caught bug 5b | Junior+ | 05, 07 | Open |
| 4 | A `level` session mode UI | Mid | 06, 10 | Open |
| 5 | Rename a column safely (expand/contract) | Mid | 08 | Open |
| 6 | Make the progression test self-contained | Mid | 05, 07 | Partly done |
| 7 | Remove the repeated full-table loads in `progress.ts` | Mid | 06, 08 | Mostly done; one part open |
| 8 | Add an adversarial content check | Mid+ | 03, 07 | Open |
| 9 | Make the server own the retry | Senior- | 04, 06 | Open |
| 10 | Add a new item kind end-to-end | Senior- | 02, 03, 04 | Open |
| 11 | Harden and measure the vm sandbox | Senior | 04 | Partly done |
| 12 | Make pruning safe | Senior | 08, 11 | Partly done |
| 13 | A deterministic end-to-end test | Mid+ | 05, 07 | Open |

---

## 1. Unit-test the grader (junior)

`grade()` in `src/lib/grader.ts` is pure, so it's the easiest high-value code to test.

> **Status (2026-09-23): done in the repository.** Vitest is installed and `src/lib/__tests__/grader.test.ts` exists. Do the exercise anyway, *without reading that file first*, in `src/lib/__tests__/grader.mine.test.ts`. Then compare: which cases did you think of that it doesn't have, and the other way round? Keep any case it lacks.

**Do.** Write tests with, for each of the eight kinds, one correct response and one wrong response. Add these specific cases:
- `multi`: all right picks plus one wrong pick → `correct: false` and a reduced score. One right plus one wrong → `score: 0`.
- `fill-blank`: `normalizeBlank` treats `'user'`, `"user"` and `` `user` `` as equal and ignores a trailing `;`.
- A response of the wrong kind (an `mcq` response to a `truefalse` item) grades wrong and does not throw.

**Acceptance criteria.**
- `npm test` runs and passes; `npm run check` still passes.
- At least 20 assertions; every kind appears in both a passing and a failing case.
- Temporarily making `gradeTrueFalse` return `correct: true` always makes at least one test fail. Try it and record the result in the PR description.

## 2. Correlate `kind` and `payload` in `Item` (junior+)

Chapter 02 shows that `Item.kind` and `Item.payload` are not linked, which is why `grade()` needs `as` casts.

**Do.** Redefine `Item` as a union of `ItemBase & { kind: K; payload: P }` for each kind. Remove the `as XPayload` casts from `grade()` so `switch (item.kind)` narrows the payload itself. Fix `toItem()` in `src/lib/sessionBuilder.ts`, which builds an `Item` from `JSON.parse`, by adding a single validated narrowing point.

**Acceptance criteria.**
- No `as McqPayload` / `as FillBlankPayload` / etc. remain in `src/lib/grader.ts`.
- A literal `{ kind: "code", payload: { choices: [] } }` typed as `Item` fails to compile. Add it as a `// @ts-expect-error` line in a type test.
- The PR description names every place that still casts, and says why each is safe.

## 3. The test that would have caught bug 5b (junior+)

**Do.** Export `findUnserialisable` from `scripts/check-content.ts`, or move it into `src/lib/`. Write tests:
- `findUnserialisable([() => 1, 3])` returns `"a function"`,
- nested: `[{ cb: () => 1 }]` returns non-null; `[new Map()]` → `"a Map"`; `[1, undefined]` → `"an undefined array element"`,
- plain data (`[[1, 2], { a: "x" }, null]`) returns `null`.

Then write a test that proves the *original* check was broken: show that `JSON.stringify(JSON.parse(JSON.stringify(x))) === JSON.stringify(x)` holds for `x = [() => 1]`.

**Acceptance criteria.**
- All tests pass. The "old check is blind" test is named so that a reader understands why it exists.
- Replacing `findUnserialisable`'s body with `return null` makes at least three tests fail.

## 4. A `level` session mode UI (mid)

`SessionMode` includes `"level"`, and `buildSession()` scopes by `spec.level` (and skips the level gate for it). `/api/session` accepts `?mode=level&level=N`. But no page links to it.

**Do.** On `/app/path` (`src/app/app/path/page.tsx`), add a "Drill all level N" action for each level, linking to `/app/drill?mode=level&level=N&size=12`. Show the unseen count per level. Write a delegation brief first (chapter 10) as if someone else were building it.

**Acceptance criteria.**
- The link produces a session whose items all have `level === N` (check with `curl '/api/session?mode=level&level=2'`).
- Locked levels are still reachable, but visibly marked as ahead of the learner's current level. This matches the product rule in `moduleProgress()`: *"locking people out of content they want is worse than letting them find it hard."*
- `npm run lint` is clean, with no new suppressions.

## 5. Rename a column safely: expand/contract (mid)

Rename `user_cards.total_count` to `attempt_count` without breaking an existing `reps.db` and without losing data.

**Do.** Plan and implement it as **three separately shippable steps**:
1. *Expand*: add `attempt_count` (defaulted) to `SCHEMA_DDL`; the generalised `migrate()` adds the column to existing databases for you. The backfill, `UPDATE user_cards SET attempt_count = total_count`, is still yours to write, and it must run only once (think about how you know it already ran). Writers (`POST /api/attempts`) write **both** columns.
2. *Migrate readers*: every reader (`progress.ts`, `sessionBuilder.ts` `weak` mode, `api/path/route.ts`) switches to `attempt_count`. `schema.ts` exposes the new column.
3. *Contract*: stop writing `total_count`, then drop it (check your SQLite version supports `DROP COLUMN`, or use the table-rebuild pattern).

**Acceptance criteria.**
- Each step is its own commit and passes `npm run check` and `npm run build` on its own.
- A database created *before* step 1 with real attempts goes through all three steps with `SUM(attempt_count)` equal to the old `SUM(total_count)`.
- `migrate()` stays idempotent: running `db:seed` twice after each step changes nothing.
- `SCHEMA_DDL` in `seed.ts` and `schema.ts` agree after step 3.

## 6. Make the progression test self-contained (mid)

Bug 5c was found by a script that was not committed at the time (chapter 07).

> **Status (2026-09-23): partly done.** The script is now committed as `scripts/e2e/progression.mjs` and runs with `npm run e2e`. The database path is configurable: `src/lib/db/index.ts` and `seed.ts` both read `REPS_DB_PATH`. What is not done: the script needs a server you start yourself, and it records its answers in whatever database that server uses, which is normally the learner's `reps.db`.

**Do.** Write `scripts/e2e-progression.ts`, runnable as `npm run test:progression`, that needs nothing running. It sets `REPS_DB_PATH` to a temporary file *before* importing anything from `src/lib/db`, seeds it, then answers every level-1 item of the `javascript` track correctly by calling `grade()` and the same write path as `POST /api/attempts` (or by importing the route's `POST` and calling it with a `Request`). It asserts that level 2 unlocks, then deletes the temporary file.

**Acceptance criteria.**
- Passes on the current code.
- Fails if `maybeUnlockNextLevel` is changed back to a stability gate (`card.stability >= 7`). Try it and say so in the PR.
- Fails if `UNLOCK_COVERAGE` is set above 1.
- Leaves `reps.db` byte-for-byte unchanged.
- Runs as part of `npm run check`, or explain in the PR why it should not.

## 7. Remove the repeated full-table loads in `progress.ts` (mid)

At `c027fca`, `dashboard()` in `src/lib/progress.ts` loaded the user's `user_cards` several times (directly, then through `trackProgress()` and `conceptStrengths()`), loaded the whole `items` table twice, once just to count it, and `answeredToday()` loaded every attempt ever made to count today's. This is the N+1 pattern's cousin: the same data fetched repeatedly, and filtering done in JavaScript that SQL should do.

> **Status (2026-09-23): mostly done.** `loadProgressContext()` now loads cards and published items once per request, and `trackProgress()` and `conceptStrengths()` take the context as a parameter. `answeredToday()` and `overdueCount()` are single `count(*)` queries over a local-day range. One part is open: `dashboard()` still ends with `recomputeStreak(userId, …)`, which **writes** to `users` during a read.

**Do.**
- Measure what landed: wrap `sqlite.prepare` (or turn on Drizzle's logger) and count the queries for `/api/dashboard` on the current code and on `c027fca`. Report both numbers.
- Make `/api/dashboard` read-only. `currentStreak()` already computes the streak without writing. Decide whether `longestStreak` and `lastActiveDate` should be written only on the attempt path (`POST /api/attempts` already calls `recomputeStreak()`), and argue it in the PR.

**Acceptance criteria.**
- The `/api/dashboard` JSON is identical before and after your change for the same database (diff the output).
- Loading the dashboard twice in a row changes nothing in `reps.db` (compare `SELECT * FROM users`).
- The PR reports the before and after query counts.

## 8. Add an adversarial content check (mid+)

`check-content.ts` checks that answer keys grade correctly. Add checks that catch *weak* questions.

**Do.** Add at least three of these:
- **Longest-answer tell**: in an `mcq`, the correct choice is more than 1.8× longer than every distractor (a test-taking tell). Warning.
- **Duplicate choices**: two choices with identical normalised text. Problem.
- **Answer leak**: a fill-blank's accepted answer appears verbatim in the prompt, or in the template outside the blank. Warning.
- **`code` tests too weak**: a solution that returns `expected` of the first test for all inputs would pass. Build the "constant function" and run it. Problem.
- **Unfenced code**: a prompt with a multi-line snippet not inside a fence. Warning.

**Acceptance criteria.**
- Each new check has a deliberately bad fixture that triggers it (in a test, not in real content).
- Running on the current curriculum: any real hits are either fixed or listed in the PR with a reason.
- Problems and warnings are split sensibly. Justify each choice in one line.

## 9. Make the server own the retry (senior-)

Chapter 04: the server trusts the client's `attempt` field. A client that sends `attempt: 1` for a second-try success gets full credit.

**Do.** Design and implement a server-authoritative retry. For example, the client posts every submission, including the first miss. The server records a pending first miss (a table, or a column on `user_cards` with a timestamp), derives `attempt` itself, and finalises the attempt on the second submission or on "show me". Keep the UX identical.

**Acceptance criteria.**
- `POST /api/attempts` ignores any client-supplied `attempt`.
- A scripted client that answers wrong, then right, gets `score ≤ 0.5` and `rating: 2` whatever it claims.
- A first miss followed by abandoning the session is still recorded as a miss (decide when, and document it).
- Interview mode still never retries.
- The PR explains the state machine with a small diagram or table.

## 10. Add a new item kind end-to-end (senior-)

Add `"match"`: pair left-hand terms with right-hand definitions (for example, HTTP status codes and their meanings).

**Do.** Everything the compiler and the linter demand:
- `ITEM_KINDS`, `ITEM_KIND_META`, `MatchPayload`, a `Response` variant (`src/types/index.ts`),
- a `match()` DSL constructor with invariants: at least 3 pairs, unique left and right entries (`src/content/builder.ts`),
- `gradeMatch` with partial credit, plus `emptyResponse` and `isAnswered` (`src/lib/grader.ts`),
- the answer component, with the right-hand column shuffled in an effect (see `OrderSteps`, chapter 09),
- content checks: the authored pairing grades correct, and a rotated pairing does not,
- at least 3 real `match` items in a sensible module.

**Acceptance criteria.**
- Adding `"match"` to `ITEM_KINDS` *first* produces compile errors. List them in the PR as the to-do list you worked from.
- No `default:` branch was added to any exhaustive switch.
- `ratingFor` needs no change. Explain why partial credit already flows through.
- `npm run check`, `npm run db:seed` on an existing DB, and `npm run build` all pass.

## 11. Harden and measure the vm sandbox (senior)

> **Status (2026-09-23): partly done.** The server no longer runs learner code with `new Function` in the global scope. `runTestsServer()` in `src/lib/executor.server.ts` runs each call in a fresh `node:vm` context with a hard `timeout`, and `executor.test.ts` proves that `while (true) {}` becomes a timeout verdict. The browser still checks the time budget only after a call returns. And, as chapter 04 shows, the vm runner is not isolation: host objects passed into the context leak the host `Function` (`URL.constructor("return process.env.PATH")()` works), and a callback scheduled with the host `setTimeout` runs after the timeout has stopped applying.

**Do.**
- **Measure first.** Add tests to `src/lib/__tests__/executor.test.ts` that *demonstrate* each known hole before you fix it: reading `process.env` through a passed-in global, and a `setTimeout` callback that busy-waits after the test has passed. Each should fail against the fix you are about to write, so write them to assert the safe behaviour and watch them go red first.
- **Server**: move grading into a `worker_threads` worker with `resourceLimits` (a memory cap) that the parent terminates on timeout. Keep `vmCompile()` inside the worker if you like, but stop passing host objects into the context: build what the code needs inside the context, or remove it (does a graded function need `setTimeout` at all?). Keep the `GradeOptions.runTests` seam; note that a worker is asynchronous and `grade()` is not, and decide how to handle that. One option is to run the code first and hand the result in.
- **Browser**: run `runTests` in a Web Worker created from a Blob URL, with a hard timeout through `worker.terminate()`, reporting through the existing `classifyError` path.
- Measure the cost. Report the median grading time of a passing `code` item before and after, on the server and in the browser. A worker per call is slow; a pool is more work. Decide with numbers.

**Acceptance criteria.**
- `function f(){ while(true){} }` returns a timeout verdict in under 3 seconds, in the browser and on the server, and the tab or server stays responsive.
- A solution that schedules `setTimeout(() => { while (true) {} }, 0)` cannot block the server's event loop (the test measures it).
- Learner code cannot read `process.env` on the server by any route you can think of. The test lists the routes it tried.
- A solution that allocates without bound is stopped by the memory limit, not by the machine.
- Structured cloning of inputs still protects later tests from mutation, and `content:check` still passes.
- The header comments of `executor.ts` and `executor.server.ts` describe the new guarantees accurately, including what is *still* not guaranteed.

## 12. Make pruning safe (senior)

Chapter 08: at `c027fca`, pruning an item cascaded into `attempts` and `user_cards`, so an accidental id rename silently deleted history.

> **Status (2026-09-23): partly done.** Pruning is now a soft delete (`UPDATE items SET is_published = 0` in `seed()`), `buildSession()` drops cards for unpublished items including overdue reviews, and the whole seed runs in one transaction (`sqlite.transaction(seed)()`). History survives a rename, but it stays on the old id, so the renamed item starts from scratch.

**Do.**
- Support `renamedFrom?: string` on authored items. When present, the seeder moves `user_cards`, `attempts` and `bookmarks` from the old id to the new one inside the existing transaction.
- Add a `--dry-run` flag to `db:seed` that prints what would be unpublished and renamed, and changes nothing.
- Back up `reps.db` (`VACUUM INTO`) before any step that moves user rows.
- Write the test that proves the soft delete is respected everywhere: unpublish one item and show it appears in no session mode.

**Acceptance criteria.**
- Renaming an item with `renamedFrom` keeps its card (same `reps`, `stability`, `due`) and its attempts.
- `--dry-run` leaves the database byte-for-byte unchanged and prints what *would* change.
- An unpublished item never appears in any session mode (test all six), and does not count in `/api/dashboard` totals.
- A crash halfway through a rename leaves the database as it was before (simulate it with a thrown error).

## 13. A deterministic end-to-end test (mid+)

Bug 5h (chapter 05): an assertion in `scripts/e2e/features.mjs` sampled a mixed session and *hoped* it contained a module the learner had never touched. On a well-drilled database it didn't, and the test failed with no code change. The fix finds an untouched module through `/api/cheatsheet`, but if none is left it still has to skip. The underlying problem is that the e2e scripts run against a database whose state they do not control.

**Do.**
- Make the e2e scripts create their own world. Add a runner (for example `scripts/e2e/run.mjs`, wired to `npm run e2e`) that creates a temporary database with `REPS_DB_PATH`, seeds it, builds and starts the server on a free port against that database, runs the three scripts with `REPS_URL` pointed at it, stops the server, and deletes the file, even when a check fails.
- Remove every "skip" path. Each check should *construct* its precondition: for "a first-time module shows a primer", pick a module and assert it has no attempts before you start, rather than searching for one.
- Find one more assertion in `scripts/e2e/` whose result depends on data from earlier runs or on randomness, and make it deterministic.

**Acceptance criteria.**
- Running `npm run e2e` five times in a row gives the same result every time.
- `reps.db` is byte-for-byte unchanged after a run.
- No check in `scripts/e2e/` prints "skipped".
- The PR names each precondition the tests used to assume, and how each is now created.
