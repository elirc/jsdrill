# Engineering journal: Reps

A dated log of what was built, what was learned, and what was left open. Entries are append-only. To correct an earlier entry, add a dated note under it; do not rewrite it.

Earlier history, for context: the project started on 2026-02-19 as "JS Drill" (`9ff16d3`). That version had 20 DSA-style JavaScript problems as JSON files in `seed-data/problems/` (find-max, two-sum, merge-sort and similar), FSRS scheduling, SQLite through Drizzle, a CodeMirror editor, and an admin UI for authoring problems. `309c15d` (2026-02-23) added explanatory docs under `docs/code-explanations/`.

---

## 2026-09-09: The rebuild (`6f06762`)

*Commit timestamp is 2026-09-10 05:46 -0700. The work ran through the night of the 9th.*

### What was done

- **The product changed.** Reps stopped being "LeetCode-lite for JavaScript" and became interview preparation for a junior on the way to mid-level CRUD developer, across JavaScript, TypeScript, React, Node/Express, C#, ASP.NET Core & EF Core, SQL, Web/HTTP, Testing and Git/Build/Deploy.
- **The domain model was rewritten, not adapted.** Problems became items with eight kinds (`ITEM_KINDS` in `src/types/index.ts`). Categories became tracks and patterns became concepts. A new modules layer carries a teaching brief. Each track has four levels.
- **Content moved from JSON files into typed TypeScript** under `src/content/tracks/*.ts`, written through the DSL in `src/content/builder.ts`. The launch curriculum had 229 items, 50 modules and 59 concepts.
- **Dead code was deleted:** `seed-data/`, `docs/code-explanations/`, `training-docs/`, `IMPLEMENTATION_PLAN.md` and the whole `src/app/admin/` tree. The commit changed 134 files.
- **New pure grader** (`src/lib/grader.ts`), used by the drill page and again by `POST /api/attempts`.
- **New `scripts/check-content.ts`** content linter, wired into `npm run check`.
- New screens: Today, drill runner, roadmap, track pages, mock interview, dashboard and concept library, in dark and light themes.

### What was learned

Each of these was caught by verification before commit. Details are in chapter 05.

- Higher-order exercises such as `makeCounter` cannot be tested by calling the learner's function and comparing the result, so `CodePayload.harness` was added.
- `js-async-retry` passed a function as a test input, and JSON storage turned it into `null`. The first check written to catch this compared two serialised copies, which lose the function identically, so it could never fail. The replacement, `findUnserialisable()`, walks the original values.
- Level unlocking was gated on FSRS `stability >= 7`. Stability only grows over real elapsed days, so the roadmap could never open in a single sitting. The end-to-end progression script found this. The gate is now coverage (80%) plus accuracy (70%).
- Two explanations used doubled or nested backticks, and `renderMarkdown` turned them into garbled prose. `checkProse()` now enforces the renderer's limits.
- A backtick inside a code comment ended a template literal and broke the build. Backticks inside the `brief:`, `code:`, `starter:`, `solution:` and `template:` literals were escaped by a script, not by hand.
- React 19's purity lint flagged `Date.now()` and `Math.random()` during render, plus a `setState` inside an effect. The fixes were refs seeded in effects, a shuffle done in an effect and kept in a ref, and `useSyncExternalStore` for the theme.
- Windows friction: heredocs ate backslashes; git had no identity configured (it was set locally to match the existing author); CRLF warnings appeared on every commit; port 3000 was held by an unrelated project, which was checked before anything was stopped.

### Verified

Typecheck; lint, including the React 19 purity rules; 229 items validated by `content:check`; a 42-assertion end-to-end suite against a live production server; an 8-assertion level-progression test; a clean production build of 18 routes.

### Left open

- The end-to-end and progression scripts were not committed, so they cannot be rerun from the repository.
- No unit test framework.
- Visual layout was not verified in a browser.
- The executor's time budget is checked after the call returns, so a true infinite loop still hangs. On the server it would hang the Node process (see chapter 04).

---

## 2026-09-11: Make drilling teach (`c027fca`)

### What was done

