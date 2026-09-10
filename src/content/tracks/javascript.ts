import { defineTrack, mod, mcq, multi, tf, out, blank, code, short, t } from "../builder";

export default defineTrack({
  slug: "javascript",
  name: "JavaScript",
  tagline: "The language everything else on this list sits on",
  description:
    "Coercion, scope, closures, `this`, and the event loop — the parts of JavaScript that interviewers probe because they predict whether you can read unfamiliar code.",
  icon: "JS",
  color: "#eab308",
  modules: [
    // ─────────────────────────────────────────────────────────
    mod("js-types", {
      title: "Types & Coercion",
      level: 1,
      summary: "The seven primitives, truthiness, and why `==` has a bad reputation.",
      brief: `JavaScript has **seven primitives** — \`string\`, \`number\`, \`boolean\`, \`null\`, \`undefined\`, \`symbol\`, \`bigint\` — and everything else is an object (including arrays and functions).

**Coercion** is the language converting operands to a common type before working with them. Two rules cover most of it:

- \`+\` prefers string concatenation if *either* side is a string. Every other arithmetic operator converts to number.
- \`==\` coerces before comparing; \`===\` compares type first and returns false if they differ.

**Falsy values** are the entire list you need to memorise: \`false\`, \`0\`, \`-0\`, \`0n\`, \`""\`, \`null\`, \`undefined\`, \`NaN\`. Everything else — including \`[]\`, \`{}\` and \`"0"\` — is truthy.

The practical takeaway: use \`===\` by default. The one idiomatic exception is \`x == null\`, which is true for exactly \`null\` and \`undefined\` and is a genuinely useful shorthand.

\`null\` vs \`undefined\`: \`undefined\` means "no value has been assigned yet" and is what the runtime gives you; \`null\` means "explicitly nothing" and is what *you* assign.`,
      items: [
        out("js-types-typeof-null", {
          q: "What is logged?",
          code: `console.log(typeof null);`,
          why: "`typeof null` returns `\"object\"`. This is a bug from the first version of JavaScript — the type tag for objects was `0`, and the null pointer was also all zeroes. It was never fixed because doing so would break the web. To actually test for null, use `value === null`.",
          tip: "A classic warm-up. Getting it right signals you have read about the language, not just used it.",
          c: ["coercion", "static-types"],
          choices: [
            { t: `"object"`, ok: true, why: "Correct — a legacy tagging bug that is now permanent." },
            { t: `"null"`, why: "There is no `\"null\"` typeof result." },
            { t: `"undefined"`, why: "That is `typeof undefined`." },
            { t: "Throws a TypeError", why: "`typeof` never throws, even on undeclared variables." },
          ],
        }),
        multi("js-types-falsy", {
          q: "Which of these are **falsy** in JavaScript?",
          why: "The complete falsy list is `false`, `0`, `-0`, `0n`, `\"\"`, `null`, `undefined`, `NaN`. Notably `[]` and `{}` are **truthy** — an empty array in a boolean context is `true`, which is why `if (arr)` never tells you whether the array has items. Use `arr.length` for that.",
          tip: "Interviewers use this to check you will not write `if (results)` when you meant `if (results.length)`.",
          c: ["coercion"],
          d: 1,
          choices: [
            { t: "`0`", ok: true },
            { t: '`""` (empty string)', ok: true },
            { t: "`NaN`", ok: true },
            { t: "`null`", ok: true },
            { t: "`[]` (empty array)", why: "Truthy — objects are always truthy, and arrays are objects." },
            { t: "`{}` (empty object)", why: "Truthy for the same reason." },
            { t: '`"0"` (string zero)', why: "A non-empty string is truthy, regardless of contents." },
          ],
        }),
        out("js-types-plus", {
          q: "What is logged?",
          code: `console.log(1 + "2");
console.log(1 - "2");
console.log("3" * "4");`,
          why: "`+` is overloaded: if either operand is a string it concatenates, so `1 + \"2\"` is `\"12\"`. Every other arithmetic operator has only the numeric meaning, so it coerces both sides to number: `1 - \"2\"` is `-1` and `\"3\" * \"4\"` is `12`.",
          tip: "The rule to state out loud: `+` is the only operator that prefers strings.",
          c: ["coercion"],
          d: 2,
          choices: [
            { t: `"12"\n-1\n12`, code: true, ok: true, why: "Correct — `+` concatenates, the others coerce to number." },
            { t: `3\n-1\n12`, code: true, why: "`1 + \"2\"` does not add numerically; the string wins." },
            { t: `"12"\n"-1"\n"12"`, code: true, why: "Only `+` produces a string here." },
            { t: `"12"\nNaN\nNaN`, code: true, why: "`\"2\"` and `\"4\"` are numeric strings, so they convert cleanly." },
          ],
        }),
        mcq("js-types-nullish", {
          q: "What is the difference between `??` and `||`?",
          code: `const a = 0 || 10;
const b = 0 ?? 10;`,
          why: "`||` falls back on any **falsy** left side, so `0`, `\"\"` and `false` all trigger the fallback — `a` is `10`. `??` (nullish coalescing) falls back only on `null` or `undefined`, so `b` is `0`. This matters constantly for settings: `const port = config.port ?? 3000` respects an explicitly configured `0`, while `||` would silently override it.",
          tip: "Naming a real bug this prevents — a legitimate `0` or empty string being replaced by a default — is what separates a memorised answer from an experienced one.",
          c: ["coercion", "nullability"],
          d: 2,
          choices: [
            { t: "`a` is `10`, `b` is `0`", ok: true, why: "Correct — `??` only treats null/undefined as missing." },
            { t: "`a` is `0`, `b` is `10`", why: "Backwards: `||` is the one that rejects `0`." },
            { t: "Both are `10`", why: "`??` accepts `0` as a real value." },
            { t: "Both are `0`", why: "`0` is falsy, so `||` takes the right-hand side." },
          ],
        }),
        tf("js-types-nan", {
          q: "`NaN === NaN` evaluates to `true`.",
          answer: false,
          why: "`NaN` is the only value in JavaScript not equal to itself — it means 'the result of a numeric operation that has no meaningful number', and two such failures are not the same failure. Test with `Number.isNaN(x)` (which does not coerce) rather than the older global `isNaN(x)` (which does, so `isNaN(\"hello\")` is surprisingly `true`).",
          c: ["coercion", "equality"],
          d: 2,
        }),
        mcq("js-types-null-undefined", {
          q: "When does the JavaScript runtime itself give you `undefined` rather than `null`?",
          why: "The runtime produces `undefined` for: an unassigned variable, a missing object property, a missing function parameter, and the return value of a function with no `return`. `null` is never produced automatically — it only appears where a programmer (or an API) explicitly assigned it. That is the convention worth stating: **`undefined` is the language's absence, `null` is yours**.",
          c: ["nullability"],
          d: 2,
          choices: [
            {
              t: "Reading a property that does not exist on an object",
              ok: true,
              why: "Correct — along with unassigned variables, missing arguments and implicit returns.",
            },
            { t: "Calling `JSON.parse(\"null\")`", why: "That returns `null` — it is data you asked for." },
            { t: "`document.querySelector` finding no match", why: "DOM APIs deliberately return `null` for 'searched and found nothing'." },
            { t: "Both of the above", why: "Both of those are explicit `null` by design." },
          ],
        }),
        short("js-types-explain-coercion", {
          q: "An interviewer asks: *\"When would you ever use `==` instead of `===`?\"* Answer out loud.",
          why: "This checks whether you follow rules or understand them. The strong answer names the single idiomatic exception and the reasoning behind the default.",
          model:
            "Almost never — I default to `===` because `==` runs a coercion algorithm most people cannot recite, which makes the code's behaviour non-obvious to the next reader.\n\nThe one exception I do use is `x == null`, which is true for exactly `null` and `undefined` and false for everything else. It is a concise way to say 'is this missing?' without writing `x === null || x === undefined`. Some linters even allow it as a special case.\n\nOtherwise, if I find myself wanting coercion, I convert explicitly — `Number(input)` or `String(id)` — so the conversion is visible at the point it happens rather than hidden in a comparison.",
          points: [
            "Default to `===` because coercion rules are non-obvious to readers",
            "`x == null` is the idiomatic exception: catches null and undefined together",
            "Prefer explicit conversion (`Number(...)`, `String(...)`) over implicit",
          ],
          c: ["coercion", "equality"],
          d: 2,
          secs: 90,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-scope", {
      title: "Scope, Hoisting & Closures",
      level: 1,
      summary: "`var` vs `let`, the temporal dead zone, and functions that remember.",
      brief: `**Scope** is where a name is visible. **Hoisting** is when it becomes usable.

- \`var\` is **function-scoped** and hoisted with the value \`undefined\`. Reading it before the assignment gives \`undefined\`, not an error.
- \`let\` and \`const\` are **block-scoped** and also hoisted, but sit in the **temporal dead zone** until the declaration line runs. Reading them early throws a \`ReferenceError\`.
- Function *declarations* are hoisted whole and callable before their definition. Function *expressions* assigned to \`const\` are not.

A **closure** is a function together with the variables it captured from where it was defined. It is not a special feature you turn on — every function in JavaScript is a closure; it only becomes interesting when the function outlives the scope that created it.

\`\`\`js
function counter() {
  let n = 0;              // captured, not garbage collected
  return () => ++n;       // the closure
}
const next = counter();
next(); // 1
next(); // 2
\`\`\`

Closures give you private state, they are how event handlers and callbacks remember context, and — critically for React — they are why an effect can hold a **stale** value from an earlier render.`,
      items: [
        out("js-scope-var-loop", {
          q: "What does this log?",
          code: `for (var i = 0; i < 3; i++) {
  setTimeout(() => console.log(i), 0);
}`,
          why: "`var` is function-scoped, so all three callbacks close over **the same** `i`. The loop finishes (leaving `i` at `3`) before any timer fires, so you get `3` three times.\n\nChanging `var` to `let` logs `0 1 2`, because `let` creates a **fresh binding per iteration** and each callback captures its own copy. This is the single most-asked closure question in JavaScript interviews.",
          tip: "Be ready for the follow-up: 'fix it without changing `var`' — wrap the body in an IIFE that takes `i` as a parameter.",
          c: ["closures", "scope", "event-loop"],
          d: 2,
          choices: [
            { t: `3\n3\n3`, code: true, ok: true, why: "Correct — one shared binding, read after the loop completes." },
            { t: `0\n1\n2`, code: true, why: "That is the `let` behaviour — `let` gets a new binding each iteration." },
            { t: `undefined\nundefined\nundefined`, code: true, why: "`i` is definitely assigned by the time the timers run." },
            { t: `0\n0\n0`, code: true, why: "The callbacks read `i` when they run, not when they were created." },
          ],
        }),
        out("js-scope-tdz", {
          q: "What happens?",
          code: `console.log(a);
console.log(b);
var a = 1;
let b = 2;`,
          why: "`var a` is hoisted and initialised to `undefined`, so the first log prints `undefined`. `let b` is hoisted too but stays in the **temporal dead zone** until its declaration executes, so the second log throws `ReferenceError: Cannot access 'b' before initialization`.\n\nThe TDZ exists deliberately: it turns a silent `undefined` bug into a loud error.",
          c: ["scope"],
          d: 2,
          choices: [
            { t: "`undefined`, then a ReferenceError", ok: true, why: "Correct — `var` is initialised to undefined, `let` is in the TDZ." },
            { t: "`undefined`, then `undefined`", why: "`let` does not initialise to undefined; it throws." },
            { t: "Two ReferenceErrors", why: "`var` is hoisted with a value, so the first line is fine." },
            { t: "`1`, then `2`", why: "Hoisting moves the declaration, never the assignment." },
          ],
        }),
        code("js-scope-counter", {
          q: "Write `makeCounter(start)`. It returns a function that, each time it is called, returns the next integer — beginning at `start`. Two counters must not share state.",
          why: "This is the canonical closure exercise. `count` lives in `makeCounter`'s scope; the returned function captures it. Because each call to `makeCounter` creates a new scope, each counter gets its own independent `count` — that independence is the whole point of the question.\n\nThe same technique gives you private state without classes, and it is exactly how a custom React hook keeps values between renders.",
          tip: "Interviewers usually follow up with 'now add a `reset()`' — returning an object of closures over the same variable.",
          c: ["closures", "scope"],
          d: 2,
          starter: `function makeCounter(start) {
  // Return a function that returns start, then start + 1, ...
}`,
          solution: `function makeCounter(start) {
  let count = start;
  return function () {
    return count++;
  };
}`,
          // Higher-order: the exercise returns a closure, so the tests
          // drive it through a harness rather than comparing the
          // returned function itself.
          harness: `(start, calls) => {
            const next = makeCounter(start);
            const seen = [];
            for (let i = 0; i < calls; i++) seen.push(next());
            // A second counter must not share state with the first.
            const other = makeCounter(100);
            return { seen, other: other() };
          }`,
          tests: [
            t([0, 3], { seen: [0, 1, 2], other: 100 }, "counts up from start", false),
            t([5, 2], { seen: [5, 6], other: 100 }, "honours a non-zero start", false),
            t([-3, 2], { seen: [-3, -2], other: 100 }, "works with negatives", true),
            t([0, 1], { seen: [0], other: 100 }, "counters are independent", true),
          ],
          secs: 240,
        }),
        mcq("js-scope-fn-hoisting", {
          q: "Which call succeeds?",
          code: `greet();
hello();

function greet() { console.log("hi"); }
const hello = function () { console.log("yo"); };`,
          why: "Function **declarations** are hoisted entirely — body included — so `greet()` works before its definition. `hello` is a `const` holding a function **expression**: the binding is in the temporal dead zone, so `hello()` throws `ReferenceError: Cannot access 'hello' before initialization`.\n\nThis is why codebases that standardise on `const fn = () => {}` also standardise on defining before use.",
          c: ["scope"],
          d: 2,
          choices: [
            { t: "`greet()` only", ok: true, why: "Correct — declarations hoist fully, `const` expressions do not." },
            { t: "`hello()` only", why: "Reversed." },
            { t: "Both", why: "The `const` binding is not initialised yet." },
            { t: "Neither", why: "Function declarations really are callable earlier." },
          ],
        }),
        blank("js-scope-iife", {
          q: "Complete the IIFE that gives each timeout its own copy of `i`, without changing `var`.",
          code: `for (var i = 0; i < 3; i++) {
  // ...
}`,
          template: `for (var i = 0; i < 3; i++) {
  ({{1}}(captured) {
    setTimeout(() => console.log(captured), 0);
  })({{2}});
}`,
          answers: [["function", "function "], ["i"]],
          hints: ["The keyword that starts a function expression", "The loop variable, passed by value"],
          why: "Calling a function immediately creates a new scope and copies `i` into the parameter `captured`. Each iteration therefore closes over a distinct binding, giving `0 1 2`.\n\nThis was the standard pre-ES6 workaround. Today you would simply use `let`, but the pattern still appears in older code and is a fair test of whether you understand *why* `let` fixes it.",
          c: ["closures", "scope"],
          d: 3,
          secs: 75,
        }),
        short("js-scope-explain-closure", {
          q: "Explain what a closure is, and give a real use for one.",
          why: "'A function inside a function' is the answer that gets you marked as junior. The distinguishing detail is that the inner function keeps the *variables* alive, not just the syntax nesting.",
          model:
            "A closure is a function bundled with the variables from the scope where it was defined. When that function outlives its creating scope, those variables stay alive rather than being garbage collected — the function still has a reference to them.\n\nA concrete use: private state. `makeCounter` returns a function over a local `count`; nothing outside can read or corrupt `count` except through the returned function. The module pattern is the same idea at file scope.\n\nDay to day, closures are also why callbacks remember their context — an event handler defined inside a component can still see that component's variables — and why a React effect can capture a *stale* value: it closed over the state from the render it was created in, so if the dependency array omits that value, it keeps reading the old one.",
          points: [
            "Function + the captured variables from its defining scope",
            "Captured variables survive because the function still references them",
            "Real use: private state / module pattern / callbacks remembering context",
            "Bonus: stale closures in React effects come from this exact mechanism",
          ],
          c: ["closures"],
          d: 2,
          secs: 100,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-collections", {
      title: "Arrays & Objects in Practice",
      level: 2,
      summary: "The array methods you use hourly, plus copying, spreading and Map vs object.",
      brief: `The methods worth true fluency, grouped by what they return:

| Returns a new array | Returns one value | Returns a boolean/index |
|---|---|---|
| \`map\`, \`filter\`, \`slice\`, \`concat\`, \`flat\` | \`reduce\`, \`join\`, \`find\` | \`some\`, \`every\`, \`includes\`, \`indexOf\`, \`findIndex\` |

**Mutating** methods to be careful with: \`push\`, \`pop\`, \`splice\`, \`sort\`, \`reverse\`, \`fill\`. \`sort\` and \`reverse\` mutating in place surprises people — and \`sort\` compares as **strings** by default, so \`[10, 9, 1].sort()\` gives \`[1, 10, 9]\`. Always pass a comparator for numbers: \`sort((a, b) => a - b)\`.

**Copying is shallow.** \`{...obj}\` and \`[...arr]\` copy one level; nested objects are still shared references. For a deep copy use \`structuredClone(obj)\`.

**Object vs Map**: use a \`Map\` when keys are not strings, when you need insertion order guaranteed for all key types, when you add and delete frequently, or when you want \`.size\`. Use a plain object for fixed-shape records and anything you will \`JSON.stringify\`.`,
      items: [
        out("js-arr-sort", {
          q: "What does this log?",
          code: `const nums = [10, 9, 1, 100];
console.log(nums.sort());`,
          why: "`Array.prototype.sort` converts elements to **strings** and sorts lexicographically unless you pass a comparator. `\"1\" < \"10\" < \"100\" < \"9\"`, so you get `[1, 10, 100, 9]`.\n\nThe fix is `nums.sort((a, b) => a - b)`. Also note `sort` mutates `nums` in place *and* returns it — if you need to preserve the original, sort a copy: `[...nums].sort(...)` or the newer `nums.toSorted(...)`.",
          tip: "Two facts in one question: default string comparison, and in-place mutation. Mention both.",
          c: ["collections", "immutability"],
          d: 2,
          choices: [
            { t: "`[1, 10, 100, 9]`", ok: true, why: "Correct — lexicographic string comparison." },
            { t: "`[1, 9, 10, 100]`", why: "That requires an explicit numeric comparator." },
            { t: "`[100, 10, 9, 1]`", why: "Sort is ascending by default." },
            { t: "`[10, 9, 1, 100]`", why: "`sort` definitely reorders — it just uses the wrong ordering here." },
          ],
        }),
        mcq("js-arr-shallow-copy", {
          q: "After this runs, what is `original.nested.value`?",
          code: `const original = { name: "a", nested: { value: 1 } };
const copy = { ...original };
copy.name = "b";
copy.nested.value = 99;`,
          why: "Spread is a **shallow** copy. `copy.name = \"b\"` only affects the copy, but `copy.nested` and `original.nested` point at the *same* object, so `original.nested.value` becomes `99`.\n\nFor an independent copy use `structuredClone(original)` (built into modern browsers and Node 17+). This bug is especially common in React, where mutating shared nested state means the UI does not update *and* the original is corrupted.",
          tip: "Say 'spread is shallow' unprompted — it shows you have been bitten by this.",
          c: ["value-vs-reference", "immutability"],
          d: 2,
          choices: [
            { t: "`99` — the nested object is shared", ok: true, why: "Correct, spread copies only the top level." },
            { t: "`1` — spread makes a full copy", why: "Spread copies one level only." },
            { t: "`undefined`", why: "Nothing removes the property." },
            { t: "It throws, because `original` is `const`", why: "`const` prevents reassignment, not mutation." },
          ],
        }),
        code("js-arr-groupby", {
          q: "Write `groupBy(items, key)` that groups an array of objects into an object keyed by `item[key]`. Each value is an array of the matching items, in original order.",
          why: "`reduce` is the right tool: you are folding a list into a single object. The `acc[k] ??= []` line (or `if (!acc[k]) acc[k] = []`) is the idiom for lazily creating the bucket.\n\nThis exact shape shows up constantly in real UI work — grouping rows for a table, orders by status, tasks by assignee — which is why it is a favourite over any DSA-style puzzle.",
          tip: "Modern runtimes have `Object.groupBy`, and mentioning it is a plus — but write it by hand when asked.",
          c: ["collections"],
          d: 2,
          starter: `function groupBy(items, key) {
  // { status: [item, item], ... }
}`,
          solution: `function groupBy(items, key) {
  return items.reduce((acc, item) => {
    const k = item[key];
    (acc[k] ||= []).push(item);
    return acc;
  }, {});
}`,
          tests: [
            t(
              [[{ s: "a", n: 1 }, { s: "b", n: 2 }, { s: "a", n: 3 }], "s"],
              { a: [{ s: "a", n: 1 }, { s: "a", n: 3 }], b: [{ s: "b", n: 2 }] },
              "groups by the given key",
              false
            ),
            t([[], "s"], {}, "empty input gives an empty object", true),
            t(
              [[{ s: "x", n: 1 }], "s"],
              { x: [{ s: "x", n: 1 }] },
              "single item",
              true
            ),
          ],
          secs: 300,
        }),
        mcq("js-arr-map-vs-object", {
          q: "You need a lookup keyed by user objects, with frequent additions and removals, and you often need the count. What do you reach for?",
          why: "A `Map` accepts **any** value as a key (including objects and functions), preserves insertion order, exposes `.size` in O(1), and is optimised for frequent add/delete. A plain object only supports string and symbol keys — an object key would be stringified to `\"[object Object]\"`, collapsing every entry into one.\n\nUse a plain object for fixed-shape records, JSON round-trips and config. Use a `Map` for genuine dictionaries.",
          c: ["collections"],
          d: 2,
          choices: [
            { t: "`Map`", ok: true, why: "Correct — arbitrary keys, `.size`, and cheap add/delete." },
            { t: "A plain object", why: "Object keys are coerced to strings, so every user collapses to one key." },
            { t: "An array of `[key, value]` pairs", why: "Lookup becomes O(n) — that is what `Map` is built on top of." },
            { t: "`WeakMap`", why: "Close, but `WeakMap` is not enumerable and has no `.size`; use it only when you want keys garbage-collectable." },
          ],
        }),
        multi("js-arr-mutating", {
          q: "Which array methods **mutate** the array they are called on?",
          why: "Mutating: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`, `fill`, `copyWithin`. Non-mutating: `map`, `filter`, `slice`, `concat`, `flat`, `reduce`, `join`, plus the newer `toSorted`, `toReversed`, `toSpliced` and `with`.\n\nThe two-letter trap is `slice` (copies) versus `splice` (mutates). In React, calling a mutating method on state is a leading cause of 'the array changed but nothing re-rendered'.",
          c: ["collections", "immutability"],
          d: 2,
          choices: [
            { t: "`sort`", ok: true },
            { t: "`splice`", ok: true },
            { t: "`reverse`", ok: true },
            { t: "`push`", ok: true },
            { t: "`slice`", why: "Returns a shallow copy of a portion — no mutation." },
            { t: "`map`", why: "Always returns a new array." },
            { t: "`concat`", why: "Returns a new combined array." },
          ],
        }),
        out("js-arr-reduce", {
          q: "What is logged?",
          code: `const r = [1, 2, 3, 4].reduce((acc, n) => {
  if (n % 2 === 0) acc.push(n * 10);
  return acc;
}, []);
console.log(r);`,
          why: "`reduce` folds the array into the accumulator seeded by the second argument — here an empty array. Only even numbers are pushed, multiplied by 10, giving `[20, 40]`.\n\nThe trap this question guards against is forgetting to `return acc`: the next iteration would then receive `undefined` and throw. Note this could equally be written `filter(n => n % 2 === 0).map(n => n * 10)`, which most reviewers would prefer for readability.",
          c: ["collections"],
          d: 2,
          choices: [
            { t: "`[20, 40]`", ok: true, why: "Correct — evens only, times ten." },
            { t: "`[10, 20, 30, 40]`", why: "The `if` filters out odd numbers." },
            { t: "`60`", why: "The accumulator is an array, not a number." },
            { t: "`undefined`", why: "It would be, if the callback forgot to return `acc`." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-async", {
      title: "Async, Promises & the Event Loop",
      level: 2,
      summary: "Microtasks vs macrotasks, Promise combinators, and the sequential-await trap.",
      brief: `JavaScript runs on **one thread**. Concurrency comes from the event loop, and the ordering rule is short enough to memorise:

1. Run the current synchronous code to completion.
2. Drain the **entire microtask queue** — promise callbacks, \`queueMicrotask\`.
3. Run **one macrotask** — \`setTimeout\`, \`setInterval\`, I/O.
4. Repeat from step 2.

Microtasks always beat timers, even a \`setTimeout(fn, 0)\`.

**Promise combinators**, all of which are fair game:

- \`Promise.all\` — all succeed, or reject on the first failure.
- \`Promise.allSettled\` — waits for everything, never rejects; you inspect each \`{status, value|reason}\`.
- \`Promise.race\` — settles with the first to settle, success *or* failure. Useful for timeouts.
- \`Promise.any\` — first **success**; rejects only if all fail.

The performance trap that appears in real code review: awaiting inside a loop serialises independent requests. If they do not depend on each other, start them all and \`await Promise.all(...)\`.`,
      items: [
        out("js-async-order", {
          q: "What order are these logged in?",
          code: `console.log("1");
setTimeout(() => console.log("2"), 0);
Promise.resolve().then(() => console.log("3"));
console.log("4");`,
          why: "Synchronous code first: `1`, then `4`. The function then finishes, so the **microtask** queue drains: `3`. Only then does the event loop take a macrotask: `2`.\n\nSo: **1, 4, 3, 2**. The headline is that a resolved promise's callback always runs before a `setTimeout(..., 0)` — microtasks have priority.",
          tip: "The single most-asked event-loop question. Practise saying 'sync, then microtasks, then one macrotask'.",
          c: ["event-loop", "promises"],
          d: 2,
          choices: [
            { t: "1, 4, 3, 2", ok: true, why: "Correct — sync, then microtask, then macrotask." },
            { t: "1, 2, 3, 4", why: "`setTimeout` never runs before synchronous code." },
            { t: "1, 4, 2, 3", why: "Promise callbacks are microtasks and outrank timers." },
            { t: "1, 3, 4, 2", why: "The `.then` cannot run before the sync code finishes." },
          ],
        }),
        mcq("js-async-sequential", {
          q: "Three independent API calls each take 1 second. Roughly how long does this take, and what would you change?",
          code: `const a = await getUser(id);
const b = await getOrders(id);
const c = await getSettings(id);`,
          why: "About **3 seconds**. Each `await` pauses until that request finishes before the next one even starts, so three independent calls run back to back.\n\nSince none depends on another's result, start them together and await once:\n\n```js\nconst [a, b, c] = await Promise.all([\n  getUser(id), getOrders(id), getSettings(id),\n]);\n```\n\nThat is ~1 second. This exact pattern is one of the most common real-world performance findings in code review — and interviewers love it because it is applied knowledge, not trivia.",
          tip: "Add the caveat: if `getOrders` needed `a.accountId`, sequential is correct and unavoidable.",
          c: ["async-await", "concurrency", "performance"],
          d: 2,
          choices: [
            { t: "~3s; use `Promise.all` since the calls are independent", ok: true, why: "Correct on both counts." },
            { t: "~1s; `await` already runs them in parallel", why: "`await` suspends — nothing starts until the previous resolves." },
            { t: "~3s, and it cannot be improved", why: "Independent work can always be overlapped." },
            { t: "~1s; JavaScript is multithreaded here", why: "JavaScript is single-threaded; the I/O overlap comes from starting the promises together." },
          ],
        }),
        mcq("js-async-all-vs-allsettled", {
          q: "You send 10 analytics events. One fails. You want the other 9 to still be reported, and you want to know which failed. Which combinator?",
          why: "`Promise.allSettled` waits for every promise and never rejects; you get an array of `{status: \"fulfilled\", value}` or `{status: \"rejected\", reason}` and can inspect each one.\n\n`Promise.all` rejects the moment any single promise fails — the others keep running but you lose their results, which is exactly wrong for independent best-effort work. Use `all` when you genuinely need every piece (a page that cannot render without all three fetches); use `allSettled` for independent work where partial success is acceptable.",
          c: ["promises", "error-handling"],
          d: 2,
          choices: [
            { t: "`Promise.allSettled`", ok: true, why: "Correct — never rejects, reports each outcome individually." },
            { t: "`Promise.all`", why: "Rejects on the first failure, discarding the other results." },
            { t: "`Promise.race`", why: "Settles on the first to finish and ignores the rest." },
            { t: "`Promise.any`", why: "Gives you the first success only, not all ten outcomes." },
          ],
        }),
        out("js-async-trycatch", {
          q: "Is the error caught?",
          code: `try {
  setTimeout(() => {
    throw new Error("boom");
  }, 0);
} catch (e) {
  console.log("caught");
}`,
          why: "**No.** By the time the callback runs, the `try` block has long since exited and its stack frame is gone. The throw happens in a fresh call stack started by the event loop, so it becomes an uncaught exception.\n\nThe same is true of any callback-based API. To handle it, put the `try/catch` *inside* the callback — or use a promise and `.catch()`, which is precisely the problem `async/await` plus promise-returning APIs solves.",
          tip: "The general principle: `try/catch` is synchronous and does not cross an event-loop boundary.",
          c: ["error-handling", "event-loop"],
          d: 3,
          choices: [
            { t: "No — it becomes an uncaught exception", ok: true, why: "Correct: the try block has already exited." },
            { t: "Yes — `caught` is logged", why: "`try/catch` cannot span a later turn of the event loop." },
            { t: "Yes, but only in Node", why: "Behaviour is the same in both runtimes." },
            { t: "It is caught on the next tick", why: "There is no deferred catching mechanism." },
          ],
        }),
        code("js-async-retry", {
          q: "Write `retry(fn, attempts)`. Call `fn()` (which returns a value or throws). If it throws, try again, up to `attempts` total. Return the value on success; rethrow the last error if every attempt fails.",
          why: "A loop with `try/catch`, keeping the last error, is the whole pattern. The two details reviewers look for: **`attempts` is the total number of tries, not the number of retries**, and the final failure **rethrows the original error** rather than a generic one — that preserves the diagnostic information.\n\nIn production you would add exponential backoff (`await sleep(2 ** i * 100)`) and only retry *transient* failures — retrying a `400 Bad Request` just wastes time, since the request will never become valid.",
          tip: "Volunteering 'and I would only retry idempotent operations' is a strong senior signal.",
          c: ["error-handling", "async-await"],
          d: 3,
          starter: `function retry(fn, attempts) {
  // Return fn()'s value, retrying on throw up to 'attempts' times.
}`,
          solution: `function retry(fn, attempts) {
  let lastError;
  for (let i = 0; i < attempts; i++) {
    try {
      return fn();
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}`,
          // The function under test takes a *function*, which JSON
          // cannot store — so the harness builds one from plain data:
          // fail the first `failures` calls, then succeed.
          harness: `(failures, attempts) => {
            let calls = 0;
            const flaky = () => {
              calls++;
              if (calls <= failures) throw new Error("transient " + calls);
              return "ok";
            };
            try {
              return { result: retry(flaky, attempts), calls };
            } catch (e) {
              return { error: e.message, calls };
            }
          }`,
          tests: [
            t([0, 3], { result: "ok", calls: 1 }, "succeeds first time, no retry", false),
            t([2, 3], { result: "ok", calls: 3 }, "succeeds on the third attempt", false),
            t([5, 3], { error: "transient 3", calls: 3 }, "rethrows the last error after all attempts", false),
            t([0, 1], { result: "ok", calls: 1 }, "a single attempt is allowed", true),
            t([1, 1], { error: "transient 1", calls: 1 }, "attempts is the total, not the retries", true),
          ],
          secs: 300,
        }),
        short("js-async-explain-loop", {
          q: "Explain the event loop to someone who knows how to write `async/await` but has never thought about how it works.",
          why: "This is the standard 'can you explain a system clearly' question. Interviewers listen for the queue distinction and for one consequence you have actually observed.",
          model:
            "JavaScript runs your code on a single thread, so it can only do one thing at a time. Anything slow — a network request, a timer, reading a file — is handed off to the runtime, which does the waiting elsewhere and puts a callback on a queue when it is ready.\n\nThe event loop's job is to pick what runs next. It finishes the current synchronous code, then drains the whole **microtask** queue — that is promise callbacks — and only then takes **one macrotask**, like a `setTimeout` or an I/O event. Then it checks microtasks again.\n\nThe practical consequences: a resolved promise's `.then` always runs before a `setTimeout(fn, 0)`. And because everything shares one thread, a long synchronous loop blocks the entire application — in a browser the page stops responding, in Node the server stops answering *every* request, not just the slow one. That is why CPU-heavy work goes to a worker.",
          points: [
            "Single thread; slow work is handed to the runtime and returns via a queue",
            "Order: sync code → drain all microtasks (promises) → one macrotask (timers/IO)",
            "Microtasks beat `setTimeout(fn, 0)`",
            "Blocking the thread blocks everything — hence workers for CPU-bound work",
          ],
          c: ["event-loop", "runtime"],
          d: 2,
          secs: 120,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-this", {
      title: "`this`, Classes & Prototypes",
      level: 3,
      summary: "Why `this` goes missing, and what `class` is actually built on.",
      brief: `\`this\` is decided by **how a function is called**, not where it is written. The four binding rules, in priority order:

1. \`new Foo()\` — \`this\` is the newly created object.
2. \`fn.call(obj)\` / \`.apply\` / \`.bind\` — \`this\` is what you passed.
3. \`obj.method()\` — \`this\` is \`obj\` (the receiver, whatever is left of the dot).
4. A bare \`fn()\` — \`this\` is \`undefined\` in strict mode / modules, or the global object otherwise.

**Arrow functions have no \`this\` of their own.** They inherit it lexically from the enclosing scope and cannot be rebound — which is exactly why they are the right choice for callbacks inside a method, and the wrong choice for an object method that needs the receiver.

The classic failure is *losing the receiver*:

\`\`\`js
const user = { name: "Ada", greet() { return this.name; } };
const g = user.greet;
g(); // TypeError — no receiver, \`this\` is undefined
user.greet.bind(user)(); // "Ada"
\`\`\`

\`class\` is syntax over prototypes: methods live on \`Foo.prototype\` and are shared by all instances, while fields assigned in the constructor are per-instance. Property lookup walks the prototype chain until it finds a match or reaches \`null\`.`,
      items: [
        out("js-this-lost", {
          q: "What happens on the last line?",
          code: `const user = {
  name: "Ada",
  greet() { return "Hi " + this.name; },
};

const greet = user.greet;
console.log(greet());`,
          why: "Assigning `user.greet` to a variable extracts the function and **drops the receiver**. Calling `greet()` bare means `this` is `undefined` (in a module or strict mode), so `this.name` throws `TypeError: Cannot read properties of undefined`.\n\nFixes: `user.greet.bind(user)`, or call it as `user.greet()`, or define `greet` as an arrow-function class field. This is the same bug behind every 'passing a method as a callback loses `this`' report.",
          tip: "Expect the follow-up: 'how would you fix it?' — name `bind` and arrow class fields.",
          c: ["this-binding"],
          d: 2,
          choices: [
            { t: "TypeError — `this` is undefined", ok: true, why: "Correct, the receiver was lost on assignment." },
            { t: "Logs `Hi Ada`", why: "`this` is bound at call time, not capture time." },
            { t: "Logs `Hi undefined`", why: "That happens only in sloppy mode where `this` is the global object." },
            { t: "Logs `Hi `", why: "`this` is not an empty object here." },
          ],
        }),
        mcq("js-this-arrow", {
          q: "Why does the arrow function work here where a regular `function` would not?",
          code: `class Timer {
  seconds = 0;
  start() {
    setInterval(() => { this.seconds++; }, 1000);
  }
}`,
          why: "An arrow function has no `this` binding of its own — it closes over `this` **lexically** from where it was written, which is inside `start()`, where `this` is the Timer instance.\n\nA regular `function` passed to `setInterval` would be invoked bare by the timer, so its `this` would be `undefined` (strict) or the global object, and `this.seconds++` would fail. Before arrows, people wrote `const self = this;` or `.bind(this)` to achieve the same thing.",
          c: ["this-binding", "closures"],
          d: 2,
          choices: [
            {
              t: "Arrows capture `this` lexically from the enclosing scope",
              ok: true,
              why: "Correct — and they cannot be rebound, even with `.call`.",
            },
            { t: "Arrows automatically `bind(this)` when created", why: "Close in effect, but they have no own `this` at all rather than a bound one." },
            { t: "`setInterval` passes the instance as `this` for arrows", why: "`setInterval` does not know about your instance." },
            { t: "Class bodies are always strict, so `this` defaults to the instance", why: "Strict mode makes bare `this` undefined, which is the problem, not the fix." },
          ],
        }),
        out("js-this-proto", {
          q: "What is logged?",
          code: `class Animal {
  speak() { return "generic"; }
}
class Dog extends Animal {
  speak() { return "woof"; }
}
const d = new Dog();
console.log(d.speak(), Object.getPrototypeOf(d) === Dog.prototype);`,
          why: "`d.speak()` finds `speak` on `Dog.prototype` first, so it returns `\"woof\"` and never reaches `Animal.prototype` — that is prototype-chain shadowing, which is all method overriding is. And `Object.getPrototypeOf(d)` is indeed `Dog.prototype`, so the second value is `true`.\n\nThe chain here is `d → Dog.prototype → Animal.prototype → Object.prototype → null`. Lookup stops at the first match.",
          c: ["prototypes", "oop"],
          d: 2,
          choices: [
            { t: "`woof true`", ok: true, why: "Correct — the subclass method shadows the parent's." },
            { t: "`generic true`", why: "Lookup starts at the instance's own prototype." },
            { t: "`woof false`", why: "`new Dog()` sets the prototype to `Dog.prototype`." },
            { t: "Throws — `speak` is defined twice", why: "Overriding is legal and expected." },
          ],
        }),
        tf("js-this-class-hoist", {
          q: "`class` declarations are hoisted and usable before the line that defines them, just like function declarations.",
          answer: false,
          why: "Classes are hoisted but, like `let`/`const`, they sit in the **temporal dead zone**. `new Foo()` before the `class Foo` line throws `ReferenceError: Cannot access 'Foo' before initialization`.\n\nThis is deliberate: a class body can contain an `extends` clause that evaluates an arbitrary expression, so allowing early use would mean using a class whose parent had not been resolved.",
          c: ["scope", "oop"],
          d: 2,
        }),
        multi("js-this-prototype-facts", {
          q: "Which statements about JavaScript classes and prototypes are true?",
          why: "`class` is syntax over the prototype system — it does not add a separate inheritance mechanism. Methods declared in a class body live on `Foo.prototype` and are **shared** by every instance (memory-efficient). Fields assigned in the constructor, including arrow-function class fields, are **per-instance** — which is exactly why arrow class fields bind `this` correctly but cost one function object per instance.\n\nWhat is *not* true: classes do not make properties private by default (use `#name` for that), and `extends` sets up a prototype chain rather than copying members.",
          c: ["prototypes", "oop"],
          d: 3,
          choices: [
            { t: "Methods in a class body live on the prototype and are shared across instances", ok: true },
            { t: "`class` is syntactic sugar over prototypes, not a separate system", ok: true },
            { t: "Arrow-function class fields are created per instance", ok: true },
            { t: "Class fields declared with `#` are genuinely private", ok: true },
            { t: "Class properties are private by default", why: "They are public unless prefixed with `#`." },
            { t: "`extends` copies the parent's methods onto the child", why: "It links prototypes; lookup walks the chain at call time." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-modules", {
      title: "Modules & Modern Syntax",
      level: 3,
      summary: "ESM vs CommonJS, destructuring, optional chaining and the syntax on every modern PR.",
      brief: `**ES modules (ESM)** — \`import\`/\`export\` — are static: the imports are known before the code runs, which is what lets a bundler tree-shake unused exports. They are always strict mode, and the imports are hoisted.

**CommonJS** — \`require\`/\`module.exports\` — is dynamic: \`require\` is a function call that runs at that point in the file, so you can call it conditionally. This is Node's original system and it is still everywhere.

You cannot \`require()\` an ESM module synchronously. In Node you opt into ESM with \`"type": "module"\` in package.json or a \`.mjs\` extension. Most Node interop pain traces back to this one incompatibility.

Syntax you will read on every modern PR:

\`\`\`js
const { a, b: renamed, c = 1, ...rest } = obj;   // destructure + rename + default + rest
const name = user?.profile?.name ?? "anon";      // optional chaining + nullish default
const fn = ({ id, onSave }) => {};                // destructured parameters
\`\`\`

\`?.\` short-circuits to \`undefined\` the moment anything in the chain is null or undefined — it does **not** protect against a property simply being the wrong type further along.`,
      items: [
        mcq("js-mod-esm-cjs", {
          q: "What is the practical difference between ESM and CommonJS that matters most to a bundler?",
          why: "ESM imports are **static** — they must be at the top level with literal specifiers, so a bundler can build the dependency graph without executing anything. That enables **tree-shaking**: unused exports are provably unreachable and can be dropped.\n\n`require()` is an ordinary function call that can appear anywhere with any computed string, so the bundler cannot know what will be loaded without running the code. That is the core reason modern front-end tooling standardised on ESM.",
          tip: "Naming tree-shaking as the *consequence* is what makes this answer land.",
          c: ["modules", "tooling"],
          d: 2,
          choices: [
            {
              t: "ESM is static and analysable, which enables tree-shaking; `require` is dynamic",
              ok: true,
              why: "Correct — static structure is the enabling property.",
            },
            { t: "ESM is faster at runtime", why: "Runtime speed is not the meaningful difference." },
            { t: "CommonJS cannot export multiple values", why: "It can — `module.exports = { a, b }`." },
            { t: "ESM does not support default exports", why: "`export default` exists in ESM." },
          ],
        }),
        out("js-mod-optional-chain", {
          q: "What is logged?",
          code: `const user = { profile: null };
console.log(user?.profile?.name);
console.log(user.settings?.theme ?? "dark");`,
          why: "`user?.profile?.name` — `user` exists, `profile` is `null`, so the chain short-circuits and yields `undefined` instead of throwing.\n\n`user.settings` is `undefined`, so `?.theme` short-circuits to `undefined`, and `??` supplies the fallback `\"dark\"`.\n\nSo: `undefined`, then `dark`. Note `?.` guards only against `null`/`undefined` — it will not save you if a value exists but is the wrong shape.",
          c: ["nullability"],
          d: 2,
          choices: [
            { t: "`undefined` then `dark`", ok: true, why: "Correct on both lines." },
            { t: "TypeError on the first line", why: "That is precisely what `?.` prevents." },
            { t: "`null` then `dark`", why: "Short-circuiting yields `undefined`, not `null`." },
            { t: "`undefined` then `undefined`", why: "`??` supplies the default when the left side is nullish." },
          ],
        }),
        blank("js-mod-destructure", {
          q: "Destructure `id` unchanged, `name` renamed to `label`, and `role` defaulting to `\"user\"`.",
          code: `const record = { id: 7, name: "Ada" };`,
          template: `const { id, name: {{1}}, role = {{2}} } = record;`,
          answers: [["label"], ['"user"', "'user'"]],
          hints: ["The new local name", "The default value, as a string literal"],
          why: "`name: label` renames on the way out — the local variable is `label`. `role = \"user\"` supplies a default used **only when the property is `undefined`** (not when it is `null` or `0`).\n\nDestructuring with defaults and renaming is everywhere in React props and function parameters, so reading it fluently matters more than being able to recite the grammar.",
          c: ["modules"],
          d: 2,
        }),
        tf("js-mod-import-hoist", {
          q: "`import` statements are hoisted, so a module's imports are resolved before any of its own code runs.",
          answer: true,
          why: "True. ESM imports are hoisted to the top of the module and resolved before execution, regardless of where you write them. That is why you cannot conditionally import with a static `import` — use the dynamic `import()` function, which returns a promise, for lazy or conditional loading (and it is what powers route-level code splitting).",
          c: ["modules"],
          d: 2,
        }),
        multi("js-mod-modern", {
          q: "Which of these are valid, commonly used modern JavaScript?",
          why: "All four correct answers are everyday syntax on a modern codebase:\n\n- `a ??= b` — assign only if `a` is null/undefined (there are also `||=` and `&&=`).\n- `arr.at(-1)` — last element, cleaner than `arr[arr.length - 1]`.\n- `Object.entries(o).map(([k, v]) => ...)` — iterate an object as pairs.\n- `structuredClone(o)` — a genuine deep copy, built in.\n\n`Array.prototype.remove` does not exist (use `filter` or `splice`), and `JSON.parse(JSON.stringify(o))` — while it *runs* — silently destroys `Date`, `Map`, `Set`, `undefined` and functions, which is why `structuredClone` replaced it.",
          c: ["collections", "modules"],
          d: 2,
          choices: [
            { t: "`config.retries ??= 3`", ok: true },
            { t: "`items.at(-1)`", ok: true },
            { t: "`Object.entries(obj).map(([k, v]) => k + v)`", ok: true },
            { t: "`structuredClone(state)`", ok: true },
            { t: "`items.remove(x)`", why: "No such method — use `filter` or `indexOf` + `splice`." },
            {
              t: "`JSON.parse(JSON.stringify(o))` as the best deep clone",
              why: "It works but loses Dates, Maps, Sets, undefined and functions. Prefer `structuredClone`.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-quality", {
      title: "Memory, Performance & Gotchas",
      level: 4,
      summary: "Leaks, debouncing, blocking the thread, and the traps that reach production.",
      brief: `At the mid level you are expected to reason about what your JavaScript *costs*.

**Leaks** in JavaScript are references you forgot you were holding:

- Event listeners added and never removed (especially on \`window\` or \`document\`).
- \`setInterval\` never cleared.
- Caches and arrays that only ever grow.
- Closures capturing something large when they only needed one field of it.

In React, every one of these belongs in an effect's **cleanup function**.

**Blocking**: a long synchronous loop freezes the UI in a browser and stalls *every* concurrent request in Node, because there is one thread. Heavy CPU work goes to a Web Worker or a worker thread.

**Debounce vs throttle** — the pair interviewers ask about together:

- **Debounce**: wait until activity *stops* for N ms, then run once. Search-as-you-type, autosave.
- **Throttle**: run at most once every N ms while activity continues. Scroll handlers, resize, drag.

And measure before optimising. Most application slowness is round trips and payload size, not the loop you were staring at.`,
      items: [
        multi("js-perf-leaks", {
          q: "Which of these commonly cause memory leaks in a long-lived single-page app?",
          why: "All four are the standard leak sources: listeners on globals that outlive the component, timers that are never cleared, unbounded caches, and detached DOM nodes still referenced by JavaScript (the DOM element is removed from the page but a variable keeps it alive, along with its whole subtree).\n\nLocal variables in a finished function and `const` objects are *not* leaks — the garbage collector reclaims anything unreachable. A leak is by definition something still reachable that you no longer need.",
          tip: "In React, the answer to every one of these is 'return a cleanup function from `useEffect`'.",
          c: ["memory", "performance"],
          d: 3,
          choices: [
            { t: "`window.addEventListener` without a matching `removeEventListener`", ok: true },
            { t: "`setInterval` that is never cleared", ok: true },
            { t: "A cache object that only ever grows", ok: true },
            { t: "Holding a reference to a DOM node after removing it from the page", ok: true },
            { t: "Local variables inside a function that has returned", why: "Unreachable after return — collected normally." },
            { t: "Declaring objects with `const`", why: "`const` affects rebinding, not lifetime." },
          ],
        }),
        mcq("js-perf-debounce", {
          q: "A search box fires a request on every keystroke. You want one request after the user stops typing. Debounce or throttle?",
          why: "**Debounce.** It resets a timer on every keystroke and only fires once activity has paused for the delay — exactly 'the user stopped typing'.\n\n**Throttle** guarantees a maximum rate but still fires *during* typing, so you would send a request every N ms mid-word. Throttle is right for continuous streams where you want regular sampling: scroll position, resize, mouse move, drag.\n\nFor search you would also want to cancel the in-flight request (via `AbortController`) so a slow earlier response cannot overwrite a newer one.",
          tip: "Mentioning `AbortController` and out-of-order responses turns a trivia answer into an engineering one.",
          c: ["performance"],
          d: 2,
          choices: [
            { t: "Debounce — fire once after activity stops", ok: true, why: "Correct, and pair it with request cancellation." },
            { t: "Throttle — cap it to one request per interval", why: "Still fires mid-typing; better suited to scroll/resize." },
            { t: "Neither; rely on HTTP caching", why: "Caching does not stop the requests being sent." },
            { t: "Both, applied together", why: "Debounce alone expresses the requirement." },
          ],
        }),
        out("js-perf-blocking", {
          q: "In a Node server handling many concurrent requests, what does this endpoint do to the others?",
          code: `app.get("/report", (req, res) => {
  let total = 0;
  for (let i = 0; i < 5e9; i++) total += i;   // ~seconds of CPU
  res.json({ total });
});`,
          why: "It blocks **every** request the process is serving. Node runs your JavaScript on one thread; a synchronous loop occupies it entirely, so no other request is even parsed until it finishes. From the outside, the whole service appears to hang.\n\nThe fix is to move CPU-bound work off the request thread: a `worker_threads` worker, a separate service, or a background job the endpoint returns a `202 Accepted` for. Note that async I/O does *not* have this problem — that is precisely what the event loop handles well.",
          tip: "The one-liner: 'Node is great at concurrent I/O and terrible at concurrent CPU.'",
          c: ["runtime", "performance", "event-loop"],
          d: 3,
          lang: "javascript",
          choices: [
            {
              t: "All other requests stall until the loop finishes",
              ok: true,
              why: "Correct — one thread, fully occupied.",
            },
            { t: "Only this request is slow; others are unaffected", why: "That would require the work to be off-thread." },
            { t: "Node spawns a thread automatically for CPU work", why: "It does not; the thread pool is for I/O, not your JavaScript." },
            { t: "The event loop time-slices between requests", why: "There is no preemption — your code runs to completion." },
          ],
        }),
        code("js-perf-memoize", {
          q: "Write `memoize(fn)`, which returns a wrapped function that caches results by its first argument, so repeated calls with the same argument skip `fn`.",
          why: "A `Map` keyed by the argument, checked with `has` before `get`, is the correct shape. Using `has` rather than a truthiness check matters: a legitimately cached `0`, `\"\"`, `null` or `undefined` would otherwise be recomputed every time.\n\nWhat makes this a *good* interview answer is naming the caveats: this only works for pure functions, the cache grows without bound (a real implementation needs an LRU eviction policy), and keying on multiple arguments needs a serialisation strategy — which is where naive `JSON.stringify` keys start to hurt.",
          tip: "Say 'this leaks unless it is bounded' before they ask.",
          c: ["performance", "closures", "memory"],
          d: 3,
          starter: `function memoize(fn) {
  // Return a function that caches fn's result per first argument.
}`,
          solution: `function memoize(fn) {
  const cache = new Map();
  return function (arg) {
    if (cache.has(arg)) return cache.get(arg);
    const result = fn(arg);
    cache.set(arg, result);
    return result;
  };
}`,
          // The point of memoisation is the calls that *don't* happen,
          // so the harness counts invocations of the wrapped function.
          harness: `(args) => {
            let calls = 0;
            const double = (n) => { calls++; return n * 2; };
            const fast = memoize(double);
            const results = args.map((a) => fast(a));
            return { results, calls };
          }`,
          tests: [
            t([[1, 2, 3]], { results: [2, 4, 6], calls: 3 }, "computes each new argument", false),
            t([[1, 1, 1]], { results: [2, 2, 2], calls: 1 }, "repeats come from the cache", false),
            t([[2, 3, 2, 3]], { results: [4, 6, 4, 6], calls: 2 }, "caches per argument", false),
            t([[0, 0]], { results: [0, 0], calls: 1 }, "caches a falsy result too", true),
            t([[]], { results: [], calls: 0 }, "no arguments, no calls", true),
          ],
          secs: 300,
        }),
        short("js-perf-explain-optimise", {
          q: "*\"A page in our app feels slow. Walk me through how you'd approach it.\"*",
          why: "An open-ended question testing method, not knowledge. The failure mode is jumping straight to a fix; the strong answer starts with measurement and ends with a trade-off you accepted knowingly.",
          model:
            "First I'd find out what 'slow' means — slow to first load, slow to respond to a click, or slow while scrolling. Those have completely different causes.\n\nThen I'd measure rather than guess. The browser's Performance and Network panels tell me whether time is going to network requests, to JavaScript execution, or to rendering. Lighthouse gives a starting baseline.\n\nUsually it is one of a few things. If it is network: too many requests, a waterfall of dependent calls that could run in parallel, or an oversized bundle — fixed with `Promise.all`, code splitting, or caching. If it is JavaScript: a heavy computation on every render or an unnecessary re-render cascade — fixed by memoising the actual hot path, after confirming with the profiler. If it is rendering: a huge list that should be virtualised, or layout thrashing from reading and writing DOM geometry in a loop.\n\nThen I measure again to confirm the fix moved the number I cared about, and I'd note the trade-off — memoisation costs memory and adds complexity, so it should be justified by the measurement rather than sprinkled everywhere.",
          points: [
            "Clarify which kind of slow — load, interaction, or scroll",
            "Measure first with real tools; never guess at the bottleneck",
            "Know the usual causes: request waterfalls, bundle size, re-renders, long lists",
            "Re-measure to confirm, and state the trade-off you accepted",
          ],
          c: ["performance"],
          d: 3,
          secs: 150,
        }),
      ],
    }),
  ],
});
