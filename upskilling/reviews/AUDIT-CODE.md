# Code audit: backend and frontend refactor (uncommitted working tree)

Reviewer: adversarial senior review, read-only. Scope: `src/lib`, `src/app/api`, `src/app/app`, `src/components`, `scripts` (not `src/content/**` or `upskilling/**`).
Baseline: `HEAD` = `c027fca`. Known green: `tsc`, `eslint`, `vitest` (78 tests), `check-content`, `next build`, e2e. This audit looks for what those checks miss.

I checked runtime behaviour of the `node:vm` runner by bundling `src/lib/executor.server.ts` with esbuild into a scratch script. The numbers below come from those runs, not from reading the code.

---

## 1. What the refactor changed

**Backend**

- **Server grading runs in `node:vm`** (`src/lib/executor.server.ts`, new). `runTests` now takes a pluggable `compile` (`executor.ts` `RunOptions`). `grade()` takes an optional `runTests` (`grader.ts` `GradeOptions`). The attempts route and `check-content` use `serverGradeOptions`. The client path is unchanged and still pure: `grader.ts` imports only `executor.ts`, which has no `node:vm`.
- **Function discovery is stricter**: `definedFunctionNames` ignores comments, `extractFunctionName(code, expected)` prefers the starter's name, and a helper defined first is no longer called by mistake.
- **`deepEqual` rewritten** (`utils.ts:70-141`). It compares by tag, so it works across realms. It follows JSON semantics (`undefined` keys count as absent, `-0 == 0`, `NaN == NaN`), handles Map, Set and RegExp, and survives cycles.
- **Day bucketing uses local dates** (`localDateKey`, `startOfLocalDay`, `addLocalDays`). It is used for streak, activity, forecast and `answeredToday`. No `toISOString().slice(0, 10)` bucketing remains in server code. I grepped for it.
- **Soft delete in seed** (`seed.ts:419-431`). Items missing from content are set to `is_published = 0` instead of being deleted, and republished if they come back. The whole seed is one transaction. `migrate()` now diffs against an in-memory copy of the DDL.
- **Published-only analytics** (`progress.ts`). A shared `ProgressContext` loads cards and items once per request. `trackProgress`, `moduleProgress`, `conceptStrengths`, `dashboard`, `maybeUnlockNextLevel` and `overdueCount` count only published items. Tracks and modules with nothing published are hidden.
- **`buildSession` rewritten** (`sessionBuilder.ts`). It reads the published items once and filters in memory. Filler no longer breaks the level gate. Interview widening no longer pulls in unpublished items. Within a module, easier items come first.
- **Shared API helpers** (`src/lib/api.ts`): `ok`, `fail`, `parseJson` with a guard and size limit, and `serverError`. All routes validate bodies (4xx, not 500) and log 500s server-side. `DEFAULT_USER_ID` lives in `src/lib/user.ts`.
- **The DB opens lazily** through a Proxy (`db/index.ts`), cached on `globalThis`, with `REPS_DB_PATH` as an override. `next build` no longer creates an empty `reps.db`.

**Frontend**

- **`useDrillSession`** (new) holds the session loop for both drill and interview: load, answer, retry, record, advance, and the Enter key. Each load is tagged with a `loadKey`, so stale responses cannot land. `restart()` reloads the same query.
- **`useApi`** (new) replaces the hand-written fetch effects on every page, and every page now has an `ErrorState`. **`useStoredState`** (new) uses `useSyncExternalStore` over localStorage with an in-memory fallback.
- **`ui/index.tsx` split into files** (`Button`/`LinkButton`, `Card`/`Stat`, `Badge`, `Progress`, `Markdown`, `States`). The barrel still exports everything the old file did, plus `LinkButton`, `ErrorState` and `BadgeTone`.
- **Accessibility pass**:
  - Skip link, `aria-current` on navigation, `aria-pressed` on toggles.
  - A live region that stays mounted for verdicts, and focus moves to the prompt on each new question.
  - Screen-reader verdict text on choices and blanks.
  - `LinkButton` replaces `<Link><Button>`.
