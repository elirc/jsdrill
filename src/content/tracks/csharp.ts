import { defineTrack, mod, mcq, multi, out, blank, short } from "../builder";

export default defineTrack({
  slug: "csharp",
  name: "C#",
  tagline: "The typed, compiled half of the stack",
  description:
    "Value vs reference types, interfaces, collections, LINQ, async/await and modern C# — the language questions asked in every .NET interview.",
  icon: "C#",
  color: "#a855f7",
  modules: [
    // ─────────────────────────────────────────────────────────
    mod("cs-types", {
      title: "Types, Value vs Reference",
      level: 1,
      summary: "The distinction behind half of all C# interview questions.",
      brief: `**Value types** (\`int\`, \`bool\`, \`double\`, \`char\`, \`decimal\`, \`enum\`, and any \`struct\`) hold their data directly. Assigning one **copies the value**. They live on the stack, or inline inside the object that contains them.

**Reference types** (\`class\`, \`interface\`, \`string\`, \`object\`, arrays, delegates) hold a reference to data on the heap. Assigning one copies the **reference**, so both variables point at the same object.

\`\`\`csharp
var a = new Point(1, 2);   // struct
var b = a;
b.X = 99;                   // a.X is still 1 — b is a copy

var p = new Person("Ada");  // class
var q = p;
q.Name = "Grace";           // p.Name is now "Grace" — same object
\`\`\`

**\`string\` is the confusing one**: it is a reference type but **immutable**, so it *behaves* like a value. Every "modification" allocates a new string — which is why concatenating in a loop should use \`StringBuilder\`.

**Nullability**: value types cannot be null unless you mark them \`int?\` (\`Nullable<int>\`). Reference types can always be null, which is why **nullable reference types** (\`string?\` with \`<Nullable>enable</Nullable>\`) exist — they move "might be null" into the type, exactly like TypeScript's \`strictNullChecks\`.

\`var\` is **not** dynamic typing — the compiler infers a single static type at compile time.`,
      items: [
        out("cs-types-struct-copy", {
          q: "What is printed?",
          code: `struct Point { public int X; }

var a = new Point { X = 1 };
var b = a;
b.X = 99;
Console.WriteLine(a.X);`,
          lang: "csharp",
          why: "**1.** `Point` is a `struct`, a value type, so `var b = a` copies the whole value. Mutating `b` cannot affect `a`.\n\nChange `struct` to `class` and it prints `99`, because the assignment would copy a reference to the same heap object. This single distinction underlies a large share of C# interview questions — and a class of real bugs where someone expects a struct in a `List<T>` to be mutable in place (it is not; the indexer returns a copy).",
          tip: "The follow-up: 'when would you actually define a struct?' — small, immutable, short-lived values.",
          c: ["value-vs-reference"],
          d: 2,
          choices: [
            { t: "`1`", ok: true, why: "Correct — struct assignment copies the value." },
            { t: "`99`", why: "That is the behaviour if `Point` were a `class`." },
            { t: "`0`", why: "`a.X` was initialised to 1." },
            { t: "It does not compile", why: "This is valid C#." },
          ],
        }),
        mcq("cs-types-string", {
          q: "`string` is a reference type. Why does it behave like a value type?",
          why: "Because it is **immutable**. Every operation that appears to modify a string — concatenation, `Replace`, `ToUpper` — returns a **new** string and leaves the original untouched. So passing a string around never lets anyone mutate your copy.\n\nThe practical consequence: building a string in a loop allocates a new object every iteration, which is quadratic in both time and garbage. Use `StringBuilder` for that.\n\nImmutability also enables **interning** — identical literals share one instance — and makes strings safe to use as dictionary keys and across threads without locking.",
          c: ["value-vs-reference", "memory"],
          d: 2,
          choices: [
            {
              t: "It is immutable — every 'change' returns a new string",
              ok: true,
              why: "Correct, and it is why loops need `StringBuilder`.",
            },
            { t: "The compiler treats `string` as a struct", why: "It is genuinely a class." },
            { t: "Strings are always copied when passed to a method", why: "The reference is passed; immutability makes it safe." },
            { t: "`string` is stored on the stack", why: "The contents live on the heap." },
          ],
        }),
        multi("cs-types-value", {
          q: "Which of these are **value** types in C#?",
          why: "Value types: all the numeric primitives (`int`, `double`, `decimal`), `bool`, `char`, `DateTime`, any `struct`, and `enum`. They copy on assignment and cannot be null unless made nullable with `?`.\n\nReference types: `class`, `interface`, `string`, `object`, arrays (**including `int[]`** — the array is a reference type even though its elements are values), and delegates.\n\n`record` is a reference type by default; `record struct` is the value-type variant. That one catches people out because records feel value-like thanks to their value-based equality.",
          c: ["value-vs-reference"],
          d: 2,
          choices: [
            { t: "`int`", ok: true },
            { t: "`DateTime`", ok: true },
            { t: "`bool`", ok: true },
            { t: "A user-defined `struct`", ok: true },
            { t: "`decimal`", ok: true },
            { t: "`int[]`", why: "Arrays are reference types, whatever their element type." },
            { t: "`string`", why: "A reference type — immutable, but still a class." },
            { t: "`record Person(string Name)`", why: "Reference type by default; `record struct` is the value version." },
          ],
        }),
        mcq("cs-types-nullable", {
          q: "What does enabling nullable reference types change?",
          code: `#nullable enable
string a = null;    // warning
string? b = null;   // fine`,
          lang: "csharp",
          why: "It makes 'might be null' part of the type. `string` now means *not null* and `string?` means *may be null*, and the compiler warns when you assign null to the former or dereference the latter without checking.\n\nCrucially these are **compile-time warnings**, not runtime enforcement — nothing stops null arriving from an older library, from reflection, or from deserialisation. It is the same bargain as TypeScript's `strictNullChecks`: the compiler catches the cases it can see, and boundaries still need real checks.\n\nBeing able to draw that TypeScript parallel is genuinely useful in a full-stack interview.",
          c: ["nullability", "static-types"],
          d: 2,
          choices: [
            {
              t: "Nullability becomes part of the type, enforced by compiler warnings",
              ok: true,
              why: "Correct — warnings, not runtime guarantees.",
            },
            { t: "It throws automatically when a null is dereferenced", why: "That already happens — it is a NullReferenceException." },
            { t: "It makes reference types unable to hold null at runtime", why: "The runtime is unchanged; only the compiler's view differs." },
            { t: "It applies only to value types", why: "Value-type nullability (`int?`) predates it and is a different mechanism." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-oop", {
      title: "Classes, Interfaces & OOP",
      level: 1,
      summary: "Abstract vs interface, override vs overload, and why you code to an abstraction.",
      brief: `**Interface vs abstract class** — the question that appears in nearly every .NET interview:

| | Interface | Abstract class |
|---|---|---|
| Multiple inheritance | Yes | No — one base class only |
| State / fields | No | Yes |
| Constructors | No | Yes |
| Access modifiers | Public by default | Any |
| Says | "can do" | "is a" |

Use an **interface** for a capability that unrelated types can have (\`IDisposable\`, \`IValidator\`). Use an **abstract class** when subtypes share state and implementation. Modern C# allows default interface methods, which narrows the gap but does not add state.

**Override vs overload:**
- **Overload** — same name, different parameters, resolved at **compile time**.
- **Override** — replaces a \`virtual\` or \`abstract\` base member, resolved at **runtime** by the object's actual type. That runtime dispatch *is* polymorphism.

C# methods are **not virtual by default** (unlike Java). Without \`virtual\`, a derived \`new\` method hides rather than overrides — and which one runs depends on the *variable's* declared type, which is a genuinely surprising bug.

Access modifiers: \`public\`, \`private\`, \`protected\`, \`internal\` (same assembly), \`protected internal\`, \`private protected\`.`,
      items: [
        mcq("cs-oop-interface-abstract", {
          q: "When do you choose an interface over an abstract class?",
          why: "An interface defines a **capability** that otherwise-unrelated types can implement, and a class can implement many. An abstract class defines an **is-a** relationship with shared state and implementation, and you only get one.\n\nThe deciding questions: do implementers need shared fields or a constructor (abstract class), and will types that are unrelated need this contract (interface)?\n\nIn practice, interfaces also dominate because DI containers and mocking frameworks are built around them — 'code to an interface' is what makes a class testable, since you can inject a fake.",
          c: ["oop"],
          d: 2,
          choices: [
            {
              t: "For a capability unrelated types can share, with no common state — and a class may implement many",
              ok: true,
              why: "Correct, and it enables DI and mocking.",
            },
            { t: "Whenever you need shared implementation between subclasses", why: "That is the abstract class case." },
            { t: "Interfaces are always preferable; abstract classes are legacy", why: "Both have current, distinct uses." },
            { t: "When the type needs a constructor", why: "Interfaces cannot declare constructors." },
          ],
        }),
        out("cs-oop-virtual", {
          q: "What is printed?",
          code: `class Base { public void Show() => Console.WriteLine("Base"); }
class Derived : Base { public new void Show() => Console.WriteLine("Derived"); }

Base obj = new Derived();
obj.Show();`,
          lang: "csharp",
          why: "**Base.** `Show` is not `virtual`, so `new` **hides** it rather than overriding it. Which method runs is decided at compile time from the *variable's declared type*, which is `Base`.\n\nMake the base `virtual` and the derived `override`, and it prints `Derived` — the runtime dispatches on the object's actual type. That is polymorphism, and the difference is that C# methods are **not virtual by default**, unlike Java.\n\nThis produces a real and confusing bug: the same object behaves differently depending on which variable you call it through.",
          tip: "A favourite because it separates people who know the keywords from those who know the dispatch rules.",
          c: ["oop"],
          d: 3,
          choices: [
            { t: "`Base`", ok: true, why: "Correct — `new` hides, and dispatch uses the declared type." },
            { t: "`Derived`", why: "That requires `virtual` + `override`." },
            { t: "It does not compile", why: "It compiles; `new` suppresses the hiding warning." },
            { t: "It throws at runtime", why: "No error — just a surprising result." },
          ],
        }),
        multi("cs-oop-solid", {
          q: "Which statements about designing testable C# classes are true?",
          why: "Depending on an **interface** rather than a concrete class lets you inject a fake in tests. Taking dependencies through the **constructor** makes them explicit and required, rather than hidden inside the class. Keeping classes focused (single responsibility) means fewer collaborators to stand up in a test.\n\nWhat prevents testability: `new`-ing dependencies inside a method (the test cannot substitute them), static state and singletons (shared across tests, causing order dependence), and sealed concrete types with no interface (nothing to mock).",
          c: ["oop", "dependency-injection", "testing"],
          d: 3,
          choices: [
            { t: "Depend on interfaces so a test can inject a fake", ok: true },
            { t: "Take dependencies via the constructor", ok: true },
            { t: "Keep each class to one responsibility", ok: true },
            { t: "`new`-ing a `HttpClient` inside a method is fine for testing", why: "The test cannot replace it — that is the coupling to avoid." },
            { t: "Static mutable state makes tests simpler", why: "It leaks between tests and causes order dependence." },
          ],
        }),
        blank("cs-oop-interface", {
          q: "Declare an interface with one method and implement it.",
          template: `public {{1}} INotifier
{
    void Send(string message);
}

public class EmailNotifier : {{2}}
{
    public void Send(string message) { /* ... */ }
}`,
          answers: [["interface"], ["INotifier"]],
          hints: ["The keyword for a contract with no implementation", "The interface being implemented"],
          why: "C# is **nominally** typed: `EmailNotifier` must explicitly declare `: INotifier` to be usable as one, even if it already has a matching `Send` method. TypeScript is **structural** — a matching shape is enough.\n\nThat contrast comes up naturally in full-stack interviews and is worth being able to state. The `I` prefix is a .NET convention, not a language rule, but it is universal enough that omitting it will be flagged in review.",
          c: ["oop", "structural-typing"],
          d: 1,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-linq", {
      title: "Collections & LINQ",
      level: 2,
      summary: "Choosing the right container, and LINQ's deferred execution trap.",
      brief: `**Pick the right collection:**

| Need | Use | Lookup |
|---|---|---|
| Ordered, indexed | \`List<T>\` | O(n) search |
| Key → value | \`Dictionary<K,V>\` | O(1) |
| Uniqueness / membership | \`HashSet<T>\` | O(1) |
| FIFO / LIFO | \`Queue<T>\` / \`Stack<T>\` | — |
| Read-only contract | \`IReadOnlyList<T>\` | — |

Expose the narrowest interface that works — \`IEnumerable<T>\` for "you may iterate this", \`IReadOnlyList<T>\` when count and indexing matter.

**LINQ is lazy.** \`Where\`, \`Select\`, \`OrderBy\` and friends build a query; nothing executes until you enumerate — \`ToList()\`, \`ToArray()\`, \`First()\`, \`Count()\`, or a \`foreach\`. This causes two classic problems:

1. **Re-execution.** Enumerating the same query twice runs it twice — including hitting the database twice. Materialise with \`ToList()\` when you will use the result more than once.
2. **Captured variables.** The query reads the variable's value at *execution* time, not at definition time.

**\`IEnumerable<T>\` vs \`IQueryable<T>\`** is the highest-value distinction. \`IQueryable\` builds an expression tree that EF Core translates to SQL — filtering happens **in the database**. \`IEnumerable\` runs in memory. Calling \`.ToList()\` too early, or \`.AsEnumerable()\`, drops you into memory and pulls the whole table into your process.

\`First\` throws when empty; \`FirstOrDefault\` returns \`default\`. \`Single\` throws if there is more than one — use it when "more than one" is a bug.`,
      items: [
        mcq("cs-linq-deferred", {
          q: "How many times does the database get queried?",
          code: `var query = db.Orders.Where(o => o.Total > 100);

var count = query.Count();
var list  = query.ToList();
var first = query.First();`,
          lang: "csharp",
          why: "**Three times.** `query` is an `IQueryable` — a description, not a result. Each terminal operation (`Count`, `ToList`, `First`) executes it separately, producing three round trips.\n\nIf you need the data more than once, materialise once:\n\n```csharp\nvar list = query.ToList();\nvar count = list.Count;\nvar first = list.First();\n```\n\nNow it is one query and the rest is in memory. Deferred execution is a strength — it lets you compose filters before anything runs — but it surprises people who treat a LINQ variable as if it held data.",
          tip: "Being able to say 'LINQ is lazy; the variable is a query, not a result' is the whole answer.",
          c: ["linq", "orm", "performance"],
          d: 3,
          choices: [
            { t: "Three — each terminal operation executes the query", ok: true, why: "Correct: materialise once with `ToList()`." },
            { t: "Once — the query is cached after the first run", why: "There is no automatic caching." },
            { t: "Twice — `Count` is optimised away", why: "`Count` issues its own SQL COUNT query." },
            { t: "Zero — nothing forces execution here", why: "All three are terminal operations." },
          ],
        }),
        mcq("cs-linq-queryable", {
          q: "What is the practical difference between these two lines?",
          code: `var a = db.Users.Where(u => u.IsActive).ToList();
var b = db.Users.ToList().Where(u => u.IsActive).ToList();`,
          lang: "csharp",
          why: "Line **a** translates the filter into SQL: `SELECT * FROM Users WHERE IsActive = 1`. Only matching rows leave the database.\n\nLine **b** calls `ToList()` first, which executes `SELECT * FROM Users` and pulls **every row** into memory, then filters in your process. On a large table that is a huge query, a huge allocation, and possibly an out-of-memory failure.\n\nThe rule: keep the chain as `IQueryable` for as long as possible and materialise **last**. `.ToList()` and `.AsEnumerable()` are the boundary where you leave the database — placing them early is one of the most common and most expensive EF Core mistakes.",
          tip: "This is the single highest-value LINQ question for a .NET CRUD role.",
          c: ["linq", "orm", "performance"],
          d: 3,
          choices: [
            {
              t: "a filters in SQL; b loads the whole table into memory first",
              ok: true,
              why: "Correct — `ToList()` is the exit from the database.",
            },
            { t: "They are equivalent — EF optimises both", why: "EF cannot undo an already-executed query." },
            { t: "b is faster because it caches the users", why: "It transfers every row over the wire." },
            { t: "a fails because `Where` needs a materialised list", why: "`Where` over `IQueryable` is exactly the intended usage." },
          ],
        }),
        multi("cs-linq-methods", {
          q: "Which statements about these LINQ methods are correct?",
          why: "`First()` throws `InvalidOperationException` on an empty sequence; `FirstOrDefault()` returns `default` (null for reference types, `0` for `int`). `Single()` throws if there is **not exactly one** match — use it to assert that duplicates are a bug. `Any()` is cheaper than `Count() > 0` because it stops at the first match and, over `IQueryable`, translates to `EXISTS` rather than a full count.\n\nA subtle one: `FirstOrDefault` on a value-type sequence returns `0`, which is indistinguishable from a real zero — a genuine source of bugs.",
          c: ["linq", "collections"],
          d: 2,
          choices: [
            { t: "`First()` throws on an empty sequence", ok: true },
            { t: "`FirstOrDefault()` returns `default` instead of throwing", ok: true },
            { t: "`Single()` throws if there is more than one match", ok: true },
            { t: "`Any()` is preferable to `Count() > 0`", ok: true },
            { t: "`FirstOrDefault()` on `IEnumerable<int>` returns null when empty", why: "It returns `0` — value types have no null." },
            { t: "`Where()` executes immediately", why: "It is deferred until enumeration." },
          ],
        }),
        mcq("cs-linq-collection", {
          q: "You need to check membership of ~50,000 ids inside a loop over another list. Which collection?",
          why: "**`HashSet<T>`** — O(1) membership via `Contains`. With a `List<T>`, `Contains` is a linear scan, so the nested loop becomes O(n × m): 50,000 × the outer list's length. This is the difference between milliseconds and minutes, and it is a very common real-world fix.\n\n`Dictionary<K,V>` would also give O(1) but you are not storing values, so `HashSet` expresses the intent. A sorted `List` with `BinarySearch` is O(log n) — better than a scan, worse than a hash, and requires maintaining the sort.",
          c: ["collections", "performance"],
          d: 2,
          choices: [
            { t: "`HashSet<T>` — O(1) `Contains`", ok: true, why: "Correct: the right container turns O(n·m) into O(n)." },
            { t: "`List<T>` — `Contains` is fine", why: "It is a linear scan on every check." },
            { t: "`Queue<T>`", why: "FIFO access, not membership testing." },
            { t: "An array with `Array.IndexOf`", why: "Also a linear scan." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-async", {
      title: "async / await & Tasks",
      level: 2,
      summary: "Why async helps a web server, and the deadlock everyone hits once.",
      brief: `\`async\`/\`await\` in C# is about **thread liberation**, not speed. When you \`await\` an I/O operation, the thread is returned to the pool instead of sitting blocked. On a web server with a fixed thread pool, that is the difference between handling hundreds of concurrent requests and exhausting the pool.

The rules:

**Never block on async code.** \`.Result\` and \`.Wait()\` block the thread and, in contexts with a synchronisation context (classic ASP.NET, WinForms, WPF), cause a **deadlock**: the awaited continuation needs the context the blocked thread is holding. ASP.NET **Core** has no synchronisation context so it will not deadlock — but it still wastes a pooled thread. Async all the way up.

**Avoid \`async void\`.** Exceptions from an \`async void\` method cannot be caught by the caller and crash the process. The only legitimate use is an event handler. Return \`Task\` instead.

**Parallelism**: sequential \`await\`s serialise independent work. Start them all, then \`await Task.WhenAll(...)\`:

\`\`\`csharp
var a = GetUserAsync(id);        // started
var b = GetOrdersAsync(id);      // started
await Task.WhenAll(a, b);        // ~max, not sum
\`\`\`

**\`Task\` vs \`Thread\`**: a \`Task\` is a unit of work, usually scheduled on the pool; a \`Thread\` is an OS thread you own. Use \`Task\` for I/O, \`Task.Run\` for CPU work you want off the current thread, and raw \`Thread\` almost never.

**\`CancellationToken\`** should be accepted and passed down by every async method that could be abandoned. ASP.NET Core gives you one tied to the request.`,
      items: [
        mcq("cs-async-deadlock", {
          q: "Why is `.Result` on an async call dangerous?",
          code: `var user = GetUserAsync(id).Result;`,
          lang: "csharp",
          why: "It **blocks the calling thread** until the task completes. In any context with a synchronisation context — classic ASP.NET, WinForms, WPF — the awaited continuation must resume *on that same context*, which the blocked thread is holding. Neither can proceed: a deadlock, with no exception and no stack trace.\n\nASP.NET Core removed the synchronisation context, so it does not deadlock there — but it still consumes a pool thread for the duration, which defeats the entire purpose of async and can exhaust the pool under load.\n\nThe rule: **async all the way up**. If a method calls async code, it should be async itself.",
          tip: "Say 'sync over async' — it is the recognised name for this anti-pattern.",
          c: ["async-await", "concurrency"],
          d: 3,
          choices: [
            {
              t: "It blocks the thread and can deadlock when a synchronisation context is involved",
              ok: true,
              why: "Correct — and it wastes a pool thread even where it cannot deadlock.",
            },
            { t: "It silently swallows exceptions", why: "It wraps them in an AggregateException, but that is a lesser issue." },
            { t: "It runs the task on a new thread", why: "It blocks the current one." },
            { t: "It is fine — `.Result` is the standard way to get a value", why: "It is a well-known anti-pattern." },
          ],
        }),
        mcq("cs-async-whenall", {
          q: "Three independent calls each take 1 second. How long does this take, and what would you change?",
          code: `var user = await GetUserAsync(id);
var orders = await GetOrdersAsync(id);
var prefs = await GetPrefsAsync(id);`,
          lang: "csharp",
          why: "About **3 seconds** — each `await` waits for completion before the next call starts.\n\nSince they are independent, start them all and await together:\n\n```csharp\nvar userTask = GetUserAsync(id);\nvar ordersTask = GetOrdersAsync(id);\nvar prefsTask = GetPrefsAsync(id);\nawait Task.WhenAll(userTask, ordersTask, prefsTask);\n```\n\n~1 second. One important caveat for a .NET CRUD role: **`DbContext` is not thread-safe**, so you cannot run several EF Core queries concurrently on the *same* context. You would need a separate context per parallel query, usually via `IDbContextFactory`.",
          tip: "The DbContext caveat is what turns a generic answer into a .NET one.",
          c: ["async-await", "concurrency", "orm"],
          d: 3,
          choices: [
            {
              t: "~3s; start all three then `await Task.WhenAll` — but not on one shared DbContext",
              ok: true,
              why: "Correct, including the EF Core caveat.",
            },
            { t: "~1s; `await` already parallelises", why: "`await` suspends until that task finishes." },
            { t: "~3s and it cannot be improved", why: "Independent work overlaps fine." },
            { t: "~1s; the thread pool distributes them automatically", why: "Nothing starts a call before its `await` is reached." },
          ],
        }),
        multi("cs-async-rules", {
          q: "Which are correct guidance for async C#?",
          why: "Return `Task`/`Task<T>` rather than `async void` — exceptions from `async void` cannot be caught by the caller and take down the process. Accept and forward a `CancellationToken` so abandoned work stops. Suffix async methods with `Async` (the framework convention). Go async all the way rather than blocking at any level.\n\nWhat is wrong: `async` does **not** create threads (for I/O, no thread waits at all), and `Task.Run` around a naturally-async I/O call just moves the same waiting onto a pool thread for no benefit — it is only appropriate for genuinely CPU-bound work.",
          c: ["async-await", "error-handling"],
          d: 3,
          choices: [
            { t: "Return `Task` instead of `async void`, except for event handlers", ok: true },
            { t: "Accept a `CancellationToken` and pass it down the chain", ok: true },
            { t: "Suffix async method names with `Async`", ok: true },
            { t: "Be async all the way up rather than blocking at any level", ok: true },
            { t: "`async` makes the method run on a background thread", why: "For I/O there is no thread waiting at all." },
            { t: "Wrap async I/O in `Task.Run` to make it faster", why: "Adds a pool thread with no benefit; only useful for CPU work." },
          ],
        }),
        out("cs-async-voidthrow", {
          q: "What happens to the exception?",
          code: `async void ProcessAsync() { throw new Exception("boom"); }

try { ProcessAsync(); }
catch (Exception) { Console.WriteLine("caught"); }`,
          lang: "csharp",
          why: "**It is not caught, and it crashes the process.** An `async void` method has no `Task` for the caller to await, so there is nothing to observe the exception. It is raised on the synchronisation context (or the thread pool) and becomes an unhandled exception.\n\nChange the signature to `async Task` and `await ProcessAsync()` inside the `try`, and the `catch` works normally.\n\nThe only place `async void` is legitimate is an event handler, where the signature is fixed by the delegate — and even then you should `try/catch` inside the method body.",
          tip: "'`async void` is fire-and-forget-your-exceptions' is a good way to phrase it.",
          c: ["async-await", "error-handling"],
          d: 3,
          choices: [
            {
              t: "Not caught — it becomes unhandled and crashes the process",
              ok: true,
              why: "Correct: `async void` gives the caller nothing to observe.",
            },
            { t: "`caught` is printed", why: "The try block completes before the exception is raised." },
            { t: "It is swallowed silently", why: "It is not silent — it terminates the process." },
            { t: "It is stored on a Task for later inspection", why: "There is no Task with `async void`." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-modern", {
      title: "Modern C# & Quality",
      level: 3,
      summary: "Records, pattern matching, disposal and exception handling.",
      brief: `**Records** are reference types with **value-based equality**, generated \`ToString\`, deconstruction and \`with\` expressions:

\`\`\`csharp
public record Person(string Name, int Age);
var a = new Person("Ada", 36);
var b = a with { Age = 37 };     // non-destructive copy
a == new Person("Ada", 36);       // true — a class would be false
\`\`\`

Ideal for DTOs, API models and value objects. Use a \`class\` when the object has identity and mutable state.

**Pattern matching** replaces chains of \`if\`/\`is\`/cast:

\`\`\`csharp
var label = shape switch {
    Circle { Radius: > 10 } => "big circle",
    Circle => "circle",
    Rectangle r when r.W == r.H => "square",
    null => "none",
    _ => "other",
};
\`\`\`

**Disposal**: \`IDisposable\` + \`using\` deterministically releases file handles, sockets and connections. The GC handles *memory*; it does not promptly release anything else. \`using var x = ...;\` disposes at the end of the enclosing scope.

**Exceptions**: catch only what you can handle or enrich. Use \`throw;\` not \`throw ex;\` — the latter resets the stack trace and destroys the diagnostic trail. Never swallow with an empty \`catch {}\`. Exceptions are for *exceptional* cases; use \`TryParse\`-style APIs for expected failures, since exceptions are expensive.`,
      items: [
        out("cs-modern-record-eq", {
          q: "What is printed?",
          code: `public record Person(string Name, int Age);

var a = new Person("Ada", 36);
var b = new Person("Ada", 36);
Console.WriteLine(a == b);`,
          lang: "csharp",
          why: "**True.** Records generate value-based equality: two records are equal when their types match and all their members are equal. An equivalent `class` would print `False`, because classes compare by reference unless you override `Equals` and `GetHashCode`.\n\nThat generated equality — plus `ToString`, deconstruction and `with` expressions — is why records are the default choice for DTOs and API models. They are still **reference types**, though; `record struct` is the value-type variant.",
          c: ["equality", "value-vs-reference", "oop"],
          d: 2,
          choices: [
            { t: "`True`", ok: true, why: "Correct — records have value-based equality." },
            { t: "`False`", why: "That is class behaviour; records generate `Equals`." },
            { t: "It does not compile", why: "Records support `==` out of the box." },
            { t: "`True` only for `record struct`", why: "Both record kinds have value equality." },
          ],
        }),
        mcq("cs-modern-throw", {
          q: "What is wrong with `throw ex;` in a catch block?",
          code: `try { DoWork(); }
catch (Exception ex) {
    _logger.LogError(ex, "failed");
    throw ex;
}`,
          lang: "csharp",
          why: "`throw ex;` **resets the stack trace** to this line. The original throw site — the actual location of the bug — is erased, so your production logs point at the catch block instead of the cause.\n\nUse bare `throw;` to rethrow while preserving the trace. If you want to add context, wrap it: `throw new OrderProcessingException(\"...\", ex)`, which keeps the original as `InnerException`.\n\nThis is a small detail with a large cost — it is the difference between a five-minute and a five-hour production investigation.",
          tip: "A frequent code-review catch. Knowing it signals you have debugged real .NET incidents.",
          c: ["error-handling", "logging"],
          d: 3,
          choices: [
            { t: "It resets the stack trace — use bare `throw;` instead", ok: true, why: "Correct: `throw;` preserves the original trace." },
            { t: "It swallows the exception", why: "It rethrows — just with damaged diagnostics." },
            { t: "It converts it to a different exception type", why: "The type is unchanged." },
            { t: "Nothing — `throw ex` and `throw` are equivalent", why: "They differ precisely in stack-trace preservation." },
          ],
        }),
        mcq("cs-modern-dispose", {
          q: "Why does this need `using`?",
          code: `var connection = new SqlConnection(connectionString);
connection.Open();
// ... query ...`,
          lang: "csharp",
          why: "`SqlConnection` holds an **unmanaged resource** — a pooled network connection. The garbage collector reclaims *memory* but makes no promise about when, and it does not know the connection needs returning to the pool promptly.\n\nWithout `using`, connections leak until the pool is exhausted, at which point every request fails with a pool timeout. `using var connection = new SqlConnection(...)` calls `Dispose()` deterministically at the end of scope, even if an exception is thrown.\n\nThe general rule: **anything implementing `IDisposable` gets a `using`** — connections, file streams, `HttpResponseMessage`, `CancellationTokenSource`. The notable exception is `HttpClient`, which should be long-lived or managed by `IHttpClientFactory`.",
          tip: "The `HttpClient` exception is a great detail to add — disposing it per request causes socket exhaustion.",
          c: ["disposal", "memory"],
          d: 2,
          choices: [
            {
              t: "It holds an unmanaged resource the GC will not release promptly — leaking exhausts the connection pool",
              ok: true,
              why: "Correct: `using` makes disposal deterministic.",
            },
            { t: "`using` makes the query run faster", why: "It is about resource lifetime, not speed." },
            { t: "The GC always disposes objects automatically", why: "It finalises some, unpredictably — never rely on it." },
            { t: "It is only needed for file streams", why: "It applies to every `IDisposable`." },
          ],
        }),
        multi("cs-modern-exceptions", {
          q: "Which are good exception-handling practices?",
          why: "Catch specific exception types you can actually handle. Use bare `throw;` to preserve the stack trace. Wrap with an inner exception when adding context. Prefer `TryParse`-style APIs for *expected* failures — exceptions are expensive and control flow built on them is hard to read.\n\nWhat is wrong: an empty `catch {}` swallows the failure and turns a crash into silently wrong behaviour, which is far harder to diagnose; and catching `Exception` at every level hides bugs that should propagate to the boundary handler that logs and shapes them.",
          c: ["error-handling"],
          d: 3,
          choices: [
            { t: "Catch specific exception types you can handle", ok: true },
            { t: "Use `throw;` rather than `throw ex;`", ok: true },
            { t: "Wrap with an inner exception when adding context", ok: true },
            { t: "Use `TryParse`-style APIs for expected failures", ok: true },
            { t: "`catch {}` to keep the app running", why: "Silent failure is worse than a crash you can see." },
            { t: "Catch `Exception` at every layer just in case", why: "Hides bugs; let them reach one boundary handler." },
          ],
        }),
        short("cs-modern-explain-async", {
          q: "*\"Why does making our API endpoints async improve throughput, if it doesn't make any single request faster?\"*",
          why: "A conceptual question that separates people who use `async` because the template does from those who understand what it buys.",
          model:
            "It doesn't make an individual request faster — that's the key thing to say up front. A database query still takes the same 50 milliseconds either way.\n\nWhat changes is what the *thread* does during those 50 milliseconds. In the synchronous version, the thread handling the request sits blocked, doing nothing but occupying a slot in the thread pool. The pool has a limited number of threads, so once they're all blocked, new requests queue up even though the CPU is essentially idle. That's thread pool starvation, and it shows up as requests timing out under load while the server looks unbusy.\n\nWith `await`, the thread is returned to the pool as soon as the I/O starts, so it can serve other requests. When the database responds, the continuation is scheduled on whatever thread is free. Same latency per request, far more concurrent requests per server.\n\nThe corollary is that async only helps for **I/O**. Making a CPU-bound method async gains nothing, because there's no waiting to give back — you'd want `Task.Run` or a background service for that. And it only works if it's async all the way: one `.Result` in the chain blocks a thread and reintroduces the problem you were solving.",
          points: [
            "Individual latency is unchanged — throughput is what improves",
            "Blocked threads occupy pool slots while the CPU is idle → starvation",
            "await returns the thread to the pool during I/O",
            "Only helps for I/O, not CPU-bound work",
            "Must be async all the way — one `.Result` undoes it",
          ],
          c: ["async-await", "runtime", "performance"],
          d: 3,
          secs: 160,
        }),
      ],
    }),
  ],
});
