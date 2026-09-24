import { defineTrack, mod, mcq, multi, tf, out, blank, order, short } from "../builder";

export default defineTrack({
  slug: "dotnet",
  name: "ASP.NET Core & EF Core",
  tagline: "The framework you'll actually build the CRUD app in",
  description:
    "Dependency injection and lifetimes, the middleware pipeline, controllers and minimal APIs, EF Core querying and migrations, configuration, and production ASP.NET.",
  icon: ".N",
  color: "#6366f1",
  modules: [
    // ─────────────────────────────────────────────────────────
    mod("net-intro", {
      title: "What ASP.NET Core Is",
      level: 1,
      summary: "The runtime, the project layout, and how a request becomes a response.",
      keyIdeas: [
        "Modern .NET (5+) is cross-platform and unified; .NET Framework 4.x is Windows-only legacy.",
        "Register services on `builder.Services` before `Build()`; compose middleware on `app` after it.",
        "`Program.cs` is startup, `.csproj` is dependencies and target framework, `appsettings.json` is config.",
        "Kestrel is the built-in server, usually behind a reverse proxy for TLS and load balancing.",
        "Request flow: Kestrel → middleware → routing → auth → model binding → DI builds the controller → action → serialise.",
      ],
      brief: `**ASP.NET Core** is a cross-platform web framework running on **.NET** — the runtime, standard library and JIT compiler. Since .NET 5 there is one unified platform (the old .NET Framework was Windows-only and is legacy).

**Your app is a console application** that happens to start a web server. \`Program.cs\` is the entry point, and modern templates use top-level statements:

\`\`\`csharp
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddControllers();              // register services
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cs));

var app = builder.Build();
app.UseHttpsRedirection();                       // build the pipeline
app.MapControllers();
app.Run();                                       // start listening
\`\`\`

The two halves matter: **before \`Build()\`** you register services with the DI container; **after** you compose the middleware pipeline. Trying to add a service after \`Build()\` throws.

**The files you'll meet:**

| File | Purpose |
|---|---|
| \`Program.cs\` | Startup: services, pipeline, run |
| \`*.csproj\` | Target framework and NuGet package references |
| \`appsettings.json\` | Configuration, overridden per environment |
| \`Controllers/\` | Endpoint classes (or minimal APIs in Program.cs) |

**The commands:** \`dotnet new webapi\`, \`dotnet restore\`, \`dotnet build\`, \`dotnet run\`, \`dotnet test\`, \`dotnet add package <name>\`.

**Kestrel** is the built-in web server. In production it usually sits behind a reverse proxy (IIS, nginx) for TLS termination and load balancing.

Compared to Express: ASP.NET Core is compiled and statically typed, has DI and configuration built in rather than chosen per project, and uses a thread pool rather than a single event loop.`,
      items: [
        mcq("net-intro-build", {
          q: "Why does this throw at runtime?",
          code: `var builder = WebApplication.CreateBuilder(args);
var app = builder.Build();

builder.Services.AddScoped<IOrderService, OrderService>();   // ✗
app.Run();`,
          lang: "csharp",
          why: "`builder.Build()` **finalises the service collection** and constructs the DI container. After that point the registrations are locked, so adding one throws *'Cannot modify ServiceCollection after the ServiceProvider has been built'*.\n\nThe structure to internalise is two phases: everything on `builder.Services` comes **before** `Build()`, and everything on `app` — middleware and endpoints — comes **after**. Getting this the wrong way round is one of the first errors people hit in a fresh project.",
          c: ["dependency-injection", "runtime"],
          d: 2,
          choices: [
            {
              t: "Services must be registered before `builder.Build()` — the container is fixed once built",
              ok: true,
              why: "Correct: register first, then compose the pipeline.",
            },
            { t: "`AddScoped` needs an `app.UseScoped()` call to activate", why: "No such method — registration is enough." },
            { t: "`IOrderService` must be registered as a singleton", why: "Scoped is fine; the timing is the problem." },
            { t: "`app.Run()` should come before the registration", why: "`Run()` blocks and starts the server — it goes last." },
          ],
        }),
        multi("net-intro-files", {
          q: "In a new ASP.NET Core Web API project, which statements are correct?",
          why: "`Program.cs` is the entry point where services and the pipeline are configured. The `.csproj` declares the target framework and NuGet references — it is the equivalent of `package.json`'s dependency section. `appsettings.json` holds configuration, layered with `appsettings.{Environment}.json`. And `dotnet run` restores, builds and starts the app in one step.\n\nWhat is wrong: `Startup.cs` was the old (pre-.NET 6) split of this configuration and modern templates do not generate it; and the build output goes to `bin/` and `obj/`, which belong in `.gitignore` rather than in the repository.",
          c: ["tooling", "config"],
          d: 1,
          choices: [
            { t: "`Program.cs` configures services and the middleware pipeline", ok: true },
            { t: "The `.csproj` lists the target framework and NuGet packages", ok: true },
            { t: "`appsettings.json` holds configuration, layered per environment", ok: true },
            { t: "`dotnet run` restores, builds and starts the app", ok: true },
            { t: "`Startup.cs` is required in every modern project", why: "Merged into Program.cs from .NET 6 onward." },
            { t: "`bin/` and `obj/` should be committed", why: "Build output — gitignore them." },
          ],
        }),
        order("net-intro-request", {
          q: "Order what happens when a request reaches an ASP.NET Core API.",
          steps: [
            "Kestrel accepts the connection and parses the HTTP request",
            "The request enters the middleware pipeline in registration order",
            "Routing matches the URL and method to an endpoint",
            "Authentication and authorization run against that endpoint's requirements",
            "Model binding maps route, query and body values to the action's parameters",
            "The DI container constructs the controller with its dependencies",
            "The action method runs and returns an ActionResult",
            "The result is serialised to JSON and written back through the pipeline",
          ],
          why: "Two details worth holding onto. **Routing runs before authorization**, because the authorization middleware needs to know *which* endpoint was matched in order to read its `[Authorize]` metadata — that is why `UseRouting()` precedes `UseAuthorization()`.\n\nAnd the **controller is constructed per request** by the DI container, which is what makes constructor injection work and why a scoped `DbContext` is shared correctly across everything in that one request.\n\nThe response then travels back *out* through the pipeline, so middleware registered early can observe or modify it on the way through.",
          tip: "A good whiteboard answer. Being able to say where DI and model binding fit shows real familiarity.",
          c: ["middleware", "dependency-injection", "runtime"],
          d: 2,
          secs: 100,
        }),
        mcq("net-intro-kestrel", {
          q: "What is Kestrel?",
          why: "The **cross-platform web server built into ASP.NET Core**. It is what actually listens on a socket and turns bytes into an `HttpContext`, and it is fast enough to serve production traffic directly.\n\nIt is commonly placed behind a **reverse proxy** — IIS, nginx or a cloud load balancer — which handles TLS termination, request buffering against slow-client attacks, and load balancing across instances. That deployment shape is what interviewers usually want you to describe.\n\nIt is not a database, an ORM, or a package manager.",
          c: ["runtime", "deployment"],
          d: 1,
          choices: [
            {
              t: "The built-in cross-platform web server, usually run behind a reverse proxy",
              ok: true,
              why: "Correct on both the role and the typical deployment.",
            },
            { t: "The .NET dependency injection container", why: "That is `IServiceProvider`." },
            { t: "The ORM used to query databases", why: "That is Entity Framework Core." },
            { t: "The NuGet package manager", why: "NuGet is the package manager." },
          ],
        }),
        tf("net-intro-crossplatform", {
          q: "Modern .NET (5 and later) runs on Linux and macOS, not only Windows.",
          answer: true,
          why: "True, and it is the headline change of the .NET unification. **.NET Framework** (the 4.x line) was Windows-only and is now in maintenance. **.NET Core**, and the unified **.NET 5+** that followed it, are cross-platform, open source, and the target for all new work.\n\nPractically this is why ASP.NET Core apps ship in Linux containers as a matter of course, and why a .NET backend is a completely ordinary pairing with a React front end on any hosting platform.\n\nIf an interviewer mentions '.NET Framework 4.8', they are talking about a legacy codebase — worth clarifying which one they mean.",
          c: ["runtime", "deployment"],
          d: 1,
        }),
        mcq("net-intro-lineage", {
          q: "A job ad asks for '.NET Core experience' and the team runs .NET 8. How do .NET Framework, .NET Core and .NET 8 relate?",
          why: "**.NET Framework** (up to 4.8.x) is the original, Windows-only runtime and is now maintenance-only. **.NET Core** (1.0 to 3.1) was the cross-platform, open-source rewrite. **.NET 5** dropped the word 'Core' and became the single unified line, so .NET 6, 7, 8 and 9 are the direct continuation of .NET Core.\n\nSo '.NET Core experience' and '.NET 8 experience' mean essentially the same stack; '.NET Framework' means a legacy codebase — often ASP.NET MVC 5, Web Forms or WCF on IIS — that cannot simply be retargeted.\n\nOne naming wrinkle survives: the web framework is still called **ASP.NET Core** and the ORM **EF Core**, even on .NET 8.\n\nEven-numbered releases (6, 8, 10) are **LTS** with three years of support; odd-numbered ones are shorter-lived STS releases. Teams usually standardise on the LTS line.",
          tip: "Saying '.NET 5 unified the line; Framework is the Windows-only legacy one' in one breath shows you know which world a codebase lives in.",
          c: ["runtime", "deployment"],
          d: 1,
          choices: [
            {
              t: ".NET 5+ is the continuation of .NET Core; .NET Framework is the separate, Windows-only legacy runtime",
              ok: true,
              why: "Correct — 'Core' was dropped from the name at version 5, and Framework stopped at 4.8.",
            },
            {
              t: ".NET 8 is the next version of .NET Framework 4.8",
              why: "Framework ends at 4.8.x. .NET 5+ descends from .NET Core, which is why porting a Framework app is real work.",
            },
            {
              t: ".NET Core is a lightweight subset for microservices; full apps still need .NET Framework",
              why: "That was a common perception around .NET Core 1.x. Modern .NET is the full, recommended platform for new work of any size.",
            },
            {
              t: "They are interchangeable: any .NET Framework app runs unchanged on .NET 8",
              why: "Some libraries do load, but `System.Web`, Web Forms and WCF server hosting do not exist on modern .NET.",
            },
          ],
        }),
        mcq("net-intro-publish", {
          q: "What is the difference between a framework-dependent and a self-contained `dotnet publish`?",
          why: "A **framework-dependent** publish ships only your app's DLLs and expects the matching .NET runtime to be installed on the target. The output is small, and the runtime can be patched independently by whoever manages the host.\n\nA **self-contained** publish (`--self-contained` with a runtime identifier such as `-r linux-x64`) bundles the .NET runtime into the output. The target needs no .NET install and you control the exact runtime version, but the output is much larger and runtime security patches only arrive when **you** rebuild and redeploy.\n\nIn containers the distinction matters less: the usual pattern is framework-dependent on an `aspnet` base image, which already contains the runtime. Single-file publish and trimming are further options layered on top.",
          tip: "Mention the patching trade-off — it is the part people forget.",
          c: ["deployment", "runtime"],
          d: 2,
          choices: [
            {
              t: "Framework-dependent needs the .NET runtime installed on the host; self-contained bundles the runtime into the output",
              ok: true,
              why: "Correct — small and centrally patched versus large and independent of the host.",
            },
            {
              t: "Self-contained compiles C# to native machine code with no runtime at all",
              why: "That describes Native AOT, a separate option. A self-contained app still runs on the bundled runtime with JIT compilation.",
            },
            {
              t: "Framework-dependent apps only run on Windows",
              why: "They run anywhere the matching runtime is installed, including Linux and macOS.",
            },
            {
              t: "Self-contained apps receive runtime security patches automatically",
              why: "The opposite — the runtime is baked into your output, so you must rebuild and redeploy to pick up a patch.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("net-di", {
      title: "Dependency Injection & Lifetimes",
      level: 2,
      summary: "The container is built into the framework — and the lifetimes matter.",
      keyIdeas: [
        "Transient = new per resolution; Scoped = one per request; Singleton = one per app.",
        "`DbContext` is scoped: not thread-safe, and the request is the natural unit of work.",
        "A scoped service injected into a singleton is captured forever — the captive-dependency bug.",
        "Need a scoped service inside a singleton? Inject `IServiceScopeFactory` and create a scope per operation.",
        "DI's payoff is testability: constructor-injected interfaces can be replaced with fakes.",
      ],
      brief: `ASP.NET Core has DI built in. You register services at startup and the framework constructs your controllers, injecting what they declare.

\`\`\`csharp
builder.Services.AddScoped<IOrderService, OrderService>();
builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlServer(cs));

public class OrdersController(IOrderService orders) : ControllerBase { }
\`\`\`

**Three lifetimes — know these cold:**

| Lifetime | One instance per | Use for |
|---|---|---|
| \`Transient\` | Every resolution | Lightweight, stateless services |
| \`Scoped\` | HTTP request | \`DbContext\`, repositories, per-request state |
| \`Singleton\` | Application | Caches, config, thread-safe stateless helpers |

**The captive dependency bug** is the interview question: inject a **scoped** service into a **singleton**, and the singleton captures the first instance and holds it forever. A \`DbContext\` captured this way is shared across all requests and all threads — and \`DbContext\` is *not* thread-safe. You get random, non-reproducible errors like "A second operation was started on this context".

ASP.NET Core's default container validates this in Development and throws at startup. If you genuinely need a scoped service inside a singleton, inject \`IServiceScopeFactory\` and create a scope per unit of work.

**Why DI at all?** Testability. A class that receives \`IOrderService\` can be tested with a fake; a class that does \`new OrderService()\` cannot.`,
      items: [
        mcq("net-di-lifetimes", {
          q: "Which lifetime should `DbContext` have?",
          why: "**Scoped** — one instance per HTTP request. `AddDbContext` registers it as scoped by default, and that is correct for three reasons: `DbContext` is not thread-safe, its change tracker accumulates entities and would grow unbounded as a singleton, and a request is the natural transaction boundary — everything in one request shares one unit of work.\n\nTransient would give different parts of the same request separate contexts, so changes tracked in one would not be saved by another. Singleton is the captive-dependency disaster: shared mutable state across every concurrent request.",
          tip: "Expect the immediate follow-up about using it inside a singleton — the answer is `IServiceScopeFactory`.",
          c: ["service-lifetimes", "dependency-injection", "orm"],
          d: 2,
          choices: [
            { t: "Scoped — one per request", ok: true, why: "Correct, and it is the default for `AddDbContext`." },
            { t: "Singleton — reuse the connection", why: "Not thread-safe, and the change tracker grows forever." },
            { t: "Transient — a fresh context each time", why: "Splits one request across multiple units of work." },
            { t: "It does not matter — EF manages it internally", why: "The lifetime is entirely your registration's responsibility." },
          ],
        }),
        mcq("net-di-captive", {
          q: "A singleton `CacheService` takes `AppDbContext` in its constructor. What goes wrong?",
          why: "A **captive dependency**. The singleton is constructed once, capturing whichever `DbContext` instance existed at that moment, and holds it for the application's lifetime. That context is now shared across every request and every thread.\n\n`DbContext` is not thread-safe, so you get intermittent 'A second operation was started on this context' errors, the change tracker grows without bound, and stale entities are served from it indefinitely. The symptoms are non-deterministic and load-dependent, which makes them miserable to reproduce.\n\nThe fix: inject `IServiceScopeFactory`, and inside each unit of work do `using var scope = factory.CreateScope();` then resolve the context from `scope.ServiceProvider`. ASP.NET Core's default container catches this at startup in Development.",
          tip: "'Captive dependency' is the term — using it signals you have hit this in a real codebase.",
          c: ["service-lifetimes", "dependency-injection", "concurrency"],
          d: 3,
          choices: [
            {
              t: "The scoped context is captured for the app's lifetime — shared across threads and never refreshed",
              ok: true,
              why: "Correct: use `IServiceScopeFactory` instead.",
            },
            { t: "Nothing — the container creates a new context per call", why: "The singleton's constructor runs once." },
            { t: "It throws a compile error", why: "It compiles; the default container catches it at startup in Development." },
            { t: "The context is disposed after the first request and everything fails immediately", why: "Failures are intermittent, which is what makes it hard to diagnose." },
          ],
        }),
        multi("net-di-why", {
          q: "What does constructor injection actually buy you?",
          why: "Testability is the headline: a class receiving `IEmailSender` can be given a fake in a unit test, while a class doing `new SmtpEmailSender()` cannot be tested without sending mail. Dependencies become **explicit** — the constructor signature is an honest list of what the class needs. The container owns lifetime and disposal. And swapping implementations (real vs fake, SQL vs in-memory) is a one-line registration change.\n\nWhat DI does *not* do: make code faster, or remove the need for a design. A container full of poorly-factored services is still poorly factored.",
          c: ["dependency-injection", "testing", "oop"],
          d: 2,
          choices: [
            { t: "Tests can inject fakes instead of real infrastructure", ok: true },
            { t: "Dependencies are explicit in the constructor signature", ok: true },
            { t: "The container manages instance lifetime and disposal", ok: true },
            { t: "Implementations can be swapped by changing one registration", ok: true },
            { t: "It makes the application run faster", why: "There is a small resolution cost, if anything." },
            { t: "It removes the need to think about class design", why: "Badly designed services stay badly designed." },
          ],
        }),
        blank("net-di-register", {
          q: "Register `OrderService` so each HTTP request gets one instance, resolved through its interface.",
          template: `builder.Services.Add{{1}}<{{2}}, OrderService>();`,
          answers: [["Scoped"], ["IOrderService"]],
          hints: ["The per-request lifetime", "The abstraction consumers depend on"],
          why: "`AddScoped<IOrderService, OrderService>()` maps the interface to the implementation with a per-request lifetime. Consumers ask for `IOrderService` and never mention `OrderService` — which is what makes substitution possible in tests.\n\nScoped is the right default for a service that uses a `DbContext`, because everything in the request then shares the same context and therefore the same unit of work.",
          c: ["dependency-injection", "service-lifetimes"],
          d: 2,
        }),
        mcq("net-di-httpclient", {
          q: "A service does `using var client = new HttpClient();` on every call. Under load, outbound calls start failing. Why, and what is the fix?",
          why: "**Socket exhaustion.** Disposing an `HttpClient` closes its connection, but the operating system keeps each closed TCP socket in `TIME_WAIT` for a while. Create and dispose a client per request under load and you run out of available ports, so new connections fail — and you pay a fresh DNS lookup and TLS handshake every time as well.\n\nThe fix is to reuse connections. In ASP.NET Core that usually means **`IHttpClientFactory`**: register with `builder.Services.AddHttpClient<PaymentsClient>(...)` and inject the typed client. The factory pools the underlying handlers (and their connections) and recycles them periodically, which also avoids the opposite bug — a single static `HttpClient` living forever and never noticing a DNS change.\n\nA long-lived `HttpClient` built on a `SocketsHttpHandler` with `PooledConnectionLifetime` set is the other valid answer, common outside ASP.NET Core.",
          tip: "Name both failure modes — per-request exhaustion and the stale-DNS static client — and say the factory solves both.",
          c: ["dependency-injection", "performance", "runtime"],
          d: 2,
          choices: [
            {
              t: "Each disposed client leaves sockets in `TIME_WAIT`, exhausting ports; use `IHttpClientFactory` so connections are pooled",
              ok: true,
              why: "Correct — reuse the handlers rather than burning a port per call.",
            },
            {
              t: "`HttpClient` is not thread-safe, so the fix is a lock around each call",
              why: "Its request methods are safe to call concurrently; sharing one is the recommended pattern, and a lock would just serialise traffic.",
            },
            {
              t: "The `using` is missing a call to `Close()`, so connections leak",
              why: "Disposal is exactly what closes the connection — and that is what creates the `TIME_WAIT` sockets.",
            },
            {
              t: "Register `HttpClient` as scoped so each request gets a fresh one",
              why: "That is the same create-per-request pattern, just routed through DI.",
            },
          ],
        }),
        mcq("net-di-hosted", {
          q: "You need a queue consumer that runs for the whole lifetime of the API process. What is the idiomatic ASP.NET Core approach?",
          why: "Derive from **`BackgroundService`** (a base class implementing `IHostedService`), put the loop in `ExecuteAsync(CancellationToken stoppingToken)`, and register it with `builder.Services.AddHostedService<QueueConsumer>()`. The host starts it with the app and signals the token on shutdown, so the loop can finish its current message and exit cleanly.\n\nThe trap: hosted services are effectively **singletons**. Injecting a scoped `DbContext` directly is a captive dependency — inject `IServiceScopeFactory` and create a scope per message instead.\n\nAlso worth knowing: since .NET 6, an unhandled exception escaping `ExecuteAsync` stops the host by default, so catch and log per-message failures inside the loop. For heavy or independently scaled work, a separate worker process running the same `BackgroundService` is often better than sharing the API's process.",
          tip: "Follow up unprompted with 'and it is a singleton, so I create a scope per message' — that is the senior detail.",
          c: ["dependency-injection", "service-lifetimes", "concurrency"],
          d: 2,
          choices: [
            {
              t: "A `BackgroundService` registered with `AddHostedService`, creating a DI scope per message",
              ok: true,
              why: "Correct — host-managed lifetime, cancellation on shutdown, and no captive `DbContext`.",
            },
            {
              t: "`Task.Run` an infinite loop from `Program.cs` after `app.Run()`",
              why: "`app.Run()` blocks until shutdown, so the loop would only start once the app is shutting down — and a fire-and-forget task gets no cancellation or clean shutdown anyway.",
            },
            {
              t: "A controller action the client calls once to start the loop",
              why: "The host knows nothing about that loop — no graceful shutdown, no restart — and any scoped services it captured, such as a `DbContext`, are disposed when the request ends.",
            },
            {
              t: "A scoped service that starts a timer in its constructor",
              why: "Scoped services are created per request and disposed at its end, so the timer's owner disappears.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("net-pipeline", {
      title: "Middleware & the Request Pipeline",
      level: 2,
      summary: "Order is behaviour — the ASP.NET Core version of the same lesson.",
      keyIdeas: [
        "Middleware runs in registration order; each can act before and after `next`, or short-circuit by not calling it.",
        "`UseAuthentication` populates `HttpContext.User`; `UseAuthorization` evaluates it — identity before permission.",
        "`UseRouting` before authorization (it needs the matched endpoint's metadata); `UseCors` between routing and endpoints.",
        "`UseExceptionHandler` goes first so it wraps everything below.",
        "CORS is enforced by the browser, not the server; `AllowAnyOrigin` + `AllowCredentials` is invalid.",
      ],
      brief: `Every request passes through a pipeline of middleware you compose in \`Program.cs\`. Each one can act **before** and **after** the rest of the pipeline, and can short-circuit it.

\`\`\`csharp
app.UseExceptionHandler("/error");   // outermost — catches everything below
app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();
app.UseCors("frontend");
app.UseAuthentication();             // who are you?
app.UseAuthorization();              // may you?
app.MapControllers();
\`\`\`

**Order rules that get asked:**

- \`UseAuthentication\` **before** \`UseAuthorization\` — you cannot authorise an identity you have not established.
- \`UseCors\` after \`UseRouting\` and before the endpoints.
- \`UseExceptionHandler\` **first**, so it wraps everything downstream.
- \`UseStaticFiles\` early, so file requests skip the rest of the pipeline.

Custom middleware follows the \`RequestDelegate\` pattern:

\`\`\`csharp
app.Use(async (ctx, next) => {
    var sw = Stopwatch.StartNew();
    await next(ctx);                  // everything downstream runs here
    logger.LogInformation("{Path} took {Ms}ms", ctx.Request.Path, sw.ElapsedMilliseconds);
});
\`\`\`

Not calling \`next\` short-circuits the pipeline — which is exactly how authorisation returns a 401 without reaching your controller.`,
      items: [
        mcq("net-pipe-authorder", {
          q: "Why must `UseAuthentication()` come before `UseAuthorization()`?",
          why: "Authentication **establishes who the caller is** — it reads the cookie or bearer token and populates `HttpContext.User`. Authorization **decides whether that user may proceed** by evaluating policies and `[Authorize]` attributes against `HttpContext.User`.\n\nReverse them and authorization runs against an empty, unauthenticated principal, so every `[Authorize]` endpoint returns 401 — even for users with a perfectly valid token. The symptom is 'my login works but every protected endpoint rejects me', and the cause is two lines in the wrong order.\n\nThe general phrasing: **authentication is identity, authorization is permission**, and identity must come first.",
          c: ["middleware", "auth"],
          d: 2,
          choices: [
            {
              t: "Authentication populates `HttpContext.User`, which authorization then evaluates",
              ok: true,
              why: "Correct — identity before permission.",
            },
            { t: "They can be in any order; ASP.NET reorders them", why: "The pipeline runs exactly as registered." },
            { t: "Authorization is faster, so it should run last for performance", why: "Ordering here is about correctness." },
            { t: "Only one of them is needed in a modern app", why: "They do different jobs and both are required." },
          ],
        }),
        order("net-pipe-order", {
          q: "Order a typical ASP.NET Core middleware pipeline.",
          steps: [
            "UseExceptionHandler",
            "UseHttpsRedirection",
            "UseStaticFiles",
            "UseRouting",
            "UseCors",
            "UseAuthentication",
            "UseAuthorization",
            "MapControllers",
          ],
          why: "`UseExceptionHandler` is outermost so it catches failures from everything below it. HTTPS redirection happens before any work is done on an insecure request. Static files short-circuit early so an image request never touches routing or auth.\n\n`UseRouting` selects the endpoint, which authorization needs in order to read that endpoint's `[Authorize]` metadata. `UseCors` must sit between routing and the endpoints. Then authentication, then authorization, then the endpoints themselves.\n\nThe template scaffolds this correctly, which is exactly why interviewers ask — they want to know whether you understand it or just accepted it.",
          tip: "Being able to justify each position, not just recite the order, is what is being tested.",
          c: ["middleware", "auth", "cors"],
          d: 3,
          secs: 100,
        }),
        out("net-pipe-shortcircuit", {
          q: "What does the controller see if this middleware does not call `next`?",
          code: `app.Use(async (ctx, next) =>
{
    if (!ctx.Request.Headers.ContainsKey("X-Api-Key"))
    {
        ctx.Response.StatusCode = 401;
        return;                       // no next(ctx)
    }
    await next(ctx);
});`,
          lang: "csharp",
          why: "The controller is **never reached**. Not calling `next` short-circuits the pipeline: the response is written and returned immediately, and nothing downstream — routing, authorization, your endpoint — executes.\n\nThis is how every gate-style middleware works, including the built-in authorization middleware. The mirror-image bug is calling `next` *and then* writing to the response: once the response has started, modifying headers or the status code throws `Cannot set status code, response has already started`.",
          c: ["middleware"],
          d: 2,
          choices: [
            { t: "Nothing — the pipeline short-circuits and returns 401 immediately", ok: true, why: "Correct." },
            { t: "The controller runs and can override the 401", why: "Downstream middleware never executes." },
            { t: "ASP.NET calls `next` automatically at the end", why: "It does not; you control continuation." },
            { t: "It throws because the response was not completed", why: "Returning without `next` is a valid, intended pattern." },
          ],
        }),
        mcq("net-pipe-cors", {
          q: "Your React dev server on `localhost:5173` gets a CORS error calling the API on `localhost:5001`. What is true?",
          why: "CORS is enforced **by the browser**, not the server. The request usually reaches your API and executes; the browser then refuses to hand the response to JavaScript because the required `Access-Control-Allow-Origin` header is absent. That is why the same call works from Postman or curl — those are not browsers and do not enforce it.\n\nA different port is a different origin, so `localhost:5173` → `localhost:5001` is cross-origin. The fix is server-side: register a CORS policy naming the allowed origin and call `UseCors` in the right pipeline position.\n\nAnd `AllowAnyOrigin` combined with `AllowCredentials` is invalid and rejected by browsers — with cookies you must name specific origins.",
          tip: "'CORS is a browser relaxation mechanism, not a server security boundary' is the sentence that impresses.",
          c: ["cors", "security", "middleware"],
          d: 3,
          choices: [
            {
              t: "The browser blocks the response; the fix is a server-side CORS policy naming the origin",
              ok: true,
              why: "Correct — enforcement is client-side, configuration is server-side.",
            },
            { t: "The API rejected the request for security reasons", why: "The API usually processed it fine." },
            { t: "CORS protects the API from unauthorised clients", why: "It is not a server-side access control at all." },
            { t: "Setting `AllowAnyOrigin` with `AllowCredentials` is the standard fix", why: "That combination is explicitly disallowed." },
          ],
        }),
        mcq("net-pipe-next", {
          q: "In this inline middleware, when does the `Stopwatch` line after `await next(context)` run?",
          code: `app.Use(async (context, next) =>
{
    var sw = Stopwatch.StartNew();
    await next(context);
    logger.LogInformation("Took {Ms}ms", sw.ElapsedMilliseconds);
});`,
          lang: "csharp",
          why: "**After everything downstream has finished** — the rest of the middleware, routing, and the endpoint itself. Middleware is a chain of delegates: `next` is simply the next component in the pipeline, and awaiting it runs the entire remainder of the pipeline before control returns to you.\n\nThat gives every middleware two halves: code before `next` runs on the way **in** (inspect or reject the request), code after runs on the way **out** (observe the result, time it, log it). The request goes through the components in registration order and the response unwinds through them in reverse — which is why the first middleware registered sees the whole request's duration.\n\nOne caution for the 'after' half: by then the response may already have started streaming to the client, so you can read `context.Response.StatusCode` but should not try to change headers.",
          tip: "Describe middleware as 'a Russian doll of delegates' — before `next` is the way in, after is the way out.",
          c: ["middleware"],
          d: 1,
          choices: [
            {
              t: "After the rest of the pipeline, including the endpoint, has completed",
              ok: true,
              why: "Correct — awaiting `next` runs everything downstream first.",
            },
            {
              t: "Immediately, in parallel with the endpoint",
              why: "It is awaited, so execution continues only when the downstream work completes.",
            },
            {
              t: "Only if a later middleware short-circuits",
              why: "It runs whenever `next` returns, whether the endpoint or an earlier short-circuit produced the response.",
            },
            {
              t: "Never — code after `next` is ignored",
              why: "The after-`next` half is how logging, timing and response-inspection middleware work.",
            },
          ],
        }),
        mcq("net-pipe-policies", {
          q: "Why prefer `[Authorize(Policy = \"CanRefundOrders\")]` over `[Authorize(Roles = \"Admin,Support\")]`?",
          why: "A **policy** names a *permission* and keeps the rule for it in one place; a **role list** scatters the rule across every attribute that repeats it.\n\nYou register the policy once in `AddAuthorization(o => o.AddPolicy(\"CanRefundOrders\", p => p.RequireRole(\"Admin\", \"Support\")))` — or require a claim, or write a custom `IAuthorizationRequirement` with a handler for anything richer. If Support later loses refund rights, you change one registration rather than hunting through every controller.\n\nRoles are not wrong — role checks are themselves just one kind of policy requirement. The point is that endpoints should ask 'can this user do X?', not 'is this user one of these job titles?'.\n\nResource-based checks such as 'is this *your* order?' need the resource itself, so they go through `IAuthorizationService.AuthorizeAsync(user, order, policy)` inside the action rather than an attribute.",
          tip: "Mentioning resource-based authorization for ownership checks is the step beyond most answers.",
          c: ["auth", "security"],
          d: 2,
          choices: [
            {
              t: "The policy names a permission defined once, so changing who may refund is one edit rather than many",
              ok: true,
              why: "Correct — centralised rules, and endpoints express intent.",
            },
            {
              t: "Role checks are not enforced when using JWT bearer tokens",
              why: "Roles work fine from token claims, provided the role claim type is mapped correctly.",
            },
            {
              t: "Policies are evaluated in the database, so they are always up to date",
              why: "Policies are evaluated in-process against the user's claims; no database is involved unless your handler queries one.",
            },
            {
              t: "Policies skip authentication, so they are faster",
              why: "Policies still evaluate against an authenticated `HttpContext.User`.",
            },
          ],
        }),
        mcq("net-pipe-jwt", {
          q: "An API is configured with `AddAuthentication().AddJwtBearer(...)`. What does it do with the bearer token on each request?",
          why: "It **validates the token locally**: checks the signature against the issuer's signing keys, then the issuer (`iss`), audience (`aud`) and expiry (`exp`). If everything passes it builds a `ClaimsPrincipal` from the token's claims and puts it on `HttpContext.User`.\n\nThe important part is what it does **not** do: it does not call the identity provider or a database per request. The signing keys are fetched from the provider's metadata document (when you configure an `Authority`) and cached. That is why JWTs scale well — and also why they cannot be revoked instantly: a stolen token stays valid until it expires, so access tokens are kept short-lived and paired with refresh tokens.\n\nThe API never issues tokens here; that is the identity provider's job.",
          tip: "Connect local validation to the revocation trade-off — that is what shows you understand JWTs rather than just configuring them.",
          c: ["auth", "security", "middleware"],
          d: 2,
          choices: [
            {
              t: "Validates signature, issuer, audience and expiry locally, then builds `HttpContext.User` from the claims",
              ok: true,
              why: "Correct — no per-request round trip, which is both the benefit and the revocation problem.",
            },
            {
              t: "Sends the token to the identity provider on every request to check it is still valid",
              why: "That is token introspection, used with opaque tokens. JWT bearer validation is local, with cached signing keys.",
            },
            {
              t: "Decrypts the token to read the user's password hash",
              why: "A standard JWT is signed, not encrypted — its payload is merely Base64URL-encoded and readable by anyone — and it never contains a password.",
            },
            {
              t: "Looks the token up in a sessions table",
              why: "That is how opaque session ids work. A JWT is self-contained, which is the point of the format.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("net-api", {
      title: "Controllers, Minimal APIs & Model Binding",
      level: 3,
      summary: "Getting data in, validating it, and returning the right result.",
      keyIdeas: [
        "`[ApiController]` gives automatic 400s on validation failure, body-binding inference, and ProblemDetails.",
        "Never bind an entity from the request — over-posting lets clients set `IsAdmin`. Bind a DTO and map.",
        "`ActionResult<T>` returns a typed body or any status code; `IActionResult` loses the type for tooling.",
        "`NotFound()` for a missing resource; route constraints like `{id:guid}` reject bad ids before your code runs.",
        "DataAnnotations for simple rules; FluentValidation for conditional or cross-field validation.",
      ],
      brief: `**Controllers** suit larger apps with filters, conventions and many related endpoints. **Minimal APIs** suit small services and have less ceremony. Both are first-class; pick per project and be able to justify it.

\`\`\`csharp
[ApiController]
[Route("api/[controller]")]
public class OrdersController(IOrderService svc) : ControllerBase
{
    [HttpGet("{id:guid}")]
    public async Task<ActionResult<OrderDto>> Get(Guid id)
    {
        var order = await svc.FindAsync(id);
        return order is null ? NotFound() : Ok(order);
    }
}
\`\`\`

**\`[ApiController]\`** is doing real work: automatic \`400\` on model-validation failure, inferring \`[FromBody]\` for complex types, and \`ProblemDetails\`-shaped errors. Without it you must check \`ModelState.IsValid\` yourself.

**Model binding** sources: route values, query string, body (JSON), form, headers. Complex types come from the body by default under \`[ApiController]\`; simple types from route or query.

**Never bind your EF entity directly from the request.** **Over-posting** lets a caller set fields you never intended — \`IsAdmin\`, \`Price\`, \`UserId\`. Bind to a **DTO** containing exactly the fields a client may set, then map. This is both a security control and a versioning boundary between your API contract and your database schema.

**Validation**: DataAnnotations (\`[Required]\`, \`[MaxLength]\`, \`[Range]\`) for simple rules, FluentValidation for anything conditional or cross-field.`,
        items: [
        mcq("net-api-overposting", {
          q: "What is the risk in binding the EF entity directly?",
          code: `[HttpPost]
public async Task<IActionResult> Create(User user)
{
    db.Users.Add(user);
    await db.SaveChangesAsync();
    return Ok(user);
}`,
          lang: "csharp",
          why: "**Over-posting** (mass assignment). Model binding populates *every* settable property from the request body, so a caller can POST `{\"name\":\"x\",\"isAdmin\":true,\"id\":\"...\"}` and set fields your UI never exposes. If `User` has `IsAdmin`, `CreatedAt` or a `Role`, they are all client-controllable.\n\nThe fix is a DTO with exactly the permitted fields:\n\n```csharp\npublic record CreateUserDto(string Name, string Email);\n```\n\nbind that, and map it onto the entity yourself. This also decouples your API contract from your database schema, so a column rename is not a breaking API change — and it stops you accidentally serialising password hashes or navigation properties back to the client.",
          tip: "Say 'over-posting' or 'mass assignment' — it is a named vulnerability class and interviewers listen for the term.",
          c: ["security", "validation", "rest", "orm"],
          d: 3,
          choices: [
            {
              t: "Over-posting — the client can set any bindable property, including ones the UI never exposes",
              ok: true,
              why: "Correct: bind a DTO instead.",
            },
            { t: "Nothing — EF validates the entity before saving", why: "EF checks database constraints, not intent." },
            { t: "It is only a problem if the entity has navigation properties", why: "Any settable property is exposed." },
            { t: "`[ApiController]` prevents it automatically", why: "It handles validation, not field allow-listing." },
          ],
        }),
        multi("net-api-apicontroller", {
          q: "What does the `[ApiController]` attribute give you?",
          why: "It enables automatic model-state validation (a failed `[Required]` returns `400` with a `ProblemDetails` body before your action runs), infers binding sources so complex types come from the body without an explicit `[FromBody]`, requires attribute routing, and standardises error responses on `ProblemDetails`.\n\nWhat it does **not** do: authenticate or authorise (that is `[Authorize]` plus the middleware), or protect against over-posting — it will happily bind every property of whatever type you declared.",
          c: ["rest", "validation"],
          d: 3,
          choices: [
            { t: "Automatic 400 responses when model validation fails", ok: true },
            { t: "Binding-source inference — complex types come from the body", ok: true },
            { t: "`ProblemDetails`-shaped error responses", ok: true },
            { t: "Requires attribute routing", ok: true },
            { t: "Authenticates the request", why: "That is `[Authorize]` plus authentication middleware." },
            { t: "Prevents over-posting", why: "You still need DTOs for that." },
          ],
        }),
        mcq("net-api-actionresult", {
          q: "Which return type lets you return either a typed body or a different status code?",
          why: "`ActionResult<T>` is the union: you can `return Ok(dto)`, `return dto` directly, or `return NotFound()` / `BadRequest(...)` from the same method. Swagger and the API explorer read `T` to document the success shape, so you get accurate OpenAPI output.\n\n`IActionResult` allows any status but erases the response type, so tooling cannot document it and callers get no type information. Returning `T` directly forces you to throw or use a filter to produce anything other than 200.\n\nFor async, the full form is `Task<ActionResult<T>>`.",
          c: ["rest", "http-semantics"],
          d: 2,
          choices: [
            { t: "`ActionResult<T>`", ok: true, why: "Correct — typed success plus arbitrary status codes." },
            { t: "`IActionResult`", why: "Flexible on status, but loses the response type for tooling." },
            { t: "`T` directly", why: "No way to return 404 without throwing." },
            { t: "`Task<T>`", why: "Same limitation, just async." },
          ],
        }),
        blank("net-api-notfound", {
          q: "Return `404` when the order is missing and `200` with the DTO otherwise.",
          template: `[HttpGet("{id:guid}")]
public async Task<{{1}}<OrderDto>> Get(Guid id)
{
    var order = await svc.FindAsync(id);
    if (order is null) return {{2}}();
    return Ok(order.ToDto());
}`,
          answers: [["ActionResult"], ["NotFound"]],
          hints: ["The return type allowing both a body and a status", "The helper for 404"],
          why: "`ActionResult<OrderDto>` permits both branches from one method. `NotFound()` produces a `404` — the correct status for a resource that does not exist, as opposed to `400` (malformed request) or `204` (success with no content).\n\nNote also `{id:guid}` in the route: a **route constraint** means a non-GUID path segment fails to match the route at all and returns 404 automatically, rather than reaching your action with a binding failure.",
          c: ["rest", "http-semantics"],
          d: 2,
        }),
        multi("net-api-binding-sources", {
          q: "In an `[ApiController]`, which statements about binding sources are correct?",
          why: "Correct: a parameter named like a route template segment (`{id}`) binds **from the route**; `[FromQuery]` reads the **query string**; and an action can have only **one** body-bound parameter, because the request body is a single stream read once.\n\nWith `[ApiController]`, the defaults are inferred: complex types come from the body (except types registered in DI, which .NET 7+ infers as services, and `IFormFile`, which comes from the form), simple types come from the route if a matching segment exists and otherwise from the query string. You add explicit attributes when you want to override that — `[FromHeader]` for a header value, `[FromQuery]` on a complex type to bind a filter object from query parameters.\n\nNot correct: form fields are `[FromForm]`, not `[FromBody]` — `[FromBody]` uses an input formatter (JSON by default). And simple types such as `int` and `string` are not read from the body by default.",
          tip: "The 'only one `[FromBody]`' rule is a quick signal that you know the body is a stream, not a dictionary.",
          c: ["rest", "validation"],
          d: 2,
          choices: [
            { t: "An `id` parameter matching a `{id}` route segment binds from the route", ok: true },
            { t: "`[FromQuery]` reads values from the query string, e.g. `?page=2`", ok: true },
            { t: "An action can have at most one parameter bound from the body", ok: true },
            { t: "`[FromBody]` is how you read HTML form fields", why: "Form posts use `[FromForm]`; `[FromBody]` runs an input formatter such as the JSON one." },
            { t: "Simple types like `int` are read from the JSON body by default", why: "Simple types are inferred from route or query; only complex types default to the body." },
          ],
        }),
        mcq("net-api-minimal", {
          q: "Which is an accurate comparison of Minimal APIs and controllers in modern ASP.NET Core?",
          why: "**Both are first-class and production-ready**; they sit on the same routing, DI, authentication and authorization foundations. (Parameter binding looks similar but is a separate implementation — minimal APIs have no `ModelState` or MVC model binders.) The choice is about how you want to organise code, not about capability.\n\nMinimal APIs (`app.MapGet(\"/orders/{id}\", ...)`) have less ceremony and slightly lower overhead, and they organise well with **route groups** (`app.MapGroup(\"/orders\")`) and **endpoint filters**. They are also the path that supports Native AOT. Controllers group related actions into classes and bring the MVC feature set — action filters, conventions, model-binding customisation — that large existing codebases lean on.\n\nA reasonable rule: new small-to-medium services often start minimal; a large codebase already built on controllers usually stays consistent. Mixing both in one app is allowed.",
          tip: "Avoid 'minimal APIs are for prototypes' — that was the framing in .NET 6 and interviewers notice it is out of date.",
          c: ["rest", "middleware"],
          d: 2,
          choices: [
            {
              t: "Both are production-ready on the same routing and DI; minimal APIs trade MVC conventions for less ceremony",
              ok: true,
              why: "Correct — it is an organisational choice, and they can coexist.",
            },
            {
              t: "Minimal APIs are for prototypes and should be rewritten as controllers before production",
              why: "An early perception; route groups, filters, validation and OpenAPI support make them a full option.",
            },
            {
              t: "Minimal APIs cannot use dependency injection",
              why: "Services are injected as handler parameters, e.g. `(int id, IOrderService svc) => ...`.",
            },
            {
              t: "Controllers are deprecated in .NET 8",
              why: "Controllers are fully supported and remain the most common style in existing codebases.",
            },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("net-ef", {
      title: "EF Core: Querying, Tracking & Migrations",
      level: 3,
      summary: "The ORM leaks you're expected to know about.",
      keyIdeas: [
        "N+1: one query for the list, one per row for a navigation property. Fix with `Include` or project with `Select`.",
        "Project to DTOs before materialising — fewer columns, no tracking, one query.",
        "`AsNoTracking()` on read-only queries; keep tracking when you intend to modify and save.",
        "`SaveChangesAsync` commits all tracked changes in one transaction; untracked entities are ignored.",
        "Review generated migrations — a rename can become drop + add, deleting the column's data.",
      ],
      brief: `**\`DbContext\`** is a unit of work plus a change tracker. You query, modify tracked entities, and call \`SaveChangesAsync()\` once — EF works out the INSERT/UPDATE/DELETE statements and wraps them in a transaction.

**\`AsNoTracking()\`** for read-only queries. Tracking every entity costs memory and time building the snapshot needed for change detection. On a list endpoint that only serialises data, tracking is pure overhead — and this is a genuine, measurable win.

**The N+1 problem** is the most-asked EF question:

\`\`\`csharp
var orders = await db.Orders.ToListAsync();          // 1 query
foreach (var o in orders)
    Console.WriteLine(o.Customer.Name);              // 1 query each → N+1
\`\`\`

Fix with eager loading — \`.Include(o => o.Customer)\` — or, better for a read endpoint, **project** exactly what you need:

\`\`\`csharp
await db.Orders.Select(o => new OrderDto(o.Id, o.Customer.Name)).ToListAsync();
\`\`\`

Projection generates one query selecting only those columns, needs no \`Include\`, and skips tracking entirely.

**Migrations**: \`dotnet ef migrations add Name\` generates a C# migration from your model changes; \`dotnet ef database update\` applies it. **Review the generated migration** — EF can interpret a rename as a drop-and-add, which silently deletes production data.

**\`Find\` vs \`FirstOrDefault\`**: \`Find\` checks the change tracker first and may avoid a database round trip; \`FirstOrDefault\` always queries.`,
      items: [
        mcq("net-ef-nplus1", {
          q: "This endpoint issues 201 queries for 200 orders. Why, and how do you fix it?",
          code: `var orders = await db.Orders.ToListAsync();
return orders.Select(o => new { o.Id, Customer = o.Customer.Name });`,
          lang: "csharp",
          why: "An **N+1**: one query for the orders, then a separate lazy-load query for each order's `Customer`. 200 orders means 201 round trips, and the latency is dominated by the network, not the database.\n\nTwo fixes. **Eager loading**: `.Include(o => o.Customer)` — one query with a JOIN. **Projection** (better for a read endpoint):\n\n```csharp\nawait db.Orders.Select(o => new OrderDto(o.Id, o.Customer.Name)).ToListAsync();\n```\n\nProjection is superior here because it selects only the two columns needed, does not track entities, and does not load whole customer rows you will discard. Note the `.Select` must run **before** materialisation to be translated to SQL — after `ToListAsync()` it is just in-memory LINQ over already-loaded data.",
          tip: "The N+1 is the single most likely EF Core interview question. Know both fixes and why projection usually wins.",
          c: ["n-plus-one", "orm", "performance"],
          d: 3,
          choices: [
            {
              t: "N+1 from lazy-loading `Customer` per row — fix with `Include` or by projecting to a DTO",
              ok: true,
              why: "Correct, and projection is usually the better choice for reads.",
            },
            { t: "EF always issues one query per entity; this is expected", why: "It issues one query per *query*, plus lazy loads." },
            { t: "Add `AsNoTracking()` and it becomes one query", why: "That reduces overhead but does not merge the queries." },
            { t: "Add an index on Orders", why: "The problem is the number of round trips, not index usage." },
          ],
        }),
        mcq("net-ef-notracking", {
          q: "When should you add `AsNoTracking()`?",
          why: "On **read-only** queries — anything you will serialise and return without modifying. By default EF snapshots every returned entity so it can detect changes at `SaveChanges`. For a list endpoint that never modifies anything, that is wasted memory and CPU, and it is measurable on large result sets.\n\nDo **not** use it when you intend to modify and save the entities: without tracking, EF does not know they changed and `SaveChanges` does nothing — a quietly broken update with no error.\n\nProjecting to a DTO with `Select` already avoids tracking, so `AsNoTracking` is redundant there.",
          c: ["orm", "performance"],
          d: 2,
          choices: [
            { t: "On read-only queries whose results you will not modify and save", ok: true, why: "Correct — skips snapshotting overhead." },
            { t: "On every query, as a default", why: "Updates would silently stop working." },
            { t: "Only on queries returning more than 1,000 rows", why: "The benefit scales with size but is not threshold-based." },
            { t: "When you want to avoid a database round trip", why: "It still queries; it just does not track the results." },
          ],
        }),
        multi("net-ef-savechanges", {
          q: "Which are true about `SaveChangesAsync()`?",
          why: "It wraps all pending changes in a **single transaction** — everything commits or nothing does. It inspects the change tracker to decide which statements to emit, so untracked entities are ignored. It returns the number of affected rows, and modern EF batches multiple statements into fewer round trips.\n\nWhat is false: it does not save entities EF is not tracking, and it does not validate business rules — only database constraints will reject bad data, and they surface as an exception at save time rather than as a clean `400`.",
          c: ["orm", "transactions"],
          d: 3,
          choices: [
            { t: "All pending changes are committed in one transaction", ok: true },
            { t: "It only persists entities the context is tracking", ok: true },
            { t: "It returns the number of affected rows", ok: true },
            { t: "It batches multiple statements to reduce round trips", ok: true },
            { t: "It validates business rules before saving", why: "Only database constraints apply — validate before you get here." },
            { t: "Each modified entity gets its own transaction", why: "It is one transaction for the whole call." },
          ],
        }),
        tf("net-ef-migration-review", {
          q: "Generated EF Core migrations can be applied without review, since EF derives them from your model.",
          answer: false,
          why: "Always review them. EF compares the old and new model **snapshots** and cannot read intent — the classic failure is renaming a property, which EF may emit as `DropColumn` + `AddColumn`. That compiles, applies cleanly, and **silently deletes every value in that column**.\n\nOther things to check: a new non-nullable column with no default fails on a table with existing rows; large index creation can lock a table; and a data-preserving change may need custom SQL you write into the migration yourself.\n\nOn production, generate a SQL script (`dotnet ef migrations script`) and have it reviewed rather than running `database update` against a live database.",
          tip: "The rename-drops-data story is memorable and shows you have shipped migrations.",
          c: ["orm", "deployment", "schema-design"],
          d: 3,
        }),
        short("net-ef-explain-slow", {
          q: "*\"An EF Core endpoint takes 4 seconds. How do you find out why?\"*",
          why: "The applied version of everything in this module. Interviewers want a method, and the specific EF causes named.",
          model:
            "First I'd see the actual SQL. Enabling sensitive-data logging in development, or attaching a profiler, shows exactly what EF sent — and usually the problem is visible immediately.\n\nThe most common cause is an N+1: one query for the list and then one per row from lazy loading a navigation property. In the log it's unmistakable — hundreds of near-identical queries. The fix is `Include` for the related data, or better, projecting straight to a DTO with `Select` so only the needed columns come back.\n\nThe second thing I'd check is whether we're materialising too early. A `.ToList()` before the filtering means the whole table is pulled into memory and filtered in the process rather than in SQL. That's easy to miss in a long chain and can be catastrophic on a large table.\n\nThen: is it a read-only query still doing change tracking? `AsNoTracking` helps on large result sets. Is the result set unbounded — should it be paginated? And once I know the actual SQL, I'd check the execution plan for a missing index on whatever we're filtering or joining on.\n\nAfter fixing, I'd measure again against a realistic data volume — a lot of these problems only appear at production scale, so testing against 20 seeded rows proves nothing.",
          points: [
            "Look at the generated SQL first — log it or profile it",
            "N+1 from lazy loading → Include, or project to a DTO",
            "Early .ToList() pulls the table into memory",
            "AsNoTracking for read-only queries",
            "Pagination for unbounded result sets",
            "Check the execution plan for missing indexes",
            "Re-measure at realistic data volume",
          ],
          c: ["orm", "n-plus-one", "performance", "indexing"],
          d: 3,
          secs: 180,
        }),
        mcq("net-ef-codefirst", {
          q: "What is the difference between Code-First and Database-First in EF Core?",
          why: "It is about **which side is the source of truth**. In **Code-First**, your C# entity classes and `DbContext` configuration define the schema, and **migrations** generate the database changes from them. In **Database-First**, the database already exists (often owned by a DBA or shared with other systems) and you **scaffold** entity classes from it with `dotnet ef dbcontext scaffold`, re-running the scaffold when the schema changes.\n\nCode-First suits greenfield apps where the application owns its database. Database-First suits legacy or shared databases where schema changes happen outside your code.\n\nEF Core has no EDMX designer file — that was classic EF6. In Core, 'Database-First' simply means reverse-engineering code from an existing schema.",
          tip: "Say which you would choose and why — 'we own the database, so Code-First with reviewed migrations' is a complete answer.",
          c: ["orm", "schema-design"],
          d: 1,
          choices: [
            {
              t: "Code-First generates the schema from your classes via migrations; Database-First scaffolds classes from an existing schema",
              ok: true,
              why: "Correct — the difference is which side is authoritative.",
            },
            {
              t: "Code-First writes SQL by hand; Database-First uses LINQ",
              why: "Both query with LINQ. The difference is where the schema is defined.",
            },
            {
              t: "Database-First is faster at runtime because the SQL is precompiled",
              why: "Runtime query behaviour is identical; only the modelling workflow differs.",
            },
            {
              t: "Database-First requires an EDMX designer file",
              why: "EDMX belonged to EF6. EF Core scaffolds plain classes.",
            },
          ],
        }),
        mcq("net-ef-update-attach", {
          q: "A `PUT` handler maps the request to a new `Order` entity (with its existing id) and calls `db.Orders.Update(order); await db.SaveChangesAsync();` on a fresh context. What happens?",
          why: "EF issues an **`UPDATE` that sets every column** of that row, without loading it first. `Update` begins tracking the entity in the **Modified** state with *all* properties marked modified, because a fresh context has no original values to compare against.\n\nThat is right for a genuine full replacement, and it saves a round trip. The risk is that any property the client did not send is written with its default value — a `null` or `0` silently overwrites real data. `Update` also walks the navigation graph: related entities with a key set are marked Modified, those without are marked Added.\n\nThe alternatives: **load then modify** (`FindAsync`, copy the fields, save) so EF's change tracker emits only the changed columns — the safest default. Or `Attach` the entity (tracked as **Unchanged**) and mark specific properties modified with `db.Entry(order).Property(o => o.Status).IsModified = true` for a targeted partial update.",
          tip: "Contrasting `Update` (all columns) with `Attach` plus `IsModified` (chosen columns) shows real EF experience.",
          c: ["orm", "rest"],
          d: 3,
          choices: [
            {
              t: "EF marks every property modified and sends an `UPDATE` of all columns, without reading the row first",
              ok: true,
              why: "Correct — fine for full replacement, dangerous if the DTO was partial.",
            },
            {
              t: "EF first `SELECT`s the row, then updates only the changed columns",
              why: "That happens only if you load the entity yourself; `Update` on a detached entity has no original values to diff.",
            },
            {
              t: "Nothing — `SaveChanges` ignores entities not loaded by this context",
              why: "`Update` starts tracking the entity, so it is saved. Merely constructing it without `Update` or `Attach` would be ignored.",
            },
            {
              t: "EF inserts a duplicate row because the entity is new",
              why: "An entity with a key value set is treated as existing by `Update`; `Add` would attempt the insert.",
            },
          ],
        }),
        tf("net-ef-pooling", {
          q: "With `AddDbContextPool`, one `DbContext` instance can be shared by two requests at the same time.",
          answer: false,
          why: "False. Pooling reuses instances **sequentially**, never concurrently. When a request's scope ends, the context is reset (its change tracker cleared) and returned to the pool; the next request leases it exclusively. That saves the cost of constructing and configuring a context per request, which matters in very high-throughput services.\n\nThe constraint pooling adds: because the same instance outlives a single request, it must not hold per-request state of its own — for example a tenant id captured in a field in the constructor would leak into the next request. That is why pooled contexts should get their dependencies through `DbContextOptions` rather than injecting other scoped services.\n\nThread-safety is unchanged either way: a single `DbContext` still supports only one operation at a time.",
          tip: "Most apps do not need pooling — say you would measure before enabling it.",
          c: ["orm", "service-lifetimes", "performance"],
          d: 3,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("net-prod", {
      title: "Configuration & Production ASP.NET",
      level: 4,
      summary: "Config precedence, secrets, and the settings that differ in production.",
      keyIdeas: [
        "Config layers: appsettings.json → appsettings.{Env}.json → user secrets → env vars → CLI args; later wins.",
        "`ConnectionStrings__Default` as an environment variable overrides the JSON — same build, per-environment config.",
        "Secrets come from a managed store or the platform; `user-secrets` is development-only.",
        "Options pattern: typed, injectable config with `ValidateOnStart()` so bad config fails the deploy.",
        "The developer exception page is an information leak — Development only; production uses `UseExceptionHandler`.",
      ],
      brief: `**Configuration providers** are layered, and **later wins**:

1. \`appsettings.json\`
2. \`appsettings.{Environment}.json\`
3. User secrets (Development only)
4. Environment variables
5. Command-line arguments

So an environment variable overrides \`appsettings.json\` — which is exactly how you configure a container without rebuilding it. Nested keys use a double underscore in environment variables: \`ConnectionStrings__Default\`.

**Never commit secrets.** Use \`dotnet user-secrets\` locally and a real secret store (Azure Key Vault, AWS Secrets Manager, the platform's environment) in production.

**The Options pattern** binds a config section to a typed class and injects it — \`IOptions<T>\` for singleton-style config, \`IOptionsSnapshot<T>\` when you want per-request reload. Validate at startup with \`.ValidateOnStart()\` so a bad config crashes the deploy rather than the first request.

**\`ASPNETCORE_ENVIRONMENT\`** drives \`IsDevelopment()\`. The developer exception page — full stack trace, source lines — must **only** appear in Development; in production it is an information-disclosure vulnerability.

**Health checks**: \`AddHealthChecks()\` with a liveness endpoint that is cheap and a readiness endpoint that verifies dependencies — the same split as any other platform.`,
      items: [
        mcq("net-cfg-precedence", {
          q: "`appsettings.json` sets `ConnectionStrings:Default` to the dev database, and the container sets the environment variable `ConnectionStrings__Default` to production. Which wins?",
          why: "The **environment variable**. Providers are applied in order and later ones override earlier ones; environment variables are registered after the JSON files in the default host builder.\n\nThat is the whole design: ship **one build** and configure it per environment from outside. The double underscore `__` maps to the `:` separator because many shells disallow colons in variable names.\n\nCommand-line arguments come last of all, which makes them handy for one-off overrides during debugging.",
          c: ["config", "deployment"],
          d: 2,
          choices: [
            { t: "The environment variable — later providers override earlier ones", ok: true, why: "Correct, and `__` maps to `:`." },
            { t: "`appsettings.json` — files take priority over the environment", why: "The order is the reverse." },
            { t: "It throws an ambiguous-configuration error", why: "Overriding is the intended behaviour." },
            { t: "Whichever was registered first", why: "First registered is lowest priority." },
          ],
        }),
        multi("net-cfg-secrets", {
          q: "Which are acceptable ways to handle a production database password?",
          why: "Acceptable: a managed secret store (Key Vault, Secrets Manager) read at startup; environment variables injected by the platform; and — best of all where available — a managed identity, so there is no password to leak at all. Validating at startup that the value is present means a misconfigured deploy fails immediately.\n\nNot acceptable: committing it to `appsettings.Production.json` (version control keeps it forever, and everyone with repo read access has it), or hard-coding a fallback in the source. `dotnet user-secrets` is a **development-only** tool — it stores values in plain text in your user profile and is not a production mechanism.",
          c: ["security", "config", "deployment"],
          d: 3,
          choices: [
            { t: "A managed secret store read at startup", ok: true },
            { t: "Environment variables injected by the hosting platform", ok: true },
            { t: "A managed identity, so there is no password at all", ok: true },
            { t: "Fail fast at startup if the secret is missing", ok: true },
            { t: "`appsettings.Production.json`, committed to the repo", why: "Version control retains it permanently." },
            { t: "`dotnet user-secrets`, promoted to production", why: "Development-only, stored in plain text." },
          ],
        }),
        tf("net-prod-devpage", {
          q: "`UseDeveloperExceptionPage()` is safe to leave enabled in production because it helps diagnose incidents.",
          answer: false,
          why: "It is an **information-disclosure vulnerability**. The page renders the full stack trace, source file paths, code snippets, framework and package versions, and often configuration and query fragments — a detailed map of your application handed to anyone who can trigger an error.\n\nThe correct arrangement is `app.UseExceptionHandler(\"/error\")` in production, returning a generic `ProblemDetails` response plus a correlation id, while the full exception goes to your structured logs. The default template already guards it with `if (app.Environment.IsDevelopment())` — the risk is someone removing that check while debugging a production issue and never putting it back.",
          c: ["security", "error-handling", "config"],
          d: 2,
        }),
        mcq("net-prod-options", {
          q: "What does the Options pattern give you over reading `IConfiguration` directly?",
          code: `builder.Services.Configure<EmailOptions>(builder.Configuration.GetSection("Email"));`,
          lang: "csharp",
          why: "**Typed, validated, injectable configuration.** Instead of `config[\"Email:SmtpHost\"]` — a magic string returning `string?` that is silently null when misspelled — you inject `IOptions<EmailOptions>` and get a strongly-typed object with real property names and compile-time checking.\n\nAdd `.ValidateDataAnnotations().ValidateOnStart()` and a missing or invalid setting fails the **deploy** rather than the first request that happens to need it. That shift — from a runtime surprise to a startup failure — is the main practical benefit.\n\n`IOptionsSnapshot<T>` gives per-request values that pick up config changes; `IOptionsMonitor<T>` adds change notifications for singletons.",
          c: ["config", "dependency-injection"],
          d: 3,
          choices: [
            {
              t: "Typed config classes, injectable via DI, with startup validation instead of magic strings",
              ok: true,
              why: "Correct — and `ValidateOnStart` turns config errors into deploy failures.",
            },
            { t: "It encrypts the configuration values", why: "Encryption is the secret store's job." },
            { t: "It reloads settings automatically in every case", why: "Only `IOptionsSnapshot`/`IOptionsMonitor` do." },
            { t: "It is required for `appsettings.json` to be read", why: "`IConfiguration` reads it regardless." },
          ],
        }),
        mcq("net-prod-structured-logging", {
          q: "Why write `logger.LogInformation(\"Order {OrderId} placed\", orderId)` instead of using string interpolation?",
          why: "Because `{OrderId}` is a **named property**, not just text. With a message template, the logging pipeline keeps `OrderId` as a separate, typed field alongside the rendered message, so a structured sink (Seq, Application Insights, Elasticsearch, Datadog) lets you query `OrderId = 1234` across millions of entries. Interpolation bakes the value into an opaque string, and every message becomes unique, which also defeats grouping by template.\n\nThere is a performance angle too: with a template, formatting is deferred until the log level is known to be enabled, while an interpolated string is built on every call even if Debug logging is off.\n\n`ILogger<T>` itself comes from DI, and `T` becomes the log **category** (usually the class name), which is what you filter on in configuration — for example raising `Microsoft.EntityFrameworkCore` to `Warning` while keeping your own code at `Information`.",
          tip: "The phrase 'message template, not string interpolation' is exactly what reviewers look for.",
          c: ["logging", "performance"],
          d: 2,
          choices: [
            {
              t: "The template keeps `OrderId` as a queryable property, and formatting is skipped when the level is disabled",
              ok: true,
              why: "Correct — structured data plus deferred formatting.",
            },
            {
              t: "Interpolated strings cannot be logged by `ILogger`",
              why: "They can; they just arrive as plain text with no properties.",
            },
            {
              t: "Templates encrypt sensitive values such as ids",
              why: "Nothing is encrypted. Do not log secrets or personal data either way.",
            },
            {
              t: "It is purely a style preference with identical output in every sink",
              why: "A structured sink stores the properties separately; that is the entire point.",
            },
          ],
        }),
        mcq("net-prod-cache", {
          q: "An API runs as three instances behind a load balancer and caches product data with `IMemoryCache`. What problem should you expect?",
          why: "**Each instance has its own cache.** `IMemoryCache` lives in the process's memory, so the three instances hold three independent copies. When a product changes and one instance evicts its entry, the other two keep serving the old value until their entries expire — users see different data depending on which instance handles them. Every restart or new instance also starts cold.\n\n`IDistributedCache` (typically backed by Redis) is shared by all instances, survives restarts, and invalidation happens in one place. The cost is a network hop and serialisation for every read.\n\nThe usual compromise is layered: a short-lived in-memory cache in front of a distributed one. `HybridCache` (the `Microsoft.Extensions.Caching.Hybrid` package, announced alongside .NET 9 and generally available since early 2025) packages that pattern along with protection against many requests recomputing the same missing entry at once.",
          tip: "Name the trade-off both ways: memory cache is fastest but per-process; distributed is consistent but a network call.",
          c: ["performance", "deployment"],
          d: 2,
          choices: [
            {
              t: "Instances hold independent caches, so after an update they can serve different, stale values",
              ok: true,
              why: "Correct — in-memory caching is per process.",
            },
            {
              t: "`IMemoryCache` is shared across instances automatically by the load balancer",
              why: "Load balancers route requests; they do not share process memory.",
            },
            {
              t: "`IMemoryCache` persists to disk, so it fills the container's storage",
              why: "It is purely in-memory and lost on restart.",
            },
            {
              t: "`IMemoryCache` is not thread-safe, so concurrent requests corrupt it",
              why: "The default `MemoryCache` is thread-safe; the problem is consistency across processes, not within one.",
            },
          ],
        }),
      ],
    }),
  ],
});