- **Keyboard**:
  - Digit shortcuts pick choices.
  - Enter on a `data-drill-choice` button checks the answer.
  - Enter in a textarea or in CodeMirror is left alone.
  - Mod-Enter is removed from CodeMirror's keymap, so it runs the code instead.

### Checked and found correct (no action needed)

- **Retry state machine** (`useDrillSession.ts:281-325`) matches `HEAD`.
  - A first miss on mcq, predict-output or fill-blank goes to retry. For mcq and predict-output the selection is cleared and the wrong pick is disabled (`Answers.tsx:101-110, 137`). For fill-blank the values are kept and correct blanks are locked (`Answers.tsx:392`).
  - The second submit posts `attempt: 2` and caps the score at 0.5.
  - "Just show me" posts `firstResponse.current` with `attempt: 1`.
  - The interview passes `allowRetry: false` and `adoptServerGrade: false`, and its clock keeps ticking while a question is on screen.
- **Enter handling** (`useDrillSession.ts:127-145`):
  - A plain Enter in the explain-it textarea does not submit.
  - Enter on a focused choice checks the answer. The window listener's `preventDefault` stops the native click.
  - Enter in a fill-blank `<input type=text>` checks, which replaces the old per-input `onKeyDown`.
  - IME composition and key repeat are ignored.
- **`key={item.id}` is kept** on `DrillCard` in both the drill and the interview.
- **Primer**: the server's `firstTime` rule is the same as before. On the client, the primer shows for the first item from a module in a session, and is suppressed in module mode. That suppression is a deliberate change, documented at `drill/page.tsx:95-102`.
- **Bookmarks** now load from the server. Before, they always started empty, which was a latent bug. Toggles are optimistic and roll back on failure.
- **Soft delete is filtered everywhere a total is computed**: sessions (`sessionBuilder.ts:37`), track and module totals, mastery denominators, unlock (`progress.ts:275`), concept strengths (`progress.ts:335-339`), dashboard `totalItems` and filtered cards (`progress.ts:454-467`), `overdueCount` (join at `:592-596`), cheat sheet (through `moduleProgress`), module detail (`path/route.ts:122, 128`), and concept items (`items/route.ts:178`). An unpublished item cannot block 100% mastery.
- **`parseJson`** always returns either `{ value }` or `{ response }`. `if (parsed.response) return parsed.response` narrows it correctly. Malformed JSON, `null`, arrays or wrong shapes return 400, and bodies over the limit return 413.

---

## 2. Confirmed bugs

**Count: 6.** B1–B3 are in the new server executor. The executor's header comments promise things it does not deliver.

### B1. Server and browser graders give different verdicts on the same learner code. Severity: **High**

- **Where:** `src/lib/executor.server.ts:74-84`, with `src/lib/executor.ts:164`.
- **What happens:** `cloneArgs` runs in the host realm, so test inputs reach the learner's code as host-realm arrays and objects. Inside the vm context, `Array` and `Object` are different constructors.
  - Measured: `function g(items){ if(!(items instanceof Array)) return 'nope'; return items.length }` with input `[[1,2]]` returns `2` in the browser runner and `"nope"` in `runTestsServer`.
  - Also affected: `x.constructor === Object`, `Object.getPrototypeOf(x) === Object.prototype` (the usual `isPlainObject` guard in deep-clone and groupBy answers), and `x instanceof Map`.
- **Why it matters:**
  - **Drill:** the browser grades first and shows **"Correct"**. Then `adoptServerGrade` (`useDrillSession.ts:256-266`) swaps in the server's verdict, and the card flips to **"Not quite"**. FSRS records a lapse (Again) for a correct answer.
  - **Interview:** the scorecard keeps the local "correct" (`adoptServerGrade: false`), while the review schedule records a failure.
  - `check-content.ts` checks runner parity only for the *reference* solution, so this never shows up in CI.