- **Key ideas.** Every module now has 4 to 6 terse bullets, 251 across the 50 modules. `mod()` in `builder.ts` requires at least 3, and `check-content.ts` enforces 3 to 7 and markup-checks each one with `checkProse()`.
- **Topic primer.** When a session reaches a module the learner has never answered anything from, its key ideas appear above the first question. `enrich()` in `src/lib/sessionBuilder.ts` sets `moduleKeyIdeas` only for modules missing from `touchedModules`. The drill page keeps a `primedModules` set so the primer shows once per session.
- **Module pages** at `/app/path/[track]/[module]` (`moduleDetail()` in `src/app/api/path/route.ts`) with the brief at reading width, key ideas, item status and prev/next navigation.
- **Cheat sheet** at `/app/cheatsheet`, with every module's key ideas, a track filter, and a toggle for "only what's not yet solid".
- **One retry after a miss** for `mcq`, `predict-output` and `fill-blank` (`RETRYABLE_KINDS` in `src/components/drill/Answers.tsx`). A second-try success gets half credit and is scheduled Hard; the server enforces both in `src/app/api/attempts/route.ts`. "Just show me" records the first miss. Interview mode never retries.
- **Readability:** prompts at 18px, choices at 15px, prose at 16px/1.75. Feedback now leads with the first paragraph of the explanation.
- **Additive migration:** `migrate()` in `src/lib/db/seed.ts` adds `modules.key_ideas` to existing databases, so nobody has to run `db:reset` and lose their progress.

### What was learned

- The retry feature changed the meaning of `grade !== null`. Before, a grade meant "the answer is shown". Afterwards a grade could exist while the answer stayed hidden. The fix was an explicit `revealed: boolean` on `AnswerProps` and `DrillCard`, agreed before the components were split across parallel agents (chapter 10).
- A retry must record the first response if the learner gives up. Otherwise "Just show me" would record an empty second response. See the `firstResponse` ref in `src/app/app/drill/page.tsx`.

### Verified

Typecheck, lint, 229 items validated, 36 + 20 + 8 end-to-end assertions against a live build (grading, scheduling, retry credit, primers, module and cheat-sheet endpoints, level progression), and a clean production build of 20 routes.

### Left open

- The server trusts the client's `attempt` number. A modified client could report a second-try answer as a first try and get full credit (chapter 04).
- The module pages and the cheat sheet were not looked at in a browser.
- Still no committed tests.

---

## 2026-09-23: Content toward interview trivia, adversarial audits, first unit tests

*Status: complete for the day. The plan below was written in the morning and is kept as it was, with notes where it changed. Results and open items are at the end. The work is in the working tree and not yet committed.*

### What is being done

1. **Content expansion toward interview trivia for JavaScript and C#.** The existing tracks teach mechanics well. This pass adds the short, sharp questions that screeners actually ask: coercion edge cases, `this` binding, hoisting and the TDZ, `==` vs `===`, value vs reference in C#, `string` immutability, `IEnumerable` vs `IQueryable`, `async void`, boxing. Work has started in `src/content/tracks/csharp.ts`, which is uncommitted at the time of writing. `scripts/_audit.ts` (untracked) prints item counts by kind for each module, so gaps in the kind mix are visible before authoring. *(Later the same day: replaced by the committed `scripts/content-stats.ts`, run as `npm run content:stats`. The scratch script is gone.)*
2. **Backend adversarial audit.** Review `src/app/api/**`, `src/lib/grader.ts`, `src/lib/executor.ts`, `src/lib/progress.ts` and `src/lib/db/seed.ts` as an attacker and as a pessimist. Known starting points:
   - `POST /api/attempts` re-grades, so `code` responses run through `new Function` inside the Node server process.
   - The client-supplied `attempt` and `timeSpent` affect credit and rating.
   - The seeder prune cascades into `attempts` and `user_cards`.
   - `dashboard()` loads `user_cards` three times.
