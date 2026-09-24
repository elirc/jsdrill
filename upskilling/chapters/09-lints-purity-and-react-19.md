# 09: Lints, purity and React 19

> Files: `eslint.config.mjs`, `src/components/drill/useDrillSession.ts` (`initialResponse`, `questionStart`, `onKeyDown`), `src/components/drill/Answers.tsx` (`OrderSteps`), `src/app/app/layout.tsx` (`themeStore`, `ThemeToggle`), `src/components/useStoredState.ts`, `src/components/useApi.ts`, `src/components/drill/CodeEditor.tsx`

The fixes in this chapter were first made in `6f06762`, in `src/app/app/drill/page.tsx`, `src/app/app/interview/page.tsx` and `OrderSteps`. On 2026-09-23 the session loop was moved out of both pages into the shared hook `useDrillSession.ts`, and two of the fixes changed shape on the way. Each section says what was done first and where it lives now. `git show c027fca:src/app/app/drill/page.tsx` shows the original.

## What happened

`eslint.config.mjs` extends `eslint-config-next` (`core-web-vitals` and `typescript`). With React 19 and Next 16 that includes `eslint-plugin-react-hooks` v6, which adds rules from the React Compiler team. During the rebuild, three kinds of code were flagged:

1. `Date.now()` and `Math.random()` called **during render**, under `react-hooks/purity`.
2. `setState` called **synchronously inside an effect** to copy an external value into state, under `react-hooks/set-state-in-effect`.
3. By the same reasoning, reading browser-only state (`document`, `localStorage`) to initialise state on mount.

The easy response is `// eslint-disable-next-line`. None of these purity findings was suppressed. Each was fixed at the source, and each fix is a pattern worth knowing. (The codebase has exactly one suppression, and it is a different rule. See "The one suppression" below.)

## Why render must be pure

React may call your component function **more than once for a single committed update**. StrictMode double-invokes in development, concurrent rendering can throw away and restart work, and the React Compiler memoises on the assumption that same inputs give the same output. A render that reads the clock or a random number gives different results on each call:

- the value on screen may not be the value your handlers see,
- server render and client hydration disagree (a hydration mismatch),
- memoisation becomes unsound.

**Render computes UI from props and state. Everything else (clocks, randomness, I/O, subscriptions) belongs in event handlers or effects.**

## Fix 1: timing refs, seeded outside render

The session needs to know when each question started, to compute `timeSpent`. The natural-but-wrong version is `const startedAt = useRef(Date.now())`. The initialiser expression runs on every render, even though `useRef` only keeps the first value, so it is still an impure call during render.

In `6f06762` the drill page declared `const startedAt = useRef(0)` and `const sessionStart = useRef(0)` and seeded both in the load effect, after the session arrived. The interview page did the same with its own `startedAt` and `questionStart`. Today both pages use one copy of this, in `src/components/drill/useDrillSession.ts`:

```ts
// Clock and bookkeeping. Seeded from callbacks — reading the clock
// during render is impure.
const questionStart = useRef(0);
const sessionStart = useRef(0);

// … inside the load effect's fetch callback, once the session arrives:
questionStart.current = Date.now();
sessionStart.current = Date.now();
```

After that, the clock is only read in callbacks: `record()` computes `Date.now() - questionStart.current`, `next()` resets `questionStart.current = Date.now()`, and `getElapsed()` is documented *"Read it from callbacks, not render."* Handlers and callbacks are allowed to be impure, because they run once per event, not once per render.

Why a ref and not state? The start time never affects what is rendered. It only feeds a calculation at submit time. **State is for values that drive rendering. Refs are for values that don't.** Putting it in state would trigger a pointless re-render.

## Fix 2: shuffle once, outside render

`order` items are authored in the correct order and must be shown shuffled. Shuffling during render has two problems: `Math.random()` is impure, and every re-render would reshuffle the list *under the user's cursor* while they reorder it.

