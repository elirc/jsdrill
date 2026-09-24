# 07: Testing without a browser

> Files: `package.json` (`scripts`), `scripts/check-content.ts`, `eslint.config.mjs`, `vitest.config.ts`, `src/lib/__tests__/`, `scripts/e2e/` (`e2e.mjs`, `features.mjs`, `progression.mjs`, `README.md`), `src/app/api/**/route.ts`, commit messages of `6f06762` and `c027fca`

## The constraint

Reps was built in a terminal, with no browser automation available. That rules out the usual "click through it and look" check. The question was how to get real confidence that a 134-file rewrite works without ever seeing it.

The answer was a stack of checks. Each one is cheap and targets a different kind of failure. Almost all of the logic lives below the UI (pure functions, API routes, the database), so almost all of it can be exercised without the UI.

## Layer 1: static checks (`npm run check`)

```json
"typecheck": "tsc --noEmit",
"lint": "eslint src scripts",
"content:check": "tsx scripts/check-content.ts",
"test": "vitest run",
"check": "npm run typecheck && npm run lint && npm run content:check && npm run test"
```

(`npm run test` joined the chain on 2026-09-23. Before that, `check` stopped at `content:check`.)

- **`tsc --noEmit`** catches shape errors across the whole program, and in particular the exhaustiveness guarantees from chapter 02. Adding an item kind produces a compile-error to-do list.
- **`eslint`** with `eslint-config-next` includes the React 19 hooks rules (`react-hooks/purity`, `react-hooks/set-state-in-effect`, the rules of hooks). These are *behavioural* bugs that type-check fine (chapter 09). Note that `lint` covers `scripts/` too, so the test tooling is held to the same standard as the app.
- **`content:check`** is a domain-specific linter, described next.
- **`test`** runs the unit tests, described after it.

The `&&` chain is ordered cheap-to-expensive, and it stops at the first failure.

## Layer 2: a linter for your own domain

`scripts/check-content.ts` is the most valuable file in the repo per line. Types can't express "the reference solution passes its own tests", but a 400-line script can. It checks every item (384 on 2026-09-23) by **running the production grader against each item's own answer key**. `code` items are graded through `serverGradeOptions`, so a reference solution with an infinite loop fails with a timeout instead of hanging the check:

- `mcq` / `predict-output`: the correct choice grades correct *and* a wrong choice grades wrong.
- `multi`: all-correct grades correct; a partial selection does not; not every option is correct.
- `truefalse`: the stated answer passes and its opposite fails.
- `fill-blank`: *every* accepted spelling of *every* blank grades correct, and nonsense does not.
- `order`: the authored order passes and the reverse fails.
- `code`: the solution passes all tests, the starter doesn't, the test data survives JSON, and there is at least one edge case (warning).
- `short`: the model answer is at least 100 characters, with at least 2 key points.
- Prose: `checkProse` on every rendered string (bug 5d).
- Structure: briefs ≥ 200 characters, explanations ≥ 40, 3 to 7 key ideas, unique ids, concept registry coverage.

