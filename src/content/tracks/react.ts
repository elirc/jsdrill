import { defineTrack, mod, mcq, multi, tf, out, blank, order, short } from "../builder";

export default defineTrack({
  slug: "react",
  name: "React",
  tagline: "State, effects, and why your component rendered again",
  description:
    "Hooks rules, dependency arrays, keys, controlled forms, data fetching and memoisation — the React questions that actually get asked, plus the bugs behind them.",
  icon: "⚛",
  color: "#06b6d4",
  modules: [
    // ─────────────────────────────────────────────────────────
    mod("react-basics", {
      title: "Components, Props & State",
      level: 1,
      summary: "What triggers a render, and why state updates look asynchronous.",
      keyIdeas: [
        "A component re-renders when its state changes, its parent re-renders, or a consumed context changes.",
        "State is a snapshot of that render — `setCount(count + 1)` three times gives 1. Use `c => c + 1`.",
        "Never mutate state: React compares by reference, so `push` on the same array is invisible to it.",
        "Props are read-only — pass a callback down and let the owner update the state.",
        "Don't copy props into state; derive during render, or `key` the component to remount with new data.",
      ],
      brief: `A component is a function that takes **props** and returns UI. React calls it, compares the result to the previous one, and applies the minimum DOM changes.

A component re-renders when:

1. Its own state changes,
2. Its parent re-renders, or
3. A context value it consumes changes.

**Props are read-only.** A child never mutates them — it calls a function the parent passed down. That one-way flow is what makes a React app traceable.

**State updates are batched and applied on the next render.** This is the number-one beginner surprise:

\`\`\`js
const [count, setCount] = useState(0);
setCount(count + 1);
setCount(count + 1);   // count is still 0 in this closure → ends at 1
\`\`\`

Use the **updater function** when the new value depends on the old one:

\`\`\`js
setCount(c => c + 1);
setCount(c => c + 1);   // → 2
\`\`\`

And **never mutate state**. React compares by reference: \`items.push(x)\` keeps the same array reference, so React concludes nothing changed and skips the render. Produce a new value — \`setItems([...items, x])\`.`,
      items: [
        out("react-basics-batch", {
          q: "After one click, what is `count`?",
          code: `const [count, setCount] = useState(0);

function handleClick() {
  setCount(count + 1);
  setCount(count + 1);
  setCount(count + 1);
}`,
          lang: "jsx",
          why: "**1.** `count` is a `const` captured by this render's closure — it is `0` for all three calls, so each one queues 'set state to 1'. React batches them and the last wins.\n\nWith the updater form, each call receives the latest queued value:\n\n```js\nsetCount(c => c + 1);  // three times → 3\n```\n\nThe rule: whenever the next state depends on the previous, pass a function.",
          tip: "One of the most-asked React questions. Say 'state is a snapshot of that render' — it is the mental model interviewers listen for.",
          c: ["rendering", "closures"],
          d: 2,
          choices: [
            { t: "`1`", ok: true, why: "Correct — all three read the same captured `0`." },
            { t: "`3`", why: "That requires the updater form `setCount(c => c + 1)`." },
            { t: "`0`", why: "The state does update, just only by one." },
            { t: "`2`", why: "Batching does not partially apply." },
          ],
        }),
        mcq("react-basics-mutate", {
          q: "Why does the list not update on screen?",
          code: `const [items, setItems] = useState([]);

function add(item) {
  items.push(item);
  setItems(items);
}`,
          lang: "jsx",
          why: "`push` mutates the existing array, so `items` is still the **same reference**. React compares the new state to the old with `Object.is`, sees they are identical, and skips the re-render.\n\nThe fix is to produce a new array: `setItems([...items, item])`, or better `setItems(prev => [...prev, item])` so it works correctly under batching. The same rule applies to objects — `{...obj, field: value}` rather than `obj.field = value`.\n\nThis is the concrete, practical reason React codebases care about immutability.",
          tip: "Interviewers ask this to see whether you connect immutability to React's actual change-detection mechanism.",
          c: ["immutability", "rendering", "equality"],
          d: 2,
          choices: [
            {
              t: "`push` mutates in place, so the reference is unchanged and React skips the render",
              ok: true,
              why: "Correct — React compares by reference.",
            },
            { t: "`setItems` is asynchronous, so it missed the push", why: "Timing is not the issue; identity is." },
            { t: "Arrays cannot be stored in `useState`", why: "They can, and commonly are." },
            { t: "It needs `setItems([...items])` to force a deep copy", why: "Close on syntax, but the reason is reference identity, not depth." },
          ],
        }),
        multi("react-basics-rerender", {
          q: "Which of these cause a component to re-render?",
          why: "The three triggers are: its own state changed, its parent re-rendered, or a context value it consumes changed. (A `key` change is really a remount — React discards the old component and creates a new one.)\n\nWhat does **not** trigger a render: mutating a variable that is not state, changing a `useRef`'s `.current` (refs are deliberately render-invisible, which is why they suit timer ids and DOM nodes), or a prop changing on a *sibling*.",
          c: ["rendering"],
          d: 2,
          choices: [
            { t: "Its own state changes via a setter", ok: true },
            { t: "Its parent re-renders", ok: true },
            { t: "A context value it consumes changes", ok: true },
            { t: "Its `key` changes", ok: true, why: "Technically a remount — old instance discarded, state reset." },
            { t: "A `useRef`'s `.current` is reassigned", why: "Refs never trigger renders — that is their purpose." },
            { t: "A plain module-level variable is reassigned", why: "React has no way to observe that." },
          ],
        }),
        tf("react-basics-props-mutate", {
          q: "A child component may modify the props object it receives, as long as it calls a setter afterwards.",
          answer: false,
          why: "Props are read-only. Mutating them breaks React's one-way data flow: the parent still owns that value, so on its next render it overwrites your change — and the mutation makes the data flow untraceable in the meantime.\n\nThe correct pattern is to pass a callback down (`onChange`, `onSave`) and let the **owner** of the state update it. If a child needs to derive something from a prop, compute it during render rather than storing a copy in state, which would then go stale.",
          c: ["component-design", "immutability"],
          d: 1,
        }),
        mcq("react-basics-derived", {
          q: "What is wrong with copying a prop into state?",
          code: `function Profile({ user }) {
  const [name, setName] = useState(user.name);
  return <h1>{name}</h1>;
}`,
          lang: "jsx",
          why: "`useState(user.name)` uses the initial value **only on the first render**. If the parent later passes a different `user`, `name` keeps the stale original — the heading never updates.\n\nIf the value is just derived, compute it during render: `const name = user.name`. If you genuinely need editable local state seeded from a prop (a form), the idiomatic fix is to `key` the component by `user.id` so a different user remounts it with fresh state.\n\n'Don't duplicate props in state' is one of React's oldest guidelines and it still catches people.",
          tip: "The follow-up is usually 'so how do you build an editable form seeded from props?' — answer: `key`, or an explicit reset effect.",
          c: ["component-design", "rendering"],
          d: 3,
          choices: [
            {
              t: "The initial value is only read once, so the state goes stale when the prop changes",
              ok: true,
              why: "Correct — use derivation, or remount with `key`.",
            },
            { t: "`useState` cannot take an object property", why: "It takes any value." },
            { t: "It causes an infinite render loop", why: "No loop — the problem is silence, not repetition." },
            { t: "Nothing — this is the recommended pattern", why: "It is a documented anti-pattern." },
          ],
        }),
        multi("react-basics-useref", {
          q: "Which are appropriate uses of `useRef`?",
          why: "A ref is a **mutable box that persists across renders and does not trigger a render when changed**. That makes it right for two families of job.\n\nFirst, **DOM access**: `ref={inputRef}` then `inputRef.current.focus()`, measuring an element, or handing a node to a non-React library such as a chart or map.\n\nSecond, **instance-like values that the UI does not display**: a timer or interval id you need to clear later, an `AbortController`, or a flag like 'has this already been sent?'.\n\nWhat it is wrong for: anything the screen shows. Changing `ref.current` does not re-render, so the UI goes stale — that is `useState`'s job. And reading or writing `ref.current` during render (outside effects and handlers) makes rendering impure, which is a common source of subtle bugs.",
          tip: "The one-line definition — 'a mutable value that survives renders without causing one' — covers every correct use.",
          c: ["hooks-rules", "rendering"],
          d: 1,
          choices: [
            { t: "Holding a DOM node so you can call `.focus()` on it", ok: true },
            { t: "Storing an interval id so it can be cleared later", ok: true },
            { t: "Holding the `AbortController` for an in-flight request", ok: true },
            {
              t: "Holding a counter that is displayed on screen, to avoid re-renders",
              why: "Mutating a ref does not re-render, so the displayed value goes stale. Shown values belong in state.",
            },
            {
              t: "Forcing a re-render by assigning to `ref.current`",
              why: "Assigning to a ref never schedules a render — that is precisely its defining property.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("react-effects", {
      title: "useEffect & Dependencies",
      level: 2,
      summary: "Stale closures, infinite loops, cleanup — the three effect bugs.",
      keyIdeas: [
        "Effects synchronise with systems outside React: subscriptions, timers, network, the DOM.",
        "Dependencies compare with `Object.is` — an inline object or array is new every render and loops forever.",
        "A stale closure comes from a value left out of the dependency array; use updater functions or add it.",
        "Return a cleanup: remove listeners, clear timers, abort fetches. It runs before every re-run and on unmount.",
        "Derived data belongs in render, event responses in the handler — not in effects.",
      ],
      brief: `\`useEffect\` **synchronises your component with something outside React**: a subscription, a timer, a browser API, a network request. It runs *after* the render is committed to the screen.

The dependency array controls re-running. React compares each dependency with \`Object.is\`:

- \`[]\` — run once after mount (and clean up on unmount).
- \`[a, b]\` — re-run whenever \`a\` or \`b\` changes.
- omitted — run after **every** render.

Three bugs cover nearly everything that goes wrong:

**1. Stale closure** — you left a value out of the array, so the effect keeps reading the value from the render it was created in.

**2. Infinite loop** — a dependency is a new reference every render (an object, array or inline function), so the effect re-runs, sets state, re-renders, and repeats. Fix by memoising the dependency or moving it inside the effect.

**3. Missing cleanup** — return a function to remove listeners, clear timers, and abort in-flight requests. React calls it before each re-run and on unmount.

The modern guidance worth quoting: **you probably don't need an effect** for transforming data for rendering (compute during render) or for handling a user event (do it in the handler). Effects are for external systems.`,
      items: [
        mcq("react-eff-infinite", {
          q: "Why does this loop forever?",
          code: `const [user, setUser] = useState(null);

useEffect(() => {
  fetchUser(id).then(setUser);
}, [{ id }]);`,
          lang: "jsx",
          why: "`{ id }` creates a **new object on every render**. React compares dependencies with `Object.is`, and two structurally identical objects are different references, so the dependency always looks changed. The effect runs, sets state, triggers a render, creates a new object, and runs again — forever.\n\nThe fix is to depend on the **primitive**: `}, [id])`. Primitives compare by value. The same trap appears with inline arrays, inline object literals, and inline functions as dependencies.",
          tip: "The general rule to state: dependencies should be primitives, or references that are stable across renders.",
          c: ["effects", "equality"],
          d: 2,
          choices: [
            {
              t: "The object literal is a new reference every render, so the dependency always differs",
              ok: true,
              why: "Correct — depend on `id` directly.",
            },
            { t: "`fetchUser` returns a new promise each time", why: "The promise is not a dependency." },
            { t: "`setUser` changes identity between renders", why: "State setters are guaranteed stable." },
            { t: "The effect is missing a cleanup function", why: "Cleanup would not stop the re-run cycle." },
          ],
        }),
        out("react-eff-stale", {
          q: "The counter shows `1` and never goes higher. Why?",
          code: `const [count, setCount] = useState(0);

useEffect(() => {
  const id = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  return () => clearInterval(id);
}, []);`,
          lang: "jsx",
          why: "With `[]`, the effect runs once and its closure captures `count` as `0` **forever**. Every tick computes `0 + 1`, so the state is set to `1` repeatedly and the display never advances — a textbook **stale closure**.\n\nThe fix is the updater form, which does not need to read the current value:\n\n```js\nsetCount(c => c + 1);\n```\n\nThe dependency array can stay `[]`, the interval is created once, and each tick increments correctly. Adding `count` to the array would also 'work' but tears down and recreates the interval every second.",
          tip: "This connects closures to React. Say the words 'stale closure' — interviewers are listening for them.",
          c: ["effects", "closures"],
          d: 3,
          choices: [
            {
              t: "The effect's closure captured `count` as 0 and never re-ran — use `setCount(c => c + 1)`",
              ok: true,
              why: "Correct diagnosis and correct fix.",
            },
            { t: "`setInterval` only fires once", why: "It fires repeatedly; the state value is the problem." },
            { t: "The cleanup runs immediately and clears the interval", why: "Cleanup runs on unmount here, not straight away." },
            { t: "State updates inside timers are ignored by React", why: "They work fine — this one just always computes 1." },
          ],
        }),
        multi("react-eff-cleanup", {
          q: "Which of these need a cleanup function returned from `useEffect`?",
          why: "Cleanup exists to undo whatever the effect started. Subscriptions, event listeners, intervals and timeouts, WebSocket connections and in-flight fetches (via `AbortController`) all need it — otherwise you leak memory, and you can get 'setState on an unmounted component' or a slow response overwriting newer data.\n\nWhat does **not** need cleanup: a plain synchronous calculation, or a one-off analytics event with no ongoing resource. React runs cleanup before each re-run *and* on unmount, which is what makes it correct for both cases.",
          c: ["effects", "memory"],
          d: 2,
          choices: [
            { t: "`window.addEventListener('resize', handler)`", ok: true },
            { t: "`setInterval(tick, 1000)`", ok: true },
            { t: "A WebSocket connection", ok: true },
            { t: "A fetch you want to abort if the component unmounts", ok: true },
            { t: "`document.title = title`", why: "No ongoing resource to release." },
            { t: "Computing a derived value from props", why: "That should not be in an effect at all." },
          ],
        }),
        mcq("react-eff-unnecessary", {
          q: "What should replace this effect?",
          code: `const [items, setItems] = useState([]);
const [filtered, setFiltered] = useState([]);

useEffect(() => {
  setFiltered(items.filter(i => i.active));
}, [items]);`,
          lang: "jsx",
          why: "Nothing — delete it. `filtered` is **derived** data, so compute it during render:\n\n```js\nconst filtered = items.filter(i => i.active);\n```\n\nThe effect version renders twice for every change (once with stale `filtered`, then again after the effect sets state), adds a second source of truth that can drift, and is more code. If the filter were genuinely expensive you would wrap it in `useMemo`, but that is a performance decision made after measuring — not the default.\n\n'You Might Not Need an Effect' is official React guidance, and reviewers ask this to see whether you reach for effects reflexively.",
          tip: "The rule: effects are for synchronising with systems *outside* React. Deriving data is not that.",
          c: ["effects", "rendering", "component-design"],
          d: 3,
          choices: [
            {
              t: "Compute it during render — `const filtered = items.filter(...)`",
              ok: true,
              why: "Correct: derived data does not belong in state.",
            },
            { t: "Move it into `useLayoutEffect`", why: "Same double-render problem, just earlier." },
            { t: "Add `filtered` to the dependency array", why: "That creates an infinite loop." },
            { t: "Wrap it in `useCallback`", why: "Wrong tool; it does not address the extra state." },
          ],
        }),
        blank("react-eff-abort", {
          q: "Complete the effect so an in-flight request is cancelled when `id` changes or the component unmounts.",
          template: `useEffect(() => {
  const controller = new {{1}}();
  fetch(\`/api/users/\${id}\`, { signal: controller.signal })
    .then(r => r.json())
    .then(setUser)
    .catch(e => { if (e.name !== "AbortError") setError(e); });

  return () => controller.{{2}}();
}, [id]);`,
          answers: [["AbortController"], ["abort"]],
          hints: ["The browser API for cancelling fetches", "The method that cancels it"],
          why: "`AbortController` gives you a `signal` to pass to `fetch` and an `abort()` to cancel it. Returning `() => controller.abort()` means React cancels the previous request before starting a new one.\n\nThis fixes a real **race condition**: without it, if `id` changes from 1 to 2 and request 1 happens to resolve *after* request 2, you display user 1's data under user 2's id. Note the `catch` — an aborted fetch rejects with an `AbortError` you should ignore rather than show as a failure.",
          tip: "Mentioning the out-of-order-response race, not just the memory leak, is the senior version of this answer.",
          c: ["effects", "server-state", "concurrency"],
          d: 3,
          secs: 80,
        }),
        short("react-eff-explain", {
          q: "*\"When should you use `useEffect`, and when is reaching for it a mistake?\"*",
          why: "Modern React interviews probe this specifically, because overusing effects is the most common intermediate-level mistake.",
          model:
            "`useEffect` is for synchronising with something outside React — a subscription, a timer, a browser API, a WebSocket, or imperatively touching the DOM. The test I apply is: is there a system outside React that needs to know about this change? If yes, effect. If no, probably not.\n\nThe common mistakes: using an effect to derive state from props or other state, when you should just compute it during render; and using an effect to respond to a user action, when that logic belongs in the event handler. Both add an extra render, create a second source of truth that can drift, and make the data flow harder to follow.\n\nData fetching is the interesting middle case. It genuinely is an external system, so an effect is legitimate — but doing it by hand means reimplementing caching, deduplication, race-condition handling and retries. On a real project I'd use React Query or the framework's own data loading rather than hand-rolling it, and if I did write it by hand I'd use an `AbortController` in the cleanup so a stale response cannot overwrite a newer one.",
          points: [
            "Effects synchronise with systems outside React",
            "Not for deriving data (compute during render) or event responses (use the handler)",
            "Overuse costs an extra render and a second source of truth",
            "Fetching is legitimate but usually better served by a data library",
            "Cleanup handles unmount and races via AbortController",
          ],
          c: ["effects", "server-state"],
          d: 3,
          secs: 150,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("react-lists", {
      title: "Lists, Keys & Reconciliation",
      level: 2,
      summary: "Why index keys break, and what React actually does on re-render.",
      keyIdeas: [
        "Keys tell React which element is which across renders; state and DOM follow the key.",
        "Index keys break on reorder, insert or delete — row state ends up attached to the wrong data.",
        "`Math.random()` or `Date.now()` as a key remounts every row on every render.",
        "Keys must be stable, unique among siblings, and derived from the data — normally the id.",
      ],
      brief: `When React re-renders, it **reconciles**: it compares the new element tree with the previous one and applies the minimum DOM changes.

For lists it needs to know which item is which across renders. That is what \`key\` is for. The key tells React "this is the same logical item as before", so it can move the DOM node rather than destroy and rebuild it — and crucially, **component state follows the key**.

Using the array index as a key is fine only if the list is **static**: never reordered, never filtered, no insertions or deletions except at the end.

Otherwise it breaks. Insert an item at the front and every index shifts, so React thinks item 0 changed its content rather than that a new item appeared. Any state inside those rows — the text in an input, a checked checkbox, an open/closed toggle — stays attached to the *position*, not the data. The classic bug: delete the third row of a form, and the fourth row's input value jumps up into the third row's field.

Rules:
- Keys must be **stable** (same item, same key across renders), **unique among siblings**, and **derived from the data** — normally the id.
- Never use \`Math.random()\`: a new key every render remounts the entire list, destroying state and thrashing the DOM.`,
      items: [
        mcq("react-keys-index", {
          q: "A to-do list uses `key={index}`. Items can be deleted from the middle. What breaks?",
          why: "State attaches to the key, and index keys mean the key describes a **position**, not an item. Delete row 2 and everything below shifts up: React sees the same keys `0,1,2` with different content, so it reuses the existing component instances and only updates the text.\n\nAny internal state stays where it was. If each row has a checkbox or an editable input, row 3's value now appears next to row 2's label. The list *looks* right on first glance, which is what makes this bug so persistent.\n\nUse a stable id from the data: `key={todo.id}`.",
          tip: "Describing the concrete symptom — 'the input value ends up on the wrong row' — proves you have actually hit it.",
          c: ["keys", "rendering"],
          d: 2,
          choices: [
            {
              t: "Per-row state stays with the position, so values appear attached to the wrong item",
              ok: true,
              why: "Correct — state follows the key.",
            },
            { t: "The list throws a duplicate key warning", why: "Indexes are unique; there is no warning, which is why it hides." },
            { t: "Deleted items reappear on the next render", why: "The data is correct; the component instances are misaligned." },
            { t: "Nothing — index keys are always fine", why: "Only for static lists that never reorder or splice." },
          ],
        }),
        tf("react-keys-random", {
          q: "`key={Math.random()}` is a safe way to guarantee unique keys.",
          answer: false,
          why: "It is one of the worst things you can do. A fresh key every render means React matches *nothing* to the previous tree, so it unmounts every row and mounts new ones: all child state is destroyed, effects re-run, inputs lose focus mid-typing, and you pay a full DOM rebuild on every render.\n\nKeys must be **stable across renders for the same item**. Use the entity's id. If the data genuinely has no id, generate one *once* when the item is created and store it with the data — not during render.",
          c: ["keys", "performance"],
          d: 2,
        }),
        out("react-keys-reconcile", {
          q: "`items` changes from `[A, B]` to `[C, A, B]` with `key={item.id}`. What does React do to the DOM?",
          code: `{items.map(item => <Row key={item.id} item={item} />)}`,
          lang: "jsx",
          why: "React matches keys `A` and `B` to the existing instances, so those components are **not** remounted — their state and DOM nodes are preserved and simply moved. Only `C` is created and inserted.\n\nWith `key={index}` the same change would look like: index 0 went from A to C, index 1 from B to A, and a new index 2 appeared — so React updates the props of two existing rows and mounts one at the end. The DOM ends up correct, but any state inside rows 0 and 1 is now attached to the wrong data.",
          c: ["keys", "rendering"],
          d: 3,
          choices: [
            {
              t: "Mounts only `C`; `A` and `B` are moved with their state intact",
              ok: true,
              why: "Correct — stable keys let React match and move.",
            },
            { t: "Unmounts and remounts all three rows", why: "That happens with unstable keys, not stable ones." },
            { t: "Updates the props of rows 0 and 1 and appends a third", why: "That is the *index-key* behaviour." },
            { t: "Re-creates the entire list container", why: "Reconciliation is element-by-element." },
          ],
        }),
        multi("react-keys-valid", {
          q: "Which are acceptable `key` values?",
          why: "A key must be **stable, unique among siblings, and derived from the data**. A database id is ideal. A composite of fields that together identify the row (`${userId}-${date}`) works when there is no single id. A client-generated `uuid` is fine **if it was created once and stored with the item**, not regenerated during render.\n\nUnacceptable: `Math.random()` and `Date.now()` (new every render → full remount), and the array index for any list that reorders or has items removed.",
          c: ["keys"],
          d: 2,
          choices: [
            { t: "`key={todo.id}` from the database", ok: true },
            { t: 'key={`${userId}-${date}`}  — when there is no single id', code: true, ok: true },
            { t: "A uuid generated once when the item was created and stored with it", ok: true },
            { t: "`key={index}` for a hard-coded list that never changes", ok: true, why: "Acceptable for genuinely static lists." },
            { t: "`key={Math.random()}`", why: "New key every render — remounts everything." },
            { t: "`key={Date.now()}`", why: "Same problem." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("react-forms", {
      title: "Forms & Controlled Inputs",
      level: 3,
      summary: "The bread and butter of CRUD work — and the bugs that come with it.",
      keyIdeas: [
        "Controlled input: `value` + `onChange`; state is the source of truth. Uncontrolled: `defaultValue` + read on submit.",
        "`value` without `onChange` freezes the field — React overwrites every keystroke.",
        "Initialise form state with `\"\"`, never `undefined`/`null`, or the input flips uncontrolled → controlled.",
        "One handler for all fields: `setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))`.",
        "Always `e.preventDefault()`; disable submit while in flight; server validates regardless of the client.",
      ],
      brief: `A **controlled** input takes its value from state and reports changes back:

\`\`\`jsx
<input value={name} onChange={e => setName(e.target.value)} />
\`\`\`

React state is the single source of truth, so you can validate, transform and disable submit based on it.

An **uncontrolled** input keeps its own value in the DOM; you read it with a ref or from \`FormData\` on submit. Less code, fewer renders, but no live validation.

The two bugs everyone hits:

1. **\`value\` without \`onChange\`** — the field is frozen. React logs a warning telling you exactly this. Use \`defaultValue\` if you wanted uncontrolled.
2. **Switching controlled ↔ uncontrolled** — initialising state to \`undefined\` or \`null\` makes React treat the input as uncontrolled, then controlled once data loads, and it warns. Initialise to \`""\`.

For form submission, always \`e.preventDefault()\` — otherwise the browser does a full page navigation.

For anything beyond a couple of fields, a form library (React Hook Form) handles validation, touched/dirty state, and avoids re-rendering the whole form on every keystroke. Knowing *why* you'd reach for one — per-field subscriptions instead of a top-level state object — is the mid-level answer.`,
      items: [
        mcq("react-form-frozen", {
          q: "Why can the user not type in this field?",
          code: `<input value={email} />`,
          lang: "jsx",
          why: "Passing `value` makes the input **controlled**: React forces its displayed value to match state on every render. Without `onChange`, nothing ever updates state, so every keystroke is immediately overwritten by the old value.\n\nTwo fixes depending on intent: add `onChange={e => setEmail(e.target.value)}` to control it properly, or switch to `defaultValue={email}` for an uncontrolled input the DOM manages. React logs a specific warning for this exact case.",
          c: ["controlled-inputs"],
          d: 1,
          choices: [
            {
              t: "It is controlled with no `onChange`, so React overwrites every keystroke",
              ok: true,
              why: "Correct — add `onChange`, or use `defaultValue`.",
            },
            { t: "`value` should be `defaultValue` always", why: "Only if you want it uncontrolled." },
            { t: "The input needs a `name` attribute", why: "`name` matters for form submission, not editability." },
            { t: "`email` must be a string, not a number", why: "Either type renders; the missing handler is the issue." },
          ],
        }),
        mcq("react-form-undefined", {
          q: "The console warns: *\"A component is changing an uncontrolled input to be controlled.\"* What causes it?",
          code: `const [name, setName] = useState();
// later: setName(fetchedUser.name)
<input value={name} onChange={...} />`,
          lang: "jsx",
          why: "`useState()` with no argument initialises to `undefined`. React reads `value={undefined}` as 'no value supplied' and treats the input as **uncontrolled**. When the fetch resolves and `name` becomes a string, the input flips to **controlled** — a switch React warns about because it produces unpredictable behaviour.\n\nThe fix is to initialise with the right empty value: `useState(\"\")`. The same class of bug appears with `null` from an API — coalesce it: `value={name ?? \"\"}`.",
          tip: "Extremely common in edit forms that load data asynchronously.",
          c: ["controlled-inputs", "nullability"],
          d: 2,
          choices: [
            {
              t: "State starts as `undefined`, so the input begins uncontrolled and becomes controlled",
              ok: true,
              why: 'Correct — initialise with `""`.',
            },
            { t: "The `onChange` handler is missing", why: "It is present here." },
            { t: "Fetching inside a component is not allowed", why: "It is fine; the initial state value is the problem." },
            { t: "`value` cannot be updated after the first render", why: "It can, and normally is." },
          ],
        }),
        blank("react-form-generic-handler", {
          q: "Complete the single handler that updates any field in a form-state object by its `name` attribute.",
          template: `const [form, setForm] = useState({ email: "", password: "" });

function handleChange(e) {
  const { name, value } = e.target;
  setForm(prev => ({ ...prev, [{{1}}]: {{2}} }));
}`,
          answers: [["name"], ["value"]],
          hints: ["The computed key from the input's name attribute", "The new value"],
          why: "`[name]` is a **computed property key** — it uses the variable's value as the key rather than the literal string `\"name\"`. Spreading `prev` keeps the other fields, and the updater function form ensures correctness when several updates batch together.\n\nThis one handler serves every input in the form, as long as each has a matching `name`. It is the standard pattern for small forms; for larger ones a form library avoids re-rendering every field on each keystroke.",
          c: ["controlled-inputs", "immutability"],
          d: 2,
          secs: 70,
        }),
        multi("react-form-submit", {
          q: "Which belong in a robust form submit handler?",
          why: "`e.preventDefault()` stops the browser's full-page navigation — omit it and your handler runs but the page reloads. Disabling submit while in flight prevents duplicate POSTs from an impatient double-click. `try/catch/finally` ensures the loading flag is cleared even on failure, and the server error must be surfaced rather than swallowed.\n\nWhat is *not* sufficient: relying on client-side validation alone — it is a UX affordance, and the server must validate independently because anyone can bypass the browser. And clearing the form before the request succeeds loses the user's input when it fails.",
          c: ["controlled-inputs", "validation", "error-handling"],
          d: 2,
          choices: [
            { t: "`e.preventDefault()`", ok: true },
            { t: "Disable the submit button while the request is in flight", ok: true },
            { t: "Reset the loading state in a `finally` block", ok: true },
            { t: "Display the server's error message on failure", ok: true },
            { t: "Skip server validation because the client already validated", why: "The client can always be bypassed; the server must validate." },
            { t: "Clear the fields immediately on submit", why: "Loses the user's input if the request fails." },
          ],
        }),
        short("react-form-library", {
          q: "*\"When would you add a form library instead of using `useState`?\"*",
          why: "Tests whether you can justify a dependency rather than reaching for one by reflex — or refusing one out of principle.",
          model:
            "For two or three fields with simple validation, `useState` is fine and adding a dependency is not worth it.\n\nI'd reach for a library — React Hook Form is my default — once the form has meaningful validation rules, cross-field dependencies, or enough fields that re-rendering the entire form on every keystroke becomes noticeable. React Hook Form keeps inputs uncontrolled and subscribes per field, so typing in one field doesn't re-render the others. It also gives you touched and dirty state, which you need for 'only show the error after they've left the field' — that's genuinely fiddly to hand-roll.\n\nThe other thing I'd want is one schema driving both validation and types — Zod with a resolver — so the form rules and the TypeScript type come from the same definition, and ideally the same schema validates on the server. That removes the drift between client and server rules, which is where form bugs usually live.\n\nWhat I would not do is add it for a two-field login form.",
          points: [
            "useState is fine for small forms — don't add a dependency reflexively",
            "Trigger: real validation rules, many fields, or re-render cost",
            "Per-field subscriptions avoid re-rendering the whole form",
            "Touched/dirty state is tedious to hand-roll",
            "One schema (Zod) for validation + types, shared with the server",
          ],
          c: ["controlled-inputs", "validation", "packages"],
          d: 3,
          secs: 140,
        }),
        mcq("react-form-uncontrolled", {
          q: "What is an uncontrolled input, and when is it a reasonable choice?",
          why: "An **uncontrolled** input keeps its value **in the DOM**, not in React state. You give it an initial value with `defaultValue` and read it when you need it — through a ref, or with `new FormData(event.currentTarget)` in the submit handler.\n\nA **controlled** input has `value` bound to state and an `onChange` that updates it, so React is the single source of truth and re-renders on every keystroke.\n\nUncontrolled is perfectly reasonable when you only need the values **on submit**: a simple contact or login form, file inputs (which are always uncontrolled, since their value cannot be set programmatically), or large forms where per-keystroke re-renders matter. It is also the approach libraries like React Hook Form use under the hood for performance.\n\nControlled wins when the UI must react to the value as it changes: live validation, formatting as you type, disabling the submit button, or one field depending on another.",
          tip: "Mention that file inputs are always uncontrolled — it is a small detail that shows hands-on experience.",
          c: ["controlled-inputs", "component-design"],
          d: 2,
          choices: [
            {
              t: "The DOM holds the value and you read it on submit via a ref or `FormData`; fine when you do not need the value while typing",
              ok: true,
              why: "Correct — and it avoids a re-render per keystroke.",
            },
            {
              t: "An input with no `name` attribute, which cannot be submitted",
              why: "Names matter for `FormData`, but 'uncontrolled' is about where the value lives.",
            },
            {
              t: "A deprecated pattern that React warns against",
              why: "It is fully supported; React only warns when an input switches between controlled and uncontrolled.",
            },
            {
              t: "An input whose value is set by `value` without an `onChange`",
              why: "That is a read-only controlled input — the frozen-field bug — not an uncontrolled one.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("react-data", {
      title: "Data Fetching & Server State",
      level: 3,
      summary: "Loading, error, empty — and why server state is not UI state.",
      keyIdeas: [
        "Every fetch has four states: loading, error, empty, success — empty is not an error.",
        "`fetch` only rejects on network failure; a 500 resolves. Check `res.ok`.",
        "Responses arrive out of order — abort the previous request in cleanup or use a data library.",
        "Nested fetches create a waterfall; start independent requests together, higher up.",
        "Server state (cached, shared, stale-able) is not UI state — React Query handles caching, dedup, retries, invalidation.",
      ],
      brief: `Every fetch has at least **four** states, and juniors ship two of them:

1. Loading
2. Error
3. Empty (succeeded, no results — a different message from an error)
4. Success with data

**Server state is not UI state.** It is shared, asynchronous, owned by someone else, and can go stale underneath you. Modelling it with plain \`useState\` means hand-writing caching, deduplication, retries, refetch-on-focus, and invalidation after mutations. That is what React Query / SWR exist for, and "I'd use a data library and here's what it does for me" is a stronger answer than reciting a \`useEffect\` fetch.

Two problems you must be able to name:

**Race conditions.** Search for "a", then "ab". If "a"'s response is slower, it lands last and you show the wrong results. Fix with \`AbortController\` in the effect cleanup, or a library that discards stale responses.

**Waterfalls.** A parent fetches, renders, then a child starts its own fetch. Each level adds a round trip. Fix by hoisting requests, running independent ones with \`Promise.all\`, or using a framework loader that fetches in parallel with rendering.

Also: \`fetch\` **does not reject on 4xx/5xx**. Only network failures reject. You must check \`res.ok\` yourself.`,
      items: [
        mcq("react-data-fetch-ok", {
          q: "The API returns `500`. What happens here?",
          code: `const res = await fetch("/api/users");
const data = await res.json();
setUsers(data);`,
          lang: "jsx",
          why: "No error is thrown. **`fetch` only rejects on network-level failures** — DNS failure, connection refused, CORS block. A `500`, `404` or `401` is a *successful* HTTP exchange as far as `fetch` is concerned, so the promise resolves normally.\n\n`res.json()` then parses the error body (or throws a JSON parse error if the server returned HTML), and you set that as your user list. Always check explicitly:\n\n```js\nif (!res.ok) throw new Error(`Request failed: ${res.status}`);\n```\n\nThis is one of the highest-value gotchas in front-end interviews because it silently produces wrong UI rather than an error.",
          tip: "Axios differs — it rejects on non-2xx by default. Naming that contrast is a nice touch.",
          c: ["server-state", "error-handling", "http-semantics"],
          d: 2,
          choices: [
            {
              t: "No throw — `fetch` resolves on 5xx, so you must check `res.ok`",
              ok: true,
              why: "Correct: only network failures reject.",
            },
            { t: "`fetch` rejects and the `await` throws", why: "That is Axios's behaviour, not `fetch`'s." },
            { t: "`res.json()` always throws on a 500", why: "Only if the body is not valid JSON." },
            { t: "React catches it and shows an error boundary", why: "Error boundaries do not catch async rejections." },
          ],
        }),
        order("react-data-race", {
          q: "Put the events of a search race condition in the order they occur.",
          steps: [
            'User types "a" — request A is sent',
            'User types "b" — request B is sent for "ab"',
            "Request B responds first and the UI shows results for \"ab\"",
            "Request A responds late and overwrites state with results for \"a\"",
            "The UI now shows results for \"a\" while the box reads \"ab\"",
          ],
          why: "This is the race condition every hand-rolled search hits. Responses are not guaranteed to arrive in the order the requests were sent, so a slower earlier request can land last and clobber fresher data.\n\nFixes: abort the previous request in the effect cleanup with `AbortController`; or tag each request and ignore responses that are not the latest; or use a data library, which handles this for you. Debouncing reduces how often it happens but does **not** eliminate it — a debounced request can still be overtaken.",
          tip: "Saying 'debouncing reduces but does not fix this' shows real understanding.",
          c: ["server-state", "concurrency", "effects"],
          d: 3,
          secs: 75,
        }),
        multi("react-data-library", {
          q: "What does a data library like React Query give you that a `useEffect` fetch does not?",
          why: "Caching with a shared key (so two components requesting the same data make one request), automatic deduplication of concurrent requests, background refetching and staleness control, retry with backoff, and invalidation after mutations so lists refresh once a POST succeeds. It also discards out-of-order responses, removing the race condition above.\n\nWhat it does **not** do: replace client/UI state (a modal's open flag is not server state), or remove the need to handle errors — it gives you an `error` value you still have to render.",
          c: ["server-state", "performance"],
          d: 3,
          choices: [
            { t: "A shared cache keyed by query, so duplicate requests are deduplicated", ok: true },
            { t: "Background refetching and stale-time control", ok: true },
            { t: "Retries with backoff", ok: true },
            { t: "Invalidation so lists refresh after a mutation", ok: true },
            { t: "It replaces `useState` for UI state like modal visibility", why: "That is client state — keep it in `useState`." },
            { t: "It removes the need to handle error states in the UI", why: "It surfaces the error; you still render it." },
          ],
        }),
        mcq("react-data-waterfall", {
          q: "Page load takes 3 seconds: the page fetches the user, then `<Orders>` mounts and fetches orders, then `<Address>` mounts and fetches the address. What is this and how do you fix it?",
          why: "A **request waterfall**. Each fetch only starts once its parent has rendered, so three 1-second requests take 3 seconds serially even though none depends on the others.\n\nFixes, in order of preference: fetch in parallel at a shared level (`Promise.all`, or a route loader that starts all three before rendering); prefetch on hover or route intent; or have the server return the composed payload in one request. Adding `Suspense` alone does not fix it — it improves the loading *presentation*, but the requests still start sequentially unless the data is initiated earlier.",
          tip: "Waterfalls are the most common real cause of a slow-feeling React page. Being able to name and diagnose one is valuable.",
          c: ["server-state", "performance", "concurrency"],
          d: 3,
          choices: [
            {
              t: "A request waterfall — start the independent requests together instead of nesting them",
              ok: true,
              why: "Correct: hoist and parallelise.",
            },
            { t: "An N+1 query — add caching", why: "N+1 is one query per row; this is nested sequential fetches." },
            { t: "A race condition — add `AbortController`", why: "Nothing is being overwritten here; it is purely serial." },
            { t: "Normal React behaviour that cannot be improved", why: "It very much can." },
          ],
        }),
        multi("react-data-states", {
          q: "Which states must a data-fetching component handle to be considered complete?",
          why: "Loading, error, empty and success. **Empty is distinct from error**: a search with no matches is a successful request, and showing 'Something went wrong' for it is a real UX bug reviewers look for.\n\nThe fifth worth having in a list view is *refetching* — data already on screen while newer data loads — because showing a full-page spinner over content the user is reading is worse than a subtle indicator. 'Offline' is nice to have but not usually required to call the component complete.",
          c: ["server-state", "component-design"],
          d: 2,
          choices: [
            { t: "Loading", ok: true },
            { t: "Error, with a way to retry", ok: true },
            { t: "Empty — succeeded but no results", ok: true },
            { t: "Success with data", ok: true },
            { t: "Treat empty results as an error", why: "A common and jarring UX mistake." },
            { t: "Render nothing until data arrives, with no indicator", why: "Looks broken to the user." },
          ],
        }),
        multi("react-data-error-boundary", {
          q: "Which errors will a React error boundary catch?",
          why: "Error boundaries catch errors thrown **while React is rendering** the tree below them: in a child's render (function body), in lifecycle methods, and in constructors. They then render a fallback UI instead of unmounting the whole app.\n\nThey do **not** catch errors in **event handlers** (those run outside rendering — use `try/catch`), in **asynchronous code** such as `setTimeout` callbacks or promise rejections from a fetch, in **server-side rendering**, or in the boundary component itself.\n\nThe practical pattern for async errors is to catch them and store them in state. To show one through a boundary, rethrow it during the next render — some data libraries offer an option that does exactly this.\n\nBoundaries still have to be written as **class components** using `getDerivedStateFromError` / `componentDidCatch`; most teams use the small `react-error-boundary` package instead of writing their own.",
          tip: "The 'not event handlers, not async' exclusions are what the question is really testing.",
          c: ["error-handling", "rendering"],
          d: 2,
          choices: [
            { t: "An error thrown while a child component renders", ok: true },
            { t: "An error thrown in a child's constructor or lifecycle method", ok: true },
            { t: "An error thrown inside an `onClick` handler", why: "Event handlers run outside rendering; catch these with `try/catch`." },
            { t: "A rejected promise from a `fetch` in `useEffect`", why: "Async errors are not caught unless you store them and rethrow during render." },
            { t: "An error in a `setTimeout` callback", why: "It runs later, outside React's render, so no boundary sees it." },
          ],
        }),
        mcq("react-data-hydration", {
          q: "A server-rendered page logs 'Hydration failed because the server rendered HTML didn't match the client'. Which is a typical cause?",
          why: "Rendering something that **differs between server and client on the first render** — most commonly `new Date().toLocaleString()` or `Math.random()` in render, or a branch on `typeof window !== \"undefined\"`, which is false on the server and true in the browser.\n\n**Hydration** means React attaching to server-produced HTML instead of creating it: it renders the tree again in the browser and expects exactly the same output, so it can reuse the existing DOM and just wire up event handlers. A mismatch means it cannot trust that DOM.\n\nOther causes: invalid HTML nesting such as a `<div>` inside a `<p>` (the browser repairs the markup, so the DOM no longer matches), and browser extensions that inject elements.\n\nThe fix is to make the first client render identical to the server's, then apply browser-only values in an effect after mount (or skip server rendering for that one component).",
          tip: "Define hydration in one sentence before naming the cause — it proves you know why the mismatch matters.",
          c: ["rendering", "effects"],
          d: 3,
          choices: [
            {
              t: "Rendering a timestamp or random value, or branching on `window`, so the first client render differs from the server's",
              ok: true,
              why: "Correct — the server and first client render must produce identical markup.",
            },
            {
              t: "Using `useState` in a server-rendered component",
              why: "State is fine; it is initialised identically on both sides.",
            },
            {
              t: "The API returned an error during the fetch",
              why: "That affects what you render, but not whether server and client agree.",
            },
            {
              t: "The page uses CSS modules",
              why: "Styling approach does not change the rendered element tree.",
            },
          ],
        }),
        short("react-data-rendering-modes", {
          q: "*\"Explain the difference between client-side rendering, server-side rendering and static site generation. When would you use each?\"*",
          why: "A standard front-end systems question. The interviewer wants the mechanism of each, the trade-off in one line, and a sensible default — not a framework sales pitch.",
          model:
            "With client-side rendering, the server sends a mostly empty HTML shell and a JavaScript bundle; the browser downloads and runs the JS, fetches data, and builds the page. It's simple to host and great for app-like screens behind a login, but the first meaningful paint waits on the JS, and crawlers that don't run JavaScript see very little.\n\nServer-side rendering generates the HTML for each request on the server, with the data already in it. The user sees content quickly and SEO is good, then the JavaScript loads and hydrates the page so it becomes interactive. The cost is a server doing work per request, and the page isn't interactive until hydration finishes.\n\nStatic site generation renders the HTML once at build time and serves it from a CDN. It's the fastest and cheapest to serve, but the content is only as fresh as the last build — frameworks soften that with incremental regeneration on a timer or on demand.\n\nI'd pick per page: SSG for marketing pages, docs and blog posts; SSR for public pages with per-request or frequently changing data where SEO matters, like product pages; and CSR for authenticated dashboards where SEO is irrelevant. Frameworks like Next.js let you mix these in one app.",
          points: [
            "CSR: empty shell + JS builds the page in the browser",
            "SSR: HTML generated per request, then hydrated",
            "SSG: HTML generated at build time, served from a CDN",
            "Trade-offs: first paint, SEO, server cost, freshness",
            "Choose per page; frameworks mix them",
          ],
          c: ["rendering", "performance", "deployment"],
          d: 2,
          secs: 120,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("react-state-arch", {
      title: "Context, Composition & State Architecture",
      level: 3,
      summary: "Where state should live, and why context is not a state manager.",
      keyIdeas: [
        "Put state in the closest common ancestor of everything that needs it; push it down when only one branch does.",
        "Try composition — pass the element as a prop or `children` — before reaching for context.",
        "Context is a transport, not a store: every consumer re-renders when the value changes.",
        "Memoise the provider value; an inline `{...}` object re-renders every consumer on every render.",
        "Context suits rarely-changing, widely-needed values (theme, user); not per-keystroke data.",
      ],
      brief: `**Where does state go?** Put it in the closest common ancestor of everything that needs it — "lifting state up". If only one branch uses it, push it back down. State that lives too high causes needless re-renders across the tree; state that lives too low gets duplicated and drifts.

**Prop drilling** is passing a prop through components that do not use it. Before reaching for context, try **composition** — pass the element itself:

\`\`\`jsx
// instead of threading \`user\` down three levels:
<Layout sidebar={<Profile user={user} />} />
\`\`\`

The intermediate components no longer need to know about \`user\` at all. This solves most drilling complaints with no new machinery.

**Context is a transport, not a store.** It broadcasts a value down the tree. Its cost: *every* consumer re-renders when the value changes, and if you pass an inline object (\`value={{user, setUser}}\`) that is a new reference every render, so consumers re-render even when nothing meaningful changed. Memoise the value, and split contexts so rarely-changing data (theme, current user) is not bundled with frequently-changing data.

Good context candidates: theme, authenticated user, locale, feature flags. Bad ones: high-frequency values like form input or scroll position.`,
      items: [
        mcq("react-ctx-rerender", {
          q: "Every consumer re-renders on every parent render. Why?",
          code: `<AuthContext.Provider value={{ user, login, logout }}>
  {children}
</AuthContext.Provider>`,
          lang: "jsx",
          why: "The object literal `{ user, login, logout }` is a **new reference on every render** of the provider. Context consumers re-render whenever the value changes by identity, so all of them re-render even if `user`, `login` and `logout` are unchanged.\n\nThe fix is to memoise:\n\n```js\nconst value = useMemo(() => ({ user, login, logout }), [user, login, logout]);\n```\n\nand ensure `login`/`logout` are themselves stable (`useCallback` or defined outside). This is the single most common context performance bug.",
          tip: "Same root cause as the infinite-effect question: a new object identity every render.",
          c: ["memoization", "rendering", "equality"],
          d: 3,
          choices: [
            {
              t: "The inline object is a new reference each render — memoise it with `useMemo`",
              ok: true,
              why: "Correct.",
            },
            { t: "Context always re-renders all consumers, unavoidably", why: "Only when the value's identity changes." },
            { t: "`children` changes identity every render", why: "`children` is not what consumers subscribe to." },
            { t: "The provider needs `React.memo`", why: "That does not stabilise the value object." },
          ],
        }),
        mcq("react-ctx-vs-redux", {
          q: "Is Context a replacement for a state management library?",
          why: "No — Context is a **dependency injection / transport** mechanism. It passes a value down the tree without prop drilling. It has no store, no reducers, no selectors, no middleware, and critically **no way for a consumer to subscribe to part of the value**: any change re-renders every consumer.\n\nA state library adds selector-based subscriptions (so a component only re-renders when the slice it reads changes), devtools, and structured update patterns. For a small app, Context plus `useReducer` is genuinely enough. For frequently-changing global state read by many components, the lack of selective subscription becomes a real performance problem — which is when Zustand or Redux Toolkit earns its place.",
          c: ["component-design", "rendering"],
          d: 3,
          choices: [
            {
              t: "No — it is a transport with no selective subscription; every consumer re-renders on any change",
              ok: true,
              why: "Correct, and that limitation is the deciding factor.",
            },
            { t: "Yes — Context replaced Redux entirely", why: "It solves drilling, not store management." },
            { t: "Yes, as long as you use `useReducer` with it", why: "That adds structure but not selective subscription." },
            { t: "No — Context cannot hold objects", why: "It can hold any value." },
          ],
        }),
        multi("react-ctx-good-fit", {
          q: "Which values are a good fit for Context?",
          why: "Good fits change **rarely** and are needed **widely**: theme, the authenticated user, locale, feature flags. The re-render-everything cost barely matters when the value changes once a session.\n\nBad fits change **frequently**: form field values, scroll or mouse position, or anything per-keystroke. Every change re-renders every consumer, so these belong in local state, a ref, or a store with selector subscriptions.",
          c: ["component-design", "rendering"],
          d: 2,
          choices: [
            { t: "The current theme (light/dark)", ok: true },
            { t: "The authenticated user", ok: true },
            { t: "Locale / i18n settings", ok: true },
            { t: "Feature flags", ok: true },
            { t: "The value of a text input as the user types", why: "Every keystroke would re-render every consumer." },
            { t: "Live scroll position", why: "High frequency — use a ref or a subscribing store." },
          ],
        }),
        mcq("react-ctx-composition", {
          q: "You are threading `user` through four components that do not use it. What is the first thing to try?",
          why: "**Composition.** Pass the rendered element down instead of the data:\n\n```jsx\n<Layout sidebar={<Profile user={user} />} />\n```\n\n`Layout` and everything between now know nothing about `user` — the element is created where the data already lives and passed as a prop (or as `children`). No new machinery, no re-render cost, and the coupling actually decreases.\n\nContext is the right answer when many components across *different* branches need the same value, but it is worth trying composition first because it is simpler and free.",
          tip: "Reaching straight for context is the common answer; naming composition first stands out.",
          c: ["component-design"],
          d: 3,
          choices: [
            {
              t: "Composition — pass the element as a prop or `children` so intermediates never see the data",
              ok: true,
              why: "Correct, and it is the cheapest fix.",
            },
            { t: "Context, immediately", why: "Works, but adds re-render coupling before it is needed." },
            { t: "Redux", why: "A large addition for a local structural problem." },
            { t: "A module-level global variable", why: "Invisible to React's render cycle — it will not update the UI." },
          ],
        }),
        mcq("react-ctx-usereducer", {
          q: "When is `useReducer` a better fit than several `useState` calls?",
          why: "When **several pieces of state change together according to named transitions**. A checkout with `status`, `items`, `error` and `discount`, where 'apply coupon' touches three of them at once, is clearer as `dispatch({ type: \"couponApplied\", code })` handled by one reducer than as three setters sprinkled through event handlers that must be kept consistent by hand.\n\nThe benefits: all the update logic lives in one **pure function** you can unit-test without rendering anything; impossible combinations are easier to prevent; and `dispatch` has a stable identity, so it can be passed down (often through Context) without breaking memoisation.\n\nFor a single independent value — a toggle, an input's text — `useState` is simpler and the right choice. Neither is faster; `useState` is in fact implemented on top of the same mechanism.",
          tip: "Say 'related state with named transitions' — then mention the reducer is testable in isolation.",
          c: ["component-design", "hooks-rules"],
          d: 2,
          choices: [
            {
              t: "When related values change together through well-defined transitions, and you want that logic in one testable function",
              ok: true,
              why: "Correct — centralised, pure update logic.",
            },
            {
              t: "Whenever performance matters, because reducers skip re-renders",
              why: "A dispatch that produces new state re-renders just like a setter.",
            },
            {
              t: "Only when using Redux",
              why: "`useReducer` is built into React and needs no library.",
            },
            {
              t: "When the state is a single boolean toggle",
              why: "That is the textbook case for `useState`.",
            },
          ],
        }),
        mcq("react-ctx-portal", {
          q: "A modal rendered through `createPortal(modal, document.body)` contains a button. Its click event bubbles to…",
          why: "**Its React parent**, not just its DOM parent. A portal moves where the element is placed **in the DOM** — typically `document.body`, so it escapes a parent's `overflow: hidden` or stacking context and z-index — but it stays in the same place **in the React tree**.\n\nSo events bubble through React ancestors as if the modal were rendered inline: an `onClick` on the component that opened the modal will see clicks inside it. Context flows the same way, so the modal can still read the theme or current user from providers above its React parent.\n\nThe bubbling behaviour occasionally surprises people — a click inside the modal triggering a 'click outside to close' handler on a React ancestor, for instance — and `event.stopPropagation()` in the modal is the usual fix.\n\nPortals are the standard tool for modals, tooltips, dropdown menus and toasts.",
          tip: "State both halves: DOM position changes, React tree position does not.",
          c: ["component-design", "rendering"],
          d: 3,
          choices: [
            {
              t: "React ancestors of the component that rendered the portal, even though the DOM node is in `body`",
              ok: true,
              why: "Correct — events and context follow the React tree.",
            },
            {
              t: "Only `document.body`, since that is its DOM parent",
              why: "React's synthetic events propagate along the React tree, which is the part that surprises people.",
            },
            {
              t: "Nowhere — portals stop event propagation",
              why: "Propagation continues through React ancestors unless you stop it.",
            },
            {
              t: "Both, so each handler fires twice",
              why: "Each handler fires once; the bubbling path simply follows the React tree.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("react-perf", {
      title: "Performance & Hooks Rules",
      level: 4,
      summary: "memo, useMemo, useCallback — and when they make things worse.",
      keyIdeas: [
        "Hooks are matched to state by call order — never call one inside a condition, loop, or after an early return.",
        "`React.memo` compares props shallowly; an inline arrow or object prop defeats it completely.",
        "`useMemo` caches a value, `useCallback` a function reference — they cost a comparison and retained memory.",
        "Profile first. Virtualise long lists, lift expensive work, then memoise the measured hot path.",
        "StrictMode double-runs effects in development to expose missing cleanup — fix the cleanup, not StrictMode.",
      ],
      brief: `**Rules of Hooks**: call them at the top level of a component or another hook, unconditionally, in the same order every render. React matches hooks to their stored state **by call order**, so a hook inside an \`if\` shifts every subsequent slot and state silently attaches to the wrong hook. That is the whole reason for the rule.

**The memoisation trio:**

- \`React.memo(Component)\` — skip re-rendering when props are shallow-equal.
- \`useMemo(fn, deps)\` — cache a computed **value**.
- \`useCallback(fn, deps)\` — cache a **function reference** (it is \`useMemo\` for functions).

The trap: \`memo\` compares props shallowly, so passing an inline object or arrow function defeats it — a new reference every render means props are never equal. \`memo\` on a child whose parent passes \`onClick={() => ...}\` does nothing at all.

They are **not free**: each costs a dependency comparison, retains references (memory), and adds noise. React's own guidance is to fix the real cause first — usually re-rendering a huge subtree, an expensive calculation that should be lifted, or a list that should be virtualised.

**Profile before memoising.** The React DevTools Profiler tells you which components actually re-render and how long they take. Scattering \`useCallback\` everywhere without measuring is a recognised anti-pattern.`,
      items: [
        mcq("react-perf-memo-broken", {
          q: "`Row` is wrapped in `React.memo` but still re-renders on every parent render. Why?",
          code: `const Row = React.memo(function Row({ item, onSelect }) { /* ... */ });

// parent:
<Row item={item} onSelect={() => select(item.id)} />`,
          lang: "jsx",
          why: "`React.memo` does a **shallow comparison** of props. The inline arrow `() => select(item.id)` is a brand-new function reference on every parent render, so `onSelect` never compares equal and `memo` bails out every time.\n\nFix by stabilising the callback with `useCallback`, or by passing primitive data and letting the child construct the handler (`onSelect={select}` plus `onClick={() => onSelect(item.id)}` inside `Row`). The same trap applies to inline object and array props.\n\nThe broader lesson: `memo` is only effective if *every* prop is referentially stable.",
          tip: "Very common in code review. The reviewer's question is always 'is `memo` actually doing anything here?'",
          c: ["memoization", "equality", "rendering"],
          d: 3,
          choices: [
            {
              t: "The inline arrow is a new reference each render, so the shallow prop comparison always fails",
              ok: true,
              why: "Correct — stabilise it with `useCallback`.",
            },
            { t: "`React.memo` does not work on function components", why: "That is exactly what it is for." },
            { t: "`item` is an object, and `memo` cannot compare objects", why: "It compares by reference, which is fine for a stable `item`." },
            { t: "`memo` only works with class components", why: "`PureComponent` is the class equivalent; `memo` is for functions." },
          ],
        }),
        mcq("react-perf-hooks-rule", {
          q: "Why can't a hook be called inside a condition?",
          code: `function Profile({ id }) {
  if (!id) return null;
  const [user, setUser] = useState(null);  // ✗
}`,
          lang: "jsx",
          why: "React stores hook state in an ordered list per component and matches each call to its slot **by position**. It does not know hook *names*. If a hook is skipped on some renders, every subsequent hook shifts by one — so a `useState` starts reading the slot belonging to a `useEffect`, and state silently attaches to the wrong hook.\n\nThe fix is to call hooks unconditionally and put the condition *inside*:\n\n```js\nconst [user, setUser] = useState(null);\nif (!id) return null;\n```\n\nThis is also why the early `return null` must come after all hooks, and why the `eslint-plugin-react-hooks` rule is worth treating as an error rather than a warning.",
          c: ["hooks-rules"],
          d: 2,
          choices: [
            {
              t: "React matches hooks to state by call order, so skipping one misaligns all the rest",
              ok: true,
              why: "Correct — order is the identity.",
            },
            { t: "Hooks are asynchronous and conditions break the await", why: "Hooks are synchronous." },
            { t: "It is only a style convention with no runtime effect", why: "It genuinely corrupts state." },
            { t: "Conditions are fine as long as the condition never changes", why: "The rule is unconditional for good reason." },
          ],
        }),
        multi("react-perf-when-memo", {
          q: "When is reaching for `useMemo` / `useCallback` actually justified?",
          why: "Justified when: the value is passed to a `memo`-ised child or used as an effect dependency and must be referentially stable; the computation is genuinely expensive (measured, not assumed); or a large list would otherwise re-render on every parent update.\n\nNot justified: wrapping every function 'just in case', memoising cheap arithmetic or a short string concatenation, or using it as a substitute for profiling. Each one costs a dependency array comparison plus retained memory, and the React team explicitly warns against blanket application. The honest answer includes 'I profile first'.",
          c: ["memoization", "performance"],
          d: 3,
          choices: [
            { t: "The value is a dependency of a `memo`-ised child and must stay referentially stable", ok: true },
            { t: "The value is used in a `useEffect` dependency array and would otherwise loop", ok: true },
            { t: "The computation is measurably expensive on a large dataset", ok: true },
            { t: "Wrapping every callback by default, for consistency", why: "Adds cost and noise with no measured benefit." },
            { t: "Memoising `a + b`", why: "The comparison costs more than the addition." },
            { t: "As a substitute for profiling the actual bottleneck", why: "That is the anti-pattern the guidance warns about." },
          ],
        }),
        tf("react-perf-strictmode", {
          q: "In development, React StrictMode intentionally runs your effects twice on mount.",
          answer: true,
          why: "True, since React 18. StrictMode mounts, unmounts and remounts each component in development, running effect setup → cleanup → setup. It is deliberately surfacing effects that are **not resilient to being re-run** — usually a missing cleanup.\n\nIf your effect breaks under double-invocation (duplicate subscriptions, two requests, a doubled counter), that is a real bug that would also appear with Fast Refresh or future concurrent features. The fix is proper cleanup, **not** disabling StrictMode. This only happens in development; production mounts once.",
          tip: "'My API is called twice in dev' is a frequent confusion — knowing the cause and that the fix is cleanup is a good signal.",
          c: ["effects", "hooks-rules"],
          d: 3,
        }),
        short("react-perf-explain-slow", {
          q: "*\"A table with 5,000 rows is janky when the user types in the filter box. Walk me through fixing it.\"*",
          why: "A realistic performance scenario with several valid layers of fix. Interviewers want to see you diagnose before prescribing, and pick the fix with the biggest effect first.",
          model:
            "First I'd confirm where the time goes with the React Profiler — is it re-rendering 5,000 rows on each keystroke, or is the filtering computation itself slow? Those need different fixes and I don't want to guess.\n\nUsually it's the render. The highest-leverage fix is **virtualisation** — react-window or TanStack Virtual — so only the ~30 visible rows are in the DOM. That's typically an order-of-magnitude improvement and it makes the other fixes mostly unnecessary.\n\nBeyond that: I'd debounce the filter input so we filter on a pause rather than every keystroke, keeping the input itself controlled and responsive. If the filter computation is genuinely expensive I'd wrap it in `useMemo` keyed on the query and the data. And I'd memoise the row component with `React.memo`, making sure the props are referentially stable — an inline arrow handler would defeat it entirely, which is a mistake I'd check for specifically.\n\nIf it's still janky, `useDeferredValue` lets the input update at full priority while the list catches up. And at 5,000 rows I'd also ask whether the server should be paginating or filtering instead — shipping the whole table to the client may be the real problem.\n\nThen I'd re-profile to confirm the number moved.",
          points: [
            "Profile first — re-render cost vs computation cost",
            "Virtualisation is the biggest lever for long lists",
            "Debounce the filter; keep the input responsive",
            "useMemo the expensive filter; memo the row with stable props",
            "useDeferredValue to keep typing at high priority",
            "Question whether the server should paginate at all",
            "Re-measure to confirm",
          ],
          c: ["performance", "memoization", "rendering"],
          d: 3,
          secs: 170,
        }),
        mcq("react-perf-lazy", {
          q: "What does `const Reports = React.lazy(() => import(\"./Reports\"))` achieve?",
          why: "**Code splitting.** The dynamic `import()` tells the bundler to put `Reports` and its dependencies in a **separate chunk**. That chunk is not downloaded with the main bundle; it is fetched the first time `<Reports />` actually renders, so users who never open the reports page never pay for it.\n\nWhile the chunk loads, the component suspends, so it must sit inside a **`<Suspense fallback={<Spinner />}>`** boundary, which renders the fallback until the code arrives. `React.lazy` expects the module's **default export** to be the component.\n\nRoute-level splitting is the usual starting point — each page its own chunk — followed by heavy, rarely-used components such as charts, editors or maps. Splitting tiny components gains nothing and adds network requests.\n\nIf the chunk fails to load (for example, after a redeploy removed old files), the error is thrown during render, so an error boundary should sit around it too.",
          tip: "Pair it with 'split by route first' — it shows you apply it with judgement.",
          c: ["performance", "rendering", "tooling"],
          d: 2,
          choices: [
            {
              t: "`Reports` is split into its own bundle chunk, downloaded on first render, with a `Suspense` fallback shown meanwhile",
              ok: true,
              why: "Correct — smaller initial bundle, deferred loading.",
            },
            {
              t: "`Reports` renders lazily in idle time, but its code is still in the main bundle",
              why: "The dynamic `import()` is what moves it into a separate chunk.",
            },
            {
              t: "It memoises `Reports` so it never re-renders",
              why: "That is `React.memo`.",
            },
            {
              t: "It renders `Reports` on the server only",
              why: "It is a client-side loading mechanism, unrelated to server components.",
            },
          ],
        }),
      ],
    }),
  ],
});
