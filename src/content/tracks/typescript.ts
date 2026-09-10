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
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("ts-narrowing", {
      title: "Unions, Narrowing & Guards",
      level: 2,
      summary: "Discriminated unions — the pattern that replaces most of your defensive checks.",
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
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("ts-config", {
      title: "Config, Structural Typing & Traps",
      level: 4,
      summary: "`strict`, excess property checks, and the places TypeScript is unsound on purpose.",
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
      ],
    }),
  ],
});
