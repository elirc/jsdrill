import { defineTrack, mod, mcq, multi, tf, out, blank, short } from "../builder";

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
      keyIdeas: [
        "Value types (int, bool, DateTime, struct, enum) copy on assignment; reference types (class, string, arrays) copy the reference.",
        "`string` is a reference type that behaves like a value because it is immutable — use `StringBuilder` in loops.",
        "`int[]` is a reference type even though its elements are values.",
        "`record` is a reference type with value equality; `record struct` is the value-type version.",
        "Nullable reference types make `string?` explicit — compile-time warnings, not runtime enforcement.",
      ],
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
        mcq("cs-types-struct-when", {
          q: "When is a `struct` the right choice over a `class`?",
          why: "**When the type is a small, immutable value with no identity** — a coordinate, a money amount, a date range. Microsoft's design guidance puts it at roughly 16 bytes or less, logically a single value, immutable, and not boxed often.\n\nThe mechanism: a struct is copied on every assignment, parameter pass and return. For a small value that copy is cheaper than a heap allocation plus later garbage collection. For a large struct the copying costs more than it saves, and a mutable struct produces baffling bugs because you keep mutating a *copy* (the classic one being `list[0].X = 5`, which does not even compile).\n\nStructs cannot inherit from another type (they are implicitly sealed and derive from `ValueType`), but they can implement interfaces — though using one through an interface variable boxes it.",
          tip: "Name the guideline (small, immutable, value-like) and then the failure mode (mutable structs mutate copies). That pair is the senior answer.",
          c: ["value-vs-reference", "performance"],
          d: 2,
          choices: [
            {
              t: "For small, immutable values with no identity, like a coordinate or a money amount",
              ok: true,
              why: "Correct — copying a few bytes beats a heap allocation and GC pressure.",
            },
            { t: "Whenever performance matters, because structs are always faster", why: "Large structs are slower — every assignment copies all of the data." },
            { t: "When the type needs to inherit shared behaviour from a base type", why: "Structs cannot inherit; they can only implement interfaces." },
            { t: "When several parts of the program need to mutate the same shared object", why: "That is exactly the case for a class — each struct holder gets its own copy." },
          ],
        }),
        tf("cs-types-nullable-value", {
          q: "`int?` is a reference type that wraps an `int`, which is how it is able to hold `null`.",
          why: "**False.** `int?` is shorthand for `Nullable<int>`, which is a **struct** — a value type holding the `int` plus a `bool HasValue` flag. 'Null' just means `HasValue` is false; no heap object or reference is involved.\n\nReading `.Value` when `HasValue` is false throws `InvalidOperationException`. Prefer `GetValueOrDefault()`, the `??` operator, or a pattern like `if (x is int n)`.\n\nBoxing gets special treatment: boxing an `int?` with no value produces a plain `null` reference, and boxing one with a value produces a boxed `int` — never a boxed `Nullable<int>`. That is why `object o = (int?)null; o == null` is true.",
          tip: "Say 'Nullable<T> is a struct with HasValue and Value' — it shows you know the mechanism, not just the syntax.",
          c: ["nullability", "value-vs-reference"],
          d: 1,
          answer: false,
        }),
        mcq("cs-types-span", {
          q: "What problem does `Span<T>` solve?",
          code: `ReadOnlySpan<char> text = "2024-06-15";
var year = int.Parse(text[..4]);   // no substring allocated`,
          lang: "csharp",
          why: "**It gives you a type-safe window onto contiguous memory — an array, a string, stack memory or native memory — so you can slice and parse without allocating copies.** `text[..4]` above is just a pointer and a length, where `Substring(0, 4)` would allocate a new string.\n\nThe mechanism is that `Span<T>` is a `ref struct`: it may only live on the stack. That is what makes it safe to point at stack memory, and it is also the restriction — it cannot be a field of a class, cannot be boxed, cannot be captured by a lambda, and cannot live across an `await`. When you need a storable or async-friendly version, use `Memory<T>`.\n\nIn practice you mostly consume spans through framework APIs (`int.Parse`, `Utf8JsonReader`, `string.AsSpan()`), which is where much of modern .NET's performance comes from.",
          tip: "Interviewers want 'slicing without allocation' and 'stack-only ref struct' — then `Memory<T>` for the async case.",
          c: ["performance", "memory"],
          d: 3,
          choices: [
            {
              t: "Slicing and reading contiguous memory without allocating copies",
              ok: true,
              why: "Correct — a span is a view, not a copy.",
            },
            { t: "It is a thread-safe replacement for arrays", why: "Spans say nothing about thread safety; they are views over existing memory." },
            { t: "It is a lazily evaluated sequence, like `IEnumerable<T>`", why: "A span is over memory that already exists; nothing is deferred." },
            { t: "It allocates arrays on the heap more cheaply", why: "It allocates nothing — it points at memory that someone else owns." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-oop", {
      title: "Classes, Interfaces & OOP",
      level: 1,
      summary: "Abstract vs interface, override vs overload, and why you code to an abstraction.",
      keyIdeas: [
        "Interface = a capability unrelated types can share, many per class, no state. Abstract class = is-a, one base, shared state.",
        "Methods are not virtual by default; `new` hides, `override` replaces. Dispatch on hidden methods uses the declared type.",
        "Overload resolves at compile time by parameters; override resolves at runtime by the object's actual type.",
        "C# is nominal: a class must declare `: IFoo` to be an `IFoo`, unlike TypeScript's structural typing.",
        "Depend on interfaces via the constructor — it is what makes a class testable with fakes.",
      ],
      brief: `**Interface vs abstract class** — the question that appears in nearly every .NET interview:

| | Interface | Abstract class |
|---|---|---|
| Multiple inheritance | Yes | No — one base class only |
| Instance state / fields | No (static fields only) | Yes |
| Instance constructors | No | Yes |
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
            { t: "When the type needs a constructor", why: "Interfaces cannot declare instance constructors (C# 8+ allows only a static one)." },
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
        mcq("cs-oop-ctor-chain", {
          q: "What does `: this(name, 0)` do here?",
          code: `public Person(string name) : this(name, 0) { }
public Person(string name, int age) { Name = name; Age = age; }`,
          lang: "csharp",
          why: "**It calls the other constructor of the same class first, then runs this constructor's body.** It is how you keep initialisation logic in one place instead of copying it into every overload.\n\n`: base(...)` is the sibling syntax: it chooses which **base-class** constructor runs. If you write neither, the compiler inserts `: base()` for you — so if the base class has no parameterless constructor, the derived class will not compile until you chain explicitly.\n\nThe usual design is to have the overload with the most parameters do the real work and every shorter overload chain into it with defaults. Optional parameters can replace some of these overloads, but chaining still matters when the shorter constructors need to compute their defaults.",
          c: ["oop"],
          d: 1,
          choices: [
            {
              t: "Runs the two-parameter constructor of the same class before this body",
              ok: true,
              why: "Correct — `this(...)` chains within the class.",
            },
            { t: "Calls the base class's constructor", why: "That is `: base(...)`." },
            { t: "Runs the other constructor after this constructor's body", why: "The chained constructor always runs first." },
            { t: "Creates a second `Person` object and copies its fields", why: "Only one object is created — chaining just reuses initialisation code." },
          ],
        }),
        multi("cs-oop-class-kinds", {
          q: "Which statements about `static`, `sealed`, `abstract` and `partial` classes are true?",
          why: "A **static** class cannot be instantiated or inherited, and may contain only static members — it is a home for helpers and extension methods. A **sealed** class can be instantiated but cannot be inherited from; sealing also lets the JIT devirtualise calls. An **abstract** class cannot be instantiated directly — only its concrete subclasses can. A **partial** class is one type split across several files, merged by the compiler; it exists mainly so generated code (designers, source generators) and hand-written code can live apart.\n\nThe traps: all parts of a partial class must be in the **same assembly** — it is a compile-time feature, not a way to extend someone else's type. And a static class cannot implement an interface, because an interface describes instances and a static class has none.",
          c: ["oop"],
          d: 2,
          choices: [
            { t: "A static class cannot be instantiated and holds only static members", ok: true },
            { t: "A sealed class cannot be used as a base class", ok: true },
            { t: "An abstract class cannot be instantiated directly", ok: true },
            { t: "A partial class is compiled into a single type from several files", ok: true },
            { t: "Partial classes let you add members to a class in another assembly", why: "Every part must be compiled together, in the same assembly. Use extension methods for someone else's type." },
            { t: "A static class can implement an interface", why: "Interfaces describe instances; a static class never has one." },
          ],
        }),
        mcq("cs-oop-property-field", {
          q: "Why expose a public property instead of a public field?",
          code: `public string Name;                 // field
public string Name { get; set; }    // auto-property
public string Name { get; init; }   // settable only during initialisation`,
          lang: "csharp",
          why: "**A property is a pair of methods, so you can add validation, lazy loading or change notification later without changing the public contract.** An auto-property is just a compiler-generated private backing field with a trivial `get` and `set`.\n\nSwitching a public field to a property later is a **binary breaking change**: callers compiled against the field access it directly and must be recompiled. It can also break source, since a field can be passed by `ref` and a property cannot. Serialisers, data binding and interfaces also work in terms of properties.\n\n`init` (C# 9) is the modern middle ground: the property can be set in an object initialiser or constructor, then becomes read-only — ideal for DTOs.",
          c: ["oop"],
          d: 2,
          choices: [
            {
              t: "It lets you add logic later without breaking callers, and frameworks bind to properties",
              ok: true,
              why: "Correct — the property is the stable contract; the storage is an implementation detail.",
            },
            { t: "Properties are faster than fields", why: "Trivial accessors are usually inlined to the same speed; speed is not the reason." },
            { t: "Public fields are not allowed in C#", why: "They compile fine; they are discouraged, not forbidden." },
            { t: "Properties store their data on the heap, fields on the stack", why: "Both live wherever the containing object lives." },
          ],
        }),
        tf("cs-oop-static-ctor", {
          q: "A static constructor runs once per type, before the first instance is created or any static member is used, and your code cannot call it directly.",
          why: "**True.** The runtime runs the static constructor itself, at most once, and guarantees it is thread-safe — two threads racing to touch the type will not both run it. It takes no parameters and no access modifier, because nobody calls it.\n\nThat guarantee is why a `static readonly` field initialised there is a simple, thread-safe singleton.\n\nThe sharp edge: if a static constructor throws, the runtime wraps it in a `TypeInitializationException` and the type is **unusable for the rest of the process** — every later access throws the same error. Keep static constructors trivial and never do I/O in them.",
          c: ["oop", "runtime"],
          d: 2,
          answer: true,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-runtime", {
      title: "The CLR, Memory & the Basics",
      level: 1,
      summary: "What the runtime does for you, and the fresher questions every .NET screen starts with.",
      keyIdeas: [
        "C# compiles to IL; the CLR JIT-compiles IL to native code and supplies GC, type safety and exceptions.",
        "The GC is generational and non-deterministic. It frees memory only — handles and connections need `Dispose`.",
        "Boxing copies a value type into a heap object. Hidden boxing costs allocations and GC pressure.",
        "`const` is inlined into callers at compile time; `static readonly` is read at runtime. Public constants are a versioning trap.",
        "`==` on `object` compares references; `Equals` is virtual and can compare values. Know which one the compiler picked.",
        "Use `decimal` for money — base-10 exact; `double` is binary and cannot represent 0.1.",
      ],
      brief: `### From source to running code

The C# compiler does **not** produce machine code. It produces **IL** (intermediate language) plus metadata, packaged in an assembly (\`.dll\`). At runtime the **CLR** — the Common Language Runtime — **JIT-compiles** each method to native code the first time it is called, and supplies the services that make code *managed*:

- **Garbage collection** of heap memory
- **Type safety** and bounds checking
- **Exception handling** and stack unwinding
- **Thread management** and the thread pool

**Unmanaged** code runs outside those guarantees — native DLLs called through P/Invoke, COM, OS handles. The GC knows nothing about the resources they hold, which is why \`IDisposable\` exists.

### The garbage collector

| Generation | Holds | Collected |
|---|---|---|
| Gen 0 | New objects | Very often, cheaply |
| Gen 1 | Survived one collection | A buffer between 0 and 2 |
| Gen 2 | Long-lived objects (+ the large object heap) | Rarely, expensively |

Most objects die young, so collecting Gen 0 alone is fast. Collections are **non-deterministic** — triggered by allocation pressure, low memory, or \`GC.Collect()\` — so you never know *when* an object is freed. **Finalizers** (\`~MyType()\`) run later on a separate thread and delay reclamation; \`Dispose\` is the deterministic path.

### The fresher checklist

| Question | Short answer |
|---|---|
| Boxing | Value type copied into a heap \`object\`; unboxing copies it back |
| \`ref\` / \`out\` / \`in\` | By reference: read-write / must be assigned by callee / read-only |
| \`const\` vs \`readonly\` | Compile-time, inlined vs set once at runtime (declaration or constructor) |
| \`string\` | Immutable; loops use \`StringBuilder\` |
| \`==\` vs \`Equals\` | Operator chosen at compile time vs virtual method chosen at runtime |
| \`var\` / \`object\` / \`dynamic\` | Inferred static type / static type \`object\` / bound at runtime |
| \`(T)x\` / \`as\` / \`is\` | Throws / returns null / tests and binds |
| \`decimal\` vs \`double\` | Exact base-10 for money vs fast binary for science |

### Access modifiers

\`public\` (anyone), \`private\` (this type — the default for members), \`protected\` (this type and derived types), \`internal\` (this assembly — the default for top-level types), \`protected internal\` (derived types **or** this assembly), \`private protected\` (derived types **and** this assembly).`,
      items: [
        mcq("cs-rt-clr", {
          q: "What happens between writing C# and it executing on the CPU?",
          why: "**The C# compiler emits IL into an assembly, and at runtime the CLR's JIT compiler turns each method into native machine code the first time it is called.** The CLR then keeps running alongside your code, supplying garbage collection, type safety, exception handling and threading.\n\nThat two-stage design is why one `.dll` runs on x64 and ARM, why any .NET language (C#, F#, VB) can call any other — they all compile to the same IL and type system — and why reflection works, since the metadata travels with the IL.\n\nModern .NET blurs the edges: **tiered compilation** JITs a quick version first and re-optimises hot methods, **ReadyToRun** pre-compiles to shorten startup, and **Native AOT** compiles everything ahead of time for fast-starting, trimmed executables — at the cost of limits on runtime reflection and code generation.",
          tip: "Say 'IL, then JIT, then the CLR provides GC and type safety'. Mentioning Native AOT as the exception shows you are current.",
          c: ["clr", "runtime"],
          d: 1,
          choices: [
            {
              t: "It compiles to IL; the CLR JIT-compiles the IL to native code at runtime",
              ok: true,
              why: "Correct — two stages, with the runtime supplying the managed services.",
            },
            { t: "It compiles straight to machine code, like C++", why: "That is only true with Native AOT; the normal path goes through IL and the JIT." },
            { t: "The CLR interprets the IL one instruction at a time", why: "The CLR compiles to native code; it is not an interpreter." },
            { t: "The CLR is just the garbage collector; the OS runs the IL", why: "The OS cannot execute IL — the CLR compiles it and hosts it." },
          ],
        }),
        tf("cs-rt-managed", {
          q: "Because .NET has a garbage collector, a class that wraps a native file handle does not need to do anything special to release it.",
          why: "**False.** The GC manages **memory** — it tracks managed objects and reclaims them when they are unreachable. A file handle, socket, database connection or native buffer is an **unmanaged resource**: the GC can free the small wrapper object, but it has no idea the handle needs closing, and it collects on its own schedule anyway.\n\nSo a type that owns an unmanaged resource implements `IDisposable` and releases it in `Dispose()`, and callers use `using` to make that deterministic. In modern .NET you rarely hold raw handles yourself — wrap them in a `SafeHandle`, which carries its own finalizer as a last-resort safety net.\n\nThat is the whole distinction between managed and unmanaged code: whether the CLR is responsible for the thing's lifetime.",
          c: ["clr", "memory", "disposal"],
          d: 1,
          answer: false,
        }),
        mcq("cs-rt-gc-generations", {
          q: "Why does the .NET garbage collector divide the heap into generations 0, 1 and 2?",
          why: "**Because most objects die young, so collecting only the newest objects frequently reclaims most garbage for very little work.** New objects go into Gen 0. Anything that survives a collection is promoted — Gen 0 to Gen 1, Gen 1 to Gen 2 — and Gen 2 is collected only occasionally, in a full and comparatively expensive collection.\n\nGen 1 is a buffer: it catches objects that were only briefly alive at the moment Gen 0 was collected, so they do not pollute Gen 2. Objects of 85,000 bytes or more go straight onto the **large object heap**, which is collected along with Gen 2.\n\nThe practical consequence is the 'mid-life crisis': objects that live just long enough to reach Gen 2 and then die (per-request caches, large temporary buffers) force expensive full collections. Pooling, `ArrayPool<T>` and fewer allocations are the fix.",
          c: ["memory", "runtime", "clr"],
          d: 2,
          choices: [
            {
              t: "Most objects die young, so frequent cheap Gen 0 collections reclaim most garbage",
              ok: true,
              why: "Correct — the generational hypothesis.",
            },
            { t: "Each generation belongs to a different thread", why: "Generations are about object age, not threads." },
            { t: "Gen 2 is where value types are stored", why: "Generations group heap objects by age, not kind — a value type lives wherever its container does, which may be an object in any generation." },
            { t: "Objects move from Gen 2 back to Gen 0 as they get older", why: "Promotion only goes upwards: 0 to 1 to 2." },
          ],
        }),
        multi("cs-rt-gc-facts", {
          q: "Which statements about garbage collection and finalizers are true?",
          why: "Collection is **non-deterministic**: it is triggered when Gen 0's allocation budget is exceeded, when the OS reports low memory, or by an explicit `GC.Collect()` — you never know exactly when an object will be freed. Objects with a **finalizer** (`~MyType()`) survive at least one extra collection: the GC queues them, a dedicated finalizer thread runs the finalizer later, and only a subsequent collection reclaims them. Calling `GC.Collect()` in application code is almost always a smell — the GC tunes itself better than you can.\n\nThe traps: setting a variable to `null` only removes one reference; the object is freed at some later collection if nothing else points to it. And a finalizer is **not** `Dispose` — it runs at an unknown time on another thread, not when a variable goes out of scope. That is why the dispose pattern calls `GC.SuppressFinalize(this)`: once disposed, the finalizer is unnecessary cost.",
          c: ["memory", "disposal", "runtime"],
          d: 2,
          choices: [
            { t: "You cannot predict when a given object will be collected", ok: true },
            { t: "Allocation pressure on Gen 0 is a normal trigger for a collection", ok: true },
            { t: "Objects with finalizers take longer to reclaim than those without", ok: true },
            { t: "Calling `GC.Collect()` in application code is usually a mistake", ok: true },
            { t: "Setting a variable to `null` frees the object immediately", why: "It drops one reference; memory is reclaimed at a later collection." },
            { t: "A finalizer runs as soon as the object goes out of scope, like `Dispose`", why: "Finalizers run later, on the finalizer thread. Only `Dispose` via `using` is deterministic." },
          ],
        }),
        mcq("cs-rt-boxing", {
          q: "What happens on the second line?",
          code: `int n = 42;
object o = n;
int m = (int)o;`,
          lang: "csharp",
          why: "**Boxing: the runtime allocates a new object on the heap and copies the value 42 into it.** `o` references that box, not `n` — changing `n` afterwards does not affect `o`. The third line **unboxes**, copying the value back out; it must be unboxed to the exact type, so `(long)o` throws `InvalidCastException` even though an `int` would convert to a `long`.\n\nOne box is trivial. The cost is when it hides in a hot path: the non-generic `ArrayList` and `Hashtable` box every value, a struct used through an interface variable is boxed, and older APIs taking `object` box their arguments. Each box is an allocation, and the GC has to clean it up.\n\nGenerics removed most boxing — a `List<int>` stores its ints directly — which is one of the strongest arguments for them.",
          tip: "Follow up yourself with where boxing hides: `ArrayList`, a struct through an interface, APIs taking `object`.",
          c: ["value-vs-reference", "memory", "performance"],
          d: 1,
          choices: [
            { t: "A heap object is allocated and the value is copied into it", ok: true, why: "Correct — that is boxing." },
            { t: "`o` becomes a reference to `n` on the stack", why: "A reference cannot point at a stack local; the value is copied into a new box." },
            { t: "Nothing — `int` is already an `object`", why: "`int` derives from `object` in the type system, but converting it still allocates a box." },
            { t: "It does not compile without an explicit cast", why: "Boxing is implicit; only unboxing needs a cast." },
          ],
        }),
        mcq("cs-rt-ref-out-in", {
          q: "Which statement about `ref`, `out` and `in` parameters is correct?",
          why: "**`out` does not need to be initialised by the caller, but the method must assign it before returning.** That is the `TryParse` shape: `int.TryParse(s, out var n)`.\n\n`ref` is the other way round: the caller must initialise the variable, and the method may read and reassign it. `in` passes by reference but **read-only** — it exists to avoid copying large structs, while still promising not to modify them.\n\nThe classic misconception is that `ref` is pointless on a class. Without `ref`, a method receives a **copy of the reference**: it can mutate the object, but reassigning the parameter (`p = new Person()`) does not affect the caller's variable. With `ref`, it can replace the caller's object entirely.",
          tip: "Explain `TryParse` as your example for `out` — it instantly grounds the answer.",
          c: ["value-vs-reference"],
          d: 2,
          choices: [
            {
              t: "An `out` argument need not be initialised, but the method must assign it before returning",
              ok: true,
              why: "Correct — which is why `TryParse` uses it.",
            },
            { t: "`ref` on a class parameter is pointless, since classes are already passed by reference", why: "Classes pass a copy of the reference. `ref` lets the method reassign the caller's variable." },
            { t: "`ref` and `out` are interchangeable at the call site", why: "The compiler enforces different rules — definite assignment before the call for `ref`, inside the method for `out`." },
            { t: "`in` copies the argument so the method cannot modify the original", why: "`in` passes a read-only reference — its purpose is to avoid the copy." },
          ],
        }),
        mcq("cs-rt-const-readonly", {
          q: "A library has `public const int MaxItems = 50;`. You change it to 100 and ship the new DLL, but the app using it is not recompiled. What does the app see?",
          why: "**Still 50.** A `const` is a compile-time constant, and the compiler **copies its value into every caller's IL**. The app's assembly contains the literal 50; it never reads the library's field at runtime.\n\n`static readonly` avoids this: the value is read from the library at runtime, so the app picks up 100. That is why public constants should be things that genuinely never change (like `Math.PI`), and anything configurable should be `static readonly` or real configuration.\n\nThe other differences: `const` is implicitly static and limited to primitives, `string`, enums and `null`. A `readonly` field can hold any type, can be per-instance, and can be assigned in its declaration **or in a constructor**. Note that `readonly` only freezes the field — a `readonly List<int>` can still have items added.",
          tip: "The versioning hazard is what interviewers are listening for — most candidates only say 'compile-time vs runtime'.",
          c: ["runtime", "static-types"],
          d: 3,
          choices: [
            { t: "50 — the constant was inlined into the app when it was compiled", ok: true, why: "Correct — `static readonly` would give 100." },
            { t: "100 — the app reads the field from the new DLL", why: "That is `static readonly` behaviour; `const` is baked in." },
            { t: "It throws `MissingFieldException` at startup", why: "The app never touches the field at runtime, so nothing is missing." },
            { t: "0 — the field is re-initialised when the DLL changes", why: "Nothing is re-initialised; the old literal is simply in the app's code." },
          ],
        }),
        mcq("cs-rt-stringbuilder", {
          q: "Why is `StringBuilder` much faster than `+=` for building a string from 10,000 pieces?",
          why: "**Because `string` is immutable: each `+=` allocates a brand-new string and copies every character so far into it.** Over 10,000 appends that is quadratic work and 10,000 garbage strings. `StringBuilder` keeps a mutable, growing buffer and only produces a string once, when you call `ToString()`.\n\nDo not over-apply it, though. A single expression like `a + b + c` compiles to one `String.Concat` call, and string interpolation is already optimised — `StringBuilder` only earns its place when you append in a loop or across many statements.\n\nAlso note `StringBuilder` is **not** thread-safe; share one across threads and you will get corrupted output.",
          c: ["memory", "performance"],
          d: 1,
          choices: [
            {
              t: "Strings are immutable, so each `+=` copies everything into a new string",
              ok: true,
              why: "Correct — `StringBuilder` appends into a single growing buffer.",
            },
            { t: "`StringBuilder` is thread-safe, and strings are not", why: "It is the other way round — immutable strings are safe to share; `StringBuilder` is not." },
            { t: "Strings are value types, so passing them around copies them", why: "`string` is a reference type; the cost is the new allocation per `+=`." },
            { t: "`StringBuilder` stores its text on the stack", why: "Its buffer is on the heap; it is faster because it is mutable." },
          ],
        }),
        tf("cs-rt-intern", {
          q: "Two string variables with equal contents always refer to the same object in memory, because .NET interns every string.",
          why: "**False.** Only string **literals** and compile-time constant expressions are interned automatically — every `\"hello\"` literal in a program shares one instance. Strings built at runtime (concatenation of variables, `StringBuilder.ToString()`, reading a file or request) are new objects, even when their contents match. You can intern one manually with `string.Intern`, but that is rarely worth it.\n\nIt seldom matters, because `==` between two `string` variables compares **contents**. It matters when the static type is `object`: then `==` compares references, and whether two equal strings happen to be the same instance decides the result — a bug that appears to work with literals and fails with real data.",
          c: ["equality", "memory", "immutability"],
          d: 2,
          answer: false,
        }),
        mcq("cs-rt-equality", {
          q: "What do these print?",
          code: `object a = "hello";
object b = new string("hello".ToCharArray());
Console.WriteLine(a == b);
Console.WriteLine(a.Equals(b));`,
          lang: "csharp",
          why: "**`False`, then `True`.** Operators are chosen at **compile time** from the static types. Both variables are declared `object`, so `==` is `object`'s reference comparison — and these are two different string instances.\n\n`Equals` is a **virtual method**, dispatched at runtime on the actual object. The actual object is a `string`, and `string` overrides `Equals` to compare characters.\n\nThe three tools, then: `==` is whatever operator the static types select (value comparison for `string`, reference for `object` unless overloaded); `Equals` is the type's own idea of equality; `ReferenceEquals` always means 'same instance'. The trap: change `b` to the literal `\"hello\"` and `a == b` becomes `True`, because literals are interned — code that passes with test literals and fails with real data.",
          tip: "State the rule: operators bind statically, `Equals` dispatches virtually. That one sentence explains every variant of this question.",
          c: ["equality", "static-types"],
          d: 3,
          choices: [
            { t: "`False` then `True`", ok: true, why: "Correct — reference `==` on `object`, virtual `string.Equals`." },
            { t: "`True` then `True`", why: "That happens only if `a` and `b` are declared `string`, or both are the same interned literal." },
            { t: "`False` then `False`", why: "`Equals` dispatches to `string`'s override, which compares contents." },
            { t: "`True` then `False`", why: "Backwards — here `==` is the stricter comparison, checking identity rather than contents." },
          ],
        }),
        mcq("cs-rt-var-dynamic", {
          q: "`GetDuck()` is declared to return `object`. Which of these compiles fine but fails only at runtime if `Quack()` does not exist?",
          why: "**`dynamic`.** It switches off compile-time checking: member access is resolved at runtime by the Dynamic Language Runtime, and a missing member throws `RuntimeBinderException`. That is **late binding**; everything else in C# is **early binding**, checked by the compiler.\n\n`var` is not dynamic at all — the compiler infers a single static type from the initialiser, and `x.Quack()` fails at compile time if that type lacks it. `object` is a static type too; you would need a cast before calling anything beyond `ToString`, `Equals` and the like.\n\n`dynamic` has niche legitimate uses — COM interop, some JSON handling, calling into dynamic languages — but it throws away IntelliSense, refactoring safety and performance, so it should be rare.",
          c: ["static-types", "reflection"],
          d: 1,
          choices: [
            { t: "`dynamic x = GetDuck(); x.Quack();`", ok: true, why: "Correct — binding happens at runtime." },
            { t: "`var x = GetDuck(); x.Quack();`", why: "`var` infers `object` here — compile-time inference, so the missing member is a compile error." },
            { t: "`object x = GetDuck(); x.Quack();`", why: "`object` has no `Quack`, so this is a compile error." },
            { t: "All three", why: "Only `dynamic` defers checking to runtime." },
          ],
        }),
        multi("cs-rt-access", {
          q: "Which statements about access modifiers are true?",
          why: "`internal` means visible anywhere in the same assembly. `protected` means visible to derived classes — **including derived classes in other assemblies**. Class members default to `private`, and top-level types default to `internal`. `private protected` is the narrow one: derived classes **and** same assembly.\n\nThe trap is `protected internal`, which sounds like the intersection but is the **union**: accessible to derived classes anywhere, **or** to any code in the same assembly. And top-level types are not public by default — forgetting `public` on a class in a library makes it invisible to consumers.\n\nPrefer the narrowest modifier that works. Public surface is a promise you have to keep compatible.",
          c: ["oop"],
          d: 2,
          choices: [
            { t: "`internal` members are visible anywhere in the same assembly", ok: true },
            { t: "`protected` members are visible to derived classes, even in other assemblies", ok: true },
            { t: "Class members are `private` unless stated otherwise", ok: true },
            { t: "`private protected` limits access to derived classes in the same assembly", ok: true },
            { t: "`protected internal` means derived classes in the same assembly only", why: "It is the union: derived classes anywhere, or any code in the assembly. The intersection is `private protected`." },
            { t: "A top-level class is `public` by default", why: "It is `internal` by default." },
          ],
        }),
        multi("cs-rt-casting", {
          q: "Which statements about `(Foo)obj`, `obj as Foo` and `obj is Foo f` are true?",
          why: "A **cast** `(Foo)obj` throws `InvalidCastException` if `obj` is not a `Foo`. `as` returns `null` instead of throwing. The **pattern** `obj is Foo f` tests and assigns in one step, and `f` is only definitely assigned where the test succeeded.\n\nThe traps: `as` only works with reference types and nullable value types — `obj as int` does not compile, because there is no `null` to return. And `is` returns `false` for `null`, whatever the variable's declared type.\n\nModern style: use the `is` pattern when a failed match is expected, and a cast when failure would be a bug you want thrown. `as` followed by a null check is the older spelling of the `is` pattern.",
          c: ["static-types", "oop"],
          d: 2,
          choices: [
            { t: "`(Foo)obj` throws `InvalidCastException` when `obj` is not a `Foo`", ok: true },
            { t: "`obj as Foo` returns `null` rather than throwing", ok: true },
            { t: "`obj is Foo f` tests the type and binds `f` in one step", ok: true },
            { t: "`obj as int` is a safe way to unbox", why: "It does not compile — `as` needs a type that can be null. Use `obj as int?` or `obj is int n`." },
            { t: "`obj is Foo` is true when `obj` is null but declared as `Foo`", why: "`is` checks the runtime object, and `null` has none — it returns false." },
          ],
        }),
        mcq("cs-rt-decimal", {
          q: "Why should money be stored as `decimal` rather than `double`?",
          code: `Console.WriteLine(0.1 + 0.2 == 0.3);     // False
Console.WriteLine(0.1m + 0.2m == 0.3m);  // True`,
          lang: "csharp",
          why: "**`decimal` is a base-10 type, so values like 0.1 are stored exactly; `double` is binary floating point and cannot represent 0.1 at all.** With `double`, every cent carries a tiny error, and sums, comparisons and rounding drift — the kind of bug an auditor finds.\n\n`decimal` is 128 bits with 28-29 significant digits. The trade-offs: it is slower (much of its arithmetic is done in software rather than by the FPU) and its **range is far smaller** than `double`'s. It is still not infinitely precise — `1m / 3m` is rounded — it just rounds the way humans and accountants expect.\n\nUse `double` for measurement and science, where range and speed matter and tiny relative errors are acceptable. Use `decimal` wherever someone will add up the numbers and expect the pennies to match. In SQL, map it to `decimal(p, s)`, not `float`.",
          c: ["static-types"],
          d: 1,
          choices: [
            { t: "It is base-10, so amounts like 0.1 are exact", ok: true, why: "Correct — no binary rounding error on cents." },
            { t: "It has a larger range than `double`", why: "Its range is much smaller; `double` reaches around 10^308." },
            { t: "`double` cannot store fractional values", why: "It can — just not exactly for most decimal fractions." },
            { t: "`decimal` arithmetic is faster", why: "It is slower; exactness is the reason to pay for it." },
          ],
        }),
        mcq("cs-rt-reflection", {
          q: "What is reflection, and what is its main cost?",
          code: `var method = obj.GetType().GetMethod("Save");
method?.Invoke(obj, null);`,
          lang: "csharp",
          why: "**Reflection is inspecting and using type metadata at runtime — listing properties, reading attributes, creating instances and invoking members by name. Its main cost is speed and safety: it is far slower than a direct call and moves errors from compile time to runtime.**\n\nIt works because assemblies carry full metadata alongside the IL. Most of it is used by frameworks rather than application code: serialisers walking properties, DI containers finding constructors, ORMs mapping columns, test runners finding `[Fact]` methods.\n\nIn your own code, reach for it rarely. When you must, cache the `MethodInfo`/`PropertyInfo` rather than looking it up per call. Modern .NET increasingly replaces it with **source generators** (System.Text.Json and logging both use them), because reflection also fights with trimming and Native AOT — the trimmer cannot see members you only reference by string.",
          c: ["reflection", "runtime", "performance"],
          d: 2,
          choices: [
            {
              t: "Runtime inspection and invocation of types via metadata — slower, and unchecked by the compiler",
              ok: true,
              why: "Correct — frameworks rely on it; application code should use it sparingly.",
            },
            { t: "A compile-time feature that generates code from attributes", why: "That describes source generators, which are the modern alternative." },
            { t: "Copying an object's fields into a new object", why: "That is cloning; reflection can be used to do it, but it is not what reflection is." },
            { t: "It is free after the first call, because the JIT inlines it", why: "Each `Invoke` still goes through binding and argument checks; cache or avoid it in hot paths." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-linq", {
      title: "Collections & LINQ",
      level: 2,
      summary: "Choosing the right container, and LINQ's deferred execution trap.",
      keyIdeas: [
        "LINQ is lazy: a query variable is a description, and each terminal operation re-executes it.",
        "`IQueryable` translates to SQL; `.ToList()` or `.AsEnumerable()` pulls everything into memory — materialise last.",
        "`First` throws on empty, `FirstOrDefault` returns default (0 for int!), `Single` throws on more than one.",
        "`Any()` beats `Count() > 0` — it stops early and translates to EXISTS.",
        "Membership tests in a loop need `HashSet<T>` (O(1)), not `List<T>.Contains` (O(n)).",
      ],
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
        mcq("cs-linq-interfaces", {
          q: "Which interface adds `Count`, `Add` and `Remove` to a sequence, but **not** access by index?",
          why: "**`ICollection<T>`.** The collection interfaces form a ladder, each adding capability:\n\n- `IEnumerable<T>` — you can iterate it. Nothing else; it may even be lazy or infinite.\n- `ICollection<T>` — adds `Count`, `Add`, `Remove`, `Contains`, `Clear`.\n- `IList<T>` — adds the indexer `[i]`, `IndexOf`, `Insert`, `RemoveAt`.\n- `IQueryable<T>` — a separate branch: an `IEnumerable<T>` that carries an expression tree and a provider, so a LINQ query can be translated to SQL instead of run in memory.\n\nThe design rule: **accept the widest type you can use, return the most useful type you can promise.** A method that only loops should take `IEnumerable<T>`. One that returns data to callers might return `IReadOnlyList<T>`, which offers `Count` and indexing without letting them mutate your list. Note that arrays implement `IList<T>` but throw `NotSupportedException` from `Add` — the interface allows that, which is a known wart.",
          tip: "Finish with 'take `IEnumerable<T>`, return `IReadOnlyList<T>`' — it shows you use these types for API design, not just recall.",
          c: ["collections", "linq"],
          d: 2,
          choices: [
            { t: "`ICollection<T>`", ok: true, why: "Correct — count and mutation, but no indexer." },
            { t: "`IEnumerable<T>`", why: "It only supports iteration — no `Count` property, no `Add`." },
            { t: "`IList<T>`", why: "`IList<T>` is the one that adds indexed access on top of `ICollection<T>`." },
            { t: "`IQueryable<T>`", why: "It adds an expression tree for query translation, not mutation." },
          ],
        }),
        mcq("cs-linq-capture", {
          q: "What is printed?",
          code: `var nums = new List<int> { 5, 50, 500 };
int min = 10;
var query = nums.Where(n => n > min);
min = 100;
Console.WriteLine(query.Count());`,
          lang: "csharp",
          why: "**1.** The lambda captures the **variable** `min`, not its value at the moment the query was written. The query does not run until `Count()` enumerates it, and by then `min` is 100 — so only 500 passes.\n\nThe same applies to the source: add an item to `nums` before enumerating and the query sees it. A LINQ query is a recipe that reads its inputs when it is executed, not when it is defined.\n\nThis bites in real code when a query is built in one place and enumerated later — after a loop has moved on, or after a filter variable was reassigned. If you need a snapshot, materialise with `ToList()` at the point where the values are right.",
          c: ["linq", "closures"],
          d: 2,
          choices: [
            { t: "`1`", ok: true, why: "Correct — the filter reads `min` at execution time, when it is 100." },
            { t: "`2`", why: "That assumes the value 10 was captured when the query was defined." },
            { t: "`3`", why: "The filter still applies; it just uses the later value." },
            { t: "`0`", why: "500 is greater than 100, so one item passes." },
          ],
        }),
        short("cs-linq-hashcode", {
          q: "*\"You use a custom class as a `Dictionary` key and override `Equals`. What else must you do, and what breaks if you don't?\"*",
          why: "The `Equals`/`GetHashCode` contract is the mechanism behind every hash-based collection — and breaking it produces lookups that silently fail.\n\nA strong answer states the contract, explains how a dictionary uses it, and then names the mutable-key trap.",
          tip: "Mentioning records (which generate both correctly) and mutable keys lifts this from textbook to experienced.",
          model:
            "You must also override `GetHashCode`, and it has to agree with `Equals`: **if two objects are equal, they must return the same hash code**. The reverse is not required — different objects can collide, that's fine.\n\nThe reason is how `Dictionary` and `HashSet` work. They call `GetHashCode` first to pick a bucket, and only then call `Equals` on the entries in that bucket. If I override `Equals` but not `GetHashCode`, I get the default reference-based hash, so two 'equal' keys land in different buckets and a lookup with an equal-but-different instance just returns not-found. No exception, just missing data.\n\nThe second trap is mutable keys. If a field that feeds the hash changes after the object is inserted, the entry is now sitting in the wrong bucket and can't be found or removed. So hash only on immutable data.\n\nIn practice I'd implement `IEquatable<T>` so structs avoid boxing, use `HashCode.Combine(Id, Name)` for the hash, or just make it a `record`, which generates both correctly.",
          points: [
            "Equal objects must return equal hash codes; collisions are allowed",
            "Dictionary buckets by GetHashCode, then confirms with Equals",
            "Overriding only Equals makes lookups silently miss",
            "Mutating a key after insertion strands the entry",
            "Use `HashCode.Combine`, `IEquatable<T>`, or a record",
          ],
          c: ["equality", "collections"],
          d: 3,
          secs: 120,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-async", {
      title: "async / await & Tasks",
      level: 2,
      summary: "Why async helps a web server, and the deadlock everyone hits once.",
      keyIdeas: [
        "`await` returns the thread to the pool during I/O — it improves throughput, not per-request latency.",
        "`.Result` and `.Wait()` block the thread and can deadlock under a single-threaded synchronisation context (UI, classic ASP.NET). Async all the way.",
        "Sequential awaits serialise independent calls; start them and `await Task.WhenAll` — but not on one `DbContext`.",
        "`async void` is only for event handlers; its exceptions cannot be caught and crash the process.",
        "Accept and pass a `CancellationToken`; `Task.Run` is for CPU-bound work, not for wrapping I/O.",
      ],
      brief: `\`async\`/\`await\` in C# is about **thread liberation**, not speed. When you \`await\` an I/O operation, the thread is returned to the pool instead of sitting blocked. On a web server with a fixed thread pool, that is the difference between handling hundreds of concurrent requests and exhausting the pool.

The rules:

**Never block on async code.** \`.Result\` and \`.Wait()\` block the thread and, in contexts with a single-threaded synchronisation context (classic ASP.NET, WinForms, WPF), can cause a **deadlock**: the awaited continuation needs the context the blocked thread is holding. ASP.NET **Core** has no synchronisation context so it will not deadlock — but it still wastes a pooled thread. Async all the way up.

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
          why: "It **blocks the calling thread** until the task completes. Under a single-threaded synchronisation context — classic ASP.NET, WinForms, WPF — an awaited continuation (without `ConfigureAwait(false)`) must resume *on that same context*, which the blocked thread is holding. Neither can proceed: a deadlock, with no exception and no stack trace.\n\nASP.NET Core removed the synchronisation context, so it does not deadlock there — but it still consumes a pool thread for the duration, which defeats the entire purpose of async and can exhaust the pool under load.\n\nThe rule: **async all the way up**. If a method calls async code, it should be async itself.",
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
            { t: "`caught` is printed", why: "The async machinery captures the exception and rethrows it later, after the try block has completed." },
            { t: "It is swallowed silently", why: "It is not silent — it terminates the process." },
            { t: "It is stored on a Task for later inspection", why: "There is no Task with `async void`." },
          ],
        }),
        mcq("cs-async-task-thread", {
          q: "What is the essential difference between a `Task` and a `Thread`?",
          why: "**A `Thread` is an operating-system thread you create and own; a `Task` is a representation of work that will complete in the future, which may or may not involve a thread.** CPU-bound tasks (`Task.Run`) borrow a thread-pool thread. I/O-bound tasks — a database call, an HTTP request — typically occupy **no thread at all** while waiting; the OS signals completion and a continuation is scheduled.\n\nTasks also give you what raw threads do not: a result (`Task<T>`), exception propagation to whoever awaits, cancellation, and composition with `await`, `WhenAll` and `WhenAny`.\n\nCreating a `Thread` costs about a megabyte of reserved stack and a kernel object, so in modern code you almost never do it — the exceptions are long-running dedicated work, or needing control over thread settings such as apartment state.",
          tip: "The line that impresses: 'an I/O-bound task has no thread behind it while it waits'.",
          c: ["async-await", "concurrency", "runtime"],
          d: 2,
          choices: [
            {
              t: "A Thread is an OS thread you own; a Task is a future result, usually pooled — and I/O tasks may use no thread while waiting",
              ok: true,
              why: "Correct — a Task is an abstraction over work, not over threads.",
            },
            { t: "Every `Task` creates a new thread when it starts", why: "Tasks reuse pool threads, and I/O tasks need none while waiting." },
            { t: "They are the same; `Task` is simply the newer name", why: "They are different abstractions — work versus OS thread." },
            { t: "A `Thread` can be awaited, but a `Task` cannot return a value", why: "Backwards: tasks are awaitable and `Task<T>` returns a value." },
          ],
        }),
        mcq("cs-async-configureawait", {
          q: "What does `ConfigureAwait(false)` do?",
          code: `var data = await httpClient.GetStringAsync(url).ConfigureAwait(false);`,
          lang: "csharp",
          why: "**It tells the `await` not to resume on the captured context — the continuation may run on any thread-pool thread.** By default, `await` captures the current `SynchronizationContext` (the UI thread in WPF or WinForms, the request context in classic ASP.NET) and posts the rest of the method back to it.\n\nWhen it matters: in **library code**, which should not care about its caller's context — it avoids an unnecessary hop and reduces the risk of the sync-over-async deadlock. When it does not: **ASP.NET Core has no synchronisation context**, so in application code there it changes essentially nothing. And in UI code, you must *not* use it before touching controls, since you would no longer be on the UI thread.\n\nTwo subtleties: if the task has already completed, execution simply continues synchronously and the setting has no effect; and it only protects against the deadlock if *every* await down the chain uses it — it is not a fix for calling `.Result`.",
          tip: "Saying 'irrelevant in ASP.NET Core app code, still good practice in libraries' is the answer most interviewers want.",
          c: ["async-await", "concurrency"],
          d: 3,
          choices: [
            {
              t: "Resumes the method without returning to the captured synchronisation context",
              ok: true,
              why: "Correct — it removes the hop back to the original context.",
            },
            { t: "Runs the awaited operation on a background thread", why: "It does not change where the operation runs, only where the continuation resumes." },
            { t: "Makes the call fire-and-forget, so it is not awaited", why: "The method still awaits and receives the result." },
            { t: "Stops exceptions from the task being rethrown", why: "Exceptions propagate exactly as before." },
          ],
        }),
        multi("cs-async-thread-safety", {
          q: "Which statements about thread safety in C# are true?",
          why: "`lock (obj) { ... }` lets only one thread at a time into any block locked on the **same object**. `count++` is not atomic — it is read, add, write, and two threads can interleave and lose an update. `Interlocked.Increment(ref count)` does the same thing atomically without a lock. And you cannot `await` inside a `lock` — it is a compile error, because the lock is tied to a thread and the method might resume on another. Use `SemaphoreSlim.WaitAsync()` for async mutual exclusion.\n\nThe traps: lock on a **private, dedicated object** (or the `System.Threading.Lock` type in .NET 9+), never on `this`, a `Type` or a string — other code can lock the same object and deadlock you. And `ConcurrentDictionary.GetOrAdd` is thread-safe for the dictionary, but its value factory **can run more than once** under contention; only one result is stored. Wrap the value in `Lazy<T>` if the factory must run exactly once.",
          c: ["concurrency"],
          d: 3,
          choices: [
            { t: "`count++` on a shared field can lose updates under concurrency", ok: true },
            { t: "`Interlocked.Increment` performs the increment atomically without a lock", ok: true },
            { t: "You cannot `await` inside a `lock` block", ok: true },
            { t: "`lock` allows one thread at a time per lock object", ok: true },
            { t: "`lock (this)` is the recommended pattern", why: "Outside code can lock the same instance. Lock on a private object." },
            { t: "`ConcurrentDictionary.GetOrAdd` guarantees its value factory runs exactly once", why: "The factory can run on several threads at once; only one result wins. Use `Lazy<T>` values if that matters." },
          ],
        }),
        tf("cs-async-valuetask", {
          q: "`ValueTask<T>` should replace `Task<T>` as the return type of every async method, because it avoids an allocation.",
          why: "**False.** `ValueTask<T>` is a struct that avoids allocating a `Task` **when the result is often available synchronously** — a cache hit, or a buffered stream that already has the data. In those hot paths it saves real allocations. When the method genuinely awaits I/O most of the time, there is little to gain.\n\nIt also comes with rules that `Task` does not have: a `ValueTask` must be consumed **once**. Do not await it twice, do not await it concurrently, and do not read `.Result` before it completes — it may be backed by a pooled object that has already been reused. If you need to do any of those, call `.AsTask()`.\n\nSo the guidance is: default to `Task`, and use `ValueTask` in measured hot paths where synchronous completion is common.",
          c: ["async-await", "performance"],
          d: 3,
          answer: false,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-delegates", {
      title: "Delegates, Events & Lambdas",
      level: 2,
      summary: "Methods as values: callbacks, events, closures and the machinery under LINQ.",
      keyIdeas: [
        "A delegate is a type-safe reference to one or more methods with a given signature.",
        "`event` restricts outsiders to `+=` and `-=` — only the owner can raise it or reset the list.",
        "`Func` returns a value (last type argument), `Action` returns void, `Predicate<T>` returns bool.",
        "Lambdas capture variables, not values. A `for` loop variable is shared; `foreach` gets a fresh one per iteration.",
        "A subscriber the publisher still references cannot be collected — unsubscribe from longer-lived publishers.",
        "LINQ is extension methods taking delegates, often over `yield return` iterators that run lazily.",
      ],
      brief: `### Delegates

A **delegate** is a type-safe object that points at a method — or several. It is how C# treats methods as values:

\`\`\`csharp
Func<int, int, int> add = (a, b) => a + b;   // takes two ints, returns int
Action<string> log = msg => Console.WriteLine(msg);
Predicate<User> isAdmin = u => u.Role == "admin";
\`\`\`

| Type | Signature | Typical use |
|---|---|---|
| \`Func<T1, …, TResult>\` | returns the last type argument | LINQ selectors, factories |
| \`Action<T1, …>\` | returns \`void\` | callbacks, handlers |
| \`Predicate<T>\` | returns \`bool\` | \`List<T>.FindAll\`, \`RemoveAll\` |

Delegates are **multicast**: \`+=\` combines them into an invocation list, and calling it runs every target in order.

### Events

An \`event\` is a delegate with a restricted public surface. Outside the declaring class you can only **subscribe** (\`+=\`) and **unsubscribe** (\`-=\`). Only the owner can **raise** it — so a subscriber cannot fire someone else's event or wipe the list with \`=\`. This is the **Observer pattern** built into the language:

\`\`\`csharp
public event EventHandler<OrderPlacedEventArgs>? OrderPlaced;
protected virtual void OnOrderPlaced(OrderPlacedEventArgs e) => OrderPlaced?.Invoke(this, e);
\`\`\`

The publisher holds a reference to every subscriber. If the publisher lives longer than the subscribers and they never unsubscribe, they cannot be collected — the classic .NET memory leak.

### Lambdas and closures

A lambda can use local variables from its enclosing method. The compiler **hoists** those variables into a heap-allocated closure object, so the lambda sees the **variable**, not a snapshot. That is powerful, and it is also the source of the loop-capture bug.

### Iterators and extension methods

\`yield return\` turns a method into a lazy iterator: nothing runs until someone enumerates it. **Extension methods** — static methods whose first parameter is marked \`this\` — let \`Where\`, \`Select\` and friends appear on any \`IEnumerable<T>\`. Put the two together and you have LINQ to Objects.`,
      items: [
        mcq("cs-del-what", {
          q: "What is a delegate in C#?",
          why: "**A type-safe object that references one or more methods with a specific signature, and can be invoked like a method.** `Func<int, bool>` can only hold methods that take an `int` and return a `bool`; the compiler checks it.\n\nUnder the hood each delegate type is a class deriving from `MulticastDelegate`. An instance stores the target method, the object to call it on (for instance methods), and an invocation list for multicast.\n\nDelegates are what let you pass behaviour as a parameter — LINQ's `Where(x => ...)`, callbacks, `Task.Run(() => ...)` and events all sit on top of them. The comparison interviewers like is 'a type-safe function pointer', with the emphasis on type-safe.",
          c: ["delegates"],
          d: 1,
          choices: [
            {
              t: "A type-safe reference to one or more methods with a given signature",
              ok: true,
              why: "Correct — and the compiler checks the signature.",
            },
            { t: "An untyped function pointer, like in C", why: "The key difference from C is that delegates are fully type-checked." },
            { t: "An interface that has exactly one method", why: "Similar in purpose, but delegates are their own kind of type, derived from `MulticastDelegate`." },
            { t: "A lightweight thread for running a method in the background", why: "Invoking a delegate is an ordinary synchronous call." },
          ],
        }),
        mcq("cs-del-multicast", {
          q: "What is printed?",
          code: `Func<int> f = () => 1;
f += () => 2;
Console.WriteLine(f());`,
          lang: "csharp",
          why: "**2.** `+=` makes `f` a **multicast** delegate with two targets. Invoking it runs both, in the order they were added — but a delegate call can only return one value, so you get the **last** target's result. The `1` is computed and thrown away.\n\nThat is why multicast is really meant for `void` delegates like `Action` and event handlers. If you need every result, iterate `f.GetInvocationList()` and invoke each one yourself.\n\nThe same applies to exceptions: if one target throws, the rest of the list does not run. For events where one bad subscriber should not starve the others, loop over the invocation list with a `try/catch` per handler.",
          c: ["delegates"],
          d: 3,
          choices: [
            { t: "`2`", ok: true, why: "Correct — both run; the last result is returned." },
            { t: "`1`", why: "The first target runs, but its result is discarded." },
            { t: "`3`", why: "Results are not combined — only the last is returned." },
            { t: "It does not compile — `+=` needs an event", why: "`+=` works on any delegate; it calls `Delegate.Combine`." },
          ],
        }),
        mcq("cs-del-event", {
          q: "What does the `event` keyword add over a public delegate field?",
          code: `public Action? Changed;         // delegate field
public event Action? Changed;   // event`,
          lang: "csharp",
          why: "**Encapsulation: outside the declaring class, code can only `+=` and `-=`. It cannot invoke the event, and it cannot assign it with `=`.**\n\nWith a plain public delegate field, any subscriber could write `publisher.Changed = MyHandler;` — silently removing every other subscriber — or call `publisher.Changed()` to fire the notification itself, pretending the change happened. The `event` keyword makes raising the event the owner's responsibility alone.\n\nIt does not change how invocation works: an event is still a multicast delegate underneath, raised synchronously, in subscription order. Conventionally you raise it with `Changed?.Invoke()`, which avoids a race between the null check and an unsubscribe on another thread.",
          tip: "'Only the owner can raise it or reset it' is the one-sentence answer.",
          c: ["delegates", "oop"],
          d: 2,
          choices: [
            {
              t: "Outsiders can only subscribe and unsubscribe — not invoke it or overwrite it with `=`",
              ok: true,
              why: "Correct — that is the whole point of the keyword.",
            },
            { t: "It makes handlers run asynchronously", why: "Events are raised synchronously, like any delegate call." },
            { t: "Subscriptions become weak references, so they cannot leak", why: "Events hold strong references — which is exactly how they leak." },
            { t: "It allows more than one subscriber, which a delegate cannot have", why: "Every delegate can be multicast; `event` only restricts access." },
          ],
        }),
        multi("cs-del-func-action", {
          q: "Which statements about `Func`, `Action` and `Predicate` are true?",
          why: "`Func<int, string>` takes an `int` and returns a `string` — the **last** type argument is always the return type. `Action<string>` takes a `string` and returns `void`. `Predicate<T>` takes a `T` and returns `bool`, which is why `List<T>.FindAll` and `RemoveAll` use it. A lambda like `x => x > 0` has no type of its own, so it converts to whichever compatible delegate type is expected.\n\nThe trap: `Predicate<int>` and `Func<int, bool>` have identical shapes but are **different types**, and delegate types do not convert to one another. You cannot pass an existing `Predicate<int>` variable where a `Func<int, bool>` is required — you would have to wrap it (`x => pred(x)`). This is why LINQ's `Where` takes `Func<T, bool>` and older `List<T>` methods take `Predicate<T>`, and why modern code standardises on `Func`.",
          c: ["delegates", "generics"],
          d: 1,
          choices: [
            { t: "In `Func<int, string>`, `string` is the return type", ok: true },
            { t: "`Action<string>` takes a string and returns nothing", ok: true },
            { t: "The lambda `x => x > 0` can be assigned to either `Predicate<int>` or `Func<int, bool>`", ok: true },
            { t: "A `Predicate<int>` variable can be passed wherever a `Func<int, bool>` is expected", why: "Same shape, different types — delegate types do not convert to each other." },
            { t: "`Action<int, string>` returns a `string`", why: "`Action` always returns `void`; use `Func<int, string>` for a result." },
          ],
        }),
        mcq("cs-del-closure-loop", {
          q: "What is printed?",
          code: `var actions = new List<Action>();
for (int i = 0; i < 3; i++)
    actions.Add(() => Console.Write(i));
foreach (var a in actions) a();`,
          lang: "csharp",
          why: "**`333`.** All three lambdas capture the **same variable** `i`, not its value at the time. A `for` loop declares `i` once, outside the iterations, so by the time the lambdas run the loop has finished and `i` is 3.\n\nThe fix is to copy it into a variable declared **inside** the loop body: `int copy = i; actions.Add(() => Console.Write(copy));` — each iteration then gets its own variable, and it prints `012`.\n\nNote the history: before C# 5, `foreach` had the same bug. C# 5 changed `foreach` so its loop variable is fresh per iteration, but `for` still shares one — so the `foreach` version of this code prints `012` today. It is exactly the same trap as `var` in a JavaScript `for` loop.",
          tip: "Explain it as 'captures the variable, not the value', then mention the C# 5 `foreach` change.",
          c: ["closures", "delegates"],
          d: 3,
          choices: [
            { t: "`333`", ok: true, why: "Correct — one shared `i`, read after the loop has ended." },
            { t: "`012`", why: "That is what `foreach`, or a copy inside the loop body, would give." },
            { t: "`222`", why: "The loop increments `i` to 3 before the condition fails." },
            { t: "It does not compile — lambdas cannot use loop variables", why: "Capturing loop variables is allowed; that is why the trap exists." },
          ],
        }),
        tf("cs-del-closure-hoist", {
          q: "When a lambda captures a local variable, the compiler moves that variable into a heap-allocated object, so it can outlive the method that declared it.",
          why: "**True.** The compiler generates a hidden closure class (often called a 'display class'), turns the captured local into a field on it, and makes both the method and the lambda use that field. That is how a lambda stored in a list or passed to `Task.Run` can still read and write the variable after the method returns.\n\nTwo consequences. First, it is why lambdas see later changes to the variable — there is only one field. Second, it costs an allocation, which matters in hot paths: a lambda that captures nothing can be cached and reused, while a capturing one allocates each time the enclosing code runs.\n\nC# 9 added `static` lambdas (`static x => x * 2`), which the compiler rejects if they try to capture anything — a cheap way to guarantee no hidden allocation.",
          c: ["closures", "delegates", "memory"],
          d: 2,
          answer: true,
        }),
        tf("cs-del-yield", {
          q: "A method that uses `yield return` starts running its body as soon as it is called, up to the first `yield`.",
          code: `IEnumerable<int> Numbers(int max)
{
    if (max < 0) throw new ArgumentOutOfRangeException(nameof(max));
    for (int i = 0; i < max; i++) yield return i;
}`,
          lang: "csharp",
          why: "**False.** Calling an iterator method runs **none** of its body. The compiler rewrites it into a state machine, and the call just returns an object that implements `IEnumerable<T>`. The body only starts on the first `MoveNext()` — the first iteration of a `foreach`, or a `ToList()`.\n\nThe practical consequence is in the example: `Numbers(-1)` does **not** throw. The argument check only fires when someone eventually enumerates the result, possibly far away from the bad call. The standard fix is to split the method: a public, non-iterator method validates eagerly and returns a call to a private iterator (a local function works well).\n\nThis laziness is the same deferred execution that LINQ is built on — `Where` and `Select` are iterators.",
          c: ["linq", "collections"],
          d: 2,
          answer: false,
        }),
        multi("cs-del-extension", {
          q: "Which statements about extension methods are true?",
          code: `public static class StringExtensions
{
    public static bool IsBlank(this string? s) => string.IsNullOrWhiteSpace(s);
}`,
          lang: "csharp",
          why: "Extension methods are **static methods in a non-generic static class, with `this` before the first parameter**. The compiler rewrites `name.IsBlank()` into `StringExtensions.IsBlank(name)` — pure syntactic sugar, resolved at **compile time** from the variable's static type. That is exactly how LINQ works: `Where` and `Select` are extension methods on `IEnumerable<T>` in `System.Linq.Enumerable`, which is why they appear only once you add `using System.Linq`.\n\nThey cannot see private members — they are ordinary outside code. And if the type has an instance method with a matching signature, **the instance method always wins**, so an extension can never override existing behaviour.\n\nA neat consequence of the rewriting: an extension method can be called on a `null` reference without throwing, since nothing is dereferenced — which is why `IsBlank` above works on null.",
          c: ["linq", "oop", "static-types"],
          d: 2,
          choices: [
            { t: "They are static methods in a static class, with `this` on the first parameter", ok: true },
            { t: "`list.Where(...)` compiles into a call to `Enumerable.Where(list, ...)`", ok: true },
            { t: "An instance method with the same signature takes priority over the extension", ok: true },
            { t: "They can access the private members of the type they extend", why: "They are outside code, limited to the public (or internal) surface." },
            { t: "They are chosen at runtime based on the object's actual type", why: "Resolution is at compile time, from the static type — no virtual dispatch." },
          ],
        }),
        mcq("cs-del-leak", {
          q: "A singleton service exposes an event. Short-lived view models subscribe in their constructors and never unsubscribe. What happens?",
          why: "**The view models are never garbage collected — a memory leak.** Subscribing stores a delegate in the publisher's invocation list, and that delegate holds a strong reference to the subscriber. As long as the singleton lives, it keeps every subscriber reachable, and every one of them still runs its handler whenever the event fires — often on stale state.\n\nThe fix is to unsubscribe with `-=` when the subscriber's lifetime ends, typically by implementing `IDisposable`. For frameworks where you cannot control teardown, use a **weak event** pattern (WPF's `WeakEventManager`, or a messenger that holds weak references).\n\nThe rule of thumb: this matters when the **publisher outlives the subscriber**. A child control subscribing to its own button's event is fine — they die together.",
          tip: "'The publisher keeps the subscriber alive' is the key sentence. Then say *when* it matters.",
          c: ["delegates", "memory"],
          d: 2,
          choices: [
            {
              t: "The singleton keeps every view model reachable, so they are never collected",
              ok: true,
              why: "Correct — the event's delegate holds a strong reference.",
            },
            { t: "Nothing — event subscriptions are weak references", why: "They are strong references; weak events need explicit support." },
            { t: "The event throws `ObjectDisposedException` once a view model is gone", why: "The view model is never gone — that is the problem." },
            { t: "It only matters if the event is `static`", why: "A static event is the worst case, but any longer-lived publisher causes it." },
          ],
        }),
        short("cs-del-callback-choice", {
          q: "*\"For a callback, when would you use a `Func` parameter, an `event`, or an interface?\"*",
          why: "A design-judgement question: all three let code call back into other code, but they express different relationships.\n\nThe answer should map each tool to a situation — one-off behaviour passed in, many observers, or a rich contract — rather than naming a favourite.",
          tip: "Tie it to patterns: `Func` is lightweight Strategy, `event` is Observer, interface is full Strategy or a DI-resolved dependency.",
          model:
            "They express different relationships, so I pick by the shape of the collaboration.\n\nA **`Func` or `Action` parameter** is for a single piece of behaviour the caller supplies for this call — LINQ's `Where(x => ...)`, a retry helper taking the operation to retry, a sort key. It's the lightest-weight option, and it's essentially the Strategy pattern without the ceremony.\n\nAn **`event`** is for notifications where the publisher doesn't know or care who's listening: zero, one or many subscribers, each attaching and detaching independently. That's the Observer pattern. The trade-off is lifetime — subscribers have to unsubscribe from longer-lived publishers or they leak.\n\nAn **interface** is for when the callback is really a contract: several related methods, state, or something resolved from DI and substituted in tests — `IComparer<T>`, `IValidator<T>`, a payment provider. It's discoverable and mockable, and a class can implement it with its own dependencies.\n\nSo: one-off behaviour, `Func`; broadcast, `event`; a real collaborator, interface.",
          points: [
            "`Func`/`Action` — a single behaviour supplied per call",
            "`event` — broadcast to many independent subscribers (Observer)",
            "Events need unsubscribing from longer-lived publishers",
            "Interface — multi-method contract, DI-resolved and mockable",
          ],
          c: ["delegates", "design-patterns", "oop"],
          d: 3,
          secs: 120,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-modern", {
      title: "Modern C# & Quality",
      level: 3,
      summary: "Records, pattern matching, disposal and exception handling.",
      keyIdeas: [
        "Records give value equality, `ToString`, deconstruction and `with` — the default for DTOs.",
        "Pattern matching (`switch` expressions, property patterns) replaces if/is/cast chains.",
        "`throw;` preserves the stack trace; `throw ex;` destroys it. Wrap with an inner exception to add context.",
        "`using` disposes deterministically — connections, streams, `HttpResponseMessage`. The GC handles memory only.",
        "Catch specific exceptions you can handle; never an empty `catch {}`; use `TryParse` for expected failures.",
      ],
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
        mcq("cs-modern-exception-filter", {
          q: "What is the advantage of an exception filter over catching and rethrowing?",
          code: `catch (HttpRequestException ex) when (ex.StatusCode == HttpStatusCode.NotFound)
{
    return null;
}`,
          lang: "csharp",
          why: "**The `when` condition is evaluated before the stack unwinds, so if it is false the exception carries on as though this `catch` did not exist — untouched.** With catch-check-rethrow, the exception is caught, the stack is unwound to this frame, and then rethrown, which loses the state a debugger or crash dump would have shown at the original throw.\n\nIt also reads better: the intent — 'handle 404, let everything else through' — sits on one line instead of an `if` with a `throw;` in the else branch.\n\nA known idiom uses a filter purely for logging: `catch (Exception ex) when (Log(ex))`, where `Log` returns `false`. The exception is logged with its full stack intact and never actually caught. Keep filters cheap and side-effect free otherwise, since they run during the exception dispatch.",
          c: ["error-handling"],
          d: 2,
          choices: [
            {
              t: "If the condition is false, the exception continues untouched — the stack is never unwound here",
              ok: true,
              why: "Correct — better diagnostics and clearer intent than rethrowing.",
            },
            { t: "Filters make exception handling faster than normal code paths", why: "Exceptions are still expensive; filters just avoid a needless catch and rethrow." },
            { t: "A filter can catch exceptions that a normal `catch` block cannot", why: "It catches the same exceptions — it only adds a condition." },
            { t: "The filtered exception is converted to its inner exception", why: "Nothing is converted; the exception object is unchanged." },
          ],
        }),
        mcq("cs-modern-datetimeoffset", {
          q: "Why do many teams store timestamps as `DateTimeOffset` rather than `DateTime`?",
          why: "**A `DateTimeOffset` records the instant unambiguously — the local time plus its offset from UTC — whereas a `DateTime` carries only a `Kind` flag, which is easily `Unspecified`.** A `DateTime` of 09:00 with `Kind = Unspecified` could be any of 24-plus instants, and serialisers and databases routinely drop or misinterpret the `Kind`.\n\nWith `DateTimeOffset`, `2024-06-15T09:00:00+02:00` means exactly one moment, compares correctly against timestamps from other zones, and round-trips through JSON and SQL Server's `datetimeoffset` intact.\n\nThe limit: an offset is not a **time zone**. It does not know daylight-saving rules, so for scheduling future local events ('every day at 9 in London') you store the zone ID and use `TimeZoneInfo`. And storing UTC `DateTime` values consistently is a perfectly workable alternative — the point is never to keep `Unspecified` times.",
          c: ["static-types"],
          d: 2,
          choices: [
            {
              t: "It stores the offset from UTC, so each value identifies exactly one instant",
              ok: true,
              why: "Correct — no ambiguous 'local or UTC?' values.",
            },
            { t: "It stores the full time zone, including daylight-saving rules", why: "It stores only an offset; zone rules need `TimeZoneInfo`." },
            { t: "It has more precision than `DateTime`", why: "Both use 100-nanosecond ticks." },
            { t: "`DateTime` cannot represent UTC", why: "It can, with `DateTimeKind.Utc` — the trouble is values that are `Unspecified`." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("cs-design", {
      title: "SOLID, Patterns & Design Judgement",
      level: 3,
      summary: "The principles behind maintainable C#, the patterns you are expected to name — and when to leave them out.",
      keyIdeas: [
        "Name the smell, then the principle: a god class is SRP, a growing `switch` is OCP, a throwing override is LSP.",
        "DIP is a design rule (depend on abstractions); DI is a technique; a container is a tool. They are not the same thing.",
        "Constructor injection is the default: required, visible, and the object is always valid.",
        "Favour composition: small interfaces combined at runtime beat deep inheritance trees.",
        "`DbContext` already is a unit of work and `DbSet<T>` a repository — wrap them only for a real reason.",
        "A pattern is a cost you pay for a flexibility you need now. Otherwise, YAGNI.",
      ],
      brief: `### SOLID, with the smell each letter prevents

| Principle | Means | Smell it prevents |
|---|---|---|
| **S**ingle responsibility | One reason to change | \`OrderService\` validates, prices, saves *and* emails |
| **O**pen/closed | Extend by adding code, not editing it | A \`switch\` that grows with every new payment type |
| **L**iskov substitution | Subtypes honour the base contract | An override that throws \`NotSupportedException\` |
| **I**nterface segregation | Small, client-specific interfaces | Implementers stubbing out half of \`IRepository\` |
| **D**ependency inversion | Depend on abstractions | \`new SqlOrderRepository()\` inside business logic |

### Composition over inheritance

Inheritance couples a subclass to its base class's *implementation*, is fixed at compile time, and C# allows only one base class. Composition builds behaviour from small objects behind interfaces, which can be swapped at runtime and faked in tests. Inherit for genuine **is-a** relationships with shared behaviour; compose everything else.

### Dependency injection

- **Constructor injection** — the default. Dependencies are required, visible, and stored in \`readonly\` fields.
- **Property injection** — for genuinely optional dependencies with a sensible default.
- **Method injection** — when the dependency varies per call (a \`CancellationToken\`, an \`IFormatProvider\`).

Watch lifetimes: a **singleton** that captures a **scoped** service (such as \`DbContext\`) is a *captive dependency* bug.

### Patterns worth naming

| Pattern | In .NET |
|---|---|
| Strategy | \`IComparer<T>\`, or any interface with swappable implementations |
| Observer | C# \`event\`s, \`IObservable<T>\` |
| Factory / Abstract Factory | \`IHttpClientFactory\`, \`DbProviderFactory\` |
| Singleton | \`AddSingleton\` in DI — rarely a hand-written static \`Instance\` |
| Decorator | Wrapping a service to add caching, retries or logging |
| Repository / Unit of Work | \`DbSet<T>\` and \`DbContext\` already implement them |

The senior skill is restraint: every pattern adds indirection, so use one when the problem it solves is present — not in anticipation.`,
      items: [
        mcq("cs-des-srp", {
          q: "`OrderService.PlaceOrder` validates input, calculates tax, writes to the database and sends the confirmation email. Which SOLID principle does this most clearly violate?",
          why: "**Single Responsibility.** The class has four different reasons to change: validation rules, tax law, the schema, and the email template. Each change risks breaking the others, and a unit test for tax has to stand up a database and an email sender.\n\nThe fix is to extract each concern behind its own abstraction — `IOrderValidator`, `ITaxCalculator`, `IOrderRepository`, `IEmailSender` — and let `OrderService` **coordinate** them. Coordinating is itself one responsibility.\n\nA useful test in an interview: SRP is about **reasons to change**, not about a class 'doing one thing' — which is why a well-factored coordinator with several collaborators is fine, while a 2,000-line class with one public method is not.",
          c: ["solid", "oop"],
          d: 1,
          choices: [
            { t: "Single Responsibility", ok: true, why: "Correct — four unrelated reasons to change in one class." },
            { t: "Open/Closed", why: "OCP is about extending without editing; the core problem here is too many concerns." },
            { t: "Liskov Substitution", why: "LSP concerns subtypes breaking their base contract — there is no inheritance here." },
            { t: "Dependency Inversion", why: "It may also new up concrete classes, but the described smell is mixed responsibilities." },
          ],
        }),
        mcq("cs-des-ocp", {
          q: "Every new payment method means adding another `case` to a `switch` inside `PaymentProcessor`. Which principle is being violated, and what is the usual fix?",
          code: `switch (method)
{
    case "card":   /* ... */ break;
    case "paypal": /* ... */ break;
    // next sprint: "applepay"
}`,
          lang: "csharp",
          why: "**Open/Closed — introduce an `IPaymentMethod` interface with one implementation per method, and have `PaymentProcessor` pick one.** New payment types then mean **adding** a class and registering it, not **editing** a tested class that every payment flows through.\n\nWith DI you can inject `IEnumerable<IPaymentMethod>` and select by a `Name` property, or use keyed services in .NET 8+. This is also the Strategy pattern — OCP is frequently achieved through Strategy.\n\nThe judgement part: a `switch` is not automatically wrong. If the set is small and genuinely closed (days of the week, a handful of HTTP methods), a `switch` expression is clearer than five classes. The smell is a `switch` that keeps growing, or the same `switch` duplicated in several places.",
          c: ["solid", "design-patterns"],
          d: 2,
          choices: [
            {
              t: "Open/Closed — put each payment method behind an interface and add new implementations",
              ok: true,
              why: "Correct — extension by adding code rather than editing it.",
            },
            { t: "Single Responsibility — move the `switch` into its own file", why: "Moving it does not stop it growing; every new type still edits it." },
            { t: "Liskov Substitution — make the payment classes inherit from a common base", why: "LSP is about subtypes keeping promises, and there are no subtypes here yet." },
            { t: "Interface Segregation — split `PaymentProcessor` into smaller interfaces", why: "ISP targets fat interfaces forced on clients; the problem here is modification." },
          ],
        }),
        mcq("cs-des-lsp", {
          q: "`ReadOnlyRepository` inherits from `Repository` and overrides `Save()` to throw `NotSupportedException`. Which principle does this break?",
          why: "**Liskov Substitution.** Any code written against `Repository` is entitled to call `Save()`. Hand it a `ReadOnlyRepository` and it throws — the subtype cannot be substituted for its base without breaking callers. The textbook version is `Square : Rectangle`, where setting the width silently changes the height.\n\nLSP violations usually show up as overrides that throw, do nothing, or tighten the preconditions, and as callers forced to write `if (repo is ReadOnlyRepository)` checks.\n\nThe fix usually involves **Interface Segregation**: split `IReadRepository` from `IWriteRepository`, and have the read-only type implement only what it can honour. That is why the two principles are often mentioned together — ISP is the cure, LSP is the symptom.",
          c: ["solid", "oop"],
          d: 2,
          choices: [
            { t: "Liskov Substitution", ok: true, why: "Correct — the subtype breaks a promise the base type made." },
            { t: "Interface Segregation", why: "ISP is part of the fix, but the symptom — a subtype that breaks callers of its base — is LSP." },
            { t: "Open/Closed", why: "Nothing needed editing; the problem is a broken contract." },
            { t: "None — throwing `NotSupportedException` is the correct pattern", why: "The BCL does it in places (arrays as `IList<T>`), but it is widely regarded as a wart, not a pattern to copy." },
          ],
        }),
        multi("cs-des-isp-dip", {
          q: "Which statements about Interface Segregation and Dependency Inversion are true?",
          why: "**ISP**: clients should not be forced to depend on methods they do not use. If most implementers of `IRepository` stub out half its members, split it — `IOrderReader` and `IOrderWriter`, say. **DIP**: high-level policy should depend on abstractions, not on low-level details — so `OrderService` depends on `IOrderRepository`, and writing `new SqlOrderRepository()` inside it violates the principle. DIP is a design principle; dependency injection is one technique that achieves it.\n\nThe traps: DIP does **not** require a DI container — passing interfaces into a constructor by hand satisfies it completely. And ISP does not mean one method per interface; it means interfaces shaped around what their **clients** need. Over-splitting produces a different mess.",
          c: ["solid", "dependency-injection"],
          d: 2,
          choices: [
            { t: "ISP: clients should not depend on methods they do not use", ok: true },
            { t: "Calling `new SqlOrderRepository()` inside `OrderService` violates DIP", ok: true },
            { t: "DIP is a principle; dependency injection is one way to achieve it", ok: true },
            { t: "DIP requires using a DI container", why: "Hand-wiring interfaces through constructors satisfies DIP; the container is just a convenience." },
            { t: "ISP means every interface should have exactly one method", why: "Interfaces should match their clients' needs — splitting further is its own smell." },
          ],
        }),
        mcq("cs-des-composition", {
          q: "Why is 'favour composition over inheritance' standard advice?",
          why: "**Inheritance couples a subclass to its base class's implementation and fixes the relationship at compile time; composition assembles behaviour from small, swappable objects behind interfaces.**\n\nWith inheritance, a change to the base class ripples into every subclass (the **fragile base class** problem), you get only one base in C#, and hierarchies like `EmailNotifier`, `SmsNotifier`, `EmailAndSmsNotifier`, `LoggingEmailNotifier` explode combinatorially. With composition, a `Notifier` takes a list of `IChannel`s and an optional `ILogger` — mix and match at runtime, and fake any of them in a test.\n\nInheritance is still right for a genuine **is-a** relationship with shared behaviour that will not vary independently — framework base classes like `ControllerBase` or `DbContext` are good examples. The advice is 'favour', not 'never'.",
          c: ["oop", "design-patterns"],
          d: 2,
          choices: [
            {
              t: "Composition keeps behaviour swappable at runtime and avoids coupling to a base class's internals",
              ok: true,
              why: "Correct — and it avoids combinatorial class hierarchies.",
            },
            { t: "Virtual method calls through inheritance are too slow", why: "The cost is negligible; the argument is about coupling and flexibility." },
            { t: "C# classes are sealed by default, which discourages inheritance", why: "They are not — C# classes are inheritable unless marked `sealed`." },
            { t: "Composition removes the need for interfaces", why: "Composition usually relies on interfaces, so the parts can be swapped." },
          ],
        }),
        mcq("cs-des-di-types", {
          q: "Which form of dependency injection should be your default, and why?",
          why: "**Constructor injection — dependencies are required, visible in the signature, and the object can never exist in a half-built state.** Store them in `readonly` fields and the class is honest about what it needs; a test simply passes fakes into the constructor.\n\n**Property injection** is for genuinely optional dependencies with a sensible default (a logger that falls back to a no-op). **Method injection** is for things that vary per call — a `CancellationToken`, an `IFormatProvider`, or `[FromServices]` on a single controller action.\n\nThe tempting wrong answer is property injection 'to avoid long constructors'. A constructor with eight parameters is a **Single Responsibility** smell — hiding the dependencies in properties just hides the smell. And the **service locator** (calling `IServiceProvider.GetService` inside the class) is widely considered an anti-pattern for the same reason: dependencies become invisible.",
          tip: "Add 'a long constructor is an SRP signal, not a reason to switch injection style' — it lands well.",
          c: ["dependency-injection", "solid"],
          d: 2,
          choices: [
            {
              t: "Constructor injection — dependencies are explicit and the object is always fully initialised",
              ok: true,
              why: "Correct — the default in ASP.NET Core for good reason.",
            },
            { t: "Property injection, because it keeps constructors short", why: "Long constructors signal too many responsibilities; hiding them does not help." },
            { t: "Resolving from `IServiceProvider` inside methods, because it is the most flexible", why: "That is the service locator anti-pattern — hidden dependencies, harder tests." },
            { t: "Method injection for every dependency", why: "Callers would have to supply every collaborator on every call." },
          ],
        }),
        tf("cs-des-captive", {
          q: "Injecting a scoped service such as `DbContext` into a singleton is safe, because the container hands the singleton a fresh scoped instance each time it is used.",
          why: "**False.** A singleton is constructed once, so whatever it receives in its constructor is captured **for the lifetime of the app**. The scoped `DbContext` it was given becomes, in effect, a singleton too — a **captive dependency**. It is now shared across concurrent requests (and `DbContext` is not thread-safe), its change tracker grows forever, and it may hold stale data.\n\nASP.NET Core's container catches this when scope validation is on, which it is by default in the Development environment: resolving the singleton throws an `InvalidOperationException` about consuming a scoped service from a singleton.\n\nThe fix: inject `IServiceScopeFactory` and create a scope per unit of work, or use `IDbContextFactory<T>` to create short-lived contexts on demand.",
          tip: "Use the phrase 'captive dependency' — it is the recognised name.",
          c: ["dependency-injection", "service-lifetimes"],
          d: 3,
          answer: false,
        }),
        multi("cs-des-singleton", {
          q: "Which statements about the Singleton pattern in C# are true?",
          code: `public sealed class Config
{
    private static readonly Lazy<Config> _instance = new(() => new Config());
    public static Config Instance => _instance.Value;
    private Config() { }
}`,
          lang: "csharp",
          why: "A hand-written singleton is **global state**: any code can reach it, so dependencies hide inside method bodies and tests interfere with each other through shared data. The naive version — `if (_instance == null) _instance = new Config();` — is **not thread-safe**; two threads can both see null and create two instances. `Lazy<T>` fixes that: its default mode, `ExecutionAndPublication`, guarantees the factory runs once. In ASP.NET Core the idiomatic answer is `services.AddSingleton<IConfig, Config>()` — one instance, but injected, so it can be replaced in tests.\n\nThe trap: `AddSingleton` guarantees **one instance**, not **thread safety**. That single object is shared by every concurrent request, so any mutable state in it needs locking or concurrent collections.",
          c: ["design-patterns", "concurrency", "dependency-injection"],
          d: 3,
          choices: [
            { t: "Hand-rolled singletons are global state that hides dependencies and couples tests", ok: true },
            { t: "A null-check-then-create `Instance` getter is not thread-safe", ok: true },
            { t: "`Lazy<T>` gives thread-safe lazy initialisation by default", ok: true },
            { t: "In ASP.NET Core, prefer registering with `AddSingleton` over a static `Instance`", ok: true },
            { t: "A service registered with `AddSingleton` is automatically thread-safe", why: "The container guarantees one instance, not safe access to it — you still guard mutable state." },
            { t: "A singleton is recreated at the start of each HTTP request", why: "That describes a scoped service; a singleton lives for the whole application." },
          ],
        }),
        mcq("cs-des-factory", {
          q: "What distinguishes Abstract Factory from Factory Method?",
          why: "**Abstract Factory creates a family of related objects that must be used together; Factory Method creates one kind of object, deferring the concrete type to an implementation.**\n\n.NET has a textbook Abstract Factory: `DbProviderFactory`. `SqlClientFactory` produces a matching `SqlConnection`, `SqlCommand` and `SqlParameter`, while another provider's factory produces its own consistent set — you never mix a SQL Server command with a PostgreSQL connection. Factory Method is the single `CreateConnection()` style method, overridden or implemented to decide which concrete class is returned.\n\nIn day-to-day C#, many 'factories' are simpler still: a static creation method (`Guid.NewGuid()`), a `Func<T>` injected by DI, or `IHttpClientFactory`, which exists to manage the lifetime of handlers. Say which one you mean — the vocabulary is what the question tests.",
          c: ["design-patterns"],
          d: 2,
          choices: [
            {
              t: "Abstract Factory creates a family of related objects; Factory Method creates a single product",
              ok: true,
              why: "Correct — `DbProviderFactory` is the .NET example.",
            },
            { t: "An Abstract Factory is simply a factory class declared `abstract`", why: "The name refers to creating families behind an abstraction, not to the keyword." },
            { t: "Factory Method must be a `static` method", why: "A static creation method is a 'simple factory'; GoF Factory Method is typically virtual or on an interface." },
            { t: "They are two names for the same pattern", why: "They solve different problems: one product versus a consistent family." },
          ],
        }),
        mcq("cs-des-strategy", {
          q: "Passing an `IComparer<T>` to `List<T>.Sort` is an example of which pattern?",
          why: "**Strategy** — a family of interchangeable algorithms behind a common interface, chosen by the caller at runtime. `Sort` does not care how items are compared; you pass in the comparison policy.\n\nIn C# a strategy is often just a delegate: `list.Sort((a, b) => a.Price.CompareTo(b.Price))` is the same pattern without a class. Use an interface when the strategy has several methods, needs dependencies of its own, or is chosen by DI — shipping cost calculators or pricing rules per region, for instance.\n\nStrategy is also the usual answer to 'how would you remove this growing `switch`?' — which ties it to the Open/Closed principle.",
          c: ["design-patterns", "solid"],
          d: 1,
          choices: [
            { t: "Strategy", ok: true, why: "Correct — the comparison algorithm is plugged in by the caller." },
            { t: "Observer", why: "Observer broadcasts notifications to subscribers; nothing is being notified here." },
            { t: "Decorator", why: "Decorator wraps an object to add behaviour while keeping its interface." },
            { t: "Template Method", why: "Template Method varies steps through inheritance and overrides, not by passing an object in." },
          ],
        }),
        short("cs-des-repository", {
          q: "*\"Should we put a generic repository and unit of work on top of EF Core?\"*",
          secs: 150,
          why: "A classic opinion question with a well-known critique behind it. Interviewers are not looking for a fixed verdict — they want the trade-off.\n\nThe strong answer knows that EF Core already implements both patterns, names what a generic wrapper costs, and says when a repository does earn its place.",
          tip: "'It depends' is fine only if you then say exactly what it depends on.",
          model:
            "Usually not a *generic* one, because EF Core already implements both patterns. `DbContext` is a unit of work — it tracks changes and `SaveChanges` commits them in one transaction — and each `DbSet<T>` is a repository.\n\nA generic `IRepository<T>` wrapper tends to go one of two ways. Either it exposes `IQueryable<T>`, in which case it's a thin pass-through that leaks EF anyway, or it hides it, in which case you lose `Include`, projections, `AsNoTracking` and efficient queries, and end up adding a method for every query shape. It also doesn't buy much testability: mocking a repository proves nothing about whether the LINQ translates to valid SQL. I'd rather run tests against a real database in a container.\n\nWhere a repository does earn its place is as a *specific* abstraction: in a domain-driven design, a repository per aggregate with intention-revealing methods like `GetOrderWithLines(id)`, keeping persistence out of the domain layer. Or when queries are complex enough that centralising them helps, or there's more than one data source.\n\nSo: no generic wrapper by default; specific repositories when there's a real boundary to protect.",
          points: [
            "`DbContext` is already a unit of work; `DbSet<T>` is already a repository",
            "Generic wrappers either leak `IQueryable` or lose EF features",
            "Mocking repositories does not test SQL translation — prefer a real test database",
            "Specific, aggregate-level repositories can be worth it in DDD",
          ],
          c: ["design-patterns", "orm", "testing"],
          d: 3,
        }),
        short("cs-des-solid-walkthrough", {
          q: "*\"Walk me through SOLID, with a C# example of each.\"*",
          secs: 150,
          why: "Asked in almost every mid-level .NET interview. Reciting the five names is not enough; the interviewer wants a concrete smell and fix for each letter.\n\nKeep each principle to two sentences — what it means, and what it looks like when violated.",
          tip: "Prepare one running example (an order system works well) so the five answers connect instead of sounding memorised.",
          model:
            "**Single responsibility** — a class should have one reason to change. If `OrderService` validates, calculates tax, saves and sends email, a tax-law change can break email; I'd extract a validator, a tax calculator and a notifier.\n\n**Open/closed** — open for extension, closed for modification. A `switch` on payment type that grows every sprint becomes an `IPaymentMethod` interface, and a new method is a new class.\n\n**Liskov substitution** — a subtype must work anywhere its base type does. A `ReadOnlyRepository` that inherits `Save()` and throws breaks every caller; the fix is not to inherit that contract at all.\n\n**Interface segregation** — don't force clients to depend on methods they don't use. Split a fat `IRepository` into read and write interfaces so the read-only implementer doesn't have to stub `Delete`.\n\n**Dependency inversion** — high-level code depends on abstractions, not concrete classes. `OrderService` takes an `IOrderRepository` in its constructor instead of calling `new SqlOrderRepository()`, which is also what lets me unit-test it with a fake.\n\nThe common thread is making change cheap and testing easy — I apply them where that pays off, not as a checklist.",
          points: [
            "SRP — one reason to change (split a god class)",
            "OCP — add implementations instead of growing a switch",
            "LSP — subtypes must not break the base contract",
            "ISP — small, client-shaped interfaces",
            "DIP — depend on abstractions; enables testing with fakes",
          ],
          c: ["solid", "oop"],
          d: 2,
        }),
        tf("cs-des-yagni", {
          q: "Introducing a design pattern is justified whenever it makes the code more flexible for requirements that might appear later.",
          why: "**False.** Every pattern adds indirection — more types, more files, more places to look — and that cost is paid on every read of the code, starting today. Flexibility for a requirement that never arrives is pure cost. That is **YAGNI**: you aren't gonna need it.\n\nThe better rule: apply a pattern when the problem it solves is **actually present**. One payment provider does not need a Strategy and a Factory; the third provider, arriving with a growing `switch`, does. Refactoring toward a pattern once the need is real is cheap when the code is simple and covered by tests.\n\nInterviewers ask about restraint deliberately. Being able to say 'I would not add a repository or an interface here, and here is why' reads as more senior than naming every pattern.",
          c: ["design-patterns", "solid"],
          d: 2,
          answer: false,
        }),
      ],
    }),
  ],
});
