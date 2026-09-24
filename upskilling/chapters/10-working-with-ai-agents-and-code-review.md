# 10: Working with AI agents and code review

> Files: `src/components/drill/Answers.tsx` (`AnswerProps`, `RETRYABLE_KINDS`), `src/components/drill/DrillCard.tsx`, `src/components/drill/useDrillSession.ts` (`submit`, `giveUp`, `next`), `upskilling/reviews/`, commit trailers in `git log`

Reps was built with Claude Code. Both feature commits carry `Co-Authored-By` trailers for the models involved (`git log -2 --format=%B | grep Co-Authored`). This chapter treats working with coding agents as an engineering skill in its own right. The skills involved are delegation, interface design, scoping and review. They look a lot like leading a team, and they transfer directly to working with human engineers.

## The situation in c027fca

The retry feature (a second attempt after a miss for `mcq`, `predict-output` and `fill-blank`) touched a lot of code:

- the drill page's state machine (`src/app/app/drill/page.tsx`),
- the card wrapper that shows feedback (`src/components/drill/DrillCard.tsx`),
- the per-kind answer components (`src/components/drill/Answers.tsx`: `ChoiceList`, `SingleChoice`, `FillBlank`, …),
- the server's partial-credit rule (`src/app/api/attempts/route.ts`),

plus the unrelated key-ideas, module-page and cheat-sheet work in the same commit (30 files).

Doing it all serially is slow. Handing it to several agents at once only works if they don't collide, both in the files they edit and in the assumptions they make.

## Step 1: define the contract before splitting the work

Before the retry, the UI used one signal: `grade !== null` meant "answered, so show the answer". The retry breaks that. There is now a state where a grade exists (the first miss, which must mark the wrong pick) **but the answer must stay hidden**.

If three agents had each been told "support retries" and left to handle it their own way, you would get three different interpretations: one adds `retrying`, another adds `attempt`, a third infers state from `grade.attempt`. The pieces would each compile and fail to work together.

So the coordinator fixed the interface first, in `AnswerProps`:

```ts
export type AnswerProps = {
  item: DrillItem;
  response: Response;
  onChange: (r: Response) => void;
  /**
   * The most recent grade. May be set while `revealed` is false: that
   * is the retry state — the learner missed once and gets one more
   * go before the answer is shown, so only their wrong pick is marked.
   */
  grade: Grade | null;
  /** Once true the answer is shown and inputs lock. */
  revealed: boolean;
  onSubmit: () => void;
};
```

and the same `revealed: boolean` on `DrillCard`. With that one field and its doc comment agreed, every component can work out its own behaviour from a shared rule:

