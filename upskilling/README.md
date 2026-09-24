# Upskilling: junior to senior, using this repository

This folder is an engineering course with one worked example: Reps, the app in this repository. Each chapter takes a decision, a design, or a bug that really happened here and explains what it teaches. You can check every claim. Every file path and function name is real, and the history comes from `git log`.

It is written for a junior engineer who can already ship features and wants to learn how senior engineers think: how they scope work, model data, decide what to trust, verify what they built, and leave a codebase better than they found it.

> **Baseline.** The chapters describe the working tree as of 2026-09-23: commit `c027fca` plus that day's work, which was not yet committed when this folder was last revised. That work includes a backend refactor (`src/lib/api.ts`, `src/lib/user.ts`, a `node:vm` runner in `src/lib/executor.server.ts`, soft-delete pruning), Vitest with 78 unit tests in `src/lib/__tests__/`, the end-to-end scripts in `scripts/e2e/`, a frontend refactor (`useDrillSession.ts`, `SessionChrome.tsx`, `useApi.ts`, a split `src/components/ui/`), and 155 new items. Where a chapter tells history it names the commit or the date, so "in `c027fca`" means the old code and "today" means the tree described here. `git show c027fca:<path>` shows the earlier version of any file, and `git log` shows the hash the 2026-09-23 work was committed under, once it is.

## How to use it

1. **Read one chapter.** Keep the files it cites open next to it. When a chapter says "`maybeUnlockNextLevel` in `src/lib/progress.ts` gates on coverage plus accuracy", go and read that function.
2. **Do the chapter's "Try it yourself" exercise.** They are small and they touch real code. Do them on a scratch branch (`git switch -c practice/ch04`) so you can throw the work away.
3. **Run the checks** before you call anything done:
   ```bash
   npm run check          # tsc --noEmit + eslint + scripts/check-content.ts + vitest
   npm run db:seed        # upsert content into reps.db; progress is preserved
   npm run build          # production build; catches server/client boundary errors
   npm run e2e            # API end-to-end scripts; needs a running server
   ```
   `npm run e2e` records attempts in the database the server uses, normally your own `reps.db`. Read `scripts/e2e/README.md` before running it.
4. **Read the "Junior vs senior" box** at the end of each chapter last. It compresses the chapter into one contrast you can remember.
5. When you have read several chapters, work through [`EXERCISES.md`](EXERCISES.md). It has thirteen longer exercises, ordered from junior to senior, each with acceptance criteria and a note on which ones the repository has since done itself.
6. [`JOURNAL.md`](JOURNAL.md) is the dated engineering log for the project. [`GLOSSARY.md`](GLOSSARY.md) defines the vocabulary. [`reviews/`](reviews/) holds the adversarial review reports that chapter 10 uses as evidence.

## Chapters

| # | Chapter | One line |
|---|---|---|
| 01 | [Scoping and the rewrite decision](chapters/01-scoping-and-the-rewrite-decision.md) | Why a 134-file rewrite beat adapting "JS Drill", and why the dead code was deleted rather than kept. |
| 02 | [Domain modelling with discriminated unions](chapters/02-domain-modelling-with-discriminated-unions.md) | Eight item kinds, a JSON payload column, and where the types are exact and where they cheat. |
| 03 | [Content as typed data and the authoring DSL](chapters/03-content-as-typed-data-and-the-authoring-dsl.md) | `mcq()`, `blank()`, `code()` and friends: invariants checked when content is written, not when a learner finds the mistake. |
| 04 | [Pure functions and never trusting the client](chapters/04-pure-functions-and-never-trusting-the-client.md) | One grader, run twice. What the server re-checks, what it still takes on trust, and what the `node:vm` runner does and does not protect against. |
| 05 | [The bugs verification found](chapters/05-the-bugs-verification-found.md) | Eight real bugs, in the order they were found, each with its lesson. The newest is a flaky test. |
| 06 | [Designing for learning: FSRS and sessions](chapters/06-designing-for-learning-fsrs-and-sessions.md) | Turning a grade into a rating, 60/40 sessions, interleaving, and the second-try rule. |
| 07 | [Testing without a browser](chapters/07-testing-without-a-browser.md) | Static checks, a content linter, unit tests, API-level end-to-end scripts, and saying plainly what was not verified. |
| 08 | [Migrations, seeding and not breaking users](chapters/08-migrations-seeding-and-not-breaking-users.md) | Deterministic ids, upserts, additive migrations, and how pruning went from a cascading delete to a soft delete. |
| 09 | [Lints, purity and React 19](chapters/09-lints-purity-and-react-19.md) | What `react-hooks/purity` and `set-state-in-effect` flagged, and the three idiomatic fixes. |
| 10 | [Working with AI agents and code review](chapters/10-working-with-ai-agents-and-code-review.md) | Prop contracts, disjoint file scopes, adversarial review (and the 17 errors it found), agents dying mid-task, and knowing which work to keep for yourself. |
| 11 | [Git, secrets and shipping](chapters/11-git-secrets-and-shipping.md) | Feature branches for big changes, what never goes in the repo, and why a leaked secret is rotated. |

