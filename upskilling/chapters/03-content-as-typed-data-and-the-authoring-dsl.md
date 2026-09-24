# 03: Content as typed data and the authoring DSL

> Files: `src/content/builder.ts`, `src/content/index.ts`, `src/content/concepts.ts`, `src/content/tracks/*.ts`, `scripts/check-content.ts`

## The decision

JS Drill kept its content in JSON files: `seed-data/problems/arrays-t1-find-max.json` and nineteen others, plus `categories.json` and `patterns.json`. The rebuild moved all content into TypeScript modules under `src/content/tracks/`, written through a small set of helper functions in `src/content/builder.ts`.

Here is a real item from `src/content/tracks/javascript.ts`, shortened:

```ts
code("js-async-retry", {
  q: "Write `retry(fn, attempts)`. Call `fn()` …",
  why: "A loop with `try/catch`, keeping the last error, is the whole pattern. …",
  tip: "Volunteering 'and I would only retry idempotent operations' is a strong senior signal.",
  c: ["error-handling", "async-await"],
  d: 3,
  starter: `function retry(fn, attempts) { … }`,
  solution: `function retry(fn, attempts) { … }`,
  harness: `(failures, attempts) => { … }`,
  tests: [
    t([0, 3], { result: "ok", calls: 1 }, "succeeds first time, no retry", false),
    t([1, 1], { error: "transient 1", calls: 1 }, "attempts is the total, not the retries", true),
  ],
}),
```

## Why TypeScript data beats JSON files here

| Concern | JSON files | Typed TS + DSL |
|---|---|---|
| Typo in a field name (`explaination`) | Silently ignored | Compile error |
| Wrong shape for a kind | Found at runtime, if ever | `code()` requires `starter`, `solution` and `tests` |
| Rules like "exactly one correct MCQ choice" | Need a separate validator | Asserted inside `mcq()` when the module loads |
| Multi-line code snippets | `"\n"`-escaped strings | Template literals, readable as code |
| Shared defaults (`estSeconds` per kind) | Copied into every file | `base(id, kind, o, defaultSecs)` |
| Ids | Duplicated as file names and fields | One string argument |
| Editor support | Minimal | Autocomplete, go-to-definition, rename |

The costs are real too. Non-programmers can't easily edit TypeScript. Content is bundled into the code, so any content change goes through the build. And template literals bring their own traps (bug 5e, chapter 05). For a curriculum written by engineers and reviewed in PRs, the trade is clearly worth it.

## Anatomy of the DSL

`builder.ts` has three layers.

**1. Terse authoring shapes.** `Common` uses short keys: `q`, `why`, `tip`, `c`, `secs`, `d`. `AuthoredChoice` uses `t`, `ok`, `code`, `why`. Short keys matter when a file has 900 lines of content. They keep the prose, which is the valuable part, in view.

**2. One constructor per kind.** `mcq`, `multi`, `tf`, `out`, `blank`, `order`, `code`, `short`. Each one:
- calls `base(id, kind, o, defaultSecs)` to map terse keys to domain fields (`q` → `prompt`, `why` → `explanation`, `c` → `conceptIds`, default `difficulty: 1`),
- builds the kind-specific payload (`toChoices()` assigns ids `c1`, `c2`, … in order),
- **checks that kind's rules** with `assert()`.

**3. Structure.** `mod(slug, …)` and `defineTrack(…)` put items into modules and tracks, and `t(input, expected, description, isEdgeCase)` is shorthand for a test case.

## Invariants checked when content is written

These `assert` calls throw `[content] …` errors as soon as the track module is *executed*. That happens on `npm run db:seed`, `npm run content:check`, and `next build`, which prerenders the landing page `src/app/page.tsx`, and that page imports `TRACKS` and `contentStats()`. `tsc` does not run them, because type-checking never executes code:

```ts
// mcq(): exactly one correct choice
assert(choices.filter((c) => c.correct).length === 1,
  `mcq "${id}" must have exactly one correct choice`);

// blank(): the template must contain every blank
for (const b of blanks) {
  assert(o.template.includes(`{{${b.id}}}`),
    `fill-blank "${id}" template is missing {{${b.id}}}`);
}

// order(): at least three steps; code(): at least one test; short(): at least one key point
// mod(): at least one item and at least 3 key ideas

// defineTrack(): ids unique within the track
assert(!seen.has(i.id), `duplicate item id "${i.id}" in track ${t.slug}`);
```

