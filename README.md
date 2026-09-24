# Reps

**Spaced-repetition interview drills for full-stack developers.**
Beginner → mid-level CRUD developer, across JavaScript, TypeScript, React, Node, C#, .NET, SQL and the web.

Not algorithm puzzles. The questions are the ones actually asked in screens and technical interviews: why your effect loops forever, what a scoped service does inside a singleton, which status code that endpoint should return, and how you'd find an N+1 query.

```bash
npm install
npm run db:seed
npm run dev          # http://localhost:3000
```

---

## What it is

384 questions across 55 modules and 10 tracks, each with a teaching explanation and a note on why an interviewer asks it. FSRS spaced repetition schedules each one for the moment you're about to forget it.

Every module carries 4–6 **key ideas** — the things you'd want in your head before the first question. You read them before you first drill the module, and they're collected on a **Cheat Sheet** page for a pre-interview skim.

Multiple choice, predict-output and fill-the-blank give you **one retry** after a miss before the answer is revealed. Getting it on the second try counts as partial credit and schedules the question to come back soon — a near-miss is worth more than a peek, and less than knowing it.

**Eight question types**, because recognition and recall are different skills:

| Kind | What you do |
|---|---|
| Multiple choice | Pick the one right answer |
| Select all | Pick every answer that applies (partial credit) |
| True / false | Snap judgement on a claim |
| Predict output | Read the code, call the result |
| Fill the blank | Complete a snippet from memory |
| Put in order | Sequence the steps (a request lifecycle, a deploy) |
| Write code | Implement it and pass real tests, in-browser |
| Explain it | Say it out loud, compare to a model answer, self-grade |

## The tracks

| Track | Covers |
|---|---|
| **JavaScript** | Coercion, scope, closures, functions & binding, the DOM and events, `this`, prototypes, the event loop, memory |
| **TypeScript** | `type` vs `interface`, narrowing, generics, utility types, `strict` |
| **React** | State, effects and dependencies, keys, forms, data fetching, context, memoisation |
| **Node & Express** | The runtime, middleware pipeline, REST APIs, auth, production concerns |
| **C#** | The CLR & memory, value vs reference, OOP, delegates & events, LINQ, `async`/`await`, records, SOLID & patterns |
| **ASP.NET Core & EF Core** | DI and lifetimes, the pipeline, controllers, EF querying and migrations, config |
| **Databases & SQL** | Querying, joins, schema design, transactions, indexes |
| **Web & HTTP** | Methods and status codes, REST design, cookies, CORS, security |
| **Testing** | What to test and where, Jest/Vitest, xUnit, React Testing Library |
| **Git, Build & Deploy** | Day-to-day Git, PRs, semver and lockfiles, CI/CD, migrations |

## The four levels

Levels unlock per track as you demonstrate **retention**, not as you click through.

1. **Fundamentals** — language basics and the vocabulary you're expected to already have
2. **Working Dev** — day-to-day mechanics: async, state, HTTP, the framework's own rules
3. **CRUD Builder** — shipping a real app: data access, forms, auth, validation, errors
4. **Production-Ready** — the mid-level bar: performance, security, testing, deploys, trade-offs

## The app

| Route | What it does |
|---|---|
| `/app` | Today — daily goal, streak, what's due, session length |
| `/app/drill` | The drill runner for every question type |
| `/app/path` | The roadmap: tracks × levels, mastery per track |
| `/app/path/[track]` | Module list with teaching briefs; drill one module at a time |
| `/app/path/[track]/[module]` | Module page: key ideas, the brief at reading width, the module's questions and their status |
| `/app/cheatsheet` | Every module's key ideas on one page, filterable by track, with a "only what's not yet solid" toggle |
| `/app/interview` | Mock interview — rapid-fire across all tracks, then a scorecard |
| `/app/dashboard` | Mastery by track, weakest concepts, review forecast, activity map |
| `/app/concepts` | Concept library — strength scored by idea, not by technology |

**Concepts cut across tracks.** Closures show up in JavaScript and in React hooks; N+1 shows up in EF Core and in SQL. Scoring by concept means a weak spot surfaces as *"you don't understand reference equality"* rather than *"you got three React questions wrong"*.

