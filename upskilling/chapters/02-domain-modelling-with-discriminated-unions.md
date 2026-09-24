# 02: Domain modelling with discriminated unions

> Files: `src/types/index.ts`, `src/lib/grader.ts`, `src/lib/db/schema.ts`, `src/lib/sessionBuilder.ts` (`toItem`, `enrich`), `src/lib/progress.ts` (`conceptStrengths`)

## The problem

Reps has eight kinds of question. A multiple-choice item has choices, one of them correct. A fill-blank item has a template and a list of accepted answers per blank. A code item has starter code, a reference solution, tests and maybe a harness. A short-answer item has a model answer and key points. They share a prompt, an explanation, a track, a module, a level and a difficulty. What makes each kind that kind lives in a different shape.

There are two textbook failure modes:

- **One wide type with every field optional** (`choices?`, `template?`, `tests?`, `modelAnswer?`). It compiles, but nothing tells you which fields must be present together, and every consumer has to guess.
- **A class hierarchy** (`McqItem extends Item`). It is awkward to serialise to JSON, awkward to send across the server/client boundary, and needs `instanceof` checks that stop working once the value has been through `JSON.parse`.

Reps uses **discriminated unions**: a literal `kind` field that tells TypeScript which shape you are holding.

## The kind list is the source of truth

```ts
export const ITEM_KINDS = [
  "mcq", "multi", "truefalse", "predict-output",
  "fill-blank", "order", "code", "short",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];
```

A runtime array and a compile-time type, from one declaration. The array exists so the app can iterate (`ITEM_KIND_META: Record<ItemKind, …>` must have an entry for every kind, or it fails to compile). The type exists so a `switch` can be exhaustive.

## Response and Grade: unions done properly

`Response` (what the learner submitted) is a true discriminated union. Each variant pairs a `kind` with exactly the fields that kind needs:

```ts
export type Response =
  | { kind: "mcq"; choiceId: string | null }
  | { kind: "multi"; choiceIds: string[] }
  | { kind: "fill-blank"; values: Record<string, string> }
  | { kind: "code"; code: string }
  | { kind: "short"; text: string; selfRating: SelfRating | null }
  // …
```

Inside `if (response.kind === "multi")` TypeScript knows `response.choiceIds` exists. `emptyResponse(kind)` in `grader.ts` builds the right blank shape for each kind, and `isAnswered()` switches on `response.kind`. There are no casts in either.

`Grade` takes a different approach. It is one type with optional detail fields (`choices?`, `blanks?`, `order?`, `tests?`, `selfGraded?`, `attempt?`) and two required ones, `correct: boolean` and `score: number` (0 to 1). That is also a deliberate choice. Consumers mostly care about `correct` and `score` (`ratingFor`, the attempts table, the session summary), and the detail fields are only read by the feedback UI for the kind that produced them. **Put the fields every consumer needs in the required core, and the per-variant fields in optional extras.**

## Item: where the types cheat

Now read `Item` carefully:

```ts
export type Item = {
  id: string;
  kind: ItemKind;
  // …
  payload: ItemPayload;   // McqPayload | MultiPayload | … | ShortPayload
  // …
};
```

`kind` and `payload` are **not correlated**. An `Item` with `kind: "code"` and a `McqPayload` type-checks. That is why the grader has to cast:

```ts
case "fill-blank":
  return gradeBlanks(
    item.payload as FillBlankPayload,
    response.kind === "fill-blank" ? response.values : {}
  );
```

Every `as` here is a promise the compiler cannot check. The promise holds in practice for two reasons. The only producer of items is the DSL (`blank()` always pairs `kind: "fill-blank"` with a `FillBlankPayload`, chapter 03), and `scripts/check-content.ts` grades every item against its own answer. So the correlation is enforced by construction and by test, not by the type system.

A fully correlated version would look like this:

```ts
type ItemOf<K extends ItemKind, P> = ItemBase & { kind: K; payload: P };
export type Item =
  | ItemOf<"mcq", McqPayload>
  | ItemOf<"fill-blank", FillBlankPayload>
  // …
```

Then `switch (item.kind)` narrows `item.payload` and the casts disappear. The cost is friction wherever items are built generically: `toItem()` in `sessionBuilder.ts` reads `payload` from a TEXT column with `JSON.parse`, which returns `any`. You would need a validated parse step there anyway. Exercise 2 in `EXERCISES.md` asks you to make this change and weigh it.