- `retrying = grade !== null && !revealed` (you'll find this exact expression in `ChoiceList` and `FillBlank`, and the same rule as `retrying: !!current?.grade && !current.revealed` in what `useDrillSession` returns),
- in a retry, `ChoiceList` eliminates only the chosen-and-wrong choices, and `FillBlank` locks the correct blanks,
- when `revealed`, everything locks and the full feedback shows.

**The contract is the unit of parallelism.** Write it down as a type with a doc comment, in the file the workers will read, *before* anyone starts. That is how an interface lets separate teams build separate modules, and here it did the same for separate agents.

## Step 2: scope each worker to disjoint files

Each agent got a set of files that no other agent touched: for example, one on `Answers.tsx`, one on `DrillCard.tsx`, and one on the module page and cheat sheet (`src/app/app/path/[slug]/[module]/page.tsx`, `src/app/app/cheatsheet/page.tsx`, `src/app/api/cheatsheet/route.ts`). Disjoint file sets mean:

- no merge conflicts and no agent overwriting another's edit,
- each result can be reviewed and accepted or rejected on its own,
- a failure is contained. A bad `DrillCard` doesn't block the cheat sheet.

When two tasks *must* touch the same file, they are one task. Don't parallelise them.

## Step 3: keep the coupled logic yourself

The part that was **not** delegated was the retry state machine in `src/app/app/drill/page.tsx`. Look at how much is coupled:

```ts
const [grade, setGrade] = useState<Grade | null>(null);
const [revealed, setRevealed] = useState(false);
const [attempt, setAttempt] = useState<1 | 2>(1);
const firstResponse = useRef<Response | null>(null);
```

- `submit()`: on a first miss for a retryable kind, it stores `firstResponse`, sets the grade, bumps `attempt` to 2, clears the MCQ choice and returns *without* recording. Otherwise it builds the final grade (capping a second-try score at 0.5), sets `revealed`, and calls `record(…, attempt)`.
- `giveUp()` ("Just show me"): it reveals and records **the first response** with attempt 1, not the empty second one.
- `next()`: it resets `grade`, `revealed`, `attempt`, `firstResponse` and `startedAt` together.
- The keyboard handler: Enter means `next()` when revealed and `submit()` otherwise, which includes the retry state.
- The server mirrors the scoring (`attempt === 2` → `score ≤ 0.5`, `Rating.Hard`).

Every line depends on every other line. A mistake shows up as a subtle wrong behaviour, such as recording an empty response or carrying `attempt = 2` into the next item, not as a compile error. That is exactly the work you keep: **high coupling, low specification, and the cost of a mistake is invisible**. Delegate the well-specified leaves, like "render the eliminated choice at 60% opacity with its feedback". Keep the stateful core.

### Where that state machine lives now

On 2026-09-23 the drill page and the mock interview, which had each grown their own copy of this loop, were moved onto one hook: `src/components/drill/useDrillSession.ts`, with the shared buttons and key hints in `SessionChrome.tsx`. The refactor made the coupling explicit instead of just being careful about it:

- The separate `useState` calls became **one `Core` object** updated with `setCore`. `grade`, `revealed`, `attempt`, `response`, `index` and `history` now change together in a single update, and `next()` resets them by spreading one `reset` object. A field cannot be forgotten in one place and remembered in another.
- Each load gets a `loadKey`. A server response that arrives after a restart or a new query checks `c.key !== key` and is dropped, so an answer from a dead session cannot decorate a live one.
- A `recorded` set stops the same item being posted twice.
- The differences between the two pages are **options, not forks**: `allowRetry` (false for the interview, because a real interview gives no second go) and `adoptServerGrade` (false for the interview, so its scorecard never shifts).
- Enter handling is one function, `enterBelongsToSession()`, which leaves Enter alone in text areas, the code editor, links and ordinary buttons.

That refactor is itself a good example of what to delegate. It had a written contract (the behaviour of the old pages) and a narrow file scope, and the result could be checked against the existing end-to-end scripts. The *design* of the retry rule, back in `c027fca`, was the part that had to be kept.

## Step 4: review is a separate pass from implementation

The agent that wrote a change is the worst one to review it. It shares its own blind spots. So review was run as a **separate adversarial pass**: a fresh agent, or the coordinator with fresh eyes, told to *find what's wrong*, not to confirm what's right. Useful review prompts, all of which apply to this repo:

- "What happens if the learner presses Enter during the retry state? Trace `onKeyDown` → `submit`."
- "What is recorded when the user clicks 'Just show me'? Find the value passed to `record`."
- "Can any state from item N leak into item N+1? List every piece of state `next()` does not reset."
- "What does the server trust from this request?" (Chapter 04's `attempt` finding came from exactly this question.)

Human code review works the same way. Reviewers who ask "does this look OK?" approve almost everything. Reviewers who ask "how would this break?" find bugs.

### Evidence: the 2026-09-23 fact-check

On 2026-09-23, 155 interview-trivia items were added (JavaScript 53, C# 54, the other eight tracks 48). Then three reviewer agents, separate from the authors, were each given one area and told to find what was *wrong*: every keyed answer, every distractor's explanation, every key idea. Their reports are in `upskilling/reviews/`, each with (A) confirmed errors, (B) debatable points, (C) overlaps and (D) a verdict.

| Report | Confirmed errors (A), all fixed | The worst one |
|---|---|---|
| [`REVIEW-JAVASCRIPT.md`](../reviews/REVIEW-JAVASCRIPT.md) | 8 | `js-this-lost`. The prompt did not say what the runtime was. The keyed answer (a `TypeError`, because `this` is undefined) only holds in strict or module code. In a sloppy browser script the code prints `Hi `, so a distractor was actually correct and its explanation was wrong. The prompt now pins ES-module semantics. |
| [`REVIEW-CSHARP.md`](../reviews/REVIEW-CSHARP.md) | 5 | A key idea in `cs-async` said `.Result` and `.Wait()` deadlock "wherever a synchronisation context exists". A deadlock needs a *single-threaded* context and a continuation trying to get back onto it; it does not happen if the task already finished or every await uses `ConfigureAwait(false)`. The key idea even contradicted its own item's answer ("can deadlock"). |
| [`REVIEW-OTHER-TRACKS.md`](../reviews/REVIEW-OTHER-TRACKS.md) | 4 | `ts-config-satisfies`. Its example showed no difference between `satisfies` and a type annotation, so the question "what does `satisfies` do here that an annotation would not?" had no real answer. The snippet was changed so that it does. |

Seventeen confirmed errors in total. (The JavaScript and C# reviews covered the whole of each track, 93 and 75 items, so some errors were in older items; the third review covered only the 48 new items.) **`content:check` could not have caught any of them**, because it checks that an answer key is *consistent* (the right answer grades right and a wrong one grades wrong), not that it is *true*. Only a reader actively trying to break the question could find them. Look at what kind of errors they are, too: an unstated assumption (`js-this-lost`), an over-absolute claim (`.Result`), an example that doesn't demonstrate its own point (`satisfies`). An author, human or model, is least likely to see exactly these in their own writing.

The same method was applied to the code: a separate reviewer read the refactor looking for bugs. Its report is the [code review of the refactor](../reviews/AUDIT-CODE.md).

## Step 5: verify agent output like any other output

An agent's "done" is a claim, not evidence. Everything in chapter 07 applies. The coordinator re-ran `npm run check`, the end-to-end suites and the production build on the combined result. Remember bug 5b's first check: it looked perfectly reasonable, and it could not fail. A confident report is worth exactly as much as that check.

## A larger run: 2026-09-23

The work of 2026-09-23 used every step above at a bigger scale, and hit two problems worth learning from.

**Two waves.** A coordinator (a different model from the workers) planned the round, wrote each worker's brief and file boundaries, and adjudicated disagreements. Wave one was **six implementer agents in parallel on disjoint files**, covering the backend refactor, the tests, the frontend refactor and the new content. Wave two was **per-area adversarial reviewers**: the three content fact-checkers above and the code reviewer. While the waves were running, the coordinator **forwarded findings between agents**. When one agent's work changed something another depended on, the coordinator passed the fact along instead of letting the second agent discover it by collision.

**Three agents died mid-task.** An API rate limit killed three of the agents before they finished. The tree still typechecked, because each agent's edits were internally consistent: the work it left behind was *incomplete* but not *broken*. There was no half-renamed function and no import of a file that did not exist yet. Disjoint file scopes helped too, since no dead agent had left a file that another agent was halfway through changing. The coordinator then finished the remaining pieces itself: committing the e2e scripts under `scripts/e2e/`, the concept registry in `src/content/concepts.ts`, the project README, and the fix for a flaky test.

The lesson is the same one that applies to any distributed system: **assume any worker can stop at any point, and design the work so that stopping leaves it consistent.** Small, self-consistent edits are what make a partial result usable rather than something you have to throw away.

**A flaky test.** Committing the e2e scripts showed that one assertion passed or failed depending on how much the local database had been used. It sampled a mixed session and hoped to find a module the learner had never touched. The fix picks an untouched module through `/api/cheatsheet` explicitly. The full story is bug 5h in chapter 05. The lesson for delegation: when a worker reports "tests pass", ask *under what preconditions*, and whether the test creates them or just hopes for them.

## A checklist for delegating

1. **Write the contract first**: types plus doc comments, in the repo.
2. **Disjoint file scopes.** Name the files each worker may edit.
3. **Give acceptance criteria**, not just a goal: "`npm run check` passes; `ChoiceList` disables eliminated choices; no changes outside `Answers.tsx`."
4. **Keep the coupled core**: state machines, cross-cutting invariants, anything where a mistake is silent.
5. **Review adversarially**, with someone other than the author.
6. **Verify the integrated result**, not the pieces.
7. **Record what was delegated and what was verified** (the commit message is a good place).
8. **Plan for workers dying.** Ask for edits that leave the tree consistent at every step, so a half-finished task can be picked up rather than unpicked.

## Try it yourself

1. Read `AnswerProps` and `DrillCard`'s props. Without reading their bodies, write down how `FillBlank` should behave in each of the three states: unanswered, retrying, revealed. Then read `FillBlank` and compare.
2. List every field of `Core` in `src/components/drill/useDrillSession.ts`, plus the refs (`questionStart`, `firstResponse`, `recorded`), and mark which ones `next()` resets. Is anything missing? `c027fca` kept a `primedModules` set for the primer; the drill page now derives `firstFromModule` from the session instead. Argue which is better.
3. Write a delegation brief for exercise 4 in `EXERCISES.md` (a `level` session mode UI) that a separate agent or a colleague could carry out without asking you a question. Include the contract, the file scope and the acceptance criteria.
4. Run an adversarial review of `giveUp()`: write three questions that would catch a regression in it.
5. Pick one (B) "debatable" point from any report in `upskilling/reviews/` and decide it: change the item or defend it in writing. That is the adjudication step the coordinator did for the (A) list.

> **Junior vs senior**
>
> **Junior:** "Agent, add retries." Three agents run on overlapping files, each invents its own state flag, and the one that finishes last wins. The agent's "done, tests pass" is accepted.
>
> **Senior:** "Here is the contract (`revealed: boolean`, doc-commented) and here are your files. Don't touch anything else. I'll write the state machine myself. When you're done, a different reviewer will try to break it, and I'll run the full check on the merged result."