## How scheduling works

Each answer produces an FSRS rating from how you actually did — correctness first, then partial credit and speed as tie-breakers. `Explain it` items are self-rated, since only you know whether you'd have satisfied an interviewer.

- Wrong → **Again**, back within the day
- Right on the second try → **Hard** with half credit
- Right but slow, or partial credit → **Hard**
- Right at a normal pace → **Good**
- Fast, confident, not a first exposure → **Easy**

A session is 60% overdue reviews and 40% new material, interleaved so consecutive questions rarely come from the same track — interleaving is what makes retrieval effortful, and effortful retrieval is what sticks.

## Tech

- **Next.js** (App Router) + **React 19** + **TypeScript**
- **SQLite** via `better-sqlite3` with **Drizzle ORM** — local-first, no account, no server
- **ts-fsrs** for scheduling
- **CodeMirror** for the in-browser editor, lazy-loaded only for `code` items
- Tailwind v4 with CSS custom properties; dark and light themes

## Layout

```
src/
  content/            The curriculum — the source of truth
    builder.ts        Authoring DSL (mcq, multi, tf, out, blank, order, code, short)
    concepts.ts       Cross-cutting concept registry
    tracks/*.ts       One file per track
  lib/
    grader.ts         Pure grading for all eight kinds
    executor.ts       Runs `code` items in-browser, with an optional test harness
    fsrs.ts           Rating derivation and scheduling
    sessionBuilder.ts Review/new mix, interleaving, interview selection
    progress.ts       Mastery, streaks, concept strength, dashboard
    db/               Drizzle schema + seeder
  app/                Pages and API routes
  components/         UI, code rendering, per-kind answer components
scripts/
  check-content.ts    Curriculum integrity check
```

## Adding content

Content is typed data, not JSON. Add to any file in `src/content/tracks/`:

```ts
mod("react-effects", {
  title: "Effects & Dependencies",
  level: 2,
  summary: "When effects run, what belongs in deps, and how cleanup works.",
  brief: `Effects synchronise your component with something outside React…`,
  keyIdeas: [
    "An effect runs *after* paint, not during render.",
    "The dependency array lists the values the effect reads.",
    "Cleanup runs before every re-run and on unmount.",
    "An object or function in deps is a new value every render.",
  ],
  items: [/* … */],
}),
```

`keyIdeas` is required: 4–6 terse bullets, one idea each. `content:check` enforces 3–7 of them and validates their inline markup (backticks, emphasis) the same way it does explanations.

```ts
mcq("react-eff-cleanup", {
  q: "When does an effect's cleanup function run?",
  code: `useEffect(() => {
  const id = setInterval(tick, 1000);
  return () => clearInterval(id);
}, [delay]);`,
  lang: "jsx",
  why: "Before every re-run *and* on unmount…",
  tip: "Interviewers ask this to see whether you'd leak a timer.",
  c: ["effects", "memory"],
  d: 2,
  choices: [
    { t: "Before each re-run and on unmount", ok: true, why: "Correct." },
    { t: "Only on unmount", why: "It also runs before each re-run." },
    // …
  ],
}),
```

Then:

```bash
npm run content:check   # validates it
npm run db:seed         # upserts — user progress is preserved
```

### What `content:check` catches

Things the type system can't:

- A `code` exercise whose own reference solution fails its tests
- A `code` exercise whose starter already passes (nothing to solve)
- Test data JSON can't store — a function input would silently become `null`
- A `fill-blank` whose own accepted answer would be marked wrong
- An `order` item whose authored sequence doesn't grade as correct
- An `mcq` with zero or several correct choices; a `multi` where everything is correct
- Modules with fewer than 3 or more than 7 key ideas
- Doubled, unbalanced or nested backticks that render as garbled prose
- Explanations too short to teach anything; concepts with no registry entry

## Commands

```bash
npm run dev             # development server
npm run build           # production build
npm run check           # typecheck + lint + content validation
npm run content:check   # curriculum integrity only
npm run db:seed         # upsert content, keep progress
npm run db:reset        # delete the database and start over
```

Your progress lives in `reps.db` in the project root. It never leaves your machine.
