# 05: The bugs verification found

> Files: `src/types/index.ts` (`CodePayload.harness`), `src/lib/executor.ts`, `scripts/check-content.ts` (`findUnserialisable`, `checkProse`), `src/lib/progress.ts` (`maybeUnlockNextLevel`), `src/lib/utils.ts` (`renderMarkdown`), `src/app/app/layout.tsx`, `src/components/drill/useDrillSession.ts`, `scripts/e2e/features.mjs`

Every bug here was real, and each was found by *verifying* the work before commit, not by a user. 5a to 5g are listed in the order they were found during the 2026-09-09 rebuild (`6f06762`). The commit message has a section called "Fixes found while verifying". Read it: `git show -s 6f06762`. 5h was found on 2026-09-23, while the end-to-end scripts were being committed.

Some of the code these bugs touched has since been refactored. Where that happened, the section says where the fix lives now.

---

## 5a. A closure factory cannot be tested by calling it

**Symptom.** The `makeCounter` exercise asks the learner to return a function that counts up. The executor's default strategy is `return makeCounter(...arguments)` followed by a `deepEqual` against `expected`. But the return value is a *function*, and you can't meaningfully deep-compare a function or put its expected value in JSON.

**Fix.** An optional `harness` on `CodePayload` (`src/types/index.ts`):

```ts
/**
 * Optional wrapper for higher-order exercises, where calling the
 * learner's function directly does not produce a comparable value
 * (a factory returning a closure, say). A function expression that
 * receives the test input and may call whatever the learner defined.
 */
harness?: string;
```

In `runTests()` the compiled body (built by `buildBody()` in `src/lib/executor.ts`) becomes `${userCode}; return (${harness})(...arguments);`. The `makeCounter` harness in `src/content/tracks/javascript.ts` calls the factory, calls the counter `calls` times, and also makes a *second* counter. That checks the two do not share state, which is the whole point of the exercise:

```ts
harness: `(start, calls) => {
  const next = makeCounter(start);
  const seen = [];
  for (let i = 0; i < calls; i++) seen.push(next());
  const other = makeCounter(100);
  return { seen, other: other() };
}`,
```

**Lesson.** If the value under test isn't directly comparable, **test its behaviour through a driver**. The harness turns "a function" into "a plain object describing what the function did", and a plain object *is* comparable and storable. `memoize` uses the same idea: its harness counts how many times the wrapped function was actually invoked, because the point of memoisation is the calls that *don't* happen.

---

## 5b. A function in test data, and a checker that could not fail

**Symptom.** `js-async-retry` originally passed a flaky *function* as a test input, as in `t([flakyFn, 3], "ok", …)`. In TypeScript source that's fine. But the seeder stores tests with `JSON.stringify(item.payload)`, and **`JSON.stringify` turns a function inside an array into `null`**:

```js
JSON.stringify([() => 1, 3])   // '[null,3]'
```

So in the database the learner's `retry` was called with `(null, 3)`. The item was broken for every learner, and nothing crashed.

**The first check was wrong.** The first check added to `check-content.ts` did roughly this:

```ts
const roundTripped = JSON.parse(JSON.stringify(payload.tests));
if (JSON.stringify(roundTripped) !== JSON.stringify(payload.tests)) fail(…);
```

Read it twice. **Both sides go through `JSON.stringify`, so both lose the function in exactly the same way.** The comparison is `'[null,3]' !== '[null,3]'`, which is always false. The check could never fire. It looked like protection and gave none.

**The real fix** inspects the *original* values, before serialisation can hide anything. `findUnserialisable()` in `scripts/check-content.ts`:

```ts
/** Names the first value JSON would drop, or null if everything survives. */
function findUnserialisable(value: unknown, depth = 0): string | null {
  if (typeof value === "function") return "a function";
  if (typeof value === "symbol") return "a symbol";
  if (typeof value === "bigint") return "a bigint";
  if (value instanceof Map) return "a Map";
  // … Set, Date, `undefined` array elements, recursion into arrays/objects
}
```

The call site carries the explanation forward: *"Comparing serialised forms would not catch it (both sides lose it equally), so walk the original values instead."* The `retry` item was rewritten to use a harness that *builds* the flaky function from plain numbers (`(failures, attempts) => { … }`).

**Lesson.** **Verify your verifier.** A check that can't fail is worse than no check, because it gives you false confidence. Before you trust a new check, make it fail on purpose: feed it the exact bug it is meant to catch and see it go red. Exercise 3 asks you to turn that into a permanent unit test.