- **Fix:** rebuild the inputs inside the context realm before each call. In `vmCompile`:

```ts
// After vm.createContext(...):
// Rebuild inputs with the context's own constructors, so `instanceof Array`,
// prototype checks and `constructor === Object` behave as they do in the browser.
const importDeep = new vm.Script(`(function importDeep(v, seen = new Map()) {
  if (v === null || typeof v !== "object") return v; // primitives and functions pass through
  if (seen.has(v)) return seen.get(v);
  const tag = Object.prototype.toString.call(v);
  let out;
  if (tag === "[object Array]") { out = []; seen.set(v, out); for (const x of v) out.push(importDeep(x, seen)); }
  else if (tag === "[object Date]") { out = new Date(v.getTime()); }
  else if (tag === "[object Map]") { out = new Map(); seen.set(v, out); for (const [k, x] of v) out.set(importDeep(k, seen), importDeep(x, seen)); }
  else if (tag === "[object Set]") { out = new Set(); seen.set(v, out); for (const x of v) out.add(importDeep(x, seen)); }
  else if (tag === "[object RegExp]") { out = new RegExp(v.source, v.flags); }
  else { out = {}; seen.set(v, out); for (const k of Object.keys(v)) out[k] = importDeep(v[k], seen); }
  return out;
})`).runInContext(context) as (v: unknown) => unknown;

return (args) => {
  context.__args = importDeep(args);   // was: context.__args = args
  ...
};
```

- **Also add:** a parity test that grades learner-style variants (`instanceof Array`, a `constructor === Object` guard, `Object.getPrototypeOf`) with both runners and expects the same result. Optionally extend `check-content` to grade a few such mutations of each reference solution.

### B2. Host timers and microtasks escape the vm timeout, so one callback can hang the API process for good. Severity: **Medium**

- **Where:** `src/lib/executor.server.ts:43-45`. `sandboxGlobals()` passes the host's `setTimeout`, `clearTimeout` and `queueMicrotask` into the context.
- **What happens:** callbacks scheduled through these run on the **host** event loop, outside `runInContext`, with no timeout.
  - Measured: a 1.5 s busy loop scheduled with `setTimeout(..., 0)` delayed the host's own timer by **1775 ms**.
  - Measured: a 1.2 s busy loop scheduled with `queueMicrotask` delayed a host microtask by **1519 ms**.
  - With `while (true) {}` in the callback, the Next server stops answering every request until it is restarted.
- **Why it matters:** this contradicts the stated guarantee. `executor.ts:18` says "cannot wedge the API process" and `executor.server.ts:6-8` says it "costs two seconds". It is easy to trigger by accident in a debounce or throttle answer, and the JS track teaches both.
- **Fix:** timers can never affect a synchronous verdict (in the browser they fire after grading too), so make them inert. Queue microtasks on the context's own queue, which `microtaskMode: "afterEvaluate"` runs inside the timeout:

```ts
function sandboxGlobals(): Record<string, unknown> {
  const noop = () => {};
  return {
    console: { log: noop, info: noop, warn: noop, error: noop, debug: noop, table: noop },
    structuredClone, URL, URLSearchParams, TextEncoder, TextDecoder,
    // Inert: the runner is synchronous, so a timer can never change a verdict,
    // and a host timer would run learner code outside the vm timeout.
    setTimeout: () => 0, clearTimeout: noop, setInterval: () => 0, clearInterval: noop,
  };
}
// After createContext: a context-realm queueMicrotask, so its jobs run
// inside the timeout (microtaskMode "afterEvaluate").
new vm.Script("globalThis.queueMicrotask = (cb) => { Promise.resolve().then(cb); };").runInContext(context);
```

- **Also add** a regression test: a `setTimeout` or `queueMicrotask` callback containing a busy loop must not delay a host timer by more than a few milliseconds.

### B3. The time limit applies per test, not per run, so one infinite loop blocks the server for N × 2 s. Severity: **Medium**

