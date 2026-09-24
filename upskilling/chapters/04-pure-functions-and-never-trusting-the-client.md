# 04: Pure functions and never trusting the client

> Files: `src/lib/grader.ts` (`grade`, `GradeOptions`), `src/app/api/attempts/route.ts` (`checkBody`, `POST`), `src/lib/api.ts` (`parseJson`), `src/lib/executor.ts` (`runTests`, `RunOptions`), `src/lib/executor.server.ts` (`vmCompile`, `runTestsServer`), `src/components/drill/useDrillSession.ts` (`submit`, `record`)

## One grader, two call sites

`grade(item, response, options?): Grade` in `src/lib/grader.ts` is a **pure function**. Its output depends only on its inputs. It reads no database, no clock and no global state, and it writes nothing. The header comment says why this matters:

```ts
/**
 * Pure grading for every item kind.
 *
 * Runs client-side for instant feedback and again on the server when
 * the attempt is recorded, so a tampered client cannot inflate a score.
 */
```

The two call sites:

1. **Client** (`src/components/drill/useDrillSession.ts`, shared by the drill runner and the mock interview): `submit()` calls `gradeLocally(item, response)`, imported as `grade as gradeLocally`. The learner gets instant feedback with no network round trip, and it works offline. The comment in `record()`'s `catch` says so: *"the local grade stands so the learner isn't blocked; it just isn't scheduled."*
2. **Server** (`src/app/api/attempts/route.ts`): `POST` loads the item **from the database by id** and grades again:

   ```ts
   const item = toItem(row);
   // Re-grade server-side rather than trusting the client's verdict.
   // Code runs in a vm context with a hard timeout (executor.server).
   const verdict = grade(item, response, serverGradeOptions);
   ```

The request body is read by `parseJson(request, checkBody)` from `src/lib/api.ts`, which limits its size (`MAX_BODY_BYTES`), parses it, and hands it to a guard. `checkBody` builds a **fresh object** from exactly five fields: `itemId`, `response`, `timeSpent`, `mode` and `attempt`. **It has no `correct` and no `score`**, and anything else the client sends is dropped because it is never copied. The client *cannot* claim a result. It can only submit an answer, and the server decides.

In the drill runner, `record()` then *replaces* the local grade with the server's when it arrives (the `adoptServerGrade` option, true by default), so the server's decision is also what is shown on screen. The mock interview passes `adoptServerGrade: false` so its scorecard never shifts under the learner. The server's verdict is still the one that is stored and scheduled.

Purity is what makes this possible. A grader that read `Date.now()`, the DB or `window` could not run unchanged in both places. And since both sides run the same function, they cannot drift apart. That same property lets `scripts/check-content.ts` use the production grader to validate content (chapter 03). One pure function, three consumers.

### The one seam: `GradeOptions.runTests`

`code` items need to *run* the learner's code, and the right way to run it differs between a browser tab and a server. Rather than letting the grader find out where it is running (which would make it impure), the difference is passed in:

```ts
export type GradeOptions = {
  /**
   * Replaces the code runner. The server passes the `node:vm` runner
   * (executor.server.ts) so a runaway loop hits a hard timeout; the
   * browser uses the default.
   */
  runTests?: (code, tests, harness, options) => RunResult;
};
```

`gradeCode()` uses `options.runTests ?? runTests`. The browser calls `grade(item, response)`. The route and `check-content.ts` call `grade(item, response, serverGradeOptions)`. This is **dependency injection at the smallest useful size**: one optional parameter with a default. It keeps `grader.ts` free of any `node:` import, so it still bundles for the browser, and it lets a unit test pass in a fake runner.

## What purity buys you in tests

A pure function can be tested with plain values and nothing else:

```ts
const item = { kind: "multi", payload: { choices: [
  { id: "c1", text: "a", correct: true },
  { id: "c2", text: "b", correct: true },
  { id: "c3", text: "c" },
]}} as Item;

grade(item, { kind: "multi", choiceIds: ["c1", "c3"] });
// → correct: false, score: 0 (one hit cancelled by one false positive)
```

There is nothing to mock. That is why `grade()` was the first target of the unit tests added on 2026-09-23: `src/lib/__tests__/grader.test.ts` covers every kind both ways, `normalizeBlank`, and the multi-select rule. Read `gradeMulti` for that rule, *"Each wrong pick cancels one right pick; never negative"*. It exists so that selecting every option is never a winning strategy.

## What the server still trusts

Senior engineers list what their defence *doesn't* cover. In `POST /api/attempts`, after `checkBody`:

