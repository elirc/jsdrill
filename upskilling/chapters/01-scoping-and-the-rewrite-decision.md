# 01: Scoping and the rewrite decision

> Files: `git show --stat 6f06762`, `src/types/index.ts`, `src/content/index.ts`, `README.md`

## The situation

In February 2026 this repository was "JS Drill" (`9ff16d3`). It held 20 algorithm problems as JSON files (`seed-data/problems/arrays-t2-two-sum.json`, `sorting-t2-merge-sort.json` and so on). It also had FSRS scheduling, an in-browser code runner, an admin UI for authoring problems (`src/app/admin/`), and two sets of explanatory docs (`docs/code-explanations/`, `training-docs/`).

On 2026-09-09 the product goal changed. The target user was now a junior preparing for interviews as a mid-level CRUD web developer, across ten technologies. The questions they face are not "implement merge sort". They are "why does this effect loop forever?", "what goes wrong when a scoped service is injected into a singleton?", and "401 or 403?".

There were two options:

1. **Adapt.** Keep `problems`, `categories` and `patterns`. Add a `type` column so a problem could be multiple choice. Treat technologies as categories.
2. **Rewrite the domain model** and carry over only the parts that still fitted.

The rewrite won. It landed as one commit that touched 134 files.

## Why a rewrite was right here

Adapting only pays off when the old nouns still describe the new world. Here they didn't:

| Old concept | Why it did not fit | New concept |
|---|---|---|
| `problem`: always "write a function, pass tests" | Most interview knowledge is recognition and explanation, not implementation. Only one of the eight new kinds (`code`) looks like a problem. | `item` with `kind: ItemKind` |
| `category`: arrays, strings, recursion | Categories were data-structure topics. The new axis is technology. | `track` (JavaScript, React, ASP.NET Core & EF Core, …) |
| `pattern`: two-pointer, sliding window | Algorithm patterns do not exist in the new curriculum. The cross-cutting idea is a concept such as closures, reference equality or N+1. | `concept`, many-to-many with items |
| *(nothing)* | A learner needs a teaching unit with a brief before drilling | `module` (new layer) |
| *(nothing)* | A junior-to-mid path needs a progression | `Level` 1 to 4 with `LEVEL_META` |

If you keep `problems` and bolt on an `is_mcq` flag, every function that touches a problem now needs an `if` for the new cases, and the name tells every future reader something false. That kind of renaming debt never gets paid off, because each new feature adds more branches that depend on the misleading name.

The parts that did carry over were the parts the new product still needed: FSRS scheduling (`src/lib/fsrs.ts`, rewritten around `ratingFor`), the in-browser executor (`src/lib/executor.ts`, extended with a harness), SQLite + Drizzle, and CodeMirror. The commit shows them as modifications (`src/lib/executor.ts | 165 ++--`), not deletions. A rewrite of the model is not a rewrite of everything.

## Deleting instead of keeping

The same commit deleted `seed-data/` (22 JSON files), `docs/code-explanations/` (19 files), `training-docs/` (7 files), `IMPLEMENTATION_PLAN.md` and all of `src/app/admin/`. Juniors rarely make this call, because deleting feels risky. The reasoning:

- **The docs described code that no longer existed.** `docs/code-explanations/11-problems-id-api.md` explained `src/app/api/problems/[id]/route.ts`, which the commit also deleted. Wrong documentation is worse than none, because readers trust it.
- **The admin UI edited a model that was gone.** `ProblemForm.tsx` (407 lines) knew about problems and test cases. Porting it to eight item kinds would have been a project of its own, and content authoring had moved into typed TypeScript anyway (chapter 03).
- **Git is the archive.** `git show 309c15d:docs/code-explanations/05-executor.md` still works. Keeping dead files "in case" costs attention on every search, every grep and every onboarding. Recovering them from history costs one command, on the rare day it is needed.

## Scoping the new product

The rewrite was large, but its scope had clear edges:

- **Ten tracks, four levels, eight kinds.** These are fixed lists in `src/types/index.ts` (`LEVELS`, `ITEM_KINDS`) and `src/content/index.ts` (`TRACKS`). They are closed on purpose. A closed list lets the compiler find every place that has to change when you extend it (chapter 02).
- **Local-first, single user.** `DEFAULT_USER_ID = "default-user"` appears in `sessionBuilder.ts`, `progress.ts` and `api/attempts/route.ts`. There is no auth, no accounts and no hosting. That decision removed a whole category of work, and it also set limits that later chapters come back to (chapter 04: the server executes learner code; chapter 11: `reps.db` never leaves the machine).
- **No algorithm puzzles.** The README says so in its second paragraph. Writing down what the product does not do is a scoping tool. It settles future arguments before they start.

## Doing a big change safely

A 134-file change is hard to review. It stayed manageable because of how it was done:

1. It went to a feature branch (`feat/fullstack-interview-drills`), not to `main` (chapter 11).
2. The commit message has sections (data model, curriculum, question kinds, app, fixes found while verifying, verified) so a reviewer knows where to look.
3. It was verified end to end before commit: typecheck, lint, content validation, a 42-assertion API suite, a progression test, and a production build. The message lists each of these.
4. The history before it stayed intact, so the old product can still be checked out.

## When not to rewrite

A rewrite would have been wrong if:

- users had data in the old model that needed migrating (there were none; JS Drill was pre-release),
- the old nouns still fitted and only the behaviour was wrong,
- you could not verify the new system before replacing the old one,
- the change could be delivered in slices behind a flag. It could not here, because every screen depended on the model.

The general rule: **rewrite the model when the nouns are wrong; refactor when the nouns are right and the code is messy.**

## Try it yourself

1. Run `git show --stat 6f06762 | grep -E "^ (seed-data|docs|training-docs|src/app/admin)"` and count the deleted files. For each group, write one sentence on why keeping it would have cost more than deleting it.
2. Open `src/types/index.ts` and find a type that has no equivalent in JS Drill (`git show 9ff16d3:src/types/index.ts`). Write down the product requirement that type exists to serve.
3. Pick one thing from JS Drill that was kept and modified (`git diff 309c15d 6f06762 -- src/lib/executor.ts`). List what stayed and what changed, and why the old core was still worth keeping.
4. Write a half-page "adapt instead" plan for the same change, then list the three places where it would have hurt most.

> **Junior vs senior**
>
> **Junior:** "The code already has problems and categories; I'll add a type column and make it work." They keep the old docs because deleting feels risky, and ship the result straight to `main`.
>
> **Senior:** "The nouns are wrong, so every new feature would pay rent on the old names. Rewrite the model and keep the engine (FSRS, executor, DB layer). Delete what describes the past, since git keeps it. Draw closed edges around the scope: ten tracks, four levels, eight kinds, one local user. Ship it on a branch with the verification written into the commit message."