Three more design choices are worth copying:

- **`order()` items are authored in the correct order** and shuffled at render time (`OrderSteps` in `Answers.tsx`). The author never has to write a separate answer key that could drift from the steps.
- **`blank()` takes answers positionally.** `{{1}}` matches `answers[0]`, and each answer can be a string or an array of accepted spellings. `width` is computed from the longest accepted answer, so the input box does not give the answer away by its size.
- **`out()` defaults `lang` to `"javascript"`** with `{ lang: "javascript", ...o }`. The spread order lets an author override it, for C# output questions for example.

## Layered validation: what each layer catches

The DSL is the first of three layers. Each one catches mistakes the one before cannot:

1. **Types** (`tsc`) catch wrong keys, missing required fields and wrong value types.
2. **DSL assertions** catch per-item structural rules: one correct MCQ, blanks present in the template, unique ids within a track.
3. **`scripts/check-content.ts`** catches rules that need *behaviour* or a *whole-curriculum* view:
   - every `code` item's reference solution passes its own tests, and its starter does *not*,
   - every accepted fill-blank answer grades as correct through the real `grade()` function,
   - an `order` item's authored order grades correct and its reverse does not,
   - no test input JSON would lose (`findUnserialisable`, bug 5b),
   - prose is within what the renderer supports (`checkProse`, bug 5d),
   - ids are unique across *all* tracks (the DSL only checks within one), and the seeder checks again (`Duplicate item id across tracks`),
   - concepts that are used but not defined, and defined but never used.

Note that layer 3 **uses the production grader** to validate content. It does not re-implement "is this answer right". If the grader and the linter used separate logic, they could disagree, and the linter would be testing an imaginary system.

## The concept registry

`src/content/concepts.ts` defines concepts with a name, description and explanation. `resolveConcepts()` in `src/content/index.ts` collects every slug that items actually use. It looks each one up in the registry, and if the slug is unknown it makes a fallback with a title-cased name and an empty description. So an unregistered concept is a *warning* (`concept "…" has no registry entry`), not a crash. That was a deliberate leniency: authors can tag items first and write definitions later, and the linter keeps the list of what's owed.

## Where authoring still hurts

- **Template literals and backticks.** Content prose uses markdown backticks, and it lives inside JavaScript template literals that are themselves delimited by backticks. Every inline code span in a `brief:` has to be written `` \` ``. Open `src/content/tracks/csharp.ts` and you'll see `` (\`int\`, \`bool\`, …) `` all through the first brief. Chapter 05 (bug 5e) covers what happened when one was missed.
- **Ids are strings typed by hand.** Uniqueness is checked. Stability is not: if you rename `js-async-retry`, the seeder treats it as a deletion plus a new item (chapter 08), and learners lose their history for it.

## Try it yourself

1. In `src/content/tracks/javascript.ts`, add `ok: true` to a second choice of any `mcq`. Run `npm run content:check`. Read the error and notice that it comes from `builder.ts`, before the checker's own logic even runs. Revert.
2. Change one accepted answer of a `blank(...)` item to include a trailing space and a semicolon, such as `"useState; "`. Run `content:check`. It passes. Read `normalizeBlank()` in `grader.ts` and explain why.
3. Write a new `tf(...)` item in any module, with an explanation shorter than 40 characters. Which layer rejects it, and with what message?
4. Design a DSL assertion for `multi()` that rejects "every choice correct". Should it live in `builder.ts` or `check-content.ts`? (The checker has it today. Argue for or against moving it.)

> **Junior vs senior**
>
> **Junior:** "Content is data, so JSON." Validation is "we'll notice when it looks wrong in the app".
>
> **Senior:** "Content is code that people read, so give it types, a small DSL, and assertions that fail when it's written. Validate in layers: types for shape, the DSL for per-item rules, a linter that runs the *real* grader for behaviour. Note the leftover sharp edges, like backticks in template literals and ids that must never change."