**The first fix (`6f06762`)** shuffled in an effect inside `OrderSteps` and kept the result in a ref. The effect ran once per mounted item (the page renders `<DrillCard key={item.id} …>`, so a new item is a fresh mount), then reported the order upward through `onChange`, with a guard so it never overwrote a list the learner had already reordered. That satisfied the lint, but it had a cost: the first render showed an empty list, and a second render filled it in. That is the "render, then correct it in an effect" shape that `set-state-in-effect` exists to discourage.

**The current fix (2026-09-23)** moves the shuffle to the moment the item *becomes* current. `initialResponse(item)` in `useDrillSession.ts` builds the starting response for any item. For `order` items it runs a Fisher–Yates shuffle, and its doc comment states the rule:

```ts
/**
 * The starting response for an item. Ordering items start shuffled and
 * code items start with the starter code. This reads Math.random, so it
 * is only ever called from event handlers and fetch callbacks — never
 * during render.
 */
function initialResponse(item: DrillItem): Response {
  if (item.kind === "order") {
    /* Fisher–Yates over the step ids */
    // Never hand out the answer: an unshuffled list gets its first two swapped.
    if (ids.length > 1 && ids.every((id, i) => id === steps[i].id)) {
      [ids[0], ids[1]] = [ids[1], ids[0]];
    }
    return { kind: "order", order: ids };
  }
  // …
}
```

It is called from the load callback (for the first item) and from `next()` (for every item after). `OrderSteps` no longer shuffles anything. It renders `response.order` as it is given, and its comment says *"The session seeds a shuffled order when the item loads."*

Why this is better:

- **The random value is produced by an event, not by rendering.** "The next item became current" is an event, so that is where its random state is created. No effect, no ref, and no empty first render.
- **One owner.** The hook owns `response` and creates it already shuffled, so the component never has to report state back upward.
- The "already solved" swap survived the move. It is a product detail that a naive shuffle misses: with three steps, a random shuffle comes out correct 1 time in 6.

The general form: **if a value is random or time-based, create it in the handler or callback that causes it, and store it in state from there.** An effect is the fallback when there is no such event.

## Fix 3: external state through `useSyncExternalStore`

The theme lives on `<html data-theme>`. An inline script sets it before first paint to avoid a flash of the wrong theme. That makes the DOM attribute the source of truth, and it sits **outside React**. The typical first attempt:

```ts
const [light, setLight] = useState(false);
useEffect(() => {
  setLight(document.documentElement.getAttribute("data-theme") === "light"); // ← set-state-in-effect
}, []);
```

This renders once with the wrong value, then immediately renders again with the right one. That is a cascading render, and it is exactly what `set-state-in-effect` flags. It also creates two sources of truth that can drift apart.

`src/app/app/layout.tsx` instead defines a tiny external store:

```ts
const themeStore = {
  listeners: new Set<() => void>(),
  subscribe(listener) { themeStore.listeners.add(listener); return () => themeStore.listeners.delete(listener); },
  getSnapshot()       { return document.documentElement.getAttribute("data-theme") === "light"; },
  getServerSnapshot() { return false; },
  set(light) {
    /* write the attribute, persist to localStorage in a try/catch, then: */
    for (const listener of themeStore.listeners) listener();
  },
};

const light = useSyncExternalStore(themeStore.subscribe, themeStore.getSnapshot, themeStore.getServerSnapshot);
```

Why this is correct:

- **One source of truth**, the DOM attribute. React *reads* it and never mirrors it into state.
- **`getServerSnapshot`** gives the server render a deterministic value (`false`) and lets React reconcile on hydration without a mismatch warning.
- **`getSnapshot` returns a primitive** (a boolean). `useSyncExternalStore` compares snapshots with `Object.is`. If it returned a fresh object each call, React would see "changed" on every render and loop.
- **`localStorage` is wrapped in `try/catch`**, with the comment *"Private browsing — the toggle still works for this session."* Browser storage can throw, so the feature degrades instead of crashing.

The comment above the store explains all of this to the next reader. That is the right place for the reasoning.

## The same patterns, reused (2026-09-23)

Once a pattern is understood it should become a small reusable piece, not be re-derived in every page. Three appeared in the refactor:

- **`useStoredState(key, fallback)`** in `src/components/useStoredState.ts` is `themeStore` generalised to any `localStorage` string. It reads through `useSyncExternalStore`, returns `fallback` from the server snapshot so hydration matches, listens for the `storage` event so other tabs stay in sync, and falls back to an in-memory `Map` when storage throws. The Today page uses it to remember the session size (`"reps-session-size"` in `src/app/app/page.tsx`).
- **`useApi(url)`** in `src/components/useApi.ts` loads any `{ success, data }` endpoint. Its doc comment states the rule from Fix 1: state is *"only ever set from the fetch's promise callbacks (never synchronously in the effect body)"*. Each result is tagged with the request it answers, so a slow response for an old URL cannot land on a newer one, and "loading" is derived rather than stored. Every page that uses it gets an error state with a retry button (`ErrorState` in `src/components/ui/States.tsx`).
- **`useEffectEvent`** in `useDrillSession.ts`. The Enter-key listener needs the latest `submit` and `next`, which change on every keystroke. Listing them as effect dependencies would detach and reattach the window listener constantly; leaving them out would read stale values. `onKeyDown = useEffectEvent(…)` always sees the latest values, so the effect that attaches the listener depends only on whether the session is `active`.

## The general lesson

Lint rules like these are **compressed experience**: someone hit the bug many times and wrote a rule so you don't have to. When a rule fires:

1. Find the *reason* (the rule's docs, or the React docs page it links to).
2. Decide whether your code really is the exception. It almost never is.
3. Fix it in the idiomatic way, and leave a comment where the fix isn't obvious (every fix in this chapter has one).
4. If you truly must disable a rule, disable it for one line, with a comment that explains *why*, and expect a reviewer to push back.

A codebase with few suppressions is also easier to review. Every warning that appears in CI is real, so nobody learns to ignore warnings.

## The one suppression

`grep -rn eslint-disable src scripts` finds one line, in `src/components/drill/CodeEditor.tsx`:

```ts
    view.current = new EditorView({ state, parent: host.current });
    return () => { view.current?.destroy(); view.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
```

It is a common and defensible case. The effect creates an imperative CodeMirror instance **once per mount**. Adding its dependencies (the initial value, the change handler) would destroy and rebuild the editor on every keystroke. A second effect below it syncs value changes "without clobbering the document while the user is typing".

What is missing is the *why* on the suppression itself. The reason is spread across the surrounding code instead of stated at the point where a reviewer's eye lands. A better version is `// eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only: the editor is imperative; value changes are synced by the effect below`. A cleaner fix still: keep the latest `onChange` in a ref (the "latest ref" pattern), or read it through `useEffectEvent` as `useDrillSession.ts` now does for its key handler, so the dependency array can be honestly empty. That is a small, worthwhile exercise. The suppression was still there after the 2026-09-23 refactor.

## Try it yourself

1. In `useDrillSession.ts`, change `useRef(0)` for `questionStart` to `useRef(Date.now())` and run `npm run lint`. Read the rule name and message, then revert.
2. Replace `ThemeToggle`'s `useSyncExternalStore` with the `useState` + `useEffect` version above. Run the lint, then explain in two sentences what the user would see on a slow device.
3. In `OrderSteps`, shuffle `payload.steps` directly in render with `useMemo` instead of taking the order from `response`. Is `useMemo` enough? (Hint: React may discard memoised values, and it's still impure.) What does the lint say? Then compare with `initialResponse()`.
4. Find one more place in `src/components/**` where a value is kept in a ref instead of state (`recorded` and `firstResponse` in `useDrillSession.ts` are candidates), and explain why that is the right choice there.

> **Junior vs senior**
>
> **Junior:** "The linter's being pedantic," and adds `eslint-disable`. Mirrors DOM or storage values into state with an effect. Shuffles in render.
>
> **Senior:** "Render is pure, so clocks and randomness go in the handler or callback that causes them, and in an effect only when nothing else fits. Refs hold values that don't drive the UI. External state is *subscribed to* with `useSyncExternalStore`, never copied into state. Keep suppressions rare, one line each, with the reason written on the line."
