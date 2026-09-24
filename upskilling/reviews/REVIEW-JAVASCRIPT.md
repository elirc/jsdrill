# Review: `src/content/tracks/javascript.ts`

Scope: all 93 items across 9 modules, plus briefs and keyIdeas. The newly added modules (js-functions, js-dom) and the appended items got the closest checks.

## Author-flagged claims (verified)

| Claim | Verdict |
|---|---|
| localStorage/sessionStorage ~5 MB per origin; cookies ~4 KB each | OK as approximations (Chrome/Safari ~5 MB, Firefox 5 MiB per origin group; 4096 bytes per cookie) |
| Node >= 15 terminates on unhandled rejection by default | OK (`--unhandled-rejections=throw` default since v15) |
| WeakMap keys: objects or non-registered symbols (ES2023) | OK (Symbols-as-WeakMap-keys, ES2023) |
| rAF paused in background tabs in most browsers | OK |
| React delegated to `document` before v17, root container from v17 | OK |
| DOMContentLoaded does not wait for images/iframes/async scripts | OK |
| redux-saga and co as generator examples | OK |

The other items in the brief also check out. These include arrow limits, call/apply/bind (including the `new` exception), IIFE purpose, strict mode, call-time defaults, rest position, capture/bubble, target vs currentTarget, the stop/prevent trio, defer/async, readyState values, the error types (RangeError for `new Array(-1)`, `(1).toFixed(200)` and V8 stack overflow), `Error.cause` ES2022, mark-and-sweep, map vs forEach, structuredClone (throws on functions, drops prototypes, handles cycles/Map/Set/RegExp) and live bindings (importer assignment throws TypeError).

## (A) Confirmed errors — all fixed in the file

1. **js-types-typeof-null** (distractor "Throws a TypeError"). The file said "`typeof` never throws, even on undeclared variables." That is false: `typeof x` throws a `ReferenceError` when `x` is a `let`/`const`/`class` binding in the TDZ. Fix: the why now says `typeof null` never throws and that `typeof` is safe on undeclared names, with the TDZ case as the one exception.

2. **js-arr-map-vs-object** (distractor "An array of `[key, value]` pairs"). The file said "that is what `Map` is built on top of." That is false: engines implement `Map` as a hash table, and the spec requires sublinear access time. Fix: "Lookup becomes O(n). `Map` is a hash table under the hood, giving average constant-time lookup."

3. **js-arr-reduce** (distractor "`undefined`"). The file said "It would be, if the callback forgot to return `acc`." That is false for this code: without `return acc`, the second iteration runs `undefined.push` and throws a `TypeError`. The item's own `why` says the same thing, so the distractor contradicted it. Fix: reworded to say it would throw.

4. **js-this-lost**. The prompt did not say what the runtime is, yet the keyed answer ("TypeError — `this` is undefined") only holds in strict/module code. In a sloppy browser script `this` is `window` and `window.name` defaults to `""`, so the code prints `Hi `. That makes the distractor's why ("`this` is not an empty object here") wrong and the question have two defensible answers. Fix: the prompt now says "This code runs as an ES module". The whys for `Hi undefined` (Node CJS sloppy) and `Hi ` (sloppy browser) are corrected.

5. **js-this-arrow** (why). The file said a regular function passed to `setInterval` gets "`this` … `undefined` (strict) or the global object." That is false: the HTML timer steps invoke the callback with an explicit callback-this of the `WindowProxy`, so `this` is `window` even in strict code. In Node it is the `Timeout` object. Fix: the why now says this and notes that `this.seconds++` hits the wrong object (NaN) rather than the instance.

6. **js-modules keyIdea + brief**. The file said "you cannot `require()` an ES module synchronously." That is outdated: `require(esm)` has been unflagged since Node 22.12 and 20.19 for ES modules without top-level `await`. Every Node line still supported in 2026 has it. Fix: the keyIdea and brief paragraph now give the version and the top-level-await restriction.

7. **js-dom-live-collection** (why). The file said "`getElementById` and friends take a single id or class name." That is inaccurate: `getElementsByClassName("a b")` takes a space-separated class list. Fix: "take a plain id, class list or tag name rather than a selector."