Notice also how the grader handles a response of the wrong kind. `response.kind === "fill-blank" ? response.values : {}` means an `mcq` response sent to a fill-blank item grades as an empty answer (wrong). It does not throw. That keeps the grader total: every input produces a `Grade`. Being total matters for a function the server runs on untrusted input (chapter 04).

## Exhaustiveness

`grade(item, response): Grade` has a `switch (item.kind)` with a `case` for all eight kinds and no `default`. Because the return type is `Grade`, adding a ninth kind to `ITEM_KINDS` makes TypeScript report that the function lacks an ending return statement. The compiler gives you a to-do list: `grade`, `emptyResponse`, `ITEM_KIND_META`, and every other exhaustive switch. A `default: return { correct: false, score: 0 }` would hide all of that. **Don't add a default to a switch over a closed union.**

## Storage: one JSON column

In `src/lib/db/schema.ts`:

```ts
payload: text("payload").notNull().default("{}"), // JSON, shape depends on kind
```

The alternative is one table per kind (`mcq_choices`, `fill_blanks`, `code_tests`, …) or an entity-attribute-value mess. The trade-off:

| JSON `payload` column | Table per kind |
|---|---|
| One `items` table; adding a kind needs no migration | Eight-plus tables and a join per kind |
| The whole item loads in one row read | Loading a session means N queries or a wide UNION |
| **The database cannot enforce the shape.** SQLite will happily store `{"choices": 7}` | Foreign keys and NOT NULL enforce structure |
| You cannot efficiently query inside it ("all MCQs with 5 choices") | Normal SQL works |

JSON wins here because payloads are **written by exactly one trusted path** (the seeder, from DSL-validated content) and **read whole, never queried inside**. The integrity the database gives up is provided by the DSL assertions and the content linter. If users could author items, or if you needed to query "every item whose test uses a harness", the balance would tip the other way.

Bug 5b (chapter 05) is the direct cost of this choice. JSON cannot store a function, and nothing at the database layer noticed.

## DrillItem: composition, not inheritance

```ts
export type DrillItem = Item & {
  trackName: string; trackSlug: string; trackColor: string;
  moduleTitle: string; moduleSlug: string; moduleSummary: string;
  moduleKeyIdeas: string[] | null;
  concepts: ConceptRef[];
  isReview: boolean;
  reps: number;
};
```

`Item` is the domain object: what gets graded and scheduled. `DrillItem` is a **view model**: the item plus everything the drill screen needs, assembled in one place (`enrich()` in `sessionBuilder.ts`) with batched `inArray` queries. The grader accepts an `Item`, so it happily takes a `DrillItem` too, but it never depends on display fields. `moduleKeyIdeas: string[] | null` encodes a rule in its type: `null` means "the learner has already touched this module, so show no primer".

## Concepts: many-to-many on purpose

`item_concepts` (`itemConcepts` in the schema) links items to concepts with a composite primary key. One item can teach several ideas: `js-async-retry` is tagged `["error-handling", "async-await"]`. One idea appears in several technologies: closures in JavaScript and in React hooks, N+1 in EF Core and in SQL.

`conceptStrengths()` in `progress.ts` scores by concept across tracks. So a weak spot shows up as "reference equality: shaky" rather than "three React questions wrong". Tracks are how content is *organised*; concepts are how *understanding* is measured. They are different axes, so they need different relations.

## Try it yourself

1. In `src/lib/grader.ts`, temporarily delete the `case "order":` block and run `npm run typecheck`. Read the error, then restore the block. That error is your exhaustiveness guarantee.
2. Write a type-level test: define `const bad: Item = { …, kind: "code", payload: { choices: [] } }`. It compiles. Now sketch the correlated `ItemOf<K, P>` union from this chapter and confirm the same literal fails.
3. In `sqlite3 reps.db`, run `SELECT kind, count(*) FROM items GROUP BY kind;` and then `SELECT payload FROM items WHERE kind='code' LIMIT 1;`. Find the `harness` field in the stored JSON.
4. Explain in three sentences why `Grade` uses optional fields while `Response` uses a union. Would you change either?

> **Junior vs senior**
>
> **Junior:** "I'll make one `Question` type with every field optional and store it as JSON; it's flexible." They add a `default:` case so the switch stops complaining.
>
> **Senior:** "The kind is the discriminator. Let the compiler list every place a new kind must be handled, so no `default`. Store the variant part as JSON because it is written by one validated path and read whole. Then say where the types stop checking: `kind` and `payload` aren't correlated in `Item`, and the DSL plus the content linter hold that line."