- **Where:** `src/lib/executor.ts:159-193`. The header claims are at `executor.server.ts:6-8` and `executor.ts:17-18`.
- **What happens:** each test gets its own 2000 ms `vm` timeout, and a timeout does not stop the remaining tests. Measured: 4 test cases against `function f(){ for(;;){} }` blocked the event loop for **8.6 s**, during which every other request waits. The "costs two seconds" comment is wrong.
- **Fix:** stop after the first timeout. This is fine for the browser runner as well:

```ts
let timedOut = false;
const results: TestVerdict[] = tests.map((tc) => {
  if (timedOut) {
    return { passed: false, error: "Timed out — skipped after an earlier case timed out.", testCase: tc };
  }
  try {
    ...
    if (elapsed > TIME_BUDGET_MS) { timedOut = true; return { /* existing timeout verdict */ }; }
    ...
  } catch (e) {
    if (isTimeout(e)) timedOut = true;
    ...
  }
});
```

The skipped message starts with "Timed out", so `classifyError` still returns `"timeout"`. Then correct the two header comments to say "at most `TIME_BUDGET_MS` per submission".

### B4. `eval` and `new Function` work in the browser but throw on the server. Severity: **Low**

- **Where:** `src/lib/executor.server.ts:61`, `codeGeneration: { strings: false, wasm: false }`.
- **What happens:** `function f(){ return new Function('return 1')() }` passes in the browser, but on the server throws `EvalError: Code generation from strings disallowed for this context` (measured). The effect is the same as B1: a drill verdict that flips after it is shown. It is rare in interview answers, but it is an unexplained difference.
- **Fix:** remove the `codeGeneration` option. `vm` is documented as not being a security boundary, so the restriction protects nothing. Or keep it and make the browser runner reject string code generation too.

### B5. The dashboard forecast calls today's bucket "due now", but it counts everything due before midnight. Severity: **Low**

- **Where:** `src/app/app/dashboard/page.tsx:260` (`"… due now"`), `:275` (`"due now"` title), `:279` (`"now"` label). The data comes from `progress.ts:491-508`.
- **What happens:** day 0 was changed to "due by the end of today, overdue included", but the UI still says "now". The Today page's `today.due` uses `overdueCount()`, which counts `due <= now`. The two pages therefore show different numbers for "due" at the same moment.
- **Fix:** change the three labels to "today" (for example `${forecast[0]?.count ?? 0} due today`, and `i === 0 ? "today" : …`). Or send both `dueNow` (already in `stats.dueNow`) and `dueToday`, and show the one that matches each label.

### B6. The fill-blank placeholder syntax differs between the content check and the UI. Severity: **Low (latent)**

- **Where:** `scripts/check-content.ts:268` accepts `\{\{\s*([\w-]+)\s*\}\}`. `src/components/drill/Answers.tsx:354` renders only `\{\{(\w+)\}\}`.
- **What happens:** a template written as `{{ a }}` or `{{blank-1}}` passes the new "every blank appears in the template" check. The UI then prints it as literal text with no input, so `isAnswered` never becomes true and the learner is stuck on that card. No current content triggers this, but the new check claims to guard against exactly this.
- **Fix:** move the regex into one exported constant, for example `export const BLANK_PLACEHOLDER = /\{\{(\w+)\}\}/g` in `src/types` or `grader.ts`, and use it in both places. Or widen the UI regex to match the checker, but then JSX `{{ … }}` inside a template becomes a problem.

---

## 3. Risks and smells to fix later

**Stale or missing comments**