8. **js-dom-defer-async** (why). The file said "Both attributes only apply to external scripts with a `src`." That is false for modules: `async` works on module scripts, including inline ones. Fix: "For classic scripts both attributes only apply to external scripts with a `src`; `type="module"` scripts are deferred by default (and accept `async`, even inline)."

## (B) Debatable — not changed

- **js-types keyIdea 2 / js-types-plus tip**: "every other operator coerces to number" and "`+` is the only operator that prefers strings". The relational operators (`<`, `>`) compare two strings lexicographically without converting them, so the claim is too broad. The brief correctly says "arithmetic operator". Suggestion: "every other *arithmetic* operator coerces to number."
- **js-this keyIdea 1**: "bare `fn()` → undefined". This holds only in strict mode or modules; sloppy mode gives the global object. The brief qualifies it. Suggestion: "bare `fn()` → undefined (strict) / global (sloppy)."
- **js-async-micro-macro**: "`process.nextTick` runs even before promise microtasks". This holds in CommonJS. In an ESM entry module the code already runs inside a microtask, so pending promise jobs can run before nextTick callbacks. Suggestion: add "(in CommonJS)".
- **js-async-gen-vs-async** (distractor): "`yield` is a syntax error outside a generator". In sloppy code `yield` is a valid identifier. Suggestion: "`yield` expressions are only valid inside a generator."
- **js-dom-readystate**: "`interactive` … (just before `DOMContentLoaded`)". Deferred scripts run between the two. Suggestion: "once parsing is done, before deferred scripts and `DOMContentLoaded`."
- **js-scope-chain** (distractor): "`typeof` is the one operator that does not [throw]". The same TDZ caveat as A1 applies, but the context is undeclared names, so it is acceptable.
- **js-async-sequential** (distractor): "Independent work can always be overlapped". "Always" is strong: rate limits and a shared DB connection can prevent it. Suggestion: "usually".

## (C) Duplicates / quality

- **Arrow `this` is asked twice**: js-fn-arrow-limits (first choice) and js-this-arrow. The keyIdea is also duplicated between js-functions and js-this. Consider having js-this-arrow focus only on the `setInterval` receiver.
- **IIFE**: js-scope-iife (blank, loop capture) and js-fn-iife (why IIFEs existed). They are complementary, but both explanations cover "pre-ES6 workaround".
- **Deep copy is covered three times**: js-arr-shallow-copy, js-coll-structuredclone and the JSON distractor in js-mod-modern all state "JSON loses Date/Map/Set/functions; use structuredClone".
- **`Object.create`**: js-obj-create-ways (choice + why incl. `Object.create(null)`) overlaps with js-this-object-create.
- **Promise.all keeps the others running**: stated in both js-async-all-vs-allsettled and js-async-all-cancels.
- **GC**: js-quality-gc-cycles (tf) and js-quality-explain-gc (short) share most of their content (reachability, cycles are fine).
- **DOMContentLoaded / readyState**: js-dom-domcontentloaded ends with the readyState tip, which is also the whole subject of js-dom-readystate.
- **Delegation / target**: js-dom-delegation, js-dom-target and js-dom-explain-event-flow overlap on purpose (the short one is a synthesis). This is acceptable.
- No `multi` is defensibly "all correct". Every multi has at least two distractors that are clearly wrong.

## (D) Verdict

The track is in good shape overall. The new js-functions and js-dom modules are mostly accurate, and every author-flagged fact checked out. I found **8 confirmed errors (A)**, all now fixed, plus **7 debatable wordings (B)** and **8 duplication/overlap notes (C)**.

The most serious error was **js-this-lost**. Because the prompt did not specify strict/module code, the keyed answer was only right under an unstated assumption. In the most common interview setting (a browser script) a distractor was actually correct (`Hi `), and its explanation was wrong. The next most serious were the outdated Node claim that `require()` cannot load ESM and the incorrect `setInterval` `this` explanation in js-this-arrow.

After the fixes, `npx tsx scripts/check-content.ts` reports "No problems found" (the only warnings are in the C# track) and `npx tsc --noEmit` is clean.