It separates **problems** (exit code 1, which blocks) from **warnings** (printed, doesn't block). That distinction matters. A linter that blocks on matters of taste gets disabled. A linter that only warns gets ignored.

Every check has a **positive and a negative case** where possible ("the right answer passes" *and* "a wrong answer fails"). A grader that returned `correct: true` for everything would pass every positive-only check. The negative cases are what make the linter able to fail, which is the lesson of bug 5b applied systematically.

A companion script, `scripts/content-stats.ts` (`npm run content:stats`), prints item counts by track, module, level and kind. It does not fail on anything. It exists so that gaps in the kind mix are visible before anyone authors more content. It replaced an uncommitted scratch script on 2026-09-23.

## Layer 2b: unit tests (Vitest, since 2026-09-23)

For two rebuilds the repo had no unit tests. Vitest arrived on 2026-09-23, configured in `vitest.config.ts`, with tests under `src/lib/__tests__/`. There were 78 tests in four files on arrival; the code review that same day added 10 more (88), mostly executor parity and timeout cases:

| File | Tests | What it pins down |
|---|---|---|
| `grader.test.ts` | 24 | Every item kind graded both ways, the multi-select cancellation rule, `normalizeBlank`, `emptyResponse` / `isAnswered` |
| `executor.test.ts` | 22 | `extractFunctionName`, the browser runner, `classifyError`, and the `node:vm` runner, including *"stops an infinite loop with a hard timeout"* |
| `utils.test.ts` | 24 | `deepEqual`, `renderMarkdown` and `renderInline` (HTML escaping, `a ** b` inside backticks), local-date helpers, `streakFromDays` |
| `fsrs.test.ts` | 8 | `ratingFor` and a scheduling round trip |

Two details are worth copying:

- **The unit tests cannot touch the learner's database.** `vitest.config.ts` sets `REPS_DB_PATH` to a path that does not exist, so a test that accidentally imports the database fails loudly instead of quietly writing to `reps.db`.
- **The seams make the tests possible.** `streakFromDays(days, now)` takes `now` as a parameter, so a streak test is a pure function call rather than a fight with the clock. The executor tests use `RunOptions.compile` to pass in a compiler that throws `TimeoutError`, so the timeout path can be tested in milliseconds (*"maps a TimeoutError from a custom compiler to a timeout"*). That fake compiler is a **test double**.

What is still not unit-tested: `findUnserialisable()` (it is not exported from `scripts/check-content.ts`; exercise 3), and anything that needs the database, such as `maybeUnlockNextLevel()`. The database-backed behaviour is covered only by the end-to-end scripts below.

## Layer 3: API-level end-to-end against a production build

Unit-level correctness wasn't enough (bug 5c proved that). So the rebuild was verified with scripts that:

1. started from a freshly seeded database (`npm run db:reset` is how you'd do it),
2. ran against a live **production** build (`npm run build && npm run start`, not `next dev`, so server/client boundaries, route handlers and prerendering behave as shipped),
3. drove the real HTTP API with `fetch` and asserted on the JSON.

What the 42 assertions in `6f06762` covered, in the four areas recorded for this work:

- **Grading every kind both ways.** A correct and a wrong response for each of the eight kinds, posted to `/api/attempts`, with `grade.correct` checked for each.
- **FSRS behaviour.** Ratings and resulting intervals: a miss comes back soon, and a correct answer is pushed further out.
- **All session modes.** `/api/session?mode=` for `mixed`, `track`, `module`, `level`, `weak` and `interview`.
- **Server authority.** The server's verdict comes from re-grading, not from anything the client claims (chapter 04).

Those scripts were not committed at the time (see "The gap" below). Since 2026-09-23 their successors are in `scripts/e2e/`: `e2e.mjs` covers the four areas above, `features.mjs` covers primers, the module and cheat-sheet endpoints, and second-attempt credit, and `progression.mjs` covers level unlocking. `npm run e2e` runs all three in order, and each exits non-zero if any check fails.

The **progression script** (8 assertions) answered every level-1 item of a track correctly in a loop and expected `unlocked.level === 2`. That is the script that found bug 5c. `c027fca` added 36 + 20 + 8 assertions: retry credit (`attempt: 2` → score ≤ 0.5, rating Hard), primers (`moduleKeyIdeas` set on first contact and `null` afterwards), the module and cheat-sheet endpoints, and progression again.

### Why the API layer is the right seam

Almost every behaviour a learner cares about crosses `/api/session` or `/api/attempts`. Testing there exercises the route handler, the grader, FSRS, the session builder, Drizzle and SQLite together, which is exactly where bug 5c lived. It is also stable: the JSON contract changes much less often than the markup.

## Layer 4: the production build

`npm run build` is a test in its own right. It type-checks again, prerenders static routes (running `src/app/page.tsx`, which executes every content module and therefore every DSL assertion), and fails on server/client boundary mistakes such as a server-only import in a `"use client"` file. The commit messages record the route count (18, then 20), so a route that silently disappeared would be noticed.

## Saying what was not verified

Both commit messages list what *was* verified. The session also said out loud what *wasn't*:

- **Visual layout.** No screenshot was taken, so nobody checked font sizes, spacing, the dark/light themes, or mobile widths. The readability changes in `c027fca` (18px prompts, 16px/1.75 prose) are specified in CSS, not observed.
- **Keyboard interaction** (1 to 9 to pick, Enter to submit or advance) is implemented, not exercised. Since 2026-09-23 the Enter handling lives in one place, `enterBelongsToSession()` in `src/components/drill/useDrillSession.ts`, which makes it easier to test, but nothing tests it yet.
- **The browser executor path.** The default `new Function` runner is now unit-tested under Node (`runTests (browser runner)` in `executor.test.ts`). `content:check` and server-side re-grading use the vm runner instead. Neither has ever run inside a real browser tab.
- **Accessibility.** The 2026-09-23 work added `role="group"` to answer sets, screen-reader-only verdict text (`sr-only`), an `aria-live` region for reordering, and a "Skip to content" link in `src/app/app/layout.tsx`. All of it is in the markup. None of it has been checked with a screen reader.

This is a senior habit. "Tests pass" is a claim about the tests, not about the product. Say which risks your tests cover and which they don't, so the next person knows where to look first.

## The gap, and how it was closed

For both the rebuild (`6f06762`) and `c027fca`, the end-to-end and progression scripts ran in the session's scratch space and **were not committed**. That was the biggest weakness in this chapter: nobody could rerun them, CI couldn't run them, and the next regression in unlocking would have been found the hard way.

They stayed uncommitted until 2026-09-23. They are now in `scripts/e2e/`, with a `README.md` and `npm run e2e`. Committing them immediately surfaced a flaky assertion, which is bug 5h in chapter 05: a test that passed or failed depending on how much the local database had been used.

What is still weak, as the scripts' own README says:

- **They need a running server** (`npx next build && npx next start -p 3111`, or `REPS_URL` pointed elsewhere). So they are not part of `npm run check`.
- **They write to the local `reps.db`.** Every run records real attempts in the learner's history, and it also changes the state the next run starts from. That is the root cause of 5h. `REPS_DB_PATH` already lets the server use another file; the scripts do not yet create one for themselves. Exercise 13 asks you to fix that.

## A testing plan for this repo, ranked by value per hour

Status as of 2026-09-23 in brackets.

1. **Unit tests for `grade()`**: all eight kinds, correct and wrong, plus the `multi` false-positive rule. Pure, fast, no setup. [Done: `grader.test.ts`.]
2. **Unit test for `findUnserialisable`**: a function input must be caught (the regression test for 5b). [Not done: exercise 3.]
3. **Unit tests for `ratingFor`** (the table in chapter 06's exercise). [Done: `fsrs.test.ts`.]
4. **Committed API e2e script** against `npm run start`. [Done: `scripts/e2e/e2e.mjs` and `features.mjs`, run by `npm run e2e`.]
5. **The progression test**, committed. [Done: `scripts/e2e/progression.mjs`. It still shares `reps.db`; exercises 6 and 13.]
6. Only then, a small browser test (Playwright) for the retry flow, the one piece of real client-side state machinery. [Not done. The flow now lives in `useDrillSession.ts`, which is the thing to drive.]

## Try it yourself

1. Break the grader: make `gradeTrueFalse` return `correct: true` always. Run `npm run content:check` and count how many items fail and which check catches them. Then delete the negative checks in the checker's `truefalse` case and run again. That is the difference negative cases make.
2. Find the check in `scripts/e2e/e2e.mjs` that asserts a wrong answer returns `rating: 1`. Break `ratingFor` so a wrong answer returns Hard, run `npm test` and then `npm run e2e`, and note which layer catches it first and how long each took.
3. List three things in `src/components/drill/useDrillSession.ts` that no test in this chapter covers. For each, name the cheapest test that would.

> **Junior vs senior**
>
> **Junior:** "I can't open a browser, so I'll just run the type checker." Or: "The tests pass, so it works."
>
> **Senior:** "Put the logic below the UI, then test in layers: types, lint, a domain linter with positive *and* negative cases, and API-level end-to-end runs against a production build, including the whole user journey. List what wasn't verified. Commit the scripts, or they didn't really happen. And make each test create the state it needs."