- `CodeEditor.tsx:84`: the `eslint-disable-next-line react-hooks/exhaustive-deps` is **still justified**. The mount effect deliberately reads only the initial `value`, and the effect at `:89-97` syncs later values. But the disable line has no reason next to it; the explanation is 50 lines up at `:35`. Better: `const initialDoc = useRef(value)` and `doc: initialDoc.current`, which removes the disable entirely. At minimum, add `-- initial doc only; later values sync via the effect below`.
- `CodeEditor.tsx:100-102`: read-only is enforced by `setAttribute("contenteditable")`, which bypasses CodeMirror's `EditorView.editable` facet. Use a `Compartment` holding `EditorView.editable.of(!readOnly)` and `EditorState.readOnly.of(readOnly)`. (Pre-existing.)
- `dashboard/page.tsx:18-21`: the comment still says the server keys days "as UTC calendar dates (from toISOString)". They are local keys now. Formatting them with `timeZone: "UTC"` still gives the right label, so only the comment is wrong.
- `executor.ts:17-18` and `executor.server.ts:6-8` overstate what the runner guarantees. See B2 and B3.

**Dead or duplicated code**

- `sessionBuilder.ts:407` `dueCount()` is unused and duplicates `progress.ts:588` `overdueCount()`. Delete it.
- `db/index.ts:53` `getSqlite()` is unused.
- `grader.ts:274` `keyPointsOf()` is unused.
- `useDrillSession`'s `onRecorded` option (`:47, :152, :271`) is never passed by any caller.
- `useApi`'s `loading` return value is never read.
- `DEFAULT_USER_ID` is re-exported from both `progress.ts:32` and `sessionBuilder.ts:14`. Import it from `@/lib/user` only.

**Race conditions and error handling**

- `useApi.ts:31-45` and `useDrillSession.ts:176-186`: the `.then` branch does not check `controller.signal.aborted`. If a request is aborted mid-body, `res.json()` fails, and an error is stored under the *old* key. Keys are `url#nonce`, and the nonce does not change on URL changes. So A→B→A can briefly show A's stale error or data until the new load lands. Add `if (controller.signal.aborted) return;` after the `await`.
- `useDrillSession.ts:244-245`: when the attempt POST returns `success: false` (404, 500), it is ignored silently, and `recorded` stops any retry. The learner believes the answer was scheduled. Show a small "not saved" note.
- `db/index.ts:36-40`: the helpful "Run `npm run db:seed`" message only reaches the server log. The drill shows "Failed to build session". Consider sending a specific 503 when the DB is missing.
- `drill/page.tsx:73`: the `EmptyState` body shows literal backticks around `npm run db:seed`.

**API hygiene**

- `api.ts:50`: `text.length` counts UTF-16 code units, not bytes, and a chunked body with no Content-Length is buffered in full before the check. That is acceptable locally, but the name `MAX_BODY_BYTES` is misleading.
- `interview/route.ts:62`: `...(body as InterviewScore)` stores arbitrary extra keys (up to 32 KB), and `byTrack` elements are not validated. At `:37-44`, `parseScore` returns `{}` for a corrupt row, which `PastRuns` renders as "undefined%". Skip corrupt rows instead.
- `attempts/route.ts:134` accepts attempts for **unpublished** items (for example from a stale tab), which creates cards for hidden content. They are filtered out of every total, so it is harmless, but `and(eq(id), eq(isPublished, true))` would be cleaner.
- `bookmarks/route.ts:20-24` `GET` returns unpublished items too. It only matters if a bookmarks page is added.
- `progress.ts:425-446`: `recomputeStreak` writes during `GET /api/dashboard`. This is pre-existing. The early return at `:430` leaves a stale stored streak when no attempts exist.

**Keyboard and accessibility**

- Enter on a focused, *unselected* choice does nothing (`useDrillSession.ts:140-141`), because `submit` needs a selection. Keyboard users must use Space. Consider "Enter selects if nothing is selected, otherwise checks".
- Order items: Enter on the ▲/▼ buttons moves the step rather than checking, while `KeyHint` (`SessionChrome.tsx:207`) says "Enter to check".
- `KeyHint` always says "Ctrl" for code; on macOS it should be "⌘".
- `useDigitShortcuts` (`Answers.tsx:53-64`) ignores neither `e.repeat` nor `e.isComposing`.

**Executor details**

- `__factory` and `__args` are globals the learner's code can see. Rename them to something collision-proof.
- `structuredClone` and `URL` in the sandbox are host-realm objects, which is the same realm caveat as B1.
- `executor.ts:71` `stripComments` also strips `//` inside strings and regex literals. It only affects function-name detection, so the risk is low.

