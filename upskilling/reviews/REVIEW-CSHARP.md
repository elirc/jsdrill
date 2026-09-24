# C# track review (`src/content/tracks/csharp.ts`)

Scope: all 75 items across 8 modules (cs-types, cs-oop, cs-runtime, cs-linq, cs-async, cs-delegates, cs-modern, cs-design), plus module briefs and keyIdeas. No duplicate item ids.

## Author-flagged claims: verification

| Claim | Verdict |
|---|---|
| ASP.NET Core scope validation on by default only in Development | Correct (`ValidateScopes` and `ValidateOnBuild` default to `IsDevelopment()`). |
| `Lazy<T>` default mode is `ExecutionAndPublication` | Correct for `new Lazy<T>(Func<T>)`. |
| `ConcurrentDictionary.GetOrAdd` factory may run more than once | Correct. |
| `System.Threading.Lock` from .NET 9 | Correct (C# 13 `lock` recognises it). |
| `Span<T>` cannot live across an `await` | Correct. C# 13 allows ref-struct locals in async methods/iterators, but still not across `await`/`yield`. |
| Struct guideline roughly 16 bytes | Correct (Framework Design Guidelines: "instance size under 16 bytes"). |
| Multicast returns the last target's result | Correct. |
| `const` inlined / `readonly` in ctor / `static readonly` at runtime | Correct. |
| GC generations, non-deterministic finalizers, `using` | Correct; LOH threshold 85,000 bytes correct. |
| Interning of literals, `string.Intern` | Correct. |
| `==` on `string` vs `object` | Correct; the `cs-rt-equality` snippet produces `False`/`True` as stated. |
| `dynamic` binds via the DLR | Correct (`RuntimeBinderException`). |
| Six access modifiers; `protected internal` is the union | Correct. |
| `as` only for reference/nullable types | Correct (`obj as int` is CS0077). |
| `decimal` 128-bit base-10, 28-29 digits | Correct. |
| `yield` methods run lazily incl. argument validation | Correct. |
| `for` shares one variable; `foreach` fresh per iteration since C# 5 | Correct (`333`). |
| `await` inside `lock` is a compile error; `ValueTask` single-consumption | Correct (CS1996). |
| `IQueryable : IEnumerable`, `ICollection` adds Count/Add, `IList` adds indexer | Correct. |
| Records, `init`, static ctor timing, partial, sealed, exception filters, `DateTimeOffset` | Correct (see B3 for one static-ctor nuance). |

## (A) Confirmed errors (fixed in `csharp.ts`)

**A1. cs-oop brief table: interfaces "State / fields: No", "Constructors: No".**
Wrong: since C# 8 interfaces can declare static fields and a static constructor. Only *instance* state and *instance* constructors are disallowed.
Fix:
- `| State / fields | No | Yes |` -> `| Instance state / fields | No (static fields only) | Yes |`
- `| Constructors | No | Yes |` -> `| Instance constructors | No | Yes |`

**A2. cs-oop-interface-abstract, distractor "When the type needs a constructor".**
Wrong: `why: "Interfaces cannot declare constructors."` Static constructors are legal in interfaces (C# 8+).
Fix: `why: "Interfaces cannot declare instance constructors (C# 8+ allows only a static one)."`

**A3. cs-async keyIdea, brief and cs-async-deadlock why: deadlock stated as unconditional.**
Wrong: "`.Result` and `.Wait()` ... deadlock wherever a synchronisation context exists" (the brief and the why say the same thing more softly). A deadlock needs a *single-threaded* context and a continuation that tries to get back onto it. It does not happen if the task has already completed, or if every await down the chain uses `ConfigureAwait(false)`. The MCQ's own correct option says "can deadlock", so the keyIdea contradicted it.
Fixes:
- keyIdea -> "`.Result` and `.Wait()` block the thread and can deadlock under a single-threaded synchronisation context (UI, classic ASP.NET). Async all the way."
- brief -> "in contexts with a single-threaded synchronisation context (classic ASP.NET, WinForms, WPF), can cause a **deadlock**"
- cs-async-deadlock why -> "Under a single-threaded synchronisation context — classic ASP.NET, WinForms, WPF — an awaited continuation (without `ConfigureAwait(false)`) must resume *on that same context*, which the blocked thread is holding."

**A4. cs-rt-gc-generations, distractor "Gen 2 is where value types are stored".**
Wrong: `why: "Value types live inline — on the stack or inside their container."` That reasoning is misleading. A value-type field inside a long-lived object *is* in Gen 2, and a boxed value is a heap object that is subject to generations. The distractor is wrong because generations group objects by age, not by kind.
Fix: `why: "Generations group heap objects by age, not kind — a value type lives wherever its container does, which may be an object in any generation."`

**A5. cs-async-voidthrow, distractor "`caught` is printed".**
Wrong: `why: "The try block completes before the exception is raised."` The `throw` actually runs synchronously, inside the `try`. `AsyncVoidMethodBuilder` captures the exception and rethrows it later, on the synchronisation context or the thread pool.
Fix: `why: "The async machinery captures the exception and rethrows it later, after the try block has completed."`

## (B) Debatable (not changed)

1. **cs-rt-var-dynamic.** `GetDuck()`'s return type is unspecified. If it returns `dynamic`, then `var x = GetDuck()` is also `dynamic`, so "`var`" (and arguably "All three") becomes defensible. Suggested prompt: "`GetDuck()` is declared to return `object`. Which of these compiles fine but fails only at runtime if `Quack()` does not exist?"
2. **cs-del-extension.** "They are static methods in a static class, with `this` on the first parameter" describes classic extension methods. C# 14 (.NET 10, Nov 2025) added `extension` blocks, which have no `this` parameter and also allow extension properties. Suggest: "Classic extension methods are static methods in a static class, with `this` on the first parameter", plus one sentence in the why about C# 14 extension members.
3. **cs-oop-static-ctor (tf).** "before ... any static member is used": reading a `const` does not trigger the static constructor, because it is inlined. The answer True is still right for the intended meaning. Suggest "before the first instance is created or any static field, property or method is accessed".
4. **cs-rt-clr, distractor "The CLR interprets the IL".** "it is not an interpreter" holds for CoreCLR on server and desktop. But Blazor WebAssembly runs IL on the Mono interpreter, and .NET 10 adds a CoreCLR interpreter for no-JIT platforms. Suggest: "On server and desktop the CLR compiles IL to native code; interpreters exist only for niche platforms such as WebAssembly."
5. **cs-types brief ("They live on the stack, or inline inside the object that contains them").** This leaves out boxed values and locals hoisted into closures or async state machines. Suggest adding "(or on the heap when boxed or captured)".
6. **cs-async keyIdea / brief: "`async void` ... exceptions ... crash the process".** In WPF/WinForms the exception goes to the dispatcher, where `DispatcherUnhandledException` can mark it handled. It "usually crashes" and "cannot be caught by the caller". Suggest "cannot be caught by the caller and usually crash the process".
7. **cs-async-whenall, distractor "the thread pool distributes them automatically".** The why, "Nothing starts a call before its `await` is reached", is loose, because each call starts when invoked. Suggest "The second call is not even invoked until the first `await` completes."
8. **cs-des-captive.** In Development, `ValidateOnBuild` is also on, so the error usually surfaces at `builder.Build()` (as an `AggregateException` wrapping the `InvalidOperationException`) rather than on first resolution. Suggest "startup (or resolving the singleton) throws".
9. **cs-linq keyIdea "`Single` throws on more than one".** It also throws on zero. The item's why already says "not exactly one". Suggest "`Single` throws unless there is exactly one".

## (C) Duplicates / quality

- **cs-types-string vs cs-rt-stringbuilder:** the same fact (strings are immutable, so a loop needs `StringBuilder`) with the same correct answer. Consider retargeting one, for example to "when is `StringBuilder` *not* worth it" (single-expression concat, interpolation).
- **cs-rt-managed (tf) vs cs-modern-dispose (mcq):** both test "the GC does not release unmanaged resources, so use `Dispose`/`using`". This overlap is acceptable across modules, but it is noticeable.
- **cs-rt-intern vs cs-rt-equality:** both end on "`object ==` plus interning makes literals look equal". The why paragraphs are near-identical in their final sentences.
- **cs-oop-solid vs cs-des-isp-dip / cs-des-di-types:** testability through constructor-injected interfaces is asked three times.
- The multis contain no "all are correct" traps. Every false option is clearly false.
- Prompt length and clarity are fine throughout. The longest prompts (cs-rt-const-readonly, cs-des-captive) are long because they set up a scenario, which is justified.

## (D) Verdict

The track is technically strong. Every author-flagged claim checks out, including the version-sensitive ones (`System.Threading.Lock` in .NET 9, keyed services in .NET 8, C# 13's `ref struct` rules, `Lazy<T>` defaults, scope validation in Development). All 75 answer keys (MCQ, multi, tf, output) are correct. The problems are in explanation text, not in keyed answers. **5 confirmed errors (A)**, all fixed. The most consequential is A3, the unconditional "deadlocks wherever a synchronisation context exists" keyIdea, which contradicts the item's own "can deadlock" answer and would mislead a candidate asked when it does *not* deadlock. The others are over-absolute statements about interfaces (A1, A2) and imprecise distractor rationales (A4, A5). There are **9 debatable points (B)**. The most worth fixing is cs-rt-var-dynamic, whose unspecified return type makes a second answer defensible. There are **4 overlap/quality notes (C)**, and no answer-key errors.
