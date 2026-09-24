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
      keyIdeas: [
        "Seven primitives; everything else — arrays, functions — is an object.",
        "`+` concatenates if either side is a string; every other operator coerces to number.",
        "Falsy: `false 0 -0 0n \"\" null undefined NaN`. `[]` and `{}` are truthy.",
        "Default to `===`. The one idiomatic `==` is `x == null` (catches null and undefined).",
        "`??` falls back only on null/undefined; `||` falls back on any falsy value like `0` or `\"\"`.",
        "`typeof null` is `\"object\"` — a permanent legacy bug. `NaN !== NaN`; use `Number.isNaN`.",
      ],
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
            { t: "Throws a TypeError", why: "`typeof null` is a plain lookup that never throws. (`typeof` is even safe on undeclared names; the one case it throws is a `let`/`const` still in the temporal dead zone — a `ReferenceError`.)" },
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
        multi("js-types-primitives", {
          q: "Which of these are **primitive** types in JavaScript?",
          why: "JavaScript has **seven primitive types**: `string`, `number`, `bigint`, `boolean`, `undefined`, `symbol` and `null`. Everything else is an **object** — including arrays, functions, dates and regular expressions.\n\nPrimitives are immutable and compared by value; objects are mutable and compared by reference, which is why `[] === []` is `false`. Methods like `\"abc\".toUpperCase()` still work on primitives because the engine briefly wraps the value in its object counterpart (`String`, `Number`…) for the call.\n\n`typeof` muddies the picture twice: it reports `\"function\"` for functions, which are objects, and `\"object\"` for `null`, which is a primitive.",
          tip: "Listing all seven without hesitation, then adding that arrays and functions are objects, is the expected fresher answer.",
          c: ["static-types", "value-vs-reference"],
          d: 1,
          choices: [
            { t: "`symbol`", ok: true },
            { t: "`bigint`", ok: true },
            { t: "`undefined`", ok: true },
            { t: "`string`", ok: true },
            { t: "`array`", why: "Arrays are objects — `typeof []` is `\"object\"`. Use `Array.isArray` to detect them." },
            { t: "`function`", why: "`typeof` says `\"function\"`, but functions are callable objects — you can even add properties to them." },
          ],
        }),
        tf("js-types-dynamic-weak", {
          q: "\"Dynamically typed\" and \"weakly typed\" mean the same thing, and JavaScript is both.",
          answer: false,
          why: "False — JavaScript *is* both, but they are **different properties**. **Dynamic typing** is about *when* types are checked: types belong to values rather than variables, so `let x = 1; x = \"one\";` is legal and type errors only surface at runtime. **Weak typing** is about *how much implicit conversion* the language performs: JavaScript happily coerces `1 + \"2\"` into `\"12\"`.\n\nThe two axes are independent. Python is dynamic but fairly strongly typed — `1 + \"2\"` raises a `TypeError` — while C is static yet has weak spots such as implicit numeric conversions.\n\nTypeScript adds static checking at build time, but it compiles away: at runtime the values are exactly as dynamic as before, which is why data from an API still needs validating.",
          tip: "Separating 'when are types checked' from 'how eagerly does it convert' is the precise answer most candidates blur.",
          c: ["static-types", "coercion"],
          d: 1,
        }),
        mcq("js-types-pass-by", {
          q: "After `update(u)`, what is `u.name` — and what does that reveal about how JavaScript passes objects?",
          code: `function update(user) {
  user.name = "B";
  user = { name: "C" };
}
const u = { name: "A" };
update(u);`,
          why: "`u.name` is `\"B\"`. JavaScript passes **everything by value — but for an object, the value is a reference**. The parameter `user` starts as a copy of that reference, pointing at the same object as `u`, so `user.name = \"B\"` mutates the shared object. Reassigning `user = { name: \"C\" }` only repoints the local copy; `u` is unaffected.\n\nThis is sometimes called *call by sharing*. It is not true pass-by-reference: with a real reference parameter (C++ `&`, C# `ref`), the reassignment would have replaced `u` as well.\n\nPrimitives follow exactly the same rule; because they are immutable there is nothing to mutate, which is why they seem to be 'passed by value' and objects 'by reference'.",
          tip: "Saying 'pass by value, where the value is a reference' — and proving it with the reassignment line — is what separates you from 'objects are passed by reference'.",
          c: ["value-vs-reference"],
          d: 3,
          choices: [
            { t: '`"B"` — the reference is copied, so mutation is shared but reassignment is not', ok: true, why: "Correct — two references to one object, one of which is later repointed." },
            { t: '`"C"` — objects are passed by reference, so reassignment replaces `u`', why: "The common misconception. True pass-by-reference would do this; JavaScript copies the reference instead." },
            { t: '`"A"` — the function receives a copy of the object', why: "No copy of the object is made; only the reference is copied, so the mutation is visible." },
            { t: "It throws, because `u` is `const`", why: "`const` stops `u` being reassigned, not the object being mutated — and `user` is a separate binding anyway." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-scope", {
      title: "Scope, Hoisting & Closures",
      level: 1,
      summary: "`var` vs `let`, the temporal dead zone, and functions that remember.",
      keyIdeas: [
        "`var` is function-scoped and hoisted as `undefined`; `let`/`const` are block-scoped with a temporal dead zone.",
        "Function declarations hoist whole; `const fn = () => {}` does not.",
        "A closure is a function plus the variables it captured; they stay alive as long as the function does.",
        "`for (var …)` shares one binding across timeouts; `for (let …)` gives each iteration its own.",
        "Closures give private state (counters, modules) and are why React effects can read stale values.",
      ],
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
        mcq("js-scope-chain", {
          q: "Inside a function, you read a variable that the function did not declare. How does JavaScript find it?",
          why: "It walks the **scope chain**: the current function's scope, then the scope the function was *defined* in, then that scope's parent, out to the global scope. The first match wins; if nothing matches, reading the name throws a `ReferenceError`.\n\nThe chain is fixed by **where the code is written**, not where it is called from — that is what 'lexical scope' means, and it is exactly why closures work: a function carries the scope chain of its definition wherever it goes.\n\nDo not confuse it with the **prototype chain**, which resolves *properties* on objects. A missing property gives `undefined`; a missing variable throws.",
          tip: "Saying 'lexical — decided where the function is written' and contrasting it with the prototype chain shows you have a model, not a memorised phrase.",
          c: ["scope", "closures"],
          d: 1,
          choices: [
            {
              t: "It looks outward through the scopes where the function was defined, up to global, then throws a `ReferenceError`",
              ok: true,
              why: "Correct — lexical scope, resolved from the inside out.",
            },
            { t: "It looks in the scope of whichever function called it", why: "That is dynamic scoping, which JavaScript does not use. Only `this` depends on the call site." },
            { t: "It looks up the prototype chain of `this`", why: "The prototype chain resolves object properties, not variable names." },
            { t: "It returns `undefined` if the name is not found anywhere", why: "Missing *properties* give `undefined`; an undeclared *variable* throws. (`typeof` is the one operator that does not.)" },
          ],
        }),
        multi("js-scope-var-let-const", {
          q: "Which statements about `var`, `let` and `const` are true?",
          why: "`let` and `const` are **block-scoped** — visible only inside the nearest `{}` — while `var` is **function-scoped** and ignores blocks. `var` can be redeclared in the same scope without complaint, which hides bugs; redeclaring a `let` or `const` is a `SyntaxError`.\n\n`const` prevents **reassigning the binding**, not changing the value: a `const` object or array can still be mutated. For a genuinely unmodifiable object use `Object.freeze`, which is itself shallow.\n\nAll three are hoisted — `let` and `const` simply start in the temporal dead zone. And at the top level of a classic script, `var` creates a property on `window`, while `let` and `const` do not.",
          tip: "Correcting 'let is not hoisted' — it is, but into the TDZ — is the detail interviewers use to find people who read past the tutorial.",
          c: ["scope", "immutability"],
          d: 1,
          choices: [
            { t: "A `const` array can still have items pushed onto it", ok: true },
            { t: "`var` can be redeclared in the same scope; `let` cannot", ok: true },
            { t: "A `let` declared inside an `if` block is not visible after the block", ok: true },
            { t: "`let` and `const` are not hoisted at all", why: "They are hoisted but uninitialised until their line runs — the temporal dead zone. Hence the error says 'before initialization'." },
            { t: "`const` makes an object deeply immutable", why: "Only the binding is constant. The object can still be mutated unless you freeze it." },
            { t: "A top-level `let` in a script becomes a property of `window`", why: "Only top-level `var` (and function declarations) do that." },
          ],
        }),
        short("js-scope-explain-tdz", {
          q: "What is the temporal dead zone, and why does JavaScript have it?",
          why: "Many candidates answer '`let` is not hoisted', which is wrong. The strong answer explains that the binding exists from the start of the scope but is unusable until its declaration runs — and that this was a deliberate design choice.",
          model:
            "The temporal dead zone is the stretch between the start of a scope and the point where a `let`, `const` or `class` declaration actually executes. The binding already exists — it is hoisted to the top of its block — but it is uninitialised, so reading or writing it throws `ReferenceError: Cannot access 'x' before initialization`.\n\nIt is 'temporal' because it is about execution order, not position in the source: a function written above the declaration can safely use the variable, as long as it is only *called* after the declaration has run.\n\nIt exists to turn a silent bug into a loud one. With `var`, reading too early quietly gives `undefined` and the program carries on with a wrong value. It also keeps `const` meaningful: a constant should never be observable in an 'undefined for now' state.",
          points: [
            "The binding is hoisted but uninitialised from scope start until its declaration runs",
            "Access in that window throws a `ReferenceError`, not `undefined`",
            "Temporal means execution order, not source position",
            "Purpose: surface early-use bugs that `var` hid, and keep `const` coherent",
          ],
          c: ["scope"],
          d: 2,
          secs: 90,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-functions", {
      title: "Functions: Higher-Order, Currying & Binding",
      level: 2,
      summary: "Functions as values: callbacks, `call`/`apply`/`bind`, arrows vs regular functions, currying and generators.",
      keyIdeas: [
        "Functions are values: pass them in (callbacks) or return them out — either makes a function higher-order.",
        "`call(obj, a, b)` and `apply(obj, [a, b])` invoke now; `bind(obj)` returns a new function with `this` fixed for good.",
        "Arrows have no own `this`, no `arguments`, no `prototype`, and cannot be called with `new`.",
        "Rest (`...args` in a parameter list) collects; spread (`...arr` at a call site or in a literal) expands.",
        "Default parameters apply only for `undefined` — passing `null` bypasses them.",
        "A generator's body runs only when you call `next()`, pausing at each `yield` — ideal for lazy sequences.",
      ],
      brief: `**Functions are first-class values.** You can store them in variables, pass them as arguments and return them from other functions. A function that takes or returns another function is a **higher-order function** — \`map\`, \`filter\`, \`addEventListener\` and \`setTimeout\` are all higher-order, and the function you hand them is a **callback**.

**Choosing \`this\` explicitly:**

| Method | Invokes now? | Arguments |
|---|---|---|
| \`fn.call(obj, a, b)\` | Yes | Listed individually |
| \`fn.apply(obj, [a, b])\` | Yes | As one array |
| \`fn.bind(obj, a)\` | No — returns a new function | Optional pre-filled arguments |

**Arrow vs regular functions.** Arrows are not just shorter syntax. They have no \`this\`, \`arguments\` or \`prototype\` of their own and cannot be called with \`new\`. That makes them ideal for callbacks inside methods and wrong for object methods that need the receiver.

**Rest and spread** share the \`...\` syntax but do opposite jobs: in a parameter list it *collects* the remaining arguments into a real array; at a call site or inside an array or object literal it *expands* an iterable or object.

\`\`\`js
function log(level, ...parts) {}        // rest: parts is an array
log("info", ...messages);               // spread: messages expanded
const add = (a) => (b) => a + b;        // curried
function* ids() { let n = 1; while (true) yield n++; }  // lazy
\`\`\`

**Currying** turns \`f(a, b, c)\` into \`f(a)(b)(c)\`, so you can fix some inputs once and reuse the result. **Generators** (\`function*\`) return an iterator whose body runs lazily, pausing at each \`yield\` until the caller asks for the next value.

**Strict mode** (\`"use strict"\`, automatic in ES modules and class bodies) turns silent mistakes into errors: assigning to an undeclared variable throws, and a bare function call gets \`this === undefined\` instead of the global object.`,
      items: [
        mcq("js-fn-higher-order", {
          q: "What makes `[1, 2, 3].map(n => n * 2)` an example of a higher-order function?",
          why: "`map` is higher-order because it **takes a function as an argument**. A function is higher-order if it accepts a function, returns one, or both — the callback you pass in (`n => n * 2`) is an ordinary function; `map` is the higher-order one.\n\nThis works because JavaScript functions are **first-class values**: they can be stored, passed and returned like any number or object. The same idea underlies `filter`, `reduce`, `addEventListener`, `setTimeout`, promise `.then`, and every React hook that takes a callback.\n\nThe practical payoff is separating *what* to do from *how to iterate*: `map` owns the loop, and you supply only the transformation.",
          tip: "Interviewers want the definition plus one example of each direction — a function that takes a function (`map`) and one that returns a function (`debounce`, `makeCounter`).",
          c: ["functions"],
          d: 1,
          choices: [
            { t: "It accepts a function as an argument", ok: true, why: "Correct — taking or returning a function is the whole definition." },
            { t: "It returns a new array rather than mutating", why: "That makes it non-mutating, which is a separate property. `forEach` is higher-order too, and returns nothing." },
            { t: "The arrow function passed to it is the higher-order part", why: "Tempting, but backwards: the callback is an ordinary function; the function receiving it is higher-order." },
            { t: "It runs its callback asynchronously", why: "`map` is entirely synchronous. Callbacks are not inherently async — it depends on who calls them and when." },
          ],
        }),
        mcq("js-fn-call-apply-bind", {
          q: "What is the difference between `call`, `apply` and `bind`?",
          why: "`call` and `apply` **invoke the function immediately** with a chosen `this`; they differ only in how arguments are passed — `call(obj, a, b)` lists them, `apply(obj, [a, b])` takes an array. `bind(obj)` does **not** invoke anything: it returns a new function with `this` permanently set, and optionally some arguments pre-filled.\n\nA mnemonic: **A**pply takes an **A**rray; **C**all takes **C**ommas. With spread syntax, `fn.call(obj, ...args)` covers most of what `apply` used to be needed for.\n\nReach for `bind` when you hand a function to someone else to call later — an event listener, a `setTimeout` — and it must keep its receiver.",
          tip: "The common follow-up is 'implement `bind`' — a closure that returns `(...later) => fn.apply(ctx, [...early, ...later])`.",
          c: ["functions", "this-binding"],
          d: 1,
          choices: [
            {
              t: "`call` and `apply` invoke now (arguments listed vs as an array); `bind` returns a new bound function",
              ok: true,
              why: "Correct — and only `bind` leaves invocation for later.",
            },
            { t: "`call` invokes now; `apply` and `bind` both return new functions", why: "`apply` invokes immediately, just like `call` — only the argument shape differs." },
            { t: "`bind` invokes the function and permanently changes the original's `this`", why: "`bind` never touches the original function; it returns a separate wrapper." },
            { t: "They are aliases kept for backwards compatibility", why: "They behave differently; only `call` and `apply` are near-interchangeable." },
          ],
        }),
        tf("js-fn-bind-twice", {
          q: "Calling `.bind(b)` on a function that was already produced by `.bind(a)` rebinds its `this` to `b`.",
          answer: false,
          why: "False. **A bound function's `this` is fixed permanently** — `fn.bind(a).bind(b)` still runs with `this === a`. The second `bind` wraps the first, but the inner bound function ignores whatever `this` it is called with. `call` and `apply` cannot override it either. (The one exception is `new`: constructing with a bound function creates a fresh object as `this`.)\n\nArguments do accumulate, though: a second `bind` can still pre-fill more of them.\n\nThe practical consequence: if a library hands you an already-bound function, you cannot redirect it. You have to wrap or bind the original instead.",
          tip: "This checks whether you understand `bind` as 'returns a wrapper' rather than 'sets a property on the function'.",
          c: ["functions", "this-binding"],
          d: 3,
        }),
        mcq("js-fn-iife", {
          q: "Why were IIFEs — `(function () { ... })()` — so common in pre-2015 JavaScript?",
          why: "They created a **private scope**. Before ES2015 there was no block scope (`var` is function-scoped) and no module system in browsers, so every top-level `var` in every script became a global. Wrapping a file in an immediately invoked function expression kept its variables local and exposed only what it chose to return — the **module pattern**.\n\nThe wrapping parentheses matter: they make the parser read `function` as an expression, which can be invoked immediately, rather than a declaration, which cannot.\n\nToday `let`/`const` give block scope and ES modules give every file its own scope, so IIFEs are rare. You still meet them in older code, in bundler output, and as `(async () => { ... })()` where top-level `await` is unavailable.",
          tip: "The strong answer ties the pattern to the problem it solved — global pollution without block scope or modules — rather than just expanding the acronym.",
          c: ["functions", "scope", "modules"],
          d: 1,
          choices: [
            { t: "To keep variables out of the global scope before block scope and modules existed", ok: true, why: "Correct — it was the only way to get a private scope." },
            { t: "Because functions ran faster when invoked immediately", why: "There was no performance reason; the motivation was scoping." },
            { t: "To guarantee that a piece of code runs only once", why: "It does run once, but so does any top-level code — running once was a side effect, not the reason." },
            { t: "To give the code inside its own `this`", why: "An IIFE called bare gets the global object (or `undefined` in strict mode) as `this` — not a useful binding." },
          ],
        }),
        mcq("js-fn-default-params", {
          q: "What does each call return?",
          code: `function greet(name = "guest") { return name; }

greet();
greet(undefined);
greet(null);`,
          why: "**Defaults apply only when the argument is `undefined`** — whether it was omitted or passed explicitly as `undefined`. `null` is a real value, so `greet(null)` returns `null`.\n\nThat makes defaults stricter than `??`, which also treats `null` as missing: a default parameter will not replace `null`, `0`, `\"\"` or `false`. If an API might send `null` to mean 'missing', normalise it inside the body with `name ?? \"guest\"`.\n\nDefaults are also evaluated **at call time**, on every call, and can refer to earlier parameters: `function f(a, b = a * 2)` works, and `function f(list = [])` gets a fresh array on each call — unlike Python's shared mutable default.",
          tip: "The `null` case is the whole question. Mentioning that destructuring defaults follow the same `undefined`-only rule earns extra credit.",
          c: ["functions", "nullability"],
          d: 2,
          choices: [
            { t: '`"guest"`, `"guest"`, `null`', ok: true, why: "Correct — only `undefined` triggers the default." },
            { t: '`"guest"`, `undefined`, `null`', why: "Explicitly passing `undefined` is indistinguishable from omitting the argument, so the default still applies." },
            { t: '`"guest"`, `"guest"`, `"guest"`', why: "The tempting one — but `null` is a deliberate value, not a missing one." },
            { t: "`\"guest\"` for the first call; the other two throw", why: "Passing `undefined` or `null` as an argument is always legal." },
          ],
        }),
        mcq("js-fn-rest-spread", {
          q: "In `function log(...args) {}` and the call `log(...items)`, what do the two uses of `...` do?",
          why: "The first is **rest**: in a parameter list, `...args` collects all remaining arguments into a real array. The second is **spread**: at a call site it expands the iterable `items` into separate arguments. Same syntax, opposite directions — rest gathers, spread scatters.\n\nRest must be the last parameter, and unlike the old `arguments` object it is a genuine array with `map`, `filter` and friends. Spread also works in array literals (`[...a, ...b]`) and, for own enumerable properties, in object literals (`{ ...defaults, ...overrides }`).\n\nRest appears in destructuring too — `const [first, ...others] = list` and `const { id, ...fields } = record` — still collecting whatever is left over.",
          tip: "Name the direction: rest collects in a declaration, spread expands in an expression. Saying rest replaces `arguments` is the bonus.",
          c: ["functions", "collections"],
          d: 1,
          choices: [
            {
              t: "The first collects arguments into an array (rest); the second expands an array into arguments (spread)",
              ok: true,
              why: "Correct — same syntax, opposite jobs.",
            },
            { t: "Both spread the array", why: "In a parameter list there is nothing to expand yet — `...` there collects." },
            { t: "Both make a shallow copy of `items`", why: "Spreading into a call produces separate arguments, not an array. (Rest does build a new array inside the function.)" },
            { t: "The first collects into an array-like `arguments` object", why: "Rest produces a real `Array` — which is precisely its advantage over `arguments`." },
          ],
        }),
        tf("js-fn-pure", {
          q: "A function that reads `Date.now()` but modifies nothing outside itself is a pure function.",
          answer: false,
          why: "False. A pure function must meet **two** conditions: no side effects, *and* the same output for the same inputs. Reading `Date.now()` — or `Math.random()`, a global, or the DOM — makes the output depend on hidden input, so two calls with identical arguments can return different results.\n\nPurity matters because it is what makes a function safe to memoise, trivial to test and safe to re-run. React's rendering model assumes components are pure for exactly this reason.\n\nThe usual fix is to pass the impure value in: `isExpired(token, now)` is pure, and the caller supplies `Date.now()`.",
          tip: "Most candidates only mention side effects. Naming the second condition — determinism — is what the question is checking.",
          c: ["functions", "immutability"],
          d: 2,
        }),
        multi("js-fn-arrow-limits", {
          q: "Which are true of arrow functions compared with regular `function`s?",
          why: "Arrows are not just shorter syntax. They have **no own `this`** (it is captured from the enclosing scope and cannot be changed by `call`, `apply` or `bind`), **no own `arguments`** object (use rest parameters instead), **no `prototype`**, and they **cannot be used as constructors** — `new` on an arrow throws a `TypeError`. They cannot be generators either.\n\nWhat they *can* do is everything else: take default and rest parameters, be `async`, and return an object literal if you wrap it in parentheses.\n\nThe consequence: arrows are the right choice for callbacks inside methods, because they keep the method's `this`, and the wrong choice for object or prototype methods that need the receiver.",
          tip: "Interviewers are listening for the behavioural differences — `this`, `arguments`, `new` — not 'they are shorter'.",
          c: ["functions", "this-binding"],
          d: 2,
          choices: [
            { t: "They take `this` from the enclosing scope, and `call`/`bind` cannot change it", ok: true },
            { t: "Calling one with `new` throws a `TypeError`", ok: true },
            { t: "They have no `arguments` object of their own", ok: true },
            { t: "They are hoisted like function declarations", why: "An arrow is always an expression, usually assigned to a `const`, so it follows that variable's rules — usable only after the line runs." },
            { t: "They cannot have default parameter values", why: "`(x = 1) => x` is perfectly valid." },
            { t: "They cannot be `async`", why: "`async () => {}` is common, especially in route handlers and effect bodies." },
          ],
        }),
        mcq("js-fn-generator-yield", {
          q: "What happens when you call a generator function — `function* ids() { ... }` — as `ids()`?",
          why: "**None of the body runs yet.** Calling a generator function returns a generator object, which is an iterator. Each call to its `next()` runs the body until the next `yield`, pauses there, and returns `{ value, done: false }`. When the body finishes, `next()` returns `{ value: undefined, done: true }` (or the `return` value instead of `undefined`).\n\nBecause generators are iterable, `for...of`, spread and destructuring all drive them automatically. And `next(x)` can send a value back in, which becomes the result of the paused `yield` expression — the two-way channel that libraries like redux-saga are built on.\n\nThe mental model: a function whose execution can be paused and resumed, with the caller deciding when.",
          c: ["functions", "iteration"],
          d: 2,
          choices: [
            { t: "It returns an iterator without running the body; each `next()` runs to the next `yield`", ok: true, why: "Correct — execution is driven entirely by `next()`." },
            { t: "It runs the whole body and returns an array of every yielded value", why: "That is what `[...ids()]` produces — but only because spread keeps calling `next()` for you." },
            { t: "It runs until the first `yield` and returns that value", why: "Close: the first `next()` call does that. Calling the function itself runs nothing." },
            { t: "It returns a promise that resolves once every value has been yielded", why: "Only `async function*` involves promises, and even that returns an async iterator, not a single promise." },
          ],
        }),
        mcq("js-fn-generator-lazy", {
          q: "Why is a generator a natural fit for an infinite sequence like this?",
          code: `function* naturals() {
  let n = 1;
  while (true) yield n++;
}`,
          why: "Because generators are **lazy**: each value is computed only when the consumer asks for it with `next()`. The `while (true)` loop sits paused at `yield` between requests, so it never runs away — the caller takes the values it needs and simply stops asking.\n\nA function returning an array could not do this; it would have to build the entire sequence before returning, which for an infinite sequence never finishes. The same property suits large or expensive sequences — paging through API results, walking a tree, reading a file in chunks — where you want to be able to stop early without computing the rest.\n\nThe caveat: spreading or calling `Array.from` on an infinite generator hangs, because both consume until `done`. Always bound the consumer — a `for...of` with a `break`, or a `take(n)` helper.",
          tip: "Contrasting pull-based laziness with an eager array — and warning that spreading an infinite generator hangs — shows you have actually used them.",
          c: ["functions", "iteration", "performance"],
          d: 3,
          choices: [
            { t: "Values are produced on demand, and the loop pauses at each `yield` until the next request", ok: true, why: "Correct — laziness is the whole point." },
            { t: "Generators run on a separate thread, so the infinite loop does not block", why: "Generators are ordinary single-threaded code; they avoid blocking by pausing, not by running elsewhere." },
            { t: "The engine detects `while (true)` inside a generator and caps it", why: "No such detection exists — an unbounded consumer will hang." },
            { t: "`yield` precomputes the sequence into a fixed-size buffer", why: "Nothing is precomputed; each value exists only once it is requested." },
          ],
        }),
        multi("js-fn-strict-mode", {
          q: "Which behaviours does strict mode change?",
          why: "Strict mode turns a set of **silent mistakes into errors** and removes some confusing features. Assigning to an undeclared variable throws a `ReferenceError` instead of creating a global; a plain function call gets `this === undefined` instead of the global object; duplicate parameter names and `with` statements become syntax errors; writing to a read-only property throws instead of failing silently.\n\nYou opt in with `\"use strict\"` at the top of a script or function — but **ES modules and class bodies are strict automatically**, so most modern code is strict whether or not the directive appears.\n\nIt does not change how `==` works and it adds no type checking; those are common confusions with linters and TypeScript.",
          tip: "The standout point is that modules and classes are strict by default — many candidates think strict mode is a legacy opt-in they never use.",
          c: ["functions", "scope", "this-binding"],
          d: 2,
          choices: [
            { t: "Assigning to an undeclared variable throws instead of creating a global", ok: true },
            { t: "A bare function call gets `this` as `undefined` rather than the global object", ok: true },
            { t: "It applies automatically inside ES modules and class bodies", ok: true },
            { t: "`==` stops coercing and behaves like `===`", why: "Equality semantics are identical in both modes." },
            { t: "Variables must be declared with a type", why: "That is TypeScript. Strict mode performs no type checking." },
          ],
        }),
        short("js-fn-explain-currying", {
          q: "What is currying, how does it differ from partial application, and when is it actually useful?",
          why: "A definition alone gets half marks. Interviewers are checking whether you can separate currying from partial application, explain the closure that makes it work, and name a real, non-academic use.",
          model:
            "Currying transforms a function that takes several arguments into a chain of functions that each take one: `add(a, b, c)` becomes `add(a)(b)(c)`. Each call returns a new function that closes over the arguments supplied so far, and the original body runs once the last one arrives.\n\nPartial application is the related but looser idea: fix *some* of the arguments now and get back a function that takes the rest — `fn.bind(null, a)` is partial application. Currying is the systematic, one-argument-at-a-time version.\n\nIt is useful when you want to configure a function once and reuse the specialised version: `const logError = log(\"error\")`, `const byStatus = filterBy(\"status\")`, or building single-argument functions that slot neatly into `map`, `filter` and composition pipelines. In everyday application code I use it sparingly — a closure or an options object is often clearer — but it shows up in functional libraries and in factory patterns like Express middleware that takes configuration and returns a handler.",
          points: [
            "Currying: `f(a, b, c)` becomes `f(a)(b)(c)`, one argument per call",
            "Works because each returned function closes over the arguments so far",
            "Partial application fixes several arguments at once (e.g. `bind`) — related, not identical",
            "Useful for configure-once-reuse and pipelines; weigh readability in app code",
          ],
          c: ["functions", "closures"],
          d: 2,
          secs: 120,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-collections", {
      title: "Arrays & Objects in Practice",
      level: 2,
      summary: "The array methods you use hourly, plus copying, spreading and Map vs object.",
      keyIdeas: [
        "`sort()` compares as strings and mutates in place — always pass `(a, b) => a - b`.",
        "Spread and `Object.assign` copy one level; nested objects stay shared. `structuredClone` for deep.",
        "Mutating: push/pop/shift/unshift/splice/sort/reverse. Non-mutating: map/filter/slice/concat/toSorted.",
        "`reduce` folds to one value — remember to return the accumulator every iteration.",
        "Use `Map` for real dictionaries (any key type, `.size`, cheap add/delete); plain objects for records.",
      ],
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
            { t: "An array of `[key, value]` pairs", why: "Lookup becomes O(n). `Map` is a hash table under the hood, giving average constant-time lookup." },
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
            { t: "`undefined`", why: "The callback always returns `acc`. (Had it forgotten to, the next `acc.push` would throw a `TypeError` rather than log `undefined`.)" },
          ],
        }),
        mcq("js-arr-map-vs-foreach", {
          q: "What is the difference between `map` and `forEach`?",
          why: "`map` **returns a new array** built from each callback's return value; `forEach` **returns `undefined`** and exists purely for side effects. Use `map` when you are transforming data, and `forEach` (or a `for...of` loop) when you are doing something with each item — logging, sending, updating something else.\n\nUsing `map` just to loop is a code smell: it allocates an array nobody reads and misleads the reader about intent. Chaining off `forEach` is a bug: `arr.forEach(fn).filter(...)` throws, because `undefined` has no `filter`.\n\nNeither can be stopped early with `break` — use `for...of`, `some`, `every` or `find` for that. And neither waits for `async` callbacks: `forEach(async ...)` fires them all and moves on immediately.",
          tip: "Adding the `async` callback gotcha — neither method awaits — shows you have hit it in real code.",
          c: ["collections", "functions"],
          d: 1,
          choices: [
            { t: "`map` returns a new array of results; `forEach` returns `undefined`", ok: true, why: "Correct — transform versus side effect." },
            { t: "`forEach` mutates the array; `map` does not", why: "Neither mutates the array by itself — although a `forEach` callback can mutate whatever it likes." },
            { t: "`forEach` can be stopped with `break`; `map` cannot", why: "`break` is a syntax error inside either callback. Use `for...of` or `some` to stop early." },
            { t: "`map` is asynchronous; `forEach` is synchronous", why: "Both are synchronous and call the callback once per element, in order." },
          ],
        }),
        multi("js-obj-create-ways", {
          q: "Which of these create a **new** object?",
          why: "The main ways to create an object are an **object literal** (`{}`), **`new`** with a constructor function or class, **`Object.create(proto)`** — which sets the new object's prototype directly — and factory functions that return a literal. `Object.assign({}, a)`, spread `{ ...a }` and `structuredClone(a)` also produce new objects.\n\n`Object.freeze(obj)` is the tempting wrong answer: it **returns the same object** it was given, now frozen — no copy is made. And there is no `Object.new`; that is Ruby leaking in.\n\nWhich to use: literals for data, classes or factories for things with behaviour, and `Object.create` when you need explicit control of the prototype — including `Object.create(null)` for a dictionary with no inherited keys.",
          c: ["collections", "oop", "prototypes"],
          d: 1,
          choices: [
            { t: "`{ name: \"Ada\" }`", ok: true },
            { t: "`new User(\"Ada\")`", ok: true },
            { t: "`Object.create(proto)`", ok: true },
            { t: "`Object.freeze(obj)`", why: "It returns the same object, frozen in place — `Object.freeze(obj) === obj`." },
            { t: "`Object.new()`", why: "There is no such method in JavaScript." },
          ],
        }),
        mcq("js-coll-structuredclone", {
          q: "You deep-copy an object containing a `Date`, a `Map` and a method. How do `structuredClone` and `JSON.parse(JSON.stringify(...))` differ?",
          why: "`structuredClone` preserves the `Date` and the `Map` but **throws a `DataCloneError` because of the function**. The JSON round-trip does not throw, but it silently turns the `Date` into a string, the `Map` into `{}`, and **drops the function property** entirely.\n\nSo neither copies functions: `structuredClone` fails loudly, which is usually what you want, and JSON fails quietly. `structuredClone` also handles `Set`, typed arrays, `RegExp` and circular references (JSON throws on a cycle), but it does not preserve class prototypes — a class instance comes back as a plain object.\n\nPractical rule: use `structuredClone` for data, and keep behaviour out of the objects you need to copy.",
          tip: "Knowing that `structuredClone` throws on functions — rather than assuming it copies everything — is the precise detail interviewers check.",
          c: ["immutability", "value-vs-reference", "collections"],
          d: 2,
          choices: [
            {
              t: "`structuredClone` keeps the `Date` and `Map` but throws on the function; JSON silently degrades all three",
              ok: true,
              why: "Correct — loud failure versus quiet data loss.",
            },
            { t: "Both copy all three correctly", why: "Functions cannot be structured-cloned, and JSON has no representation for any of the three." },
            { t: "`structuredClone` copies the function by reference", why: "Tempting, since spread would share it — but structured cloning refuses functions outright." },
            { t: "JSON keeps the `Date` as a `Date` object", why: "`JSON.stringify` turns it into an ISO string, and parsing gives back a plain string." },
          ],
        }),
        mcq("js-coll-weakmap", {
          q: "When is a `WeakMap` the right choice over a `Map`?",
          why: "When you want to **attach data to objects without keeping those objects alive**. A `WeakMap` holds its keys weakly: once nothing else references a key object, the entry can be garbage collected along with it. A `Map` holds its keys strongly, so a cache keyed by DOM nodes or request objects would keep every one of them alive forever — a leak.\n\nTypical uses: caching a computed result per object, storing metadata for DOM elements, and private per-instance data (the technique used before `#private` fields).\n\nThe trade-off is that a `WeakMap` cannot be iterated and has no `size` or `clear()` — entries can vanish at any moment, so enumerating them would expose garbage-collector timing. Keys must be objects (or non-registered symbols), never strings or numbers. `WeakSet` is the same idea for membership: 'have I already seen this object?'.",
          tip: "Framing it as 'associate data with an object's lifetime' — and naming the cost, no iteration — is the senior answer.",
          c: ["collections", "memory"],
          d: 3,
          choices: [
            { t: "Caching data per object, when the cache must not keep those objects alive", ok: true, why: "Correct — entries die with their keys." },
            { t: "When you need the fastest possible lookup by string key", why: "`WeakMap` keys must be objects; strings are not allowed at all." },
            { t: "When you need to iterate entries in insertion order", why: "`WeakMap` is deliberately not iterable." },
            { t: "When you want entries to expire after a timeout", why: "Entries go only when the key becomes unreachable and is collected — never on a timer, and not predictably." },
          ],
        }),
        tf("js-coll-weakset-iterate", {
          q: "You can loop over a `WeakSet` with `for...of` to list the objects it contains.",
          answer: false,
          why: "False. `WeakSet`, like `WeakMap`, is **not iterable** and has no `size`. Its entries hold objects weakly and can disappear whenever the garbage collector runs, so a listing would be non-deterministic — the API deliberately offers only `add`, `has` and `delete`.\n\nThat shapes what it is for: *membership checks on objects you do not want to keep alive*, such as marking which nodes have been processed, or tracking visited objects during a deep traversal so circular references do not loop forever.\n\nIf you need to list the members, you need a regular `Set` — and you accept that it keeps them alive.",
          c: ["collections", "memory", "iteration"],
          d: 2,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-async", {
      title: "Async, Promises & the Event Loop",
      level: 2,
      summary: "Microtasks vs macrotasks, Promise combinators, and the sequential-await trap.",
      keyIdeas: [
        "Order: run sync code → drain all microtasks (promises) → one macrotask (timers, I/O) → repeat.",
        "A resolved promise's `.then` always runs before `setTimeout(fn, 0)`.",
        "Sequential `await`s serialise independent work; start them together and `await Promise.all`.",
        "`all` rejects on first failure; `allSettled` reports every outcome; `race` first to settle; `any` first success.",
        "`try/catch` does not catch errors thrown later in a callback — use promises or catch inside it.",
      ],
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
        mcq("js-async-promise-states", {
          q: "A promise has already been fulfilled with `1`. Later, its executor calls `reject(new Error(\"late\"))`. What happens?",
          why: "**Nothing — the call is ignored.** A promise has three states: **pending**, **fulfilled** (with a value) and **rejected** (with a reason). It starts pending and settles exactly once; after that its state and value are fixed, and further `resolve` or `reject` calls are no-ops.\n\nThat one-way transition is a large part of why promises beat raw callbacks: a callback-based API could call you twice, or report both success and failure, and nothing in the language would stop it.\n\nIt also means a `.then` attached *after* settlement still runs — the promise remembers its result and delivers it, asynchronously as a microtask, to late subscribers.",
          tip: "Naming the three states and the 'settles once' guarantee — then linking it to why promises replaced callbacks — covers the whole question.",
          c: ["promises"],
          d: 1,
          choices: [
            { t: "It is ignored; a settled promise never changes state", ok: true, why: "Correct — the first settlement wins." },
            { t: "The promise switches to rejected", why: "Settlement is permanent; later calls have no effect." },
            { t: "It throws an error inside the executor", why: "Extra calls are silently ignored, which is why no error appears." },
            { t: "The `.then` handlers run again, this time with the error", why: "Each handler runs at most once per promise." },
          ],
        }),
        tf("js-async-all-cancels", {
          q: "When `Promise.all` rejects because one promise failed, the other still-pending operations are cancelled.",
          answer: false,
          why: "False. `Promise.all` rejects as soon as one input rejects, but **promises have no built-in cancellation** — the other operations keep running to completion, and their results are simply ignored. The requests still reach the server and their side effects still happen.\n\nIf you genuinely need to stop the others, you wire it up yourself — typically by passing one `AbortController` signal to every `fetch` and calling `abort()` in the `catch`.\n\nThis is also why `Promise.all` is the wrong tool when you want every outcome: use `allSettled` and inspect each result.",
          tip: "The `AbortController` follow-up is where the interviewer is heading — mention it before they ask.",
          c: ["promises", "concurrency"],
          d: 2,
        }),
        mcq("js-async-unhandled", {
          q: "Inside an `async` function with no `try/catch`, an awaited promise rejects. What happens?",
          why: "The `await` **throws** at that line and, because nothing catches it, the async function stops and **its returned promise rejects** with the same error. The error has not vanished — it has moved to whoever called the function.\n\nIf the caller neither awaits it inside a `try/catch` nor attaches `.catch()`, it becomes an **unhandled rejection**: browsers fire an `unhandledrejection` event and log it, and Node (since version 15) terminates the process by default.\n\nSo catch where you can do something useful — often at the top of a request handler or UI action — by wrapping the `await` in `try/catch`. Put cleanup such as hiding a spinner in `finally`, which runs on both paths.",
          tip: "Say where you would put the `try/catch` — at the boundary that can actually recover — rather than wrapping every `await`.",
          c: ["async-await", "error-handling"],
          d: 2,
          choices: [
            { t: "The function stops and its returned promise rejects with that error", ok: true, why: "Correct — the rejection propagates to the caller." },
            { t: "The error is silently swallowed because it happened asynchronously", why: "Unlike a throw in a `setTimeout` callback, a rejected `await` propagates through the async function's own promise." },
            { t: "The function carries on with `undefined` as the awaited value", why: "`await` on a rejected promise throws; it never substitutes a value." },
            { t: "It throws synchronously to the caller, even if the caller did not `await`", why: "An async function never throws synchronously — it always returns a promise, and the error arrives as that promise's rejection." },
          ],
        }),
        multi("js-async-micro-macro", {
          q: "Which of these are queued as **microtasks**?",
          why: "Microtasks are **promise reactions** (`.then`, `.catch`, `.finally`), the continuation after an `await`, `queueMicrotask`, and `MutationObserver` callbacks. Macrotasks (the spec just calls them tasks) include timers — `setTimeout`, `setInterval` — plus I/O, user events such as clicks, and `MessageChannel` messages.\n\nThe difference is priority: after each task the engine drains the **entire** microtask queue before doing anything else, including rendering. That is why a resolved `.then` beats `setTimeout(fn, 0)`, and why a microtask that keeps queuing more microtasks can freeze a page even though it is 'async'.\n\n`requestAnimationFrame` is neither: it runs in the rendering step. Node adds `process.nextTick`, which runs even before promise microtasks, and `setImmediate`, which is a macrotask.",
          tip: "The follow-up is usually 'so why can a promise chain freeze the page?' — because the microtask queue must fully drain before rendering.",
          c: ["event-loop", "promises"],
          d: 2,
          choices: [
            { t: "A `.then` callback on a resolved promise", ok: true },
            { t: "The code after an `await`", ok: true },
            { t: "`queueMicrotask(fn)`", ok: true },
            { t: "`setTimeout(fn, 0)`", why: "A timer is a macrotask; even at 0 ms it waits for the microtask queue to empty." },
            { t: "A click event handler", why: "User interaction events are dispatched as tasks." },
            { t: "A `requestAnimationFrame` callback", why: "Animation-frame callbacks run in the rendering step, not in the microtask queue." },
          ],
        }),
        mcq("js-async-gen-vs-async", {
          q: "Generators and `async` functions can both pause mid-body. What is the key difference?",
          why: "**Who resumes them.** A generator pauses at `yield` and stays paused until the *caller* explicitly calls `next()` — it is pull-based and has nothing to do with promises. An `async` function pauses at `await` and is resumed *automatically* by the runtime when the awaited promise settles, and it always returns a promise.\n\nThey are historically related: before `async/await` shipped, libraries like `co` ran generators with a driver that called `next()` whenever a yielded promise resolved — effectively async/await built by hand — and transpilers used the same trick to target older engines.\n\nToday: use `async` for asynchronous control flow, generators for lazy or custom iteration, and `async function*` when you need both — consuming values that arrive over time with `for await...of`.",
          tip: "Mentioning that async/await can be built from generators plus promises shows you understand the mechanism, not just the syntax.",
          c: ["async-await", "iteration", "functions"],
          d: 3,
          choices: [
            {
              t: "A generator resumes when its caller calls `next()`; an `async` function resumes automatically when the awaited promise settles",
              ok: true,
              why: "Correct — caller-driven versus promise-driven.",
            },
            { t: "Generators run on a background thread; `async` functions run on the main thread", why: "Both run on the same single thread; neither introduces parallelism." },
            { t: "`yield` and `await` are interchangeable keywords", why: "They have different semantics — and `yield` is a syntax error outside a generator." },
            { t: "Generators always return promises", why: "A regular generator returns a synchronous iterator. Only `async function*` involves promises." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-dom", {
      title: "The Browser: DOM, Events & Storage",
      level: 2,
      summary: "Event propagation and delegation, script loading, client-side storage, and what makes the page re-render.",
      keyIdeas: [
        "DOM = the page as a node tree (`document`). BOM = the browser around it on `window`: `location`, `history`, `navigator`.",
        "Events travel down (capture), hit the target, then bubble up. Listeners use the bubble phase unless you pass `{ capture: true }`.",
        "Delegation: one listener on a parent plus `event.target.closest(...)` — covers children added later.",
        "`target` is where the event started; `currentTarget` is the element whose listener is running.",
        "`defer` runs scripts in order after parsing; `async` runs each as soon as it downloads, in any order.",
        "Cookies go to the server on every request (~4 KB); `localStorage` persists; `sessionStorage` ends with the tab.",
      ],
      brief: `**DOM vs BOM.** The **DOM** (Document Object Model) is the page itself as a tree of nodes, reached through \`document\`: \`querySelector\`, \`createElement\`, \`classList\`. The **BOM** (Browser Object Model) is what the browser exposes *around* the page on \`window\`: \`location\`, \`history\`, \`navigator\`, \`screen\`. None of it exists in Node, which is why server-rendered code must guard it.

**Event propagation** happens in three phases:

1. **Capture** — the event travels from \`window\` down through each ancestor.
2. **Target** — it reaches the element that was actually clicked.
3. **Bubble** — it travels back up to \`window\`.

\`addEventListener\` listens in the bubble phase by default; pass \`true\` or \`{ capture: true }\` as the third argument to listen on the way down. Bubbling is what makes **event delegation** possible:

\`\`\`js
list.addEventListener("click", (e) => {
  const item = e.target.closest("li");   // where the click started
  if (item) select(item.dataset.id);     // e.currentTarget is list
});
\`\`\`

**Loading scripts:**

| Attribute | Download | Executes | Order kept? |
|---|---|---|---|
| none | Blocks parsing | Immediately | Yes |
| \`defer\` | In parallel | After parsing, before \`DOMContentLoaded\` | Yes |
| \`async\` | In parallel | As soon as it arrives | No |

**Client-side storage:**

| Store | Size (approx.) | Lifetime | Sent to server? |
|---|---|---|---|
| Cookie | ~4 KB each | Until expiry, or end of session | Yes, every matching request |
| \`localStorage\` | ~5 MB per origin | Until cleared | No |
| \`sessionStorage\` | ~5 MB per origin | Until the tab closes | No |

**Rendering cost.** Changing geometry — size, position, adding nodes — forces **layout** (reflow) and then **paint**; changing only colour needs just a repaint. Reading a layout property like \`offsetHeight\` straight after a write forces the browser to lay out synchronously, so batch your reads before your writes and schedule visual updates with \`requestAnimationFrame\`.`,
      items: [
        multi("js-dom-bom", {
          q: "Which of these belong to the **BOM** (Browser Object Model) rather than the DOM?",
          why: "`window.location`, `navigator` and `history` are BOM: they describe the **browser and the tab** — the current URL, the browser itself, the session history — not the document. The DOM is specifically the page's node tree, reached through `document`: `querySelector`, `createElement`, `element.classList`.\n\nThe BOM grew up without a single standard, which made it a historic source of cross-browser differences; most of it is now specified in the HTML standard. `window` is the global object that holds both — `window.document` is the entry point to the DOM.\n\nThe distinction matters most for server-side rendering: neither exists in Node, so code that touches them must be guarded or moved into an effect that only runs in the browser.",
          tip: "The SSR connection — none of these globals exist on the server — is what turns a definition into a practical answer.",
          c: ["dom-events", "runtime"],
          d: 1,
          choices: [
            { t: "`window.location`", ok: true },
            { t: "`navigator.userAgent`", ok: true },
            { t: "`history.pushState`", ok: true },
            { t: "`document.querySelector`", why: "`document` is the DOM's entry point — this searches the node tree." },
            { t: "`element.classList`", why: "Properties and methods on elements are DOM APIs." },
            { t: "`document.createElement`", why: "Creating nodes for the tree is squarely DOM." },
          ],
        }),
        mcq("js-dom-live-collection", {
          q: "What is the difference between what `querySelectorAll(\".item\")` and `getElementsByClassName(\"item\")` return?",
          why: "`querySelectorAll` returns a **static** `NodeList` — a snapshot of the matches at the moment you called it. `getElementsByClassName` (like `getElementsByTagName`) returns a **live** `HTMLCollection` that updates automatically as matching elements are added or removed.\n\nLive collections cause a classic bug: loop over one by index while removing the class from each element, and every removal shrinks the collection under you, so you skip every other element. A static snapshot does not have that problem.\n\nBeyond that, the `querySelector` family accepts any CSS selector (`\"nav > a[href^='/docs']\"`), while `getElementById`, `getElementsByClassName` and `getElementsByTagName` take a plain id, class list or tag name rather than a selector. `getElementById` is marginally faster, but it rarely matters; most modern code standardises on `querySelector`.",
          tip: "The live-vs-static distinction is the part most candidates miss — and the skipped-elements bug is the proof you understand it.",
          c: ["dom-events"],
          d: 2,
          choices: [
            { t: "`querySelectorAll` gives a static snapshot; `getElementsByClassName` gives a live collection", ok: true, why: "Correct — the older methods return live collections." },
            { t: "They are identical apart from the selector syntax", why: "The selector syntax differs, but so does whether the result tracks later DOM changes." },
            { t: "`querySelectorAll` is live; `getElementsByClassName` is a snapshot", why: "Reversed — the older `getElementsBy...` methods are the live ones." },
            { t: "`getElementsByClassName` returns only the first match", why: "That is `querySelector`. Both methods here return every match." },
          ],
        }),
        mcq("js-dom-capture", {
          q: "A button sits inside a `div`, and both have click listeners. What changes if the `div`'s listener is registered with `addEventListener(\"click\", fn, true)`?",
          why: "The `div`'s listener now runs **before** the button's. The third argument `true` (or `{ capture: true }`) registers it for the **capture phase**, when the event travels down from `window` towards the target. Without it, listeners fire in the **bubble phase** on the way back up, so the button's listener would run first and the `div`'s second.\n\nEvery event goes capture → target → bubble. Most code only uses bubbling, but capturing is useful when a parent must see an event before any child can stop it — analytics, focus management, closing a menu on any outside click.\n\nThe third argument can also be an options object: `{ once: true }` removes the listener after one call, and `{ passive: true }` promises not to call `preventDefault`, which lets the browser scroll without waiting for your handler.",
          tip: "Naming all three phases, and the options-object form of the third argument, is what the interviewer is fishing for.",
          c: ["dom-events"],
          d: 2,
          choices: [
            { t: "The `div`'s listener runs first, during the capture phase", ok: true, why: "Correct — capture listeners fire on the way down." },
            { t: "The `div`'s listener stops the event reaching the button", why: "Capturing changes *when* the listener runs, not whether the event continues — that would need `stopPropagation()`." },
            { t: "The listener fires only once and is then removed", why: "That is `{ once: true }`. A bare `true` means capture." },
            { t: "Nothing — the third argument only matters for touch events", why: "Tempting because `passive` is mostly used for touch and wheel, but `true` here means capture for every event type." },
          ],
        }),
        mcq("js-dom-delegation", {
          q: "A list renders 1,000 rows and new rows are added over time. Why attach one click listener to the list instead of one per row?",
          why: "This is **event delegation**: because clicks bubble, a single listener on the parent sees every click inside it, and `event.target.closest(\"li\")` identifies which row was hit. You get one listener instead of a thousand, and — the bigger win — rows added *later* are handled automatically, with nothing to attach or clean up.\n\nThe pattern depends on bubbling, so it does not work directly for events that do not bubble, such as `focus`, `blur`, `mouseenter` and `mouseleave`. Use their bubbling counterparts — `focusin`, `focusout`, `mouseover`, `mouseout` — instead.\n\nReact is built on the same idea: it attaches its listeners at the root (the `document` before React 17, the root container since) rather than on each element.",
          tip: "Mentioning `closest()` for nested markup and the non-bubbling events caveat separates knowing the name from having used the pattern.",
          c: ["dom-events", "performance", "memory"],
          d: 2,
          choices: [
            { t: "Clicks bubble to the parent, so one listener handles every row — including rows added later", ok: true, why: "Correct — fewer listeners, and dynamic content just works." },
            { t: "Browsers cap how many listeners a page can register", why: "There is no practical cap; the cost is memory and bookkeeping, not a hard limit." },
            { t: "Listeners on child elements do not fire until the parent has one", why: "Every element can have its own listeners independently." },
            { t: "It makes the handler run during the capture phase", why: "Delegation normally uses the default bubble phase — that is how the event reaches the parent after the row." },
          ],
        }),
        mcq("js-dom-target", {
          q: "A listener on a `ul` handles a click on a `span` inside one of its `li`s. What are `event.target` and `event.currentTarget`?",
          why: "`event.target` is the **`span`** — the element where the event originated. `event.currentTarget` is the **`ul`** — the element whose listener is currently running. They are equal only when the listener sits on the element that was actually clicked.\n\nThat is why delegation code calls `event.target.closest(\"li\")`: the click can land on any descendant, so you walk up from the real target to the element you care about.\n\nOne gotcha: `currentTarget` is only set while the event is being dispatched. Inspect the event object later — after an `await`, or in a console log you expand afterwards — and `currentTarget` is `null`.",
          c: ["dom-events"],
          d: 1,
          choices: [
            { t: "`target` is the `span`; `currentTarget` is the `ul`", ok: true, why: "Correct — origin versus the listener's element." },
            { t: "`target` is the `ul`; `currentTarget` is the `span`", why: "Reversed. 'Current' refers to the listener currently running, which is on the `ul`." },
            { t: "Both are the `li`, the nearest meaningful element", why: "The browser cannot know which ancestor is meaningful — that is why you call `closest(\"li\")` yourself." },
            { t: "Both are the `ul`, because that is where the listener is", why: "Only `currentTarget` follows the listener; `target` stays the originating element." },
          ],
        }),
        multi("js-dom-prevent-stop", {
          q: "Which statements about `preventDefault()` and `stopPropagation()` are true?",
          why: "They control **two independent things**. `preventDefault()` cancels the browser's *default action* — following a link, submitting a form, toggling a checkbox — but the event still propagates to other listeners. `stopPropagation()` stops the event travelling to further elements along the capture/bubble path, but the default action still happens: a link will still navigate.\n\n`stopImmediatePropagation()` goes one step further and also skips any remaining listeners on the *current* element.\n\nUse `stopPropagation` sparingly: it silently breaks delegated listeners and analytics code higher up the tree. Checking `event.target` in the parent is usually the better fix.",
          tip: "Interviewers want to hear that they are independent — and that `stopPropagation` has a cost to other code on the page.",
          c: ["dom-events"],
          d: 2,
          choices: [
            { t: "`preventDefault()` on a form's submit event stops the page reloading, but parent listeners still receive the event", ok: true },
            { t: "`stopPropagation()` on a link's click stops parent listeners, but the link still navigates", ok: true },
            { t: "`stopImmediatePropagation()` also stops other listeners on the same element from running", ok: true },
            { t: "`stopPropagation()` also cancels the default action", why: "It never touches the default action; that needs `preventDefault()`." },
            {
              t: "Returning `false` from an `addEventListener` callback does both",
              why: "That is a jQuery convention. In a plain `onclick` handler returning false only prevents the default, and with `addEventListener` the return value is ignored.",
            },
          ],
        }),
        mcq("js-dom-defer-async", {
          q: "Two external scripts: `vendor.js` must run before `app.js`, and `app.js` queries the DOM. Which attribute should both script tags use?",
          why: "**`defer`.** Deferred scripts download in parallel with HTML parsing, then execute **after parsing finishes, in the order they appear** in the document, just before `DOMContentLoaded`. So `vendor.js` runs first and `app.js` can safely query the complete DOM.\n\n`async` scripts also download in parallel, but each executes **as soon as it arrives** — pausing the parser if it is still running — in no guaranteed order. That suits independent scripts like analytics and breaks dependent ones.\n\nA plain script tag blocks parsing while it downloads and runs, which is why scripts were traditionally put at the end of `body`. For classic scripts both attributes only apply to external scripts with a `src`; `type=\"module\"` scripts are deferred by default (and accept `async`, even inline).",
          tip: "The one-line version: `defer` keeps order and waits for parsing; `async` runs whenever it arrives.",
          c: ["dom-events", "performance"],
          d: 2,
          choices: [
            { t: "`defer`", ok: true, why: "Correct — parallel download, ordered execution after parsing." },
            { t: "`async`", why: "Tempting because it is also non-blocking, but execution order is whichever downloads first — `app.js` could run before `vendor.js`." },
            { t: "Neither — put both in the `head` with no attribute", why: "They would block parsing, and `app.js` would run before the body exists." },
            { t: "`async` on `vendor.js`, `defer` on `app.js`", why: "An async script runs whenever it finishes downloading, which may be after the deferred one — there is no ordering between them." },
          ],
        }),
        multi("js-dom-storage", {
          q: "Which statements about cookies, `localStorage` and `sessionStorage` are true?",
          why: "The differences are **lifetime, scope, size and whether the server sees it**. Cookies are attached to every matching HTTP request, which is why they suit session identifiers and why they are small (about 4 KB each). `localStorage` persists until explicitly cleared and is shared by every tab on the same origin. `sessionStorage` is scoped to a single tab: it survives reloads but disappears when the tab closes. Both Web Storage APIs hold roughly 5 MB per origin, store only strings, and are synchronous.\n\nA cookie flagged `HttpOnly` cannot be read through `document.cookie` at all — which is why it is the safer home for an auth token: an XSS payload can read anything in `localStorage`.\n\nNothing in Web Storage is ever sent to the server automatically; if the server needs it, your code must put it into a request.",
          tip: "Bringing up `HttpOnly` and XSS turns a storage question into a security answer — that is often what is really being tested.",
          c: ["storage", "security"],
          d: 2,
          choices: [
            { t: "Cookies are sent to the server with every matching request; Web Storage is not", ok: true },
            { t: "`sessionStorage` is cleared when the tab closes, but survives a reload", ok: true },
            { t: "An `HttpOnly` cookie cannot be read from JavaScript", ok: true },
            { t: "`localStorage` is the most secure place for an auth token because it is same-origin only", why: "Same-origin does nothing against XSS: any script running on your page can read it." },
            { t: "`sessionStorage` is shared across every tab on the same origin", why: "That is `localStorage`. Each tab gets its own `sessionStorage`." },
            { t: "`localStorage` stores objects directly", why: "It stores strings — objects must go through `JSON.stringify` and `JSON.parse`." },
          ],
        }),
        tf("js-dom-domcontentloaded", {
          q: "`DOMContentLoaded` waits for every image on the page to finish loading before it fires.",
          answer: false,
          why: "False — that is the **`load`** event. `DOMContentLoaded` fires once the HTML has been fully parsed and deferred scripts have run; it does not wait for images, iframes or `async` scripts. `load` fires on `window` only after everything, including images and stylesheets, has finished.\n\nSo `DOMContentLoaded` is the right moment to attach listeners and query elements, while `load` is for work that needs the fully loaded page, such as measuring images.\n\nIf your code might run *after* `DOMContentLoaded` has already fired — a lazily injected script, say — a listener added then will never run. Check `document.readyState` first.",
          c: ["dom-events"],
          d: 1,
        }),
        mcq("js-dom-readystate", {
          q: "Why would a script check `document.readyState` instead of just listening for `DOMContentLoaded`?",
          why: "Because **the event may already have happened**. If the script runs late — loaded with `async`, injected dynamically, or run from a bookmarklet — `DOMContentLoaded` has already fired, and a listener added now will never be called.\n\n`document.readyState` tells you where the page is right now: `\"loading\"` while the HTML is being parsed, `\"interactive\"` once parsing is done (just before `DOMContentLoaded`), and `\"complete\"` once subresources have loaded (around `load`). The robust pattern:\n\n```js\nif (document.readyState === \"loading\") {\n  document.addEventListener(\"DOMContentLoaded\", init);\n} else {\n  init();\n}\n```",
          c: ["dom-events"],
          d: 2,
          choices: [
            { t: "The event may already have fired, and late listeners are never called", ok: true, why: "Correct — `readyState` covers both cases." },
            { t: "`DOMContentLoaded` is not supported in modern browsers", why: "It is universally supported." },
            { t: "`readyState` fires earlier than any event", why: "It is a property you read, not an event — it reports the current phase." },
            { t: "Polling `readyState` is faster than an event listener", why: "The pattern reads it once; there is no polling and no speed benefit." },
          ],
        }),
        mcq("js-dom-reflow", {
          q: "Why is this loop slow, and what is the fix?",
          code: `for (const el of items) {
  el.style.width = box.offsetWidth + "px";
}`,
          why: "It causes **layout thrashing**. Each iteration writes a style (invalidating layout), and the next iteration reads `offsetWidth`, which forces the browser to recalculate layout *synchronously* to return an accurate value. A thousand items means a thousand forced reflows instead of one.\n\nThe fix is to **batch reads, then writes**: read `box.offsetWidth` once before the loop, then apply all the writes. The browser can then lay out once, at the next frame.\n\nThe broader model: changing geometry (size, position, adding nodes) triggers layout and then paint; changing only colour or background needs a repaint; `transform` and `opacity` changes can often skip both and be handled by the compositor — which is why they are preferred for animation.",
          tip: "Using the term 'layout thrashing' and the fix 'batch reads before writes' signals real front-end performance work.",
          c: ["dom-events", "performance"],
          d: 3,
          choices: [
            { t: "Reading `offsetWidth` after each write forces a synchronous reflow; read once, then write", ok: true, why: "Correct — hoist the read out of the loop." },
            { t: "Setting `style.width` is slow; toggle a class instead", why: "Class changes invalidate layout the same way; the problem is the interleaved read." },
            { t: "`for...of` is slower than a classic `for` loop", why: "Loop syntax is negligible next to a forced layout per iteration." },
            { t: "The browser repaints the screen after every assignment", why: "Tempting, but painting waits for the next frame; it is *layout* that the read forces synchronously." },
          ],
        }),
        mcq("js-dom-raf", {
          q: "Why use `requestAnimationFrame` for a JavaScript animation instead of `setInterval(step, 16)`?",
          why: "`requestAnimationFrame` runs your callback **just before the browser's next repaint**, so each update lands exactly once per frame, in step with the display's refresh rate — whether that is 60 Hz or 120 Hz. A 16 ms interval drifts relative to the frames, so some frames get two updates and some none, which shows up as jank.\n\nMost browsers also pause it in background tabs, saving CPU and battery, and the callback receives a high-resolution timestamp, so you can compute progress from elapsed time rather than assuming a fixed frame length.\n\nThe same scheduling makes it the right place for batched DOM writes: read layout in your handler, then write inside the next animation frame.",
          c: ["dom-events", "performance", "event-loop"],
          d: 2,
          choices: [
            { t: "It runs once per frame, right before the repaint, matching the display's refresh rate", ok: true, why: "Correct — updates line up with frames." },
            { t: "It runs on a separate thread, so animations never block", why: "The callback runs on the main thread; a slow one still drops frames." },
            { t: "It guarantees exactly 60 callbacks per second", why: "It follows the display — a 120 Hz screen gets more calls, and a background tab usually gets none." },
            { t: "`setInterval` cannot be used for animation", why: "It can; it just cannot align with frames, which is the problem." },
          ],
        }),
        short("js-dom-explain-event-flow", {
          q: "A user clicks a `button` inside an `li` inside a `ul`, and each has a click listener. Walk through what happens to the event.",
          why: "This combines several frequently asked questions — phases, `target` vs `currentTarget`, stopping propagation, delegation — into one explanation. Interviewers listen for the phases in order and one practical consequence.",
          model:
            "The browser dispatches the click in three phases. First the capture phase: the event travels from `window` down through `document`, `html`, `body`, the `ul` and the `li`, running any listeners registered with `{ capture: true }`. Then the target phase, at the `button` itself. Then the bubble phase, back up through the `li` and the `ul` to `window`, running normal listeners — so by default the button's listener runs first, then the `li`'s, then the `ul`'s.\n\nIn every one of those listeners, `event.target` is the button, where the click started, while `event.currentTarget` is whichever element's listener is running.\n\nAny listener can call `stopPropagation()` to stop the event travelling further, or `preventDefault()` to cancel the browser's default action — the two are independent.\n\nThe practical consequence of bubbling is event delegation: instead of a listener on every button, I can put one on the `ul` and use `event.target.closest(\"li\")` to find which item was clicked, which also covers items added later.",
          points: [
            "Three phases: capture (down), target, bubble (up); listeners default to bubble",
            "`target` is where it started; `currentTarget` is whose listener is running",
            "`stopPropagation` stops travel; `preventDefault` cancels the default action — independent",
            "Bubbling enables delegation: one parent listener plus `closest()`",
          ],
          c: ["dom-events"],
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
      keyIdeas: [
        "`this` is set by the call: `new` → new object; `.call/.bind` → what you pass; `obj.m()` → obj; bare `fn()` → undefined.",
        "Arrow functions have no `this` of their own — they capture it lexically and cannot be rebound.",
        "Extracting a method (`const g = obj.greet`) drops the receiver; fix with `bind` or an arrow class field.",
        "`class` is syntax over prototypes: methods are shared on the prototype, constructor fields are per instance.",
        "Classes are hoisted but in the TDZ — no `new Foo()` before the declaration.",
      ],
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
          q: "This code runs as an ES module. What happens on the last line?",
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
            { t: "Logs `Hi undefined`", why: "Only possible in sloppy mode, where `this` is the global object — e.g. a Node CommonJS script. Modules are always strict." },
            { t: "Logs `Hi `", why: "That is what a sloppy-mode *browser* script prints — `this` is `window`, and `window.name` defaults to `\"\"`. In a module `this` is `undefined`." },
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
          why: "An arrow function has no `this` binding of its own — it closes over `this` **lexically** from where it was written, which is inside `start()`, where `this` is the Timer instance.\n\nA regular `function` passed to `setInterval` gets whatever `this` the timer supplies — `window` in browsers (even in strict code, because the timer passes it explicitly) or the `Timeout` object in Node — never the instance, so `this.seconds++` would update the wrong object (producing `NaN`) and the Timer's `seconds` would never change. Before arrows, people wrote `const self = this;` or `.bind(this)` to achieve the same thing.",
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
        mcq("js-this-object-create", {
          q: "What does `Object.create(proto)` do?",
          why: "It creates a new, empty object whose **prototype is `proto`** — without calling any constructor. Property lookups that miss on the new object fall through to `proto`, so anything defined there is shared rather than copied.\n\nIt is the most direct expression of prototypal inheritance: no class, no function, just 'make an object that delegates to this one'. Before `class`, it was also how constructor functions were wired together: `Child.prototype = Object.create(Parent.prototype)`.\n\n`Object.create(null)` is a useful special case: an object with **no prototype at all**, so keys like `toString` or `__proto__` are just data. That makes it a safe dictionary when the keys come from user input.",
          c: ["prototypes", "oop"],
          d: 2,
          choices: [
            { t: "Creates an empty object whose prototype is `proto`, without running a constructor", ok: true, why: "Correct — delegation without construction." },
            { t: "Makes a copy of `proto` with the same own properties", why: "The new object has no own properties; it *delegates* to `proto` rather than copying it." },
            { t: "Calls `proto` as a constructor, like `new proto()`", why: "No constructor runs — that is one of its main differences from `new`." },
            { t: "Sets `proto`'s prototype to a new empty object", why: "Reversed: the new object points at `proto`, not the other way round." },
          ],
        }),
        tf("js-this-class-no-new", {
          q: "Calling a class as a plain function — `User(\"Ada\")` instead of `new User(\"Ada\")` — throws a `TypeError`.",
          answer: true,
          why: "True. Class constructors refuse to run without `new`: you get `TypeError: Class constructor User cannot be invoked without 'new'`.\n\nOld-style **constructor functions** had no such guard. Calling `function User(name) { this.name = name; }` without `new` runs it as an ordinary function, so `this` is the global object in sloppy mode — silently creating a global `name` — or `undefined` in strict mode, which throws a less helpful error. Libraries used to defend against this with `if (!(this instanceof User)) return new User(name);`.\n\nThis is one of several ways `class` is more than pure sugar: class bodies are always strict, class declarations sit in the TDZ, and class methods are non-enumerable.",
          tip: "The contrast with constructor functions — and the accidental-global bug they allowed — is what makes this answer complete.",
          c: ["oop", "prototypes", "this-binding"],
          d: 2,
        }),
        short("js-this-explain-prototypal", {
          q: "Explain prototypal inheritance, and how it differs from classical inheritance in a language like Java.",
          why: "Interviewers want to hear that JavaScript objects inherit from other *objects* through a live link, and that `class` did not change that. Describing only the `class` syntax misses the point.",
          model:
            "In classical inheritance, as in Java, a class is a blueprint and instances are created from it; the hierarchy is defined between classes and fixed when the program is compiled.\n\nIn JavaScript, objects inherit directly from other objects. Every object has an internal link to a prototype. When you read a property that is not on the object itself, the engine follows that link and checks the prototype, then the prototype's prototype, until it finds the property or reaches `null`. That lookup happens at runtime, so adding a method to a prototype immediately makes it available to every object linked to it.\n\nThe `class` keyword is syntax over this same system: methods go on `Class.prototype`, and `extends` links `Child.prototype` to `Parent.prototype`. Constructor functions with `new`, and `Object.create(proto)`, are other ways to set up the same link.\n\nThe practical upshot: methods are shared rather than copied, so they are memory-efficient; overriding is just shadowing a property with one nearer the object; and the relationships are dynamic — powerful, but it is why modifying built-in prototypes is dangerous, since it affects everything.",
          points: [
            "Objects link to a prototype object; lookup walks the chain until `null`",
            "Lookup happens at runtime — delegation, not copying",
            "`class` and `extends` are syntax over the same prototype links",
            "Contrast: classical uses class blueprints with a hierarchy fixed at compile time",
          ],
          c: ["prototypes", "oop"],
          d: 3,
          secs: 120,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-modules", {
      title: "Modules & Modern Syntax",
      level: 3,
      summary: "ESM vs CommonJS, destructuring, optional chaining and the syntax on every modern PR.",
      keyIdeas: [
        "ESM `import`/`export` is static and hoisted, which is what enables tree-shaking.",
        "CommonJS `require` is a runtime function call; `require()` of an ES module only works in Node 20.19+/22.12+, and not if it uses top-level `await`.",
        "`?.` short-circuits to `undefined` on null/undefined only; pair it with `??` for defaults.",
        "Destructuring: `{ a, b: renamed, c = default, ...rest }` — defaults apply only when the value is `undefined`.",
        "Use dynamic `import()` for conditional or lazy loading; it returns a promise and powers code splitting.",
      ],
      brief: `**ES modules (ESM)** — \`import\`/\`export\` — are static: the imports are known before the code runs, which is what lets a bundler tree-shake unused exports. They are always strict mode, and the imports are hoisted.

**CommonJS** — \`require\`/\`module.exports\` — is dynamic: \`require\` is a function call that runs at that point in the file, so you can call it conditionally. This is Node's original system and it is still everywhere.

For years you could not \`require()\` an ESM module at all; Node 22.12 and 20.19 finally allow it, but only for modules without top-level \`await\`, so older runtimes and async modules still need \`await import()\`. In Node you opt into ESM with \`"type": "module"\` in package.json or a \`.mjs\` extension. Most Node interop pain traces back to this incompatibility.

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
        mcq("js-mod-default-named", {
          q: "What is the practical difference between a default export and a named export?",
          why: "A module can have **one default export**, which the importer may call anything: `import Button from \"./Button\"`. It can have **any number of named exports**, which must be imported by their exact names in braces — optionally renamed with `as`: `import { formatDate as fmt } from \"./dates\"`.\n\nUnder the hood the default is simply a named export called `default`, which is why `import { default as Button }` also works.\n\nMany teams prefer named exports: the name is consistent everywhere it is used, editors auto-import and rename it reliably, and a typo is a build error rather than a silently different name. Defaults remain common where a framework expects them, such as page or route components.",
          tip: "Stating a preference with a reason — consistent names and safer refactors — turns trivia into an engineering opinion.",
          c: ["modules"],
          d: 1,
          choices: [
            {
              t: "One default per module, imported under any name; named exports are imported by exact name (or renamed with `as`)",
              ok: true,
              why: "Correct — the difference is about naming.",
            },
            { t: "Named exports can be tree-shaken; default exports cannot", why: "An unused default export can be dropped too. What hurts tree-shaking is default-exporting one big object of helpers, not the default syntax itself." },
            { t: "A module can have several default exports", why: "Only one is allowed; a second `export default` is a syntax error." },
            { t: "Named exports can only be imported with `import *`", why: "Braces import specific names; `import * as ns` is an optional namespace form." },
          ],
        }),
        tf("js-mod-live-bindings", {
          q: "ES module imports are live bindings: if the exporting module later reassigns an exported `let`, importers see the new value.",
          answer: true,
          why: "True. An ESM import is not a copy — it is a **read-only view** of the exporting module's binding. If `counter.js` does `export let count = 0` and later runs `count++`, every module that imported `count` sees the updated number. Importers cannot assign to it themselves: `count = 5` in the importing module throws a `TypeError`.\n\nCommonJS behaves differently: `const { count } = require(\"./counter\")` copies the value at that moment, so later changes are invisible unless you re-read `module.exports.count`.\n\nLive bindings are also part of why ESM copes better with circular imports: a binding can be filled in after another module has already linked to it.",
          tip: "A senior-flavoured distinction — contrasting it with CommonJS's copy-on-require is what makes the answer land.",
          c: ["modules"],
          d: 3,
        }),
        mcq("js-mod-tagged-template", {
          q: "In a tagged template, what does the tag function receive?",
          code: "const html = (strings, ...values) => { /* ... */ };\nconst out = html`<p>${name}</p>`;",
          why: "The tag receives the **literal string parts as an array**, followed by the **interpolated values as separate arguments**. Here `strings` is `[\"<p>\", \"</p>\"]` and `values` is `[name]`. There is always one more string part than there are values, because the template may start or end with an interpolation (giving an empty string part).\n\nThe tag can return anything, not only a string. That is what makes the pattern powerful: it sees the trusted, author-written parts separately from the untrusted values, so it can **escape the values** before combining them — the basis of safe HTML templating — or parse the whole thing into something else entirely, as `gql` queries and styled-components do.\n\n`strings.raw` also exposes the unprocessed text, which is how `String.raw` leaves backslashes untouched.",
          tip: "Naming a real use — escaping values for HTML or SQL — shows you understand why the parts arrive separately.",
          c: ["modules", "functions", "security"],
          d: 2,
          choices: [
            { t: "An array of the literal string parts, then each interpolated value as its own argument", ok: true, why: "Correct — hence the `(strings, ...values)` signature." },
            { t: "The fully interpolated string", why: "That is what an untagged template produces. The tag sees the pieces before they are joined." },
            { t: "Only the interpolated values, as an array", why: "It gets both, separately — the string parts come first." },
            { t: "A single object with `strings` and `values` properties", why: "They arrive as positional arguments, which is why rest syntax is used to collect the values." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("js-quality", {
      title: "Memory, Performance & Gotchas",
      level: 4,
      summary: "Leaks, debouncing, blocking the thread, and the traps that reach production.",
      keyIdeas: [
        "Leaks are references you forgot: un-removed listeners, live intervals, growing caches, detached DOM nodes.",
        "One thread: a long synchronous loop freezes the UI or stalls every request in Node. Offload CPU work.",
        "Debounce = run once after activity stops (search box). Throttle = at most once per interval (scroll).",
        "Memoise pure functions only, key with `Map.has` (not truthiness), and bound the cache.",
        "Measure before optimising — most slowness is round trips and payload size, not the loop you suspect.",
      ],
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
        tf("js-quality-gc-cycles", {
          q: "Two objects that reference each other can never be garbage collected, even when nothing else references them.",
          answer: false,
          why: "False. Modern engines use **tracing (mark-and-sweep) collection**: starting from the **roots** — globals, the current call stack, and whatever live closures hold — the collector marks everything reachable and frees the rest. A pair of objects pointing only at each other is unreachable from any root, so both are collected.\n\nThe cycle problem belonged to **reference counting**, which frees an object when its count of references reaches zero; two objects referencing each other keep each other's count at one forever. Old versions of Internet Explorer leaked this way through cycles between JavaScript objects and DOM nodes.\n\nThe lesson for leaks today: what matters is **reachability from a root**, not how many references exist.",
          tip: "Contrasting mark-and-sweep with reference counting is the textbook answer; saying 'reachability from roots' is the phrase to use.",
          c: ["memory"],
          d: 2,
        }),
        mcq("js-quality-devtools-leak", {
          q: "You suspect that opening and closing a modal leaks memory. What is the most reliable way to confirm it in Chrome DevTools?",
          why: "**Compare heap snapshots.** In the Memory panel, take a snapshot, open and close the modal several times, force garbage collection (the bin icon), then take a second snapshot and use the *Comparison* view. Objects whose count grows with each repetition and survive collection are the leak, and the *Retainers* pane shows the reference chain keeping them alive — usually a listener, timer, closure or cache.\n\nFiltering a snapshot for `Detached` finds DOM nodes that were removed from the page but are still referenced from JavaScript — the classic modal leak.\n\nWatching the tab's memory climb is only a hint: memory rises and falls naturally with GC timing, so a single high reading proves nothing. Repeat the action, collect garbage, compare.",
          tip: "The words 'retainers' and 'detached DOM nodes' tell the interviewer you have actually chased a leak.",
          c: ["memory", "tooling"],
          d: 3,
          choices: [
            { t: "Take heap snapshots before and after repeating the action, force GC, and compare what was retained", ok: true, why: "Correct — and follow the retainer chain to the cause." },
            { t: "Watch the tab's memory in the OS task manager and see whether it rises", why: "Memory naturally fluctuates with GC; a rising number is a hint, not evidence, and says nothing about *what* is retained." },
            { t: "Run a Lighthouse audit", why: "Lighthouse measures load performance and best practices, not memory retained across an interaction." },
            { t: "Record a Performance profile and look for long tasks", why: "Long tasks reveal CPU blocking, not memory being retained." },
          ],
        }),
        multi("js-quality-memo-tradeoffs", {
          q: "In which situations is memoising a function a **bad** idea?",
          why: "Memoisation trades **memory for time**, and it only pays off when the function is pure and expensive and the same inputs recur. It backfires when the function is **impure** (a cached answer goes stale — anything that reads the clock or a database), when the function is **cheap** (building the key and looking it up costs more than recomputing), when inputs **rarely repeat** (the cache grows without ever being hit — effectively a leak unless bounded), and when inputs are objects **mutated in place** (the reference is unchanged, so a stale result comes back).\n\nThe good fit is the opposite: an expensive pure computation called repeatedly with the same arguments, such as recursion with overlapping sub-problems.\n\nReact's `useMemo` and `memo` follow the same logic: they have a cost, so use them where a profiler shows the work matters.",
          tip: "Interviewers ask this after 'implement memoize' — naming the costs shows you would not sprinkle it everywhere.",
          c: ["performance", "memory", "memoization"],
          d: 2,
          choices: [
            { t: "The function reads the current time or other external state", ok: true },
            { t: "The function is cheaper to run than building and looking up the cache key", ok: true },
            { t: "Almost every call uses a new, never-repeated argument", ok: true },
            { t: "Arguments are objects that callers mutate between calls", ok: true },
            { t: "An expensive pure function called repeatedly with the same arguments", why: "This is the ideal case for memoisation." },
            { t: "A recursive function with overlapping sub-problems, like naive Fibonacci", why: "The textbook win — memoisation turns exponential time into linear." },
          ],
        }),
        short("js-quality-explain-gc", {
          q: "How does garbage collection work in JavaScript — and if it is automatic, how can an app still leak memory?",
          why: "The answer needs both halves: the reachability model, and why a leak in a garbage-collected language is really an unwanted reference. 'The GC frees unused memory' is too vague unless you define 'unused'.",
          model:
            "JavaScript engines use tracing garbage collection, conceptually mark-and-sweep. The collector starts from a set of roots — global variables, the current call stack, and whatever active closures hold — and marks every object it can reach by following references. Anything unmarked is unreachable, and its memory is reclaimed. Because it is based on reachability, reference cycles are not a problem. Engines like V8 add optimisations on top, such as generational collection that checks short-lived objects often and long-lived ones rarely.\n\nThe catch is that the collector cannot know what you still *need*, only what you can still *reach*. So a leak in JavaScript is a reference you forgot about: a listener on `window` holding a closure over a large component, a `setInterval` never cleared, a cache or array that only grows, or a DOM node removed from the page but still stored in a variable.\n\nTo find one, I take heap snapshots before and after repeating an action, compare what was retained, and follow the retainer chain. The fixes are removing listeners and timers in cleanup, bounding caches, and using a `WeakMap` when data is keyed by objects.",
          points: [
            "Tracing / mark-and-sweep from roots; unreachable objects are freed",
            "Reachability-based, so cycles are fine; engines add generational collection",
            "A leak is still-reachable but unneeded: listeners, timers, growing caches, detached DOM",
            "Diagnose with heap-snapshot comparison; fix with cleanup, bounds, `WeakMap`",
          ],
          c: ["memory"],
          d: 2,
          secs: 120,
        }),
        mcq("js-err-types", {
          q: "Which error does calling a function that was never declared anywhere — `sendReport()` — throw?",
          why: "A **`ReferenceError`** (`sendReport is not defined`): the name cannot be resolved in any scope. Compare a `TypeError`, which means the name *was* found but the value cannot be used that way — `const x = 1; x()` gives `TypeError: x is not a function`, and `null.length` gives `TypeError: Cannot read properties of null`.\n\nThe other built-ins worth knowing: `SyntaxError` means the code (or the input to `JSON.parse`) could not be parsed; `RangeError` means a value is outside its allowed range — `new Array(-1)`, `(1).toFixed(200)`, or runaway recursion (`Maximum call stack size exceeded` in V8).\n\nThe distinction speeds up debugging: a ReferenceError says 'this name does not exist here', a TypeError says 'this value is the wrong kind of thing'.",
          tip: "Giving one trigger for each built-in error type is the complete answer to 'what error types does JavaScript have?'.",
          c: ["error-handling"],
          d: 1,
          choices: [
            { t: "`ReferenceError`", ok: true, why: "Correct — the name does not exist in any scope." },
            { t: "`TypeError`", why: "Tempting because the message sounds like 'is not a function' — but that is for a name that exists and holds a non-function." },
            { t: "`SyntaxError`", why: "The code parses fine; the problem is only discovered when that line runs." },
            { t: "`RangeError`", why: "That is for values outside an allowed range, like an invalid array length." },
          ],
        }),
        mcq("js-err-custom", {
          q: "Why throw an `Error` subclass like this rather than `throw \"invalid email\"`?",
          code: `class ValidationError extends Error {
  constructor(message, options) {
    super(message, options);
    this.name = "ValidationError";
  }
}`,
          why: "Because an `Error` object carries a **stack trace** and can be **identified by type**. A thrown string has no stack, so you lose where it came from, and a `catch` block cannot tell it apart from other failures except by comparing text. With a subclass, a handler can check `err instanceof ValidationError` to return a 400 and rethrow everything else.\n\nSetting `this.name` makes logs and stack traces show `ValidationError` instead of `Error`. Passing `options` through to `super` enables `cause` (ES2022), so you can wrap a lower-level error without losing it: `new ValidationError(\"bad input\", { cause: err })`.\n\nThe general rule: throw only `Error` instances, catch narrowly, and let unexpected errors propagate.",
          tip: "Mention `cause` for wrapping errors and rethrowing what you cannot handle — that is the senior habit.",
          c: ["error-handling", "oop"],
          d: 2,
          choices: [
            { t: "An `Error` subclass captures a stack trace and can be checked with `instanceof`", ok: true, why: "Correct — traceable and distinguishable." },
            { t: "Throwing a string is a syntax error", why: "`throw` accepts any value — which is exactly why the convention matters." },
            { t: "`try/catch` only catches `Error` objects", why: "It catches anything thrown, strings included; the problem is what you can do with it afterwards." },
            { t: "Custom errors are caught before built-in ones", why: "`catch` has no type-based priority — you branch with `instanceof` inside a single catch block." },
          ],
        }),
      ],
    }),
  ],
});