**Hygiene**

- `scripts/check-content.ts:293` contains a literal NUL byte (pre-existing), so git treats the file as binary and hides its diffs from review. Write `"\u0000not-an-answer"` instead.

---

## 4. Test coverage

**What is covered.**

- **Vitest (78 tests):**
  - Grader, for every kind: partial credit, malformed input, `normalizeBlank`.
  - Browser executor: harness, syntax, runtime and timeout mapping, cloning, `classifyError`.
  - vm runner: basic parity, a cross-realm array/object/Date *result*, an infinite loop in the called function, syntax errors, `console`.
  - `deepEqual`, including a cross-realm Date and cycles.
  - Markdown and inline rendering.
  - `localDateKey` and `streakFromDays`.
  - `ratingFor` and the FSRS round trip.
- **e2e (API-level):**
  - Attempts and ratings.
  - Retry scoring through `attempt: 2`.
  - Unlock.
  - Dashboard shape.
  - Module 404.
  - Cheat sheet.
  - Server rejects a spoofed answer.
- **Not covered at all:**
  - Any React code: `useDrillSession`, `useApi`, `useStoredState`, the key handling.
  - `buildSession`, and the `progress.ts` queries against a real database.
  - `seed` and `migrate`.
  - The 4xx validation paths.

**The five most valuable tests still missing**

1. **Runner parity on learner-style variants (catches B1 and B4).** A table of small solutions (`instanceof Array`, an `isPlainObject` guard, `x.constructor === Object`, `new Function`), each graded by `runTests` and `runTestsServer`, with `expect(server.allPassed).toBe(browser.allPassed)`.
2. **vm liveness (catches B2 and B3).**
   - A `setTimeout` or `queueMicrotask` callback containing a busy loop must not delay a host `setImmediate` by more than about 50 ms.
   - A looping function with 4 test cases must finish in under about 2.5 s.
3. **`useDrillSession` state machine** (Vitest + jsdom + `@testing-library/react`, with `fetch` mocked):
   - A first mcq miss leads to `retrying`, the wrong pick is disabled, and the second submit posts `attempt: 2`.
   - "Just show me" posts the *first* response with `attempt: 1`.
   - `allowRetry: false` never retries.
   - Enter in a textarea does not submit; Enter on a `[data-drill-choice]` button submits without toggling.
   - A slow attempt response after `restart()` is dropped.
4. **Soft-delete integration.** Seed a temp DB (`REPS_DB_PATH`), answer an item, remove it from content and reseed. Check that:
   - The attempt and card rows survive.
   - The item is absent from `buildSession`.
   - `trackProgress().totalItems`, `moduleProgress`, `dashboard().stats.totalItems` and `overdueCount` all drop by one.
   - Mastery can reach 100.
   - Re-adding the item republishes it with its history.
5. **Route validation.** `POST /api/attempts`, `/api/bookmarks` and `/api/interview` with invalid JSON, `null`, an array, `values: null`, `order: "abc"`, `code` over 50k characters, and a body over 256 KB should return 400 or 413 and never 500. An unknown `itemId` should return 404. These can call the route handlers directly with a `Request`, without a server.

---

## 5. Verdict

**Approve after fixing B1–B3.** All three are in `src/lib/executor.server.ts` (plus about 5 lines in `executor.ts`).

The refactor is a clear improvement:

- The session loop is in one place and the retry behaviour matches `HEAD` exactly.
- Soft delete is filtered on every total, and local dates are used consistently.
- Validation is real, error states exist everywhere, and the accessibility work is substantial.

The main hazard is that the new server executor causes the problems it was added to prevent:

- It disagrees with the browser, so a verdict flips after the learner has seen it and FSRS records a lapse for a correct answer (B1).
- It can still wedge the server (B2, B3).

B4–B6 and section 3 can follow in a cleanup PR.
