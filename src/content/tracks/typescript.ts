import { defineTrack, mod, mcq, multi, tf, out, blank, short } from "../builder";

export default defineTrack({
  slug: "typescript",
  name: "TypeScript",
  tagline: "Types that catch the bug before the build finishes",
  description:
    "Interfaces vs types, narrowing, generics and the utility types you are expected to use without looking up. Plus the boundary problem every codebase gets wrong.",
  icon: "TS",
  color: "#3178c6",
  modules: [
    // ─────────────────────────────────────────────────────────
    mod("ts-basics", {
      title: "Types, Interfaces & the Basics",
      level: 1,
      summary: "`type` vs `interface`, `any` vs `unknown`, and what survives to runtime.",
      keyIdeas: [
        "Types are erased at build time — nothing validates an API response unless you write the check.",
        "`unknown` is the safe top type: must be narrowed before use. `any` switches checking off and spreads.",
        "`type` can express unions, tuples, primitives and mapped types; `interface` can be merged and extended.",
        "`as` is an assertion, not a check — validate at boundaries with a schema (Zod) that also infers the type.",
        "With `strict`, `find` returns `T | undefined` and callers must handle the missing case.",
      ],
      brief: `The single most important fact: **TypeScript types are erased at build time**. They constrain your source code; they do not exist when the program runs. There is no type checking of an API response unless you write one.

**\`type\` vs \`interface\`** — for describing an object shape they are nearly interchangeable. The real differences:

- \`interface\` supports **declaration merging** (declare it twice and the members combine) and reads slightly better in \`extends\` chains.
- \`type\` can express things \`interface\` cannot: unions, tuples, primitives, mapped and conditional types.

A common team convention: \`interface\` for object shapes you might extend, \`type\` for everything else. Either is defensible — having a reason is what matters.

**\`any\` vs \`unknown\`** is the higher-signal question. \`any\` switches off checking entirely and spreads silently through your code. \`unknown\` is the *safe* top type: you can hold anything, but you must narrow before you use it. Reach for \`unknown\` at every boundary.

\`\`\`ts
function parse(json: string): unknown { return JSON.parse(json); }
const data = parse(s);
// data.name  ← error, good: you must check first
if (typeof data === "object" && data !== null && "name" in data) { /* ... */ }
\`\`\``,
      items: [
        mcq("ts-basics-any-unknown", {
          q: "What is the practical difference between `any` and `unknown`?",
          why: "Both can hold any value. The difference is on the way **out**: with `any`, TypeScript stops checking — you can call it, index it, pass it anywhere, and every error is deferred to runtime. With `unknown`, you must narrow (via `typeof`, `instanceof`, a check, or a validated parse) before doing anything with it.\n\n`unknown` is the correct type for anything crossing a boundary: `JSON.parse`, a `fetch` response body, a `catch` clause parameter. `any` is a suppression tool, and it spreads — one `any` quietly disables checking for everything it touches.",
          tip: "Saying 'I use `unknown` at boundaries and narrow with a validator like Zod' is a strong, current answer.",
          c: ["static-types", "narrowing"],
          d: 2,
          choices: [
            {
              t: "Both accept any value, but `unknown` must be narrowed before use",
              ok: true,
              why: "Correct — `unknown` is the type-safe top type.",
            },
            { t: "`unknown` accepts fewer values than `any`", why: "They accept the same set of values." },
            { t: "`any` is a runtime check, `unknown` is compile-time", why: "Neither exists at runtime." },
            { t: "`unknown` is just an alias for `any`", why: "They behave very differently at use sites." },
          ],
        }),
        multi("ts-basics-type-vs-interface", {
          q: "Which of these can `type` do that `interface` cannot?",
          why: "`type` is an alias for *any* type expression, so it can name unions (`\"a\" | \"b\"`), tuples (`[string, number]`), primitives (`type Id = string`), and mapped or conditional types.\n\n`interface` describes object shapes only — but it has one capability `type` lacks: **declaration merging**, where two interfaces with the same name combine. That is how libraries let you augment their types (extending Express's `Request`, for example).\n\nBoth support extension: `interface extends`, and `type` via intersection (`A & B`).",
          c: ["static-types"],
          d: 2,
          choices: [
            { t: "Define a union type", ok: true },
            { t: "Alias a primitive, like `type UserId = string`", ok: true },
            { t: "Define a tuple type", ok: true },
            { t: "Express a mapped or conditional type", ok: true },
            { t: "Be extended by another type", why: "Both can — `extends` for interfaces, `&` for types." },
            { t: "Describe the shape of an object", why: "Both do this equally well." },
          ],
        }),
        tf("ts-basics-runtime", {
          q: "TypeScript validates that an API response actually matches the interface you declared for it.",
          answer: false,
          why: "It does not. Types are erased during compilation; `const user = await res.json() as User` is an **assertion**, not a check. If the API returns something else, TypeScript is silent and you get a runtime error somewhere far from the cause.\n\nTo actually validate, parse with a schema library — Zod, Valibot, io-ts — that checks at runtime and *infers* the TypeScript type from the schema, so you have one source of truth. This gap between compile-time confidence and runtime reality is one of the most valuable things to say unprompted.",
          tip: "The phrase to use: 'types are compile-time only, so I validate at the boundary'.",
          c: ["static-types", "validation"],
          d: 2,
        }),
        mcq("ts-basics-assertion", {
          q: "What is wrong with this line?",
          code: `const user = JSON.parse(body) as User;`,
          why: "`as` is a **type assertion**: you are telling the compiler 'trust me, this is a `User`' and it stops checking. Nothing verifies the claim. If `body` is missing fields or has different types, the error surfaces later — often as `Cannot read properties of undefined` in an unrelated component.\n\nThe fix is runtime validation that also produces the type: `const user = UserSchema.parse(JSON.parse(body))`. Now a malformed payload fails immediately, at the boundary, with a message that names the offending field.",
          c: ["static-types", "validation"],
          d: 2,
          choices: [
            {
              t: "`as` asserts without checking — nothing verifies the data at runtime",
              ok: true,
              why: "Correct. Validate at the boundary instead.",
            },
            { t: "`JSON.parse` cannot return an object", why: "It certainly can." },
            { t: "It should be `<User>JSON.parse(body)`", why: "Equivalent syntax with the same problem — and it clashes with JSX." },
            { t: "Nothing — this is the recommended pattern", why: "It is common, but it is exactly the boundary gap to avoid." },
          ],
        }),
        blank("ts-basics-annotate", {
          q: "Type this function: it takes a list of users and an id, and returns the matching user or `undefined`.",
          template: `function findUser(users: User{{1}}, id: string): User {{2}} undefined {
  return users.find((u) => u.id === id);
}`,
          answers: [["[]", "Array"], ["|"]],
          hints: ["Array syntax", "The union operator"],
          why: "`User[]` is the array, and `User | undefined` is the honest return type — `Array.prototype.find` returns `undefined` when nothing matches, and with `strictNullChecks` on, TypeScript requires you to say so.\n\nThat forced honesty is the point of strict mode: every caller now has to handle the not-found case, so you cannot accidentally dereference a missing user.",
          c: ["static-types", "nullability"],
          d: 1,
        }),
        mcq("ts-basics-void-never", {
          q: "What is the difference between a function returning `void` and one returning `never`?",
          why: "`void` means the function **returns, but with no useful value** — a logger, an event handler. `never` means the function **never returns normally at all**: it always throws, or it loops forever. `function fail(msg: string): never { throw new Error(msg); }` is the classic example.\n\nThat difference has consequences for narrowing: after a call to a `never`-returning function, TypeScript knows the code below is unreachable, so `if (!user) fail(\"missing\");` narrows `user` to non-null afterwards. `never` is also the empty type — the type of a value that cannot exist — which is exactly why exhaustiveness checks assign the leftover case to a `never` variable.\n\nFor completeness: `any` switches type checking off, and `unknown` accepts any value but forces you to narrow before use.",
          tip: "Tie `never` to exhaustiveness checking — it shows you use it, not just know it.",
          c: ["static-types", "narrowing"],
          d: 2,
          choices: [
            {
              t: "`void` returns without a useful value; `never` never returns normally because it always throws or loops",
              ok: true,
              why: "Correct — and `never` enables narrowing after the call.",
            },
            {
              t: "They are synonyms; `never` is the older spelling",
              why: "They are distinct types. A `void` function may return; a `never` function cannot.",
            },
            {
              t: "`never` means the function returns `null` or `undefined`",
              why: "That is closer to `void` or `undefined`. `never` has no values at all.",
            },
            {
              t: "`void` functions cannot be called in expressions",
              why: "They can; the result is simply typed `void`, so you cannot usefully read it.",
            },
          ],
        }),
        mcq("ts-basics-enum", {
          q: "Why do many TypeScript teams prefer `type Status = \"active\" | \"banned\"` over `enum Status { Active = \"active\", Banned = \"banned\" }`?",
          why: "Because a **union of literals is purely a type** and disappears at compile time, while an **enum is one of the few TypeScript features that emits runtime JavaScript** — an object with the members. Everything else follows from that.\n\nA string enum is also nominal-ish: a plain `\"active\"` string, such as one from a JSON response, is not assignable to `Status.Active`, so you end up casting at every boundary. A literal union accepts the string directly and still gets full autocomplete and exhaustiveness checking. Numeric enums have their own oddities, such as reverse mappings on the emitted object.\n\nThe runtime-emitting part has become a practical issue too: tools that simply strip types, including Node's built-in TypeScript support, cannot handle enums without an extra transform. If you want a runtime list of values, `const STATUSES = [\"active\", \"banned\"] as const` plus `type Status = typeof STATUSES[number]` gives you both.\n\nEnums are not *wrong* — plenty of codebases use them — but this is why many style guides avoid them.",
          tip: "Show the `as const` array pattern — it answers 'but I need the values at runtime'.",
          c: ["static-types", "tooling"],
          d: 2,
          choices: [
            {
              t: "A literal union is erased at compile time and accepts plain strings; an enum emits runtime code and rejects raw string literals",
              ok: true,
              why: "Correct — the runtime footprint and the assignability friction are the two main reasons.",
            },
            {
              t: "Enums do not support autocomplete in editors",
              why: "They autocomplete fine; so do literal unions.",
            },
            {
              t: "Literal unions are checked at runtime, enums only at compile time",
              why: "Backwards — neither is validated at runtime, but only the enum exists at runtime at all.",
            },
            {
              t: "Enums cannot be used in `switch` statements",
              why: "They can, including exhaustiveness checks.",
            },
          ],
        }),
        tf("ts-basics-merging", {
          q: "Two `interface User` declarations in the same scope are a compile error, just like two `type User` aliases.",
          answer: false,
          why: "False. Interfaces support **declaration merging**: two `interface User` declarations in the same scope combine into one interface with the members of both (conflicting property types are an error). Two `type User` aliases, by contrast, are a duplicate-identifier error.\n\nMerging is mostly used to **augment types you do not own**. Adding a property to `Window`, extending Express's `Request` with a `user` field, or adding fields to a library's theme type are all done by redeclaring the interface, inside `declare global { ... }` or `declare module \"express\" { ... }` when you are in a module file.\n\nThe flip side is that merging can happen by accident — in a global script (a file with no imports or exports), an interface named the same as a built-in one such as `Event` silently extends it — which is one reason some teams default to `type` for their own shapes.",
          c: ["static-types", "structural-typing"],
          d: 2,
        }),
        mcq("ts-basics-dts", {
          q: "What is a `.d.ts` file?",
          why: "A **declaration file**: it contains only type information — signatures, interfaces, `declare` statements — and no implementation. It describes the shape of JavaScript that exists elsewhere, so TypeScript can type-check code that uses it.\n\nYou meet them in three places. Libraries written in TypeScript ship generated `.d.ts` files next to their compiled `.js` (`\"declaration\": true` produces them). Libraries written in plain JavaScript get community types from DefinitelyTyped, installed as `@types/lodash` and friends. And you write small ones yourself, e.g. `declare module \"*.svg\"` so imports of assets type-check, or to augment a global.\n\nNothing in a `.d.ts` runs, and the compiler emits no JavaScript for it. `skipLibCheck: true` tells the compiler not to type-check these files internally, which speeds builds and hides conflicts between third-party typings.",
          tip: "Mentioning `@types/` and `declare module` shows you have wired up an untyped library before.",
          c: ["static-types", "tooling", "packages"],
          d: 1,
          choices: [
            {
              t: "A types-only file describing the shape of JavaScript code, with no implementation",
              ok: true,
              why: "Correct — it exists purely for the type checker.",
            },
            {
              t: "A compiled TypeScript file ready to run in Node",
              why: "Compiled output is `.js`; the `.d.ts` sits beside it describing its types.",
            },
            {
              t: "A debug build of a TypeScript module with source maps",
              why: "Source maps are `.map` files. The `d` stands for declaration.",
            },
            {
              t: "A file of runtime validators generated from your interfaces",
              why: "TypeScript generates no runtime validation; libraries such as Zod fill that role.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("ts-narrowing", {
      title: "Unions, Narrowing & Guards",
      level: 2,
      summary: "Discriminated unions — the pattern that replaces most of your defensive checks.",
      keyIdeas: [
        "Narrow with `typeof`, `instanceof`, `in`, truthiness, and equality against literal discriminants.",
        "Model 'one of these shapes' as a discriminated union — impossible states become unrepresentable.",
        "A member access must be valid for every union member, or you must narrow first.",
        "A `default` branch assigning to `never` turns a forgotten case into a compile error.",
        "Type predicates (`x is Fish`) narrow at call sites but are trusted, not verified — keep them tiny.",
      ],
      brief: `A **union** says a value is one of several types. **Narrowing** is proving to the compiler which one you have.

The narrowing tools: \`typeof\` (primitives), \`instanceof\` (classes), \`in\` (property presence), truthiness checks, equality against literals, and **discriminant properties**.

The last is the pattern worth internalising — a **discriminated union**:

\`\`\`ts
type Result =
  | { status: "loading" }
  | { status: "success"; data: User[] }
  | { status: "error"; message: string };

function render(r: Result) {
  switch (r.status) {
    case "loading": return <Spinner />;
    case "success": return <List items={r.data} />;   // data exists here
    case "error":   return <Error text={r.message} />; // message exists here
  }
}
\`\`\`

The compiler knows which members exist in each branch. Compare it to the alternative — \`{ loading: boolean; data?: User[]; error?: string }\` — which permits nonsense states like loading *and* errored at once, and forces \`?.\` everywhere.

Add an \`never\` check in the default branch and adding a fourth status becomes a **compile error** at every place you forgot to handle it. That is exhaustiveness checking, and it is the strongest argument for the pattern.`,
      items: [
        mcq("ts-narrow-discriminated", {
          q: "Why is a discriminated union usually better than optional flags for request state?",
          code: `// A
type State = { loading: boolean; data?: User[]; error?: string };

// B
type State =
  | { status: "loading" }
  | { status: "success"; data: User[] }
  | { status: "error"; error: string };`,
          why: "B makes **impossible states unrepresentable**. With A you can construct `{loading: true, error: \"x\", data: [...]}`, which is meaningless, and every read of `data` needs a `?.` or a non-null assertion because the type cannot promise it is there.\n\nWith B, once you check `status === \"success\"`, TypeScript knows `data` exists and is not optional. Add an exhaustiveness check and a new status becomes a compile error everywhere it is unhandled, instead of a silently missing branch.",
          tip: "'Make illegal states unrepresentable' is the phrase — it lands well.",
          c: ["narrowing", "static-types"],
          d: 2,
          choices: [
            {
              t: "It makes impossible states unrepresentable and narrows precisely",
              ok: true,
              why: "Correct — plus exhaustiveness checking as a bonus.",
            },
            { t: "It generates less JavaScript", why: "Both compile to nothing; types are erased." },
            { t: "It is faster at runtime", why: "No runtime difference." },
            { t: "Optional properties are deprecated", why: "They are fine — just not for modelling mutually exclusive states." },
          ],
        }),
        out("ts-narrow-typeof", {
          q: "Does this compile under `strict`?",
          code: `function format(x: string | number) {
  return x.toFixed(2);
}`,
          lang: "typescript",
          why: "**No.** `toFixed` exists on `number` but not on `string`, and the parameter could be either. TypeScript rejects any member access that is not valid for *every* member of the union.\n\nNarrow first:\n\n```ts\nif (typeof x === \"number\") return x.toFixed(2);\nreturn x;\n```\n\nInside that block TypeScript knows `x` is a `number`. This is the everyday form of narrowing — the compiler follows ordinary control flow.",
          c: ["narrowing"],
          d: 1,
          choices: [
            {
              t: "No — `toFixed` does not exist on `string`, so the union must be narrowed",
              ok: true,
              why: "Correct: a member must be valid for every branch of the union.",
            },
            { t: "Yes — TypeScript coerces `x` to a number", why: "TypeScript never inserts coercion." },
            { t: "Yes, but only with `strictNullChecks` off", why: "This is about union members, not null." },
            { t: "No — `format` needs an explicit return type", why: "The return type is inferred fine; the body is the problem." },
          ],
        }),
        blank("ts-narrow-exhaustive", {
          q: "Complete the exhaustiveness check so a newly added status becomes a compile error here.",
          template: `function label(s: Status): string {
  switch (s.kind) {
    case "loading": return "Loading";
    case "done": return "Done";
    default: {
      const _exhaustive: {{1}} = s;
      throw new Error("Unhandled: " + {{2}});
    }
  }
}`,
          answers: [["never"], ["s", "_exhaustive"]],
          hints: ["The type with no possible values", "The variable holding the unhandled case"],
          why: "In the `default` branch, if every union member has been handled, `s` narrows to `never` — the type with no values — so assigning it to a `never` variable is legal. Add a third status and `s` is no longer `never` in that branch, so the assignment fails to compile.\n\nThis converts 'I hope I updated every switch' into a guarantee the compiler enforces. It is the payoff that makes discriminated unions worth the extra typing.",
          tip: "Being able to write this from memory is a genuine mid-level TypeScript signal.",
          c: ["narrowing", "static-types"],
          d: 3,
          secs: 75,
        }),
        mcq("ts-narrow-guard", {
          q: "What does the `pet is Fish` return type do here?",
          code: `function isFish(pet: Fish | Bird): pet is Fish {
  return (pet as Fish).swim !== undefined;
}`,
          why: "It declares a **type predicate**. When `isFish(x)` returns `true`, TypeScript narrows `x` to `Fish` in the surrounding scope — something a plain `boolean` return could never do.\n\nThe caution worth voicing: the compiler *trusts* you. If the body's logic is wrong, you have created an unsound narrowing that fails at runtime with no warning. Custom guards should be small, obviously correct, and ideally replaced by a discriminant property when you control the types.",
          c: ["narrowing"],
          d: 3,
          choices: [
            {
              t: "It is a type predicate: a `true` result narrows the argument to `Fish` at the call site",
              ok: true,
              why: "Correct — and TypeScript trusts the implementation.",
            },
            { t: "It casts the parameter to `Fish` inside the function", why: "The `as` inside does that; the predicate affects callers." },
            { t: "It performs a runtime check automatically", why: "You still write the check yourself." },
            { t: "It is equivalent to returning `boolean`", why: "A plain boolean does not narrow anything." },
          ],
        }),
        multi("ts-narrow-tools", {
          q: "Which of these narrow a union in TypeScript?",
          why: "`typeof` narrows primitives, `instanceof` narrows class instances, `in` narrows by property presence, and comparing a **discriminant property** to a literal narrows to that union member. Truthiness checks (`if (x)`) also narrow out `null`/`undefined`.\n\nWhat does **not** narrow: `as` (an assertion — it overrides rather than proves), and `Array.isArray` does narrow but only for arrays specifically. A comment certainly does not.",
          c: ["narrowing"],
          d: 2,
          choices: [
            { t: "`typeof x === \"string\"`", ok: true },
            { t: "`x instanceof Error`", ok: true },
            { t: '`"swim" in pet`', ok: true },
            { t: '`if (shape.kind === "circle")`', ok: true },
            { t: "`if (x)` for a `string | null`", ok: true },
            { t: "`x as Circle`", why: "An assertion overrides the type rather than proving it — no safety gained." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("ts-generics", {
      title: "Generics",
      level: 2,
      summary: "Preserving the relationship between input and output types.",
      keyIdeas: [
        "A generic preserves the relationship between input and output types instead of collapsing to `any`.",
        "Inference does the work: `first(users)` is `User | undefined` with no annotation.",
        "Constrain with `extends` to require capabilities; `K extends keyof T` plus `T[K]` gives typed property access.",
        "A type parameter used in only one position is noise — reach for a plain type instead.",
        "TypeScript generics are erased; C# generics are reified. You cannot check `T` at runtime in TS.",
      ],
      brief: `A generic is a type **parameter**. The point is not reuse — it is preserving a relationship the compiler would otherwise lose.

\`\`\`ts
function first(arr: any[]): any {}          // caller learns nothing
function first<T>(arr: T[]): T | undefined {} // caller gets the element type back
\`\`\`

With the generic version, \`first(users)\` is \`User | undefined\` with no annotation needed. Inference does the work.

**Constraints** let you require capabilities of the parameter:

\`\`\`ts
function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}
\`\`\`

Now \`T\` can be a string or an array — anything with \`length\` — and the return type is still the *specific* type the caller passed.

\`keyof\` plus a constraint gives type-safe property access:

\`\`\`ts
function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {}
pluck(user, "name");   // string
pluck(user, "nope");   // compile error
\`\`\`

The rule of thumb: reach for a generic when the same type appears in more than one position in a signature. If a type parameter is used only once, it probably wants to be a plain parameter type instead.`,
      items: [
        mcq("ts-gen-why", {
          q: "What does the generic version buy you over the `any` version?",
          code: `function first<T>(arr: T[]): T | undefined { return arr[0]; }
function firstAny(arr: any[]): any { return arr[0]; }`,
          why: "The generic **preserves the relationship** between argument and return type. `first(users)` is `User | undefined`; `firstAny(users)` is `any`, which switches off checking for everything downstream — a typo on the result is now a runtime error.\n\nThat is the sentence to lead with. Describing generics as 'reusable code' is technically true but is the answer that reads as memorised: `any` is equally reusable and considerably worse.",
          c: ["generics", "static-types"],
          d: 2,
          choices: [
            {
              t: "The return type tracks the argument type, so callers keep full type safety",
              ok: true,
              why: "Correct — relationship preservation is the whole point.",
            },
            { t: "It runs faster because the type is known", why: "Types are erased; runtime is identical." },
            { t: "It prevents passing an empty array", why: "Neither version constrains length." },
            { t: "It makes the function reusable — `any` is not", why: "Both are reusable; only one stays type-safe." },
          ],
        }),
        blank("ts-gen-constraint", {
          q: "Constrain `K` so only real keys of `T` are accepted, and return the value's type.",
          template: `function pluck<T, K extends {{1}} T>(obj: T, key: K): {{2}} {
  return obj[key];
}`,
          answers: [["keyof"], ["T[K]"]],
          hints: ["The operator producing the union of an object's key names", "An indexed access type"],
          why: "`K extends keyof T` restricts `key` to the literal union of `T`'s property names, so a typo is a compile error. `T[K]` is an **indexed access type**: the type of the property at that key.\n\nCalling `pluck(user, \"name\")` gives you `string`, and `pluck(user, \"emial\")` fails to compile. This pair — `keyof` plus indexed access — is the foundation under most utility types.",
          c: ["generics"],
          d: 3,
          secs: 70,
        }),
        out("ts-gen-infer", {
          q: "What type is `result` inferred as?",
          code: `function wrap<T>(value: T): { value: T; at: number } {
  return { value, at: Date.now() };
}
const result = wrap("hello");`,
          lang: "typescript",
          why: "`{ value: string; at: number }`. TypeScript infers `T` from the argument — and for a string literal passed to a plain `T` parameter it widens to `string`, not the literal type `\"hello\"`.\n\nIf you wanted the literal type preserved you would constrain it: `function wrap<T extends string>(...)` infers `\"hello\"`, or the caller can write `wrap(\"hello\" as const)`. That widening rule catches people out when building typed config objects.",
          c: ["generics"],
          d: 2,
          choices: [
            { t: "`{ value: string; at: number }`", ok: true, why: "Correct — the literal widens to `string`." },
            { t: '`{ value: "hello"; at: number }`', why: "Literal types need a constraint or `as const` to be preserved." },
            { t: "`{ value: any; at: number }`", why: "Inference succeeds; nothing here is `any`." },
            { t: "`{ value: unknown; at: number }`", why: "`unknown` only appears if inference has nothing to go on." },
          ],
        }),
        tf("ts-gen-runtime", {
          q: "You can check a generic type parameter at runtime, e.g. `if (T === string)`.",
          answer: false,
          why: "No — type parameters are erased along with everything else. There is no `T` at runtime to inspect. (C# differs here: generics are **reified**, so `typeof(T)` genuinely works.)\n\nIf you need runtime behaviour that depends on the type, pass a value that carries the information: a discriminant string, a constructor, or a validator function. This TypeScript/C# contrast is a great thing to know when interviewing for a full-stack role using both.",
          c: ["generics", "static-types"],
          d: 3,
        }),
        mcq("ts-gen-overuse", {
          q: "Is the generic here earning its place?",
          code: `function log<T>(message: T): void {
  console.log(message);
}`,
          why: "**No.** `T` appears in exactly one position and the return type does not depend on it, so it conveys nothing the compiler can use — `message: unknown` says the same thing more plainly.\n\nThe rule: a type parameter is useful when it appears in **two or more** positions, linking them (argument to return, or one argument to another). A single-use type parameter is noise, and reviewers notice it as a sign of cargo-culted generics.",
          tip: "Being able to say when *not* to use a feature is a stronger signal than being able to use it.",
          c: ["generics"],
          d: 3,
          choices: [
            {
              t: "No — `T` is used once and links nothing; `unknown` would be clearer",
              ok: true,
              why: "Correct. Generics need at least two positions to be meaningful.",
            },
            { t: "Yes — it keeps the function reusable", why: "`unknown` is equally reusable and simpler." },
            { t: "Yes — it avoids `any`", why: "So does `unknown`, without the ceremony." },
            { t: "No — it should be `T extends string`", why: "Constraining does not fix the single-use problem." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("ts-utility", {
      title: "Utility Types & Deriving Types",
      level: 3,
      summary: "One source of truth, everything else derived.",
      keyIdeas: [
        "Derive, don't duplicate: `Partial`, `Pick`, `Omit`, `Required`, `Readonly`, `Record`.",
        "`Omit` server-owned fields for create payloads; `Partial` that for PATCH payloads.",
        "`Record<Union, V>` forces every union member as a key — add a status and the map breaks until handled.",
        "`ReturnType<typeof fn>` and `Awaited<T>` tie a type to the implementation that produces it.",
        "`Readonly` and `readonly` are compile-time and shallow — no runtime protection.",
      ],
      brief: `Utility types let one type generate the rest, so a field added in one place propagates everywhere.

| Utility | Produces |
|---|---|
| \`Partial<T>\` | every property optional — patch/update payloads |
| \`Required<T>\` | every property required |
| \`Pick<T, K>\` | only the listed keys |
| \`Omit<T, K>\` | everything except the listed keys |
| \`Record<K, V>\` | an object type with keys \`K\` and values \`V\` |
| \`Readonly<T>\` | every property readonly |
| \`ReturnType<F>\` | the return type of a function type |
| \`Awaited<T>\` | the type inside a promise |
| \`NonNullable<T>\` | \`T\` minus \`null\` and \`undefined\` |

The everyday application is API payload types derived from one entity:

\`\`\`ts
type User = { id: string; name: string; email: string; createdAt: Date };
type CreateUser = Omit<User, "id" | "createdAt">;   // what a POST accepts
type UpdateUser = Partial<CreateUser>;               // what a PATCH accepts
type UserListItem = Pick<User, "id" | "name">;       // what the list endpoint returns
\`\`\`

Add a field to \`User\` and all three follow automatically. Hand-maintaining four parallel interfaces is the failure this prevents — and the drift between them is a real, recurring source of bugs.`,
      items: [
        mcq("ts-util-patch", {
          q: "A `PATCH` endpoint accepts any subset of a user's editable fields. Which type expresses that?",
          code: `type User = { id: string; name: string; email: string; createdAt: Date };`,
          why: "`Partial<Omit<User, \"id\" | \"createdAt\">>` — `Omit` removes the server-controlled fields (a client must not set `id` or `createdAt`), and `Partial` makes the rest optional because PATCH is a partial update.\n\nComposing utilities like this is exactly what they are for. Adding a field to `User` automatically makes it patchable, with no second type to remember to update.",
          c: ["utility-types", "rest"],
          d: 2,
          choices: [
            { t: '`Partial<Omit<User, "id" | "createdAt">>`', ok: true, why: "Correct — drop server-owned fields, then make the rest optional." },
            { t: "`Partial<User>`", why: "Would let a client send `id` or `createdAt`." },
            { t: '`Pick<User, "name" | "email">`', why: "Right fields, but all required — that is PUT, not PATCH." },
            { t: "`Readonly<User>`", why: "Readonly is about mutation, not optionality." },
          ],
        }),
        mcq("ts-util-record", {
          q: "You need an object mapping each `Status` to a colour string, and you want a compile error if a status is missing. Which type?",
          code: `type Status = "todo" | "doing" | "done";`,
          why: "`Record<Status, string>` requires **every** member of the union as a key. Forget `\"done\"` and it fails to compile; add a fourth status to the union and the object breaks until you handle it.\n\n`Partial<Record<Status, string>>` would allow gaps, and `{ [key: string]: string }` allows any key at all — losing both the exhaustiveness guarantee and typo protection. This is a small pattern with outsized value for lookup tables, config maps and i18n dictionaries.",
          c: ["utility-types", "static-types"],
          d: 2,
          choices: [
            { t: "`Record<Status, string>`", ok: true, why: "Correct — every union member is a required key." },
            { t: "`{ [key: string]: string }`", why: "Accepts any key and requires none — no safety." },
            { t: "`Partial<Record<Status, string>>`", why: "Explicitly permits the missing entry you want flagged." },
            { t: "`Map<Status, string>`", why: "Runtime structure; nothing forces completeness at compile time." },
          ],
        }),
        blank("ts-util-derive", {
          q: "Derive the response type of an async function without restating it.",
          template: `async function getUser(id: string) {
  return { id, name: "Ada", email: "a@b.c" };
}

type User = {{1}}<{{2}}<typeof getUser>>;`,
          answers: [["Awaited"], ["ReturnType"]],
          hints: ["Unwraps a Promise", "Extracts a function's return type"],
          why: "`ReturnType<typeof getUser>` gives `Promise<{...}>`, and `Awaited<...>` unwraps it to the resolved shape. `typeof getUser` is needed because `getUser` is a *value*; `typeof` in type position lifts it into a type.\n\nThis keeps the type tied to the implementation — change what the function returns and `User` follows. Worth knowing the limit too: for a public API contract, an explicitly declared type is often better, because then the *function* is checked against the contract rather than defining it.",
          c: ["utility-types", "generics"],
          d: 3,
          secs: 70,
        }),
        out("ts-util-readonly", {
          q: "Does this compile?",
          code: `const config: Readonly<{ retries: number }> = { retries: 3 };
config.retries = 5;`,
          lang: "typescript",
          why: "**No** — `Readonly<T>` marks every property `readonly`, so assignment is a compile error: *Cannot assign to 'retries' because it is a read-only property*.\n\nThe important caveat: this is **compile-time only and shallow**. Nothing stops mutation at runtime, and nested objects are still mutable unless you use `as const` or a deep-readonly helper. It documents and enforces intent during development; it is not a runtime guarantee.",
          c: ["utility-types", "immutability"],
          d: 2,
          choices: [
            { t: "No — assigning to a readonly property is a compile error", ok: true, why: "Correct, though it is erased at runtime." },
            { t: "Yes — `readonly` only applies to arrays", why: "It applies to object properties too." },
            { t: "Yes, with a warning", why: "TypeScript errors rather than warns here." },
            { t: "No — `Readonly` requires `as const`", why: "They are independent mechanisms." },
          ],
        }),
        short("ts-util-explain-value", {
          q: "*\"We have a JavaScript codebase. Convince me TypeScript is worth the migration.\"*",
          why: "A judgement question. The weak answer is 'it catches bugs'. The strong one names the mechanism, the non-obvious benefits, and the honest costs.",
          model:
            "The biggest win is not really bug-catching — it is that types are documentation the compiler enforces. When I call a function I can see what it needs and what it returns without reading its body, and my editor autocompletes it. On a team, that removes a whole class of 'what shape is this object?' interruptions.\n\nThe second win is refactoring confidence. Renaming a field or changing a return type shows me every call site immediately, instead of me grepping and hoping. That is what makes people willing to improve existing code rather than working around it.\n\nThe costs are real and I'd name them: a build step, slower initial velocity, type definitions for untyped dependencies, and the risk that people paper over friction with `any` — which gives you the cost without the benefit. I'd also be clear that types are erased at runtime, so it does nothing for malformed API responses unless you validate at the boundary with something like Zod.\n\nPractically I'd migrate incrementally — `allowJs`, file by file, strict mode on for new code — rather than proposing a big-bang rewrite.",
          points: [
            "Enforced documentation + editor autocomplete, not just bug prevention",
            "Refactoring confidence: the compiler finds every call site",
            "Honest costs: build step, ramp-up, `any` escape hatches",
            "Types are erased — still need runtime validation at boundaries",
            "Migrate incrementally with `allowJs`, not all at once",
          ],
          c: ["static-types", "tooling"],
          d: 3,
          secs: 150,
        }),
        mcq("ts-util-index-signature", {
          q: "`const prices: Record<string, number> = {};` — what is the type of `prices[\"widget\"]` under default `strict` settings?",
          why: "**`number`** — even though the key may well be missing and the real value `undefined`. `Record<string, number>` is equivalent to the index signature `{ [key: string]: number }`, and an index signature promises a value for *every* possible key. TypeScript takes that promise at face value.\n\nThe fix is the `noUncheckedIndexedAccess` compiler option, which is **not** part of `strict`. With it on, indexed reads through a signature become `number | undefined`, forcing a check before use. Alternatives are a `Map<string, number>`, whose `get` already returns `number | undefined`, or narrowing the key type.\n\nWhere `Record` genuinely shines is with a **finite key union**: `Record<Status, string>` requires every status to be present, which is a compile-time completeness check a plain index signature cannot give you.",
          tip: "Naming `noUncheckedIndexedAccess` — and that `strict` does not include it — is a strong signal.",
          c: ["utility-types", "nullability"],
          d: 3,
          choices: [
            {
              t: "`number`, even though the key may be missing; `noUncheckedIndexedAccess` makes it `number | undefined`",
              ok: true,
              why: "Correct — the index signature promises a value for every key.",
            },
            {
              t: "`number | undefined`, because `strict` includes unchecked-index protection",
              why: "`noUncheckedIndexedAccess` is a separate flag outside `strict`.",
            },
            {
              t: "A compile error, because `\"widget\"` is not a declared key",
              why: "A `string` index signature accepts any string key.",
            },
            {
              t: "`unknown`, because the object was initialised empty",
              why: "The annotation, not the initial value, determines the type.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("ts-config", {
      title: "Config, Structural Typing & Traps",
      level: 4,
      summary: "`strict`, excess property checks, and the places TypeScript is unsound on purpose.",
      keyIdeas: [
        "`strict: true` is where the value lives: `strictNullChecks` and `noImplicitAny` above all.",
        "TypeScript is structural: any value with the right members is compatible, `implements` or not.",
        "Object literals get excess-property checks; the same object via a variable does not.",
        "`!` (non-null assertion) suppresses the check without verifying — use rarely and comment why.",
        "TypeScript is deliberately unsound in places for practicality; it is a tool, not a proof.",
      ],
      brief: `**\`strict: true\`** turns on the checks that make TypeScript worth having — chiefly \`strictNullChecks\` (null and undefined are no longer assignable to everything) and \`noImplicitAny\`. A codebase without it gets a fraction of the value.

**Structural typing**: compatibility is by shape. A value with the right members satisfies an interface it has never heard of. C# is *nominal* — you must declare \`: IFoo\`. This is why a plain object literal can be passed where an interface is expected.

**Excess property checking** is the exception that confuses everyone. Object *literals* assigned directly are checked for extra properties; the same object through a variable is not:

\`\`\`ts
type P = { name: string };
const a: P = { name: "x", extra: 1 };  // error — literal is checked
const o = { name: "x", extra: 1 };
const b: P = o;                        // fine — structural compatibility
\`\`\`

The literal check is a deliberate typo-catcher, not a soundness rule.

TypeScript is also **unsound in known places**, on purpose, for practicality: array method parameter bivariance, \`as\` assertions, and non-null \`!\`. Knowing that it is a pragmatic tool rather than a proof system is a mature take.`,
      items: [
        mcq("ts-config-excess", {
          q: "Why does the first line error and the second not?",
          code: `type Point = { x: number; y: number };

const a: Point = { x: 1, y: 2, z: 3 };   // error
const raw = { x: 1, y: 2, z: 3 };
const b: Point = raw;                     // fine`,
          lang: "typescript",
          why: "**Excess property checking** applies to object literals assigned directly to a typed target. It exists to catch typos and misplaced properties at the moment you write them.\n\nOnce the object goes through a variable, ordinary **structural typing** applies: `raw` has at least `x` and `y`, so it is a valid `Point`, and the extra `z` is ignored. That is not a loophole — it is the general rule, and the literal check is the special case layered on top.",
          tip: "This surprises people who assume TypeScript is uniformly strict. Being able to explain *why* both behaviours are intentional is the good answer.",
          c: ["structural-typing", "static-types"],
          d: 3,
          choices: [
            {
              t: "Object literals get excess property checks; variables fall back to structural compatibility",
              ok: true,
              why: "Correct — the literal check is a deliberate typo-catcher.",
            },
            { t: "`raw` is inferred as `any`", why: "It is inferred with all three properties, precisely typed." },
            { t: "The second line is also an error, in strict mode", why: "It is legal under every setting." },
            { t: "`const` disables the check", why: "Both use `const`; the difference is literal vs variable." },
          ],
        }),
        multi("ts-config-strict", {
          q: "Which checks does `\"strict\": true` enable?",
          why: "`strict` is an umbrella for `strictNullChecks`, `noImplicitAny`, `strictFunctionTypes`, `strictBindCallApply`, `strictPropertyInitialization`, `noImplicitThis`, `alwaysStrict` and `useUnknownInCatchVariables`.\n\nThe two that change daily life most are `strictNullChecks` — which forces you to handle missing values instead of discovering them at runtime — and `noImplicitAny`, which stops untyped parameters silently disabling checking.\n\nWhat `strict` does **not** do: validate runtime data, or turn on `noUncheckedIndexedAccess` (a separate, stricter flag that makes `arr[0]` `T | undefined`).",
          c: ["static-types", "config", "nullability"],
          d: 3,
          choices: [
            { t: "`strictNullChecks`", ok: true },
            { t: "`noImplicitAny`", ok: true },
            { t: "`strictFunctionTypes`", ok: true },
            { t: "`strictPropertyInitialization`", ok: true },
            { t: "Runtime validation of API responses", why: "Nothing in tsconfig produces runtime checks." },
            { t: "`noUncheckedIndexedAccess`", why: "A separate opt-in flag, not part of `strict`." },
          ],
        }),
        out("ts-config-nonnull", {
          q: "What is the risk in this line?",
          code: `const el = document.getElementById("root")!;
el.textContent = "hi";`,
          lang: "typescript",
          why: "`!` is a **non-null assertion**: it tells the compiler 'this is definitely not null' without any check. If the element is missing — a typo, a changed template, a script running before the DOM is ready — you get `Cannot set properties of null` at runtime, with the type system having said nothing.\n\n`!` is occasionally justified when you genuinely know more than the compiler, but it should be rare and ideally commented. The safer form is an explicit check that throws a message naming what was missing.",
          c: ["nullability", "static-types"],
          d: 2,
          choices: [
            {
              t: "`!` suppresses the null check without verifying anything — it can still be null at runtime",
              ok: true,
              why: "Correct: an unchecked promise to the compiler.",
            },
            { t: "`!` performs a runtime null check", why: "It compiles to nothing at all." },
            { t: "It negates the value", why: "That is prefix `!`; this is the postfix assertion operator." },
            { t: "No risk — `getElementById` never returns null", why: "It returns `null` whenever the id is not found." },
          ],
        }),
        tf("ts-config-structural", {
          q: "In TypeScript, a class must explicitly declare `implements IFoo` to be usable where `IFoo` is expected.",
          answer: false,
          why: "False — TypeScript is **structurally** typed. Any class with the required members is compatible, whether or not it declares `implements`. Writing `implements` is useful because it makes the compiler check the class *at its definition* rather than at each use site, so errors point at the right file — but it is not required for assignability.\n\nC# is the contrast: nominally typed, where the declaration *is* the contract. On a full-stack interview covering both, naming this difference shows you have not just pattern-matched one onto the other.",
          c: ["structural-typing", "oop"],
          d: 3,
        }),
        mcq("ts-config-satisfies", {
          q: "What does `satisfies` do here that a `: Record<Route, string | string[]>` annotation would not?",
          code: `type Route = "home" | "orders";

const paths = {
  home: "/",
  orders: ["/orders", "/orders/:id"],
} satisfies Record<Route, string | string[]>;`,
          lang: "typescript",
          why: "It **checks the value against the type without changing the value's inferred type**. The object must match `Record<Route, string | string[]>` — a missing route or a misspelled key is a compile error — but `paths` keeps its own inferred type, `{ home: string; orders: string[] }`, so `paths.home.toUpperCase()` and `paths.orders.map(...)` both compile without narrowing.\n\nWith an annotation, the variable's type *becomes* `Record<Route, string | string[]>`: you get the same check, but every property is now the union, so each use needs a `typeof` or `Array.isArray` check first.\n\nNote the strings themselves are still widened to `string`; adding `as const` before `satisfies` preserves the literal values too.\n\n`satisfies` is purely compile-time — like everything else in TypeScript, it adds no runtime check.",
          tip: "Summarise as 'validate without widening' — the phrase interviewers are listening for.",
          c: ["static-types", "utility-types"],
          d: 2,
          choices: [
            {
              t: "It checks the object matches the type but keeps the object's own, more specific inferred type",
              ok: true,
              why: "Correct — validate without widening.",
            },
            {
              t: "It validates the object at runtime",
              why: "Purely compile-time, like all TypeScript types.",
            },
            {
              t: "It casts the object to the type, skipping the check",
              why: "That is `as`. `satisfies` performs a full check and errors on a mismatch.",
            },
            {
              t: "It makes every property `readonly`",
              why: "That is `as const` or `Readonly<T>`.",
            },
          ],
        }),
        mcq("ts-config-strictnull", {
          q: "What changes when `strictNullChecks` is turned on?",
          why: "`null` and `undefined` **stop being members of every type**. Without the flag, `let name: string = null` compiles, and any `string` might secretly be null — the type system is silent about the most common runtime crash in JavaScript. With it on, `null` and `undefined` must be declared explicitly (`string | null`), and TypeScript forces you to handle them before use through narrowing, optional chaining, or `??`.\n\nIt also makes lookups honest: `array.find(...)` returns `T | undefined`, and optional properties are `T | undefined`.\n\nIt is part of `strict`, and turning it on in an existing codebase usually produces a large wave of errors — each one a place a null could have slipped through. Because the flag is project-wide, teams migrating usually enable it through a separate tsconfig that lists the already-fixed files and grows over time, or through a plugin such as `typescript-strict-plugin`.",
          tip: "Call it 'the flag that makes TypeScript catch null reference bugs' — that is its whole purpose.",
          c: ["nullability", "static-types", "tooling"],
          d: 1,
          choices: [
            {
              t: "`null` and `undefined` are no longer assignable to other types unless declared, so you must handle them",
              ok: true,
              why: "Correct — nullability becomes part of the type.",
            },
            {
              t: "TypeScript inserts runtime null checks into the compiled output",
              why: "No runtime code is added; it is a compile-time analysis.",
            },
            {
              t: "Variables can no longer be assigned `null` at all",
              why: "They can, if their type includes `null`, e.g. `string | null`.",
            },
            {
              t: "It only affects `any`-typed values",
              why: "It affects every type; `any` is exempt from checking regardless.",
            },
          ],
        }),
      ],
    }),
  ],
});