| Input | Treatment | Can a tampered client abuse it? |
|---|---|---|
| `itemId` | Must be a non-empty string of at most 200 characters. Looked up in the DB; 404 if unknown | No |
| `response` | `kind` must be one of `ITEM_KINDS`. `checkResponseShape()` checks the fields for that kind, so `values: null` cannot crash the grader, and `code` is capped at `MAX_CODE_CHARS`. Then re-graded by `grade()` | Not for correctness |
| `timeSpent` | A finite number is rounded and clamped to 0 to 3600 (`MAX_TIME_SPENT`). Anything else counts as "not reported", and the rating then uses the item's `estSeconds` as its pace (`paceSeconds`) | **Yes, a little.** `ratingFor()` gives `Easy` when `timeSpent < budget * 0.5 && reps > 0`, so claiming 1 second on a correct review pushes the next review further out. |
| `attempt` | `attempt === 2 ? 2 : 1`. A 2 caps the score at 0.5 and forces `Rating.Hard` | **Yes.** A client that sends `attempt: 1` for a second-try success gets full credit. The server has no record of the first miss, because a first miss on a retryable kind is never sent (see `submit()`). |
| `mode` | Must be one of the six session modes; otherwise stored as `"mixed"` | Harmless label |

The route now says this itself. The doc comment above `POST` has a paragraph headed *"Trust boundary (accepted risk: local-first)"* that names `attempt` and `timeSpent`, explains why they are trusted, and says what the fix would be. For a local-first, single-user app these are acceptable: the only person you could cheat is yourself. But they are *known* limits, written in the code where the next reader will look, not accidents. To close the `attempt` hole, the server would have to see both tries, for example by recording the first miss and deriving `attempt` itself. That is exercise 9 in `EXERCISES.md`.

The general rule: **the server decides everything that matters, and anything it accepts from the client is either validated or listed as a known limit.**

## The executor: correctness harness, not sandbox

`code` items are graded by `runTests()` in `src/lib/executor.ts`. The file header sets expectations:

```ts
/**
 * Runs `code` items against their tests.
 *
 * The learner's code is their own, so this is a correctness harness,
 * not a security sandbox.
 * …
 */
```

How it works:

1. `extractFunctionName(code, expected)` strips comments, then finds function declarations and `const name = …` function expressions. If the name the exercise expects (`RunOptions.expectedName`) is among them it wins, so a helper written above the real function is not called by mistake.
2. `buildBody()` makes the body `"use strict"; <userCode>; return name(...arguments);`. With a harness it is `return (<harness>)(...arguments);` (bug 5a, chapter 05).
3. It compiles **once**, through `RunOptions.compile`. The default, `browserCompile`, is `new Function(body)`. Compiling once means a syntax error is reported as one failure, not N.
4. For each test it calls the compiled function with `cloneArgs(tc.input)`. **Inputs are structured-cloned** so a solution that mutates its argument (for example `arr.sort()`) cannot corrupt the inputs of later tests that share the same array literal.
5. It compares with `deepEqual`. `expected === undefined` means "it only has to run", and `expected === null` also accepts `undefined`, because JSON storage turns `undefined` into `null`.
6. `classifyError()` gives the learner a nudge (`timeout`, `off-by-one`, `edge-case-miss`, `type-mismatch`, …) instead of a bare "3 of 5 failed".

### In the browser: the time budget is checked after the call

```ts
const started = performance.now();
const result = invoke(cloneArgs(tc.input));
const elapsed = performance.now() - started;
// Only reached if the call returned — see the header comment.
if (elapsed > TIME_BUDGET_MS) { /* "Timed out" */ }
```

JavaScript is single-threaded. A `while (true) {}` never returns, so this code never reaches the check. In the browser it catches *slow* code (say, a 3-second exponential recursion), not *infinite* code, and the tab hangs. The header comment now says exactly that, under "The time limit, honestly". The browser fix is a Web Worker that can be terminated. That is part of exercise 11.

### On the server: `node:vm` with a hard timeout

Until 2026-09-23, `POST /api/attempts` → `grade()` → `gradeCode()` → `runTests()` → `new Function(...)` ran learner code **directly in the Next.js server process's global scope**, and an infinite loop froze the whole API. Now the route passes `serverGradeOptions`, whose runner is `runTestsServer()` in `src/lib/executor.server.ts`. It plugs `vmCompile()` into `RunOptions.compile`:

- Each run gets a fresh context from `vm.createContext(sandboxGlobals(), …)`. It holds a no-op `console`, `structuredClone`, `URL`, `URLSearchParams`, `TextEncoder`/`TextDecoder` and a few timer functions, and nothing else. There is no `process` and no `require` in scope.
- `codeGeneration: { strings: false, wasm: false }` makes `eval` and `Function("…")` *inside the context* throw.
- Every test call goes through `vm.Script` `runInContext(context, { timeout })`. V8 enforces that timeout **mid-loop**, so `while (true) {}` stops after `TIME_BUDGET_MS` (2 seconds). `isVmTimeout()` turns Node's `ERR_SCRIPT_EXECUTION_TIMEOUT` into a `TimeoutError`, which `runTests` reports as an ordinary `timeout` verdict.
- `microtaskMode: "afterEvaluate"` makes promise jobs queued by the code run inside the same timeout.

`src/lib/__tests__/executor.test.ts` proves the headline claim, in the tests *"stops an infinite loop with a hard timeout"* and *"reports the infinite loop as a timeout verdict"*. The browser path has its own block, `runTests (browser runner)`.

### The honest limitations of the vm runner

The header of `executor.server.ts` is candid: *"`vm` is **not** a security boundary … The point is liveness, not isolation."* It is worth seeing why. Both of these holes were checked against the current code while this chapter was being updated:

1. **The host realm leaks through the globals handed in.** `Function("return process")` is blocked. But `URL` is the *host's* `URL`, so `URL.constructor` is the host's `Function`, which the context's code-generation setting does not govern. A solution that calls `URL.constructor("return process.env.PATH")()` reads the server's environment. Any host object passed into a context is a door back out.
2. **The timeout covers only synchronous execution inside `runInContext`.** The `setTimeout` in `sandboxGlobals()` is the host's timer. A solution that returns normally but schedules `setTimeout(() => { while (true) {} }, 0)` passes its test, and then the callback runs on the server's event loop *after* the vm call has returned, outside any timeout. A probe with a 3-second busy loop in the callback blocked the event loop for about 3 seconds after its test had passed. With `while (true)` it would never return.

It also still runs on the server's own thread and heap, so a solution that allocates a huge array is not limited.

For Reps as shipped, the server is the learner's own machine and the code is their own. That is the same trust boundary as running `node myfile.js`, and the vm runner fixes the thing that actually hurt: an accidental infinite loop taking down the API. For any **hosted, multi-user version** it is still remote code execution, and it is the first thing a security review must flag. The options are a `worker_threads` worker with `resourceLimits` that is terminated on timeout, a separate process, or not re-grading code on the server at all and accepting client verdicts for that one kind. The last option gives up the property this chapter is about, which shows how much the first two are worth. Exercise 11 asks you to harden the runner and measure it.

## Try it yourself

1. Start the dev server and POST a forged verdict:
   ```bash
   curl -s localhost:3000/api/attempts -H 'content-type: application/json' \
     -d '{"itemId":"item-js-async-retry","response":{"kind":"code","code":"function retry(){ }"},"correct":true,"score":1}'
   ```
   Confirm the returned `grade.correct` is `false`. Find where your `correct` field is dropped (hint: `checkBody` never copies it).
2. POST `{"itemId":"item-js-async-retry","response":{"kind":"fill-blank","values":null}}`. Read the 400 message and find the line in `checkResponseShape()` that produced it. What would have happened without it?
3. Repeat exercise 1 with a correct MCQ answer and `"attempt": 2`, then with `"attempt": 1`. Compare `grade.score` and `rating`. Write the hole down in one sentence, then compare it with the "Trust boundary" paragraph above `POST`.
4. In a scratch file under `npx tsx`, time `runTestsServer("function f(){ while(true){} }", [{ input: [], expected: 1, description: "x", isEdgeCase: false }])`. Then call the browser `runTests` with the same arguments and watch it hang. Explain why `TIME_BUDGET_MS` stops one and not the other.
5. Write a unit test for `gradeMulti` covering: all right, one right plus one wrong (score 0), all options picked (not correct, score reduced). Compare yours with the `multi-select partial credit` block in `grader.test.ts`.

> **Junior vs senior**
>
> **Junior:** "The client already graded it, so I'll POST `{ correct: true }` and save it." Or: "It runs in `vm` with a timeout, so it's sandboxed."
>
> **Senior:** "Grading is a pure function shared by client and server, and the server's verdict wins. The body is validated field by field and anything extra is dropped. I list what the server still takes on faith, `timeSpent` and `attempt`, in a comment on the route. And I say plainly what the vm runner buys: liveness against an accidental loop, not isolation. Fine for a local app, a blocker for a hosted one."