---

## 5c. The roadmap that could never open

**Symptom.** Level progression was gated on FSRS stability. A track unlocked level 2 when the level-1 cards had `stability >= 7` days. In FSRS, **stability only grows when reviews happen across real elapsed time**. A learner who answered every level-1 item correctly in one sitting got modest stabilities, and could never reach level 2 that day, or for weeks.

**How it was found.** Not by unit tests. Every function was individually "correct". It was found by an **end-to-end progression script**: seed a fresh DB, start the server, answer every level-1 item of one track correctly through the real `POST /api/attempts` in a loop, and assert that the response eventually contains `unlocked: { level: 2 }`. The assertion failed. That script was not committed at the time. Since 2026-09-23 it is `scripts/e2e/progression.mjs`, run by `npm run e2e`.

**Fix.** `maybeUnlockNextLevel()` in `src/lib/progress.ts` now gates on **coverage plus accuracy**:

```ts
export const UNLOCK_COVERAGE = 0.8;   // share of the level answered correctly at least once
export const UNLOCK_ACCURACY = 0.7;   // accuracy across that level's attempts
```

Its doc comment records *why*, so nobody "fixes" it back: *"deliberately not FSRS stability: stability only grows across real elapsed days, so gating on it would keep the roadmap shut for weeks no matter how well someone was doing."* Stability still drives what it is good at: `masteryScore()` (retention weighted 0.7) and review scheduling.

**Lesson.** **Time is an input.** Any rule that depends on elapsed time has to be tested along the time axis the user actually lives on. And **test the whole journey, not only units**. The bug lived in how FSRS behaviour and the gate combined. Neither part was wrong on its own.

---

## 5d. The markdown renderer's limits

**Symptom.** Two explanations used doubled (``` `` ```) or nested backticks, as authors do when writing about backticks. `renderMarkdown()` in `src/lib/utils.ts` is hand-written and handles inline code with a single rule. Today it lives in `replaceInlineCode()`:

```ts
return text.replace(/`([^`\n]+)`/g, (_m, code: string) =>
  stash.put(`<code class="md-code">${code}</code>`, false)
);
```

(The `stash` was added on 2026-09-23 so that `a ** b` or `a || b` inside backticks is never read as bold or as a table cell. The regex itself is unchanged.) That rule has no notion of doubled delimiters. The two explanations rendered as garbled prose with stray backticks and code spans in the wrong places. The source looked fine. Only the rendered page showed the problem.

**Fix.** The content was corrected, and **a permanent lint for the renderer's limits** was added. `checkProse()` in `scripts/check-content.ts` strips fenced blocks, then fails on doubled backticks, an odd backtick count (unclosed span) and backticks nested in a span. It runs on every prompt, explanation, interview tip, choice, choice feedback, brief and key idea.

**Lesson.** **When you write your own parser, write the linter for its limits.** A hand-rolled renderer is fine; choosing a subset is a legitimate trade (see its doc comment, *"trades completeness for predictability"*). But the subset has to be *enforced* at the input. Otherwise authors discover it one garbled page at a time.

---

## 5e. A backtick in a comment broke the build

**Symptom.** Code snippets in content are TypeScript template literals, so they are delimited by backticks. A starter-code comment read ``// … up to `attempts` times``. The first unescaped backtick *ended* the template literal and the rest of the file stopped parsing.

**Fix.** Rather than hunting through the files by hand, a small script escaped backticks inside the `brief:`, `code:`, `starter:`, `solution:` and `template:` literals across `src/content/tracks/*.ts`. You can see the result throughout the tracks (`` \`int\` `` and `` \`\`\`csharp ``). The `retry` starter today phrases its comment as `up to 'attempts' times`, which avoids the problem entirely.

**Lesson.** **When a mistake is mechanical and repeated, fix it mechanically.** A script is repeatable, reviewable in the diff, and doesn't get tired at file seven of ten. Then ask why the format invites the mistake. Here the root cause is markdown-in-template-literals, and the lasting guard is that `tsc` and `content:check` run before every commit.

---

## 5f. React 19 purity rules

**Symptom.** `eslint-plugin-react-hooks` v6 (via `eslint-config-next`) flagged `Date.now()` and `Math.random()` during render (`react-hooks/purity`) and a `setState` inside an effect (`react-hooks/set-state-in-effect`).

**Fixes.** Timing refs seeded in effects (`startedAt`, `sessionStart` in `drill/page.tsx`), the `order` shuffle done once in an effect and kept in a ref (`OrderSteps` in `Answers.tsx`), and the theme read through `useSyncExternalStore` (`themeStore` in `src/app/app/layout.tsx`). Since 2026-09-23 the first two live in `src/components/drill/useDrillSession.ts` (`questionStart`, `sessionStart`, and the shuffle in `initialResponse()`); chapter 09 has the details.

**Lesson.** **Lints encode hard-won rules. Learn the reason, don't disable the rule.** Chapter 09 covers this in depth.

---

## 5g. The environment fights back (Windows)

- **Heredocs ate backslashes.** Writing files through bash heredocs on Windows silently mangled `\` sequences, which is fatal in content full of `` \` `` sequences. Files were written with an editor tool instead of shell redirection.
- **git had no identity.** The first commit attempt failed. The identity was set **locally** (repo config, not global) to match the author of the existing commits, `elirc <elirc@users.noreply.github.com>`, so history stays consistent.
- **CRLF warnings on every commit.** Harmless but noisy. The right response is to understand `core.autocrlf` or add a `.gitattributes`, not to ignore warnings on reflex.
- **Port 3000 was taken** by an unrelated project. The process was **identified before anything was done to it**. Killing whatever holds a port is how you take down someone else's work.

**Lesson.** **Check the environment before acting on it.** Find out what is on the port, which identity git will use, and what your shell does to your bytes, before you trust any of them.

---

## 5h. The flaky primer test (2026-09-23)

**Symptom.** When the end-to-end scripts were committed under `scripts/e2e/`, one assertion in `features.mjs` passed on some runs and failed on others, with no code change in between. It checked the topic primer: *"first-time module items carry key ideas"*. The original version asked `/api/session?mode=mixed&size=12` for a session and looked through it for an item from a module the learner had never touched, expecting `moduleKeyIdeas` on it.

**Cause.** The test *hoped* its precondition would be true. On a freshly seeded database almost every module is untouched, so a mixed session nearly always contains one. But the scripts record real attempts in `reps.db`, and every run touches more modules. On a well-drilled database a mixed session is mostly overdue reviews from modules the learner already knows, and it may contain no first-time module at all. Then the assertion failed although the primer code was correct. Whether it passed depended on the history of the database, not on the code.

**Fix.** The test now **constructs** its precondition instead of sampling for it. It asks `/api/cheatsheet` for every module, picks one whose `seenItems` is 0, and requests a `module`-mode session for that module:

```js
// A mixed session on a well-drilled database may contain no first-time
// module at all, so find one explicitly and drill it in module mode.
const sheet = await get("/api/cheatsheet");
const untouched = sheet.data.flatMap((t) => t.modules).find((m) => m.seenItems === 0);
```

If no untouched module is left, it prints *"every module already touched — primer assertion skipped; use a fresh db to exercise it"* rather than failing or passing silently. That is honest, but it is still a skip. The fully deterministic version runs against a database the test creates itself (`REPS_DB_PATH` is already read by `src/lib/db/index.ts` and `seed.ts`). That is the new exercise 13.

**Lesson.** **Tests must construct their preconditions, not hope for them.** A test that samples random or accumulated state and hopes the interesting case shows up is a flaky test: it fails for reasons unrelated to the code, and people learn to re-run it until it passes, and then to ignore it. If a test needs "a module the learner has never seen", it has to find or create one, and when it can't, it has to say so out loud.

---

## Try it yourself

1. Reintroduce 5b in a scratch branch: change one `retry` test to `t([() => "ok", 3], "ok", "x")`. Run `content:check` and see `findUnserialisable` fire. Then paste the *old* round-trip comparison into the checker and confirm it stays silent.
2. Reintroduce 5d: add ```Use ``x`` here``` to an explanation. Run `content:check`. Then render it with `renderMarkdown` in a scratch script and look at the HTML.
3. For 5c, set `UNLOCK_COVERAGE = 1.1` locally and run `scripts/e2e/progression.mjs` against a production build. Confirm it fails, then write the smallest script that proves the same thing without a server.
4. For 5h, find the version of the primer check before the fix in your own history (or rewrite it from the description above). Run it against a database where you have answered something from every module, and watch it fail with no code change.

> **Junior vs senior**
>
> **Junior:** writes a check, sees it pass, moves on. Tests each function alone. Kills whatever is on port 3000.
>
> **Senior:** makes every new check fail on purpose first. Tests the user's whole journey, including along the time axis. Writes a linter for every parser they hand-roll. Fixes repeated mistakes with scripts. Makes each test build its own preconditions. Looks before killing.
