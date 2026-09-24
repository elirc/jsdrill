// ─────────────────────────────────────────────────────────────
// Concept registry — the cross-cutting tags that connect items
// across tracks. "Closures" shows up in JavaScript and in React
// hooks; "N+1" shows up in EF Core and in SQL. The dashboard
// scores strength per concept, so weak spots surface by idea
// rather than by technology.
//
// Any slug used by an item but missing here is still created by
// the seeder with a title-cased name — this file just gives the
// good ones a proper description.
// ─────────────────────────────────────────────────────────────

export type ConceptDef = {
  slug: string;
  name: string;
  description: string;
  explanation: string;
};

export const CONCEPTS: ConceptDef[] = [
  // ── Language semantics ──
  {
    slug: "coercion",
    name: "Type Coercion",
    description: "How a language silently converts between types.",
    explanation:
      "JavaScript converts operands to a common type before comparing or combining them. `==` coerces, `===` does not. Knowing the coercion table for `+`, `==` and truthiness is the difference between confidently reading unfamiliar code and guessing.",
  },
  {
    slug: "value-vs-reference",
    name: "Value vs Reference",
    description: "Whether assignment copies the data or a pointer to it.",
    explanation:
      "Primitives copy their value; objects copy a reference. In C# the same split exists between `struct` and `class`. Most 'why did my other variable change?' bugs are this concept in disguise.",
  },
  {
    slug: "scope",
    name: "Scope & Hoisting",
    description: "Where a name is visible and when it becomes usable.",
    explanation:
      "`var` is function-scoped and hoisted as `undefined`; `let`/`const` are block-scoped and sit in a temporal dead zone until initialised. Scope is also the machinery closures are built on.",
  },
  {
    slug: "closures",
    name: "Closures",
    description: "A function keeping hold of the scope it was created in.",
    explanation:
      "A closure is a function plus the variables it captured. It powers module privacy, event handlers, memoisation — and the stale-value bugs in React effects that capture an old render's state.",
  },
  {
    slug: "this-binding",
    name: "`this` Binding",
    description: "What `this` refers to, decided at call time.",
    explanation:
      "In JavaScript `this` is set by how a function is *called*, not where it is defined — except for arrow functions, which capture `this` lexically. This is why extracted methods lose their receiver.",
  },
  {
    slug: "prototypes",
    name: "Prototypes",
    description: "JavaScript's inheritance chain.",
    explanation:
      "Every object has a hidden link to a prototype object; property lookups walk that chain. `class` is syntax over this, not a separate system.",
  },
  {
    slug: "immutability",
    name: "Immutability",
    description: "Producing new values instead of mutating existing ones.",
    explanation:
      "React's rendering, Redux-style reducers and change detection all rely on identity comparison. Mutating in place keeps the same reference, so the framework concludes nothing changed.",
  },
  {
    slug: "equality",
    name: "Equality & Identity",
    description: "Reference equality vs structural equality.",
    explanation:
      "`{} === {}` is false: two structurally identical objects are different references. React's `memo`, dependency arrays and `.NET`'s default `Equals` all lean on this distinction.",
  },

  // ── Async ──
  {
    slug: "event-loop",
    name: "Event Loop",
    description: "How single-threaded JavaScript interleaves work.",
    explanation:
      "The call stack runs to completion, then microtasks (promises) drain, then one macrotask (timers, I/O) runs. This ordering explains almost every 'why did this log in that order?' question.",
  },
  {
    slug: "promises",
    name: "Promises",
    description: "Values that arrive later, and their state machine.",
    explanation:
      "A promise is pending, then fulfilled or rejected — once, permanently. `async`/`await` is syntax over the same object; a forgotten `await` yields a promise where you expected a value.",
  },
  {
    slug: "async-await",
    name: "async / await",
    description: "Writing asynchronous flow as if it were sequential.",
    explanation:
      "`await` suspends the function and returns control to the caller. In C#, `await` also captures a synchronisation context by default — the source of classic deadlocks when mixed with `.Result`.",
  },
  {
    slug: "concurrency",
    name: "Concurrency",
    description: "Doing several things at once — correctly.",
    explanation:
      "Sequential awaits in a loop serialise your I/O. `Promise.all` / `Task.WhenAll` overlap it. Knowing when to parallelise, and when shared state makes that unsafe, is a mid-level signal.",
  },
  {
    slug: "error-handling",
    name: "Error Handling",
    description: "Failing loudly, in the right place, with the right shape.",
    explanation:
      "Catch where you can add information or recover; otherwise let it bubble to a boundary that logs and shapes the response. Swallowed exceptions are the most expensive habit in a codebase.",
  },

  // ── Types ──
  {
    slug: "static-types",
    name: "Static Typing",
    description: "Errors caught before the program runs.",
    explanation:
      "TypeScript's types are erased at build time — they constrain your source, not your runtime. Data crossing a boundary (an API response, `JSON.parse`) is only typed because you asserted it was.",
  },
  {
    slug: "structural-typing",
    name: "Structural Typing",
    description: "Compatibility by shape, not by declared name.",
    explanation:
      "TypeScript accepts any value with the right members; C# requires an explicit `: IFoo`. This is why a TS object literal can satisfy an interface it has never heard of.",
  },
  {
    slug: "generics",
    name: "Generics",
    description: "Code parameterised by type.",
    explanation:
      "Generics preserve the relationship between input and output types instead of collapsing to `any`/`object`. The tell of a shaky answer is describing them as 'reusable code' without mentioning type preservation.",
  },
  {
    slug: "narrowing",
    name: "Narrowing",
    description: "Proving to the compiler which member of a union you have.",
    explanation:
      "`typeof`, `in`, `instanceof`, truthiness checks and discriminant properties all narrow a union. Discriminated unions are the idiomatic way to model 'one of these shapes'.",
  },
  {
    slug: "nullability",
    name: "Null Safety",
    description: "Making 'might be missing' visible in the type.",
    explanation:
      "`strictNullChecks` in TypeScript and nullable reference types in C# both move null from a runtime surprise to a compile-time conversation.",
  },
  {
    slug: "utility-types",
    name: "Utility Types",
    description: "Deriving types from other types.",
    explanation:
      "`Partial`, `Pick`, `Omit`, `Record`, `ReturnType` let one source of truth generate the rest. Hand-maintaining a parallel type is the thing they exist to prevent.",
  },

  // ── React ──
  {
    slug: "rendering",
    name: "Rendering & Re-renders",
    description: "What makes React run your component again.",
    explanation:
      "State change, a parent re-render, or a context value change. React then diffs the produced tree and commits the minimum DOM mutations.",
  },
  {
    slug: "hooks-rules",
    name: "Rules of Hooks",
    description: "Why hooks must be called unconditionally.",
    explanation:
      "React matches hooks to state slots by call order. A conditional hook shifts every subsequent slot, so state silently belongs to the wrong hook.",
  },
  {
    slug: "effects",
    name: "Effects & Dependencies",
    description: "Synchronising with systems outside React.",
    explanation:
      "`useEffect` runs after commit and re-runs when a dependency changes by `Object.is`. Most effect bugs are a missing dependency (stale closure) or an unstable one (infinite loop).",
  },
  {
    slug: "keys",
    name: "Keys & Reconciliation",
    description: "How React matches elements between renders.",
    explanation:
      "Keys identify list children across renders. Index keys break as soon as the list reorders or has items removed, because state follows the key, not the data.",
  },
  {
    slug: "controlled-inputs",
    name: "Controlled Inputs",
    description: "React state as the single source of truth for a form.",
    explanation:
      "A controlled input takes `value` plus `onChange`. Passing `value` without `onChange` freezes the field — a classic first-week React bug.",
  },
  {
    slug: "memoization",
    name: "Memoisation",
    description: "Trading memory for skipped work.",
    explanation:
      "`memo`, `useMemo` and `useCallback` skip work when inputs are referentially unchanged. They are not free — they cost a comparison and retain references, so measure before scattering them.",
  },
  {
    slug: "server-state",
    name: "Server State",
    description: "Cached remote data, which is not the same as UI state.",
    explanation:
      "Server state is shared, asynchronous and can go stale underneath you. Modelling it with plain `useState` means reimplementing caching, deduping, retries and invalidation by hand.",
  },
  {
    slug: "component-design",
    name: "Component Design",
    description: "Where to draw component and state boundaries.",
    explanation:
      "Lift state to the closest common owner; push it down when only one branch needs it. Composition — passing `children` — solves most prop-drilling before context is warranted.",
  },

  // ── Backend / platform ──
  {
    slug: "middleware",
    name: "Middleware Pipeline",
    description: "Composable functions wrapping a request.",
    explanation:
      "Each middleware may act before and after the rest of the pipeline, and may short-circuit it. Order is behaviour: authentication before authorisation, CORS before both.",
  },
  {
    slug: "dependency-injection",
    name: "Dependency Injection",
    description: "Handing a class its collaborators instead of letting it build them.",
    explanation:
      "DI decouples construction from use, which is what makes code testable. In ASP.NET Core the container also owns lifetime: singleton, scoped, or transient.",
  },
  {
    slug: "service-lifetimes",
    name: "Service Lifetimes",
    description: "How long an injected instance lives.",
    explanation:
      "Transient per resolution, scoped per request, singleton per app. Injecting a scoped `DbContext` into a singleton is the captive-dependency bug that this concept exists to prevent.",
  },
  {
    slug: "rest",
    name: "REST API Design",
    description: "Resources, verbs and status codes used as intended.",
    explanation:
      "Nouns in paths, verbs in the method, state in the status code. `POST /getUser` and a `200 OK` carrying `{\"error\": …}` are the two tells that someone has only ever consumed APIs.",
  },
  {
    slug: "http-semantics",
    name: "HTTP Semantics",
    description: "Status codes, methods, idempotency and caching.",
    explanation:
      "`GET` is safe and idempotent, `PUT`/`DELETE` are idempotent, `POST` is neither. 401 means 'who are you?', 403 means 'I know, and no'.",
  },
  {
    slug: "cors",
    name: "CORS",
    description: "The browser's cross-origin gate.",
    explanation:
      "CORS is enforced by the browser, not the server, and only for browser-initiated cross-origin requests. It is a relaxation mechanism, never a security boundary.",
  },
  {
    slug: "auth",
    name: "Authentication & Authorisation",
    description: "Proving identity, then checking permission.",
    explanation:
      "Authentication establishes who the caller is; authorisation decides what they may do. Cookies and bearer tokens are transport choices, with different CSRF and XSS exposure.",
  },
  {
    slug: "validation",
    name: "Validation",
    description: "Refusing bad input at the boundary.",
    explanation:
      "Client validation is UX; server validation is correctness. Anything reachable over the network must assume the client is hostile or simply out of date.",
  },
  {
    slug: "security",
    name: "Web Security",
    description: "The vulnerability classes you are expected to name.",
    explanation:
      "XSS (untrusted data rendered as markup), CSRF (the browser attaching credentials to a forged request), injection (data parsed as code) and secret handling cover most interview ground.",
  },
  {
    slug: "config",
    name: "Configuration & Environments",
    description: "Same build, different settings.",
    explanation:
      "Config comes from the environment, secrets never from the repo. In ASP.NET Core, later providers override earlier ones and environment variables beat `appsettings.json`.",
  },
  {
    slug: "logging",
    name: "Logging & Observability",
    description: "Being able to answer 'what happened in production?'.",
    explanation:
      "Structured logs with correlation ids beat string interpolation. Log at boundaries, include the identifiers you would need to search by, and never log secrets or full payloads.",
  },

  // ── Data ──
  {
    slug: "sql-basics",
    name: "SQL Querying",
    description: "Filtering, shaping and aggregating rows.",
    explanation:
      "SQL is declarative and set-based. `WHERE` filters rows before grouping, `HAVING` filters groups after — the single most common SQL interview clarification.",
  },
  {
    slug: "joins",
    name: "Joins",
    description: "Combining rows across tables.",
    explanation:
      "`INNER` keeps matches only; `LEFT` keeps every left row and nulls the right. Filtering a left-joined table in `WHERE` instead of `ON` quietly turns it back into an inner join.",
  },
  {
    slug: "schema-design",
    name: "Schema Design",
    description: "Keys, relationships and normalisation.",
    explanation:
      "Primary keys identify, foreign keys enforce relationships, and normalisation removes duplicated facts. Denormalise deliberately, for a measured read path — never by accident.",
  },
  {
    slug: "transactions",
    name: "Transactions",
    description: "All-or-nothing units of work.",
    explanation:
      "ACID: atomic, consistent, isolated, durable. Isolation levels trade correctness anomalies (dirty, non-repeatable, phantom reads) against concurrency.",
  },
  {
    slug: "indexing",
    name: "Indexes",
    description: "The main lever on query performance.",
    explanation:
      "An index is a sorted structure that turns a scan into a seek. It costs write throughput and storage, and is skipped entirely when you wrap the indexed column in a function.",
  },
  {
    slug: "orm",
    name: "ORMs & EF Core",
    description: "Mapping objects to rows, and the leaks in that abstraction.",
    explanation:
      "EF Core tracks entities, translates LINQ to SQL and batches changes on `SaveChanges`. The leaks worth knowing: deferred execution, change tracking overhead, and client-side evaluation.",
  },
  {
    slug: "n-plus-one",
    name: "N+1 Queries",
    description: "One query for the list, then one per row.",
    explanation:
      "Lazy loading inside a loop turns a single request into hundreds of round trips. Fix it by eager loading (`Include`) or projecting exactly what you need in one query.",
  },

  // ── Craft ──
  {
    slug: "testing",
    name: "Testing Strategy",
    description: "What to test, and at which level.",
    explanation:
      "Many fast unit tests, fewer integration tests, a handful of end-to-end tests. Test observable behaviour; tests coupled to implementation break on every refactor.",
  },
  {
    slug: "mocking",
    name: "Test Doubles",
    description: "Standing in for real collaborators.",
    explanation:
      "Mock what is slow, non-deterministic or out of your control. Mocking the thing under test, or asserting on every internal call, produces tests that only verify the code still exists.",
  },
  {
    slug: "git",
    name: "Git",
    description: "The version control workflow you will use daily.",
    explanation:
      "Commits are snapshots, branches are movable pointers. Merge preserves history, rebase rewrites it — and rewriting shared history is the one genuinely destructive habit.",
  },
  {
    slug: "tooling",
    name: "Build Tooling",
    description: "How source becomes something a browser or server runs.",
    explanation:
      "Transpiling, bundling, tree-shaking and minification. Knowing what your build actually emits is what lets you debug 'works locally, breaks in prod'.",
  },
  {
    slug: "packages",
    name: "Dependencies & Versioning",
    description: "Semver, lockfiles and dependency hygiene.",
    explanation:
      "Semver signals intent: major breaks, minor adds, patch fixes. The lockfile is what makes an install reproducible — commit it for applications.",
  },
  {
    slug: "performance",
    name: "Performance",
    description: "Measuring first, then fixing the actual bottleneck.",
    explanation:
      "Most application slowness is I/O and round trips, not CPU. Profile, find the dominant cost, and be able to say what you traded away.",
  },
  {
    slug: "memory",
    name: "Memory & Leaks",
    description: "What keeps an object alive longer than you meant.",
    explanation:
      "Unremoved listeners, live timers, growing caches and captured closures. In both runtimes, a leak is almost always a reference you forgot you were still holding.",
  },
  {
    slug: "oop",
    name: "OOP & Interfaces",
    description: "Encapsulation, polymorphism and programming to an abstraction.",
    explanation:
      "Interfaces describe capability without implementation, which is what makes substitution and testing possible. Favour composition over deep inheritance hierarchies.",
  },
  {
    slug: "linq",
    name: "LINQ",
    description: "Declarative querying over collections in C#.",
    explanation:
      "LINQ is lazy: nothing executes until enumeration. Over `IQueryable` it becomes SQL; over `IEnumerable` it runs in memory — and mixing the two silently pulls the table into your process.",
  },
  {
    slug: "collections",
    name: "Collections",
    description: "Choosing the right container.",
    explanation:
      "`List` for ordered access, `Dictionary`/`Map` for keyed lookup, `HashSet`/`Set` for membership. Picking the wrong one turns an O(1) lookup into an O(n) scan inside a loop.",
  },
  {
    slug: "disposal",
    name: "Resource Disposal",
    description: "Releasing what the garbage collector will not.",
    explanation:
      "`IDisposable` plus `using` deterministically releases file handles, sockets and connections. The GC handles memory; it does not handle everything else.",
  },
  {
    slug: "modules",
    name: "Modules",
    description: "How files import each other.",
    explanation:
      "ES modules are static and hoisted, which enables tree-shaking; CommonJS `require` is dynamic and runtime. Interop between them is behind a large share of Node configuration pain.",
  },
  {
    slug: "runtime",
    name: "Runtime & Hosting",
    description: "Where your code actually runs.",
    explanation:
      "Node is a single-threaded event loop with a worker pool for I/O; ASP.NET Core uses a thread pool. Blocking the wrong thread stalls every other request the process is serving.",
  },
  {
    slug: "deployment",
    name: "Deployment & CI/CD",
    description: "Getting a build into production repeatably.",
    explanation:
      "Build once, promote the same artefact through environments, and keep deploys reversible. If the fix for a bad release is 'roll forward and hope', the pipeline is not finished.",
  },

  {
    slug: "functions",
    name: "Functions as Values",
    description: "Higher-order functions, callbacks, currying and binding.",
    explanation:
      "In JavaScript a function is a value: it can be passed, returned and stored. That single fact is behind callbacks, higher-order array methods, currying, `bind`, and most of what makes the language feel different from C#. The trap is `this`, which arrows capture and regular functions resolve at call time.",
  },
  {
    slug: "dom-events",
    name: "DOM & Events",
    description: "How the browser dispatches events and lets you intercept them.",
    explanation:
      "An event travels down from `window` to the target (capture) and back up (bubble). Delegation attaches one listener to an ancestor and inspects `event.target`, which is cheaper than one listener per element and survives re-rendering. `preventDefault` stops the default action; `stopPropagation` stops the travel.",
  },
  {
    slug: "storage",
    name: "Browser Storage",
    description: "Cookies vs localStorage vs sessionStorage, and what each is for.",
    explanation:
      "Cookies are small, sent with every matching request and the only option the server can set; `localStorage` persists per origin and is readable by any script on the page; `sessionStorage` is per tab. None of them is a safe place for a secret.",
  },
  {
    slug: "iteration",
    name: "Iteration Protocols",
    description: "Iterables, iterators and generators.",
    explanation:
      "Anything with a `[Symbol.iterator]` method works with `for…of`, spread and destructuring. Generators (`function*`) build iterators lazily with `yield`, which is how you produce a sequence without materialising it — and, in C#, exactly what `yield return` does.",
  },
  {
    slug: "clr",
    name: "The CLR & Managed Code",
    description: "What the .NET runtime does for you — and what it doesn't.",
    explanation:
      "C# compiles to IL; the CLR JIT-compiles it, manages memory with a generational garbage collector, enforces type safety and runs finalizers on its own schedule. Managed code lives inside those guarantees; unmanaged resources (handles, sockets) still need deterministic disposal.",
  },
  {
    slug: "delegates",
    name: "Delegates & Events",
    description: "Type-safe function references and the publish/subscribe layer over them.",
    explanation:
      "A delegate is a type describing a method signature; an instance references one or more methods. `event` restricts outsiders to subscribe/unsubscribe, which is the Observer pattern built into the language. Forgotten unsubscriptions are the classic managed-memory leak.",
  },
  {
    slug: "solid",
    name: "SOLID",
    description: "Five design principles, each named after the smell it prevents.",
    explanation:
      "Single responsibility, open/closed, Liskov substitution, interface segregation, dependency inversion. Interviewers rarely want the definitions — they want a concrete change that each principle would have made painless, and the honesty to say when applying one is overkill.",
  },
  {
    slug: "design-patterns",
    name: "Design Patterns",
    description: "Named solutions, and the judgement of when not to use them.",
    explanation:
      "Factory, Strategy, Singleton, Repository, Observer — vocabulary for shapes that recur. The senior skill is recognising when the framework already provides one (EF Core's DbContext is a unit of work; C# events are Observer) and resisting patterns that add indirection without removing a real problem.",
  },
  {
    slug: "reflection",
    name: "Reflection & Late Binding",
    description: "Inspecting and invoking types at runtime.",
    explanation:
      "Reflection reads metadata and calls members by name at runtime; `dynamic` defers binding to runtime too. Both are slower and lose compile-time checking, so they belong in frameworks, serialisers and interop — not in everyday application code.",
  },
];

export const CONCEPT_BY_SLUG = new Map(CONCEPTS.map((c) => [c.slug, c]));