## Reviews

Reports written by reviewers who were told to find what is wrong, not to confirm what is right. The content reports each list confirmed errors (all fixed), debatable points, overlaps, and a verdict.

| Report | Scope |
|---|---|
| [`reviews/REVIEW-JAVASCRIPT.md`](reviews/REVIEW-JAVASCRIPT.md) | Fact-check of the whole JavaScript track (93 items). 8 confirmed errors. |
| [`reviews/REVIEW-CSHARP.md`](reviews/REVIEW-CSHARP.md) | Fact-check of the whole C# track (75 items). 5 confirmed errors. |
| [`reviews/REVIEW-OTHER-TRACKS.md`](reviews/REVIEW-OTHER-TRACKS.md) | Fact-check of the 48 items added to the other eight tracks. 4 confirmed errors. |
| [`reviews/AUDIT-CODE.md`](reviews/AUDIT-CODE.md) | Code review of the refactor of 2026-09-23. |

## Skills map

| Skill | Chapter | Where in the repo |
|---|---|---|
| Deciding rewrite vs refactor | 01 | commit `6f06762` (`git show --stat 6f06762`) |
| Deleting dead code | 01 | `seed-data/`, `docs/`, `src/app/admin/` removed in `6f06762` |
| Modelling variants with discriminated unions | 02 | `ItemKind`, `Response`, `Grade` in `src/types/index.ts` |
| Choosing a JSON column vs relational tables | 02, 08 | `items.payload` in `src/lib/db/schema.ts` |
| Many-to-many modelling | 02 | `itemConcepts` in `src/lib/db/schema.ts`, `conceptStrengths()` in `src/lib/progress.ts` |
| Designing an internal DSL | 03 | `src/content/builder.ts` |
| Checking invariants when content is written | 03 | `assert(...)` calls in `mcq`, `blank`, `defineTrack` |
| Pure functions and shared logic | 04 | `grade()` in `src/lib/grader.ts` |
| Server-side authority | 04 | `POST` and `checkBody` in `src/app/api/attempts/route.ts`, `parseJson()` in `src/lib/api.ts` |
| Describing a limitation honestly | 04 | header comments of `src/lib/executor.ts` and `src/lib/executor.server.ts`; the "Trust boundary" comment in `src/app/api/attempts/route.ts` |
| Test doubles / vm sandbox | 04, 07 | `RunOptions.compile` in `src/lib/executor.ts`, `vmCompile()` in `src/lib/executor.server.ts`, `GradeOptions.runTests` in `src/lib/grader.ts`, `src/lib/__tests__/executor.test.ts` |
| Checking that your checks can fail | 05, 07 | `findUnserialisable()` in `scripts/check-content.ts` |
| Testing a whole user journey | 05, 07 | `maybeUnlockNextLevel()` in `src/lib/progress.ts`, `scripts/e2e/progression.mjs` |
| Flaky test | 05, 07 | the primer check in `scripts/e2e/features.mjs` (bug 5h); exercise 13 |
| Unit-testing pure functions | 04, 07 | `src/lib/__tests__/`, `vitest.config.ts` |
| Writing a linter for your own parser | 05 | `checkProse()` in `scripts/check-content.ts`, `renderMarkdown()` in `src/lib/utils.ts` |
| Applying learning science | 06 | `ratingFor()` in `src/lib/fsrs.ts`, `buildSession()` in `src/lib/sessionBuilder.ts` |
| Verifying without a UI | 07 | `npm run check`, `scripts/check-content.ts`, `scripts/e2e/` |
| Idempotent seeding and upserts | 08 | `seed()` in `src/lib/db/seed.ts` |
| Soft delete instead of cascade | 08 | `UPDATE items SET is_published = 0` in `seed()`, `src/lib/db/seed.ts` |
| Additive schema migration | 08 | `migrate()` and `SCHEMA_DDL` in `src/lib/db/seed.ts` |
| React purity and external stores | 09 | `themeStore` in `src/app/app/layout.tsx`, `initialResponse()` in `src/components/drill/useDrillSession.ts`, `src/components/useStoredState.ts` |
| Parallelising work with contracts | 10 | `AnswerProps.revealed` in `src/components/drill/Answers.tsx` |
| Keeping coupled state in one place | 10 | the `Core` state in `src/components/drill/useDrillSession.ts` |
| Adversarial review | 10 | `upskilling/reviews/` |
| Branch hygiene and secrets | 11 | `.gitignore`, branch `feat/fullstack-interview-drills` |

## Ground rules for this folder

- Keep it true. If the code changes, update the chapter or add a dated note. Do not let the prose drift away from the code.
- Cite paths and function names, not line numbers. Line numbers go stale in a week.
- When you find a new bug worth teaching, add it to `chapters/05-the-bugs-verification-found.md` and log it in `JOURNAL.md` under that day's date.