3. **Frontend adversarial audit.** Review `src/app/app/**` and `src/components/**` for stale state across item changes, keyboard handlers that fire during a retry, hydration mismatches, and places where a local grade and a server grade can disagree on screen.
4. **Unit tests introduced.** The first committed automated tests. Targets, in priority order: `grade()` for all eight kinds, both correct and wrong; `ratingFor()`; `findUnserialisable()` (it must return non-null for a function input; this is the test that would have caught bug 5b); `normalizeBlank()`; `maybeUnlockNextLevel()` against an in-memory database.
5. **This journal and the `upskilling/` course.** It is written against the committed baseline `c027fca`. *(End of day: revised to describe the working tree after this day's work; see the Baseline note in `README.md`.)*

**Working tree as observed while this entry was written (uncommitted):** `vitest` added to `devDependencies`; `src/lib/executor.server.ts` (a `node:vm` runner whose per-call `timeout` stops a server-side infinite loop; its header says plainly that `vm` is not a security boundary); `grade()` gained a `GradeOptions.runTests` injection point; the drill page is being split into `src/components/drill/useDrillSession.ts` and `SessionChrome.tsx`; new `src/components/ui/*` primitives; `src/lib/api.ts` and `src/lib/user.ts`; large additions to every track file. Whoever lands these should record them under Results. *(They are recorded below.)*

### What was learned

- Writing the course made several limitations visible that were only implicit before. They are recorded honestly in chapters 04 and 08 and not smoothed over.
- **Tests must construct their preconditions, not hope for them.** Committing the e2e scripts exposed a flaky assertion. The primer check sampled a mixed session and hoped it contained a module the learner had never touched. On a fresh database it almost always did; on a well-drilled one it often didn't, and the check failed with no code change. The fix picks an untouched module through `/api/cheatsheet` explicitly (bug 5h, chapter 05). It still has to skip when no untouched module is left, because the scripts share the learner's `reps.db` (exercise 13).
- **A linter checks consistency, not truth.** `content:check` passed all 384 items, and the three fact-check reviews still found 17 confirmed errors in explanations, key ideas and one prompt. Only a reader trying to break each question finds an unstated assumption or an over-absolute claim (chapter 10).
- **Plan for workers dying.** An API rate limit killed three of the six implementer agents mid-task. The tree still typechecked because each agent's edits were internally consistent, and the file scopes were disjoint, so the coordinator could finish the remaining pieces instead of unpicking them (chapter 10).
- **A "sandbox" claim needs an adversarial probe too.** The vm runner stops `while (true) {}`, and its unit tests prove it. Two probes run while the course was being revised showed what it does not do: `URL.constructor("return process.env.PATH")()` reads the server's environment through a host object passed into the context, and a `setTimeout` callback runs after the vm timeout has stopped applying (a 3-second busy loop in one blocked the event loop for about 3 seconds after its test had passed). The file's header already says `vm` is not a security boundary; these are the concrete reasons (chapter 04, exercise 11).

### Results

<!-- One bullet per result, with the command run and a summary of its output. -->

- **Content expansion.** 155 new interview-trivia items: JavaScript 53, C# 54, the other eight tracks 48. New modules `js-functions`, `js-dom`, `cs-runtime`, `cs-delegates` and `cs-design`. Totals are now 10 tracks, 55 modules, 384 items and 68 concepts (from 229 items, 50 modules and 59 concepts). `npx tsx scripts/content-stats.ts` prints `10 tracks · 55 modules · 384 items`, with `mcq 196, multi 69, truefalse 40, predict-output 28, short 25, fill-blank 15, order 7, code 4`. `npm run content:check` prints `Checked 384 items across 10 tracks`, one warning (`web: no module at L3; unlock skips straight past it`) and `No problems found.`
- **Content fact-check.** Three adversarial reviews by agents separate from the authors, reports in `reviews/`. 17 confirmed errors, all fixed: JavaScript 8 ([`REVIEW-JAVASCRIPT.md`](reviews/REVIEW-JAVASCRIPT.md)), C# 5 ([`REVIEW-CSHARP.md`](reviews/REVIEW-CSHARP.md)), other tracks 4 ([`REVIEW-OTHER-TRACKS.md`](reviews/REVIEW-OTHER-TRACKS.md)). The worst of each: `js-this-lost` had a distractor that was actually correct in sloppy mode (the prompt now pins ES-module semantics); a `cs-async` key idea overstated when `.Result` deadlocks; `ts-config-satisfies` used an example that showed no difference from a type annotation. The (B) debatable points were mostly reworded for the other tracks and left as notes for JavaScript and C#.
- **Backend refactor.** Fixed:
  - `src/lib/user.ts` holds the single `DEFAULT_USER_ID`.
  - `src/lib/api.ts` provides `ok`, `fail`, `serverError` and `parseJson` (size limit, JSON parse, guard). Every route in `src/app/api/` uses them.
  - `POST /api/attempts` validates the response shape per kind (`checkResponseShape()`), and code is graded by `runTestsServer()` in `src/lib/executor.server.ts`: a `node:vm` context with a hard timeout, plugged in through the new `GradeOptions.runTests`. The browser keeps `src/lib/executor.ts`. This closes the 2026-09-09 open item that an infinite loop would hang the server.
  - Streaks, today's count, the activity map and the review forecast bucket by the *local* day (`localDateKey()` in `src/lib/utils.ts`), not the UTC day.
  - `loadProgressContext()` in `src/lib/progress.ts` loads cards and published items once per request instead of `dashboard()` re-reading whole tables. `answeredToday()` and `overdueCount()` are `count(*)` queries.
  - The seeder's prune is a soft delete (`UPDATE items SET is_published = 0`), so history survives; `migrate()` now adds any missing column by diffing against `SCHEMA_DDL`; the whole seed is one transaction.

  Deferred, and documented in the code: `POST /api/attempts` has a *"Trust boundary (accepted risk: local-first)"* comment naming `attempt` and `timeSpent` as trusted client values.
- **Frontend refactor.** The drill and interview pages share `src/components/drill/useDrillSession.ts` (load, grade, retry state machine, record, advance, keyboard) and `SessionChrome.tsx`. `src/components/useApi.ts` gives every data-loading page an error state with a retry button. `src/components/useStoredState.ts` persists the session size. `src/components/ui/` is split into `Button`, `Card`, `Badge`, `Progress`, `Markdown` and `States`, with `index.tsx` as a barrel file. Bookmarks load from `/api/bookmarks`. Accessibility: `role="group"` on answer sets, screen-reader-only verdict text, an `aria-live` region for reordering, and a skip link.
- **Unit tests.** Vitest (`vitest.config.ts`), 78 tests in `src/lib/__tests__/`: `grader.test.ts` 24, `executor.test.ts` 22, `utils.test.ts` 24, `fsrs.test.ts` 8. `npm test` prints `Test Files 4 passed (4)`, `Tests 78 passed (78)`. `npm run check` now runs them. What they would have caught: the grader tests fail on a grader that marks everything correct; the vm tests are the regression tests for the server hang; the local-date tests would catch a return to UTC bucketing (only when run in a timezone far enough from UTC, since a 23:30 local time is the same day in UTC there); the `renderMarkdown` tests catch `a ** b` inside backticks being read as bold. Not yet covered: `findUnserialisable()` (exercise 3) and anything that needs the database.
- **End-to-end scripts committed.** `scripts/e2e/` (`e2e.mjs`, `features.mjs`, `progression.mjs`, `README.md`), run with `npm run e2e` against a running server. Until today they had never been committed (entries of 2026-09-09 and 2026-09-11). One flaky assertion was found and fixed (above).
- **Code review of the refactor.** A separate reviewer read the backend and frontend changes looking for bugs: [`reviews/AUDIT-CODE.md`](reviews/AUDIT-CODE.md). 6 confirmed, all fixed the same day. The worst (B1): test inputs were built in the host realm and passed into the vm, so `items instanceof Array` was true in the browser and false on the server — the learner saw "Correct", the server's verdict flipped it to "Not quite" and recorded a lapse. Fixed by rebuilding the inputs inside the vm (`importDeep` in `executor.server.ts`). Also: host `setTimeout`/`queueMicrotask` escaped the timeout (now stubbed inside the context); the time budget was per test case, not per submission (the remaining cases are now skipped after the first timeout); `eval` behaved differently between runners; the dashboard called today's bucket "now"; `content:check` accepted fill-blank placeholders the renderer can't draw. Tests went from 78 to 88.
- **How the work was run.** Two waves: six implementer agents in parallel on disjoint files, then per-area adversarial reviewers. A coordinator (a different model) planned the round, defined the file boundaries, forwarded findings between agents mid-flight, and adjudicated. Three agents were killed mid-task by an API rate limit; the coordinator finished the remaining pieces itself (the e2e scripts, the concept registry, the project README, and the flaky-test fix).
- **Verified on the final tree:** `npm run check` (typecheck, lint, content check, 88 unit tests) clean; `npm run build` passes; `npm run db:seed` then `npm run e2e` against a live build: 36 + 20 + 8 passed, 0 failed.

### Left open

- **The server still trusts `attempt` and `timeSpent`.** Now documented on the route as an accepted risk for a local-first app; the fix is exercise 9.
- **Visual layout is still unverified.** No browser was available, so the new components, the split UI primitives and the accessibility work have not been looked at or tried with a screen reader.
- **The web track has no L3 module.** `content:check` warns that unlocking skips straight past it.
- **Concept overlap between a few items.** The (C) sections of the three reviews list questions that test the same fact twice, for example `cs-types-string` and `cs-rt-stringbuilder`, and three JavaScript items that each say "JSON loses Date, Map, Set and functions".
- **The vm runner is not isolation.** Host objects in the context can still lead back to `process` (chapter 04). The timer escape is fixed; the realm escape is not. Fine for a local app; a blocker for hosting. Exercise 11.
- **The e2e scripts share the learner's database** and need a server started by hand, so they are not in `npm run check`. Exercise 13.
- **`dashboard()` still writes during a read**: it ends with `recomputeStreak()`, which updates `users`. Exercise 7.
- **The kind mix leans on recognition.** 196 of 384 items are `mcq` and 4 are `code`. That suits screening trivia, but recall-heavy kinds teach more.
- *Fixed after the review:* `scripts/check-content.ts` contained a literal NUL byte, so git treated it as binary and hid its diffs. It is now an escape sequence.
