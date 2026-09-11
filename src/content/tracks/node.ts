import { defineTrack, mod, mcq, multi, tf, blank, order, short } from "../builder";

export default defineTrack({
  slug: "node",
  name: "Node & Express",
  tagline: "The JavaScript half of your backend",
  description:
    "The Node runtime, the Express middleware pipeline, building a REST API, authentication, and the production concerns that separate a demo from a service.",
  icon: "⬢",
  color: "#22c55e",
  modules: [
    // ─────────────────────────────────────────────────────────
    mod("node-runtime", {
      title: "The Node Runtime",
      level: 1,
      summary: "One thread, an event loop, and a worker pool for I/O.",
      keyIdeas: [
        "Your JS runs on one thread; libuv provides the event loop and a small thread pool for some I/O.",
        "Great at concurrent I/O, terrible at concurrent CPU — offload heavy work to workers, queues, or a service.",
        "Scale across cores with multiple processes (cluster, PM2, container replicas), not threads.",
        "Config comes from `process.env`; validate at startup and fail fast. Never commit `.env` or a fallback secret.",
        "Runtime imports must be in `dependencies`; `devDependencies` are omitted from production installs.",
      ],
      brief: `Node is **V8 plus libuv**. Your JavaScript runs on a single thread; libuv provides the event loop and a small thread pool for filesystem work and some crypto.

The consequence that matters: Node handles **concurrent I/O** brilliantly and **concurrent CPU** terribly. Thousands of simultaneous database queries are fine — they are all waiting elsewhere. One tight synchronous loop stalls every request in the process.

CPU-bound work belongs in \`worker_threads\`, a separate service, or a background queue.

**\`process.env\`** is how configuration reaches your app. Never commit secrets; read them from the environment and fail fast at startup if a required one is missing.

**Node vs the browser**: no \`window\`, \`document\` or \`localStorage\`; instead you get \`process\`, \`fs\`, \`path\`, \`Buffer\` and \`__dirname\` (in CommonJS). Code that must run in both cannot assume either set.

**\`package.json\` scripts** are the project's interface: \`start\`, \`dev\`, \`build\`, \`test\`. \`dependencies\` ship to production; \`devDependencies\` (TypeScript, test runners, linters) do not.`,
      items: [
        mcq("node-rt-threading", {
          q: "Is Node single-threaded?",
          why: "Your **JavaScript** runs on a single thread. But the process is not single-threaded overall: libuv maintains a thread pool (4 by default) for filesystem operations, DNS lookups and some crypto, and the OS handles network I/O asynchronously without needing a thread at all.\n\nThe precise version — 'single-threaded event loop for your code, with a thread pool underneath for certain I/O' — is what interviewers want. The practical consequence is that you scale across CPU cores by running multiple processes (`cluster`, PM2, or container replicas), not threads.",
          tip: "The follow-up is 'so how do you use all 8 cores?' — answer: multiple processes.",
          c: ["runtime", "concurrency"],
          d: 2,
          choices: [
            {
              t: "Your JavaScript is, but libuv uses a thread pool for some I/O underneath",
              ok: true,
              why: "Correct and precise.",
            },
            { t: "Yes, entirely — one thread in the whole process", why: "libuv's pool and the GC use other threads." },
            { t: "No, Node runs each request on its own thread", why: "That is the traditional thread-per-request model Node avoids." },
            { t: "It depends on whether you use `async`", why: "`async` does not create threads." },
          ],
        }),
        mcq("node-rt-cpu", {
          q: "Where should a CPU-heavy PDF generation task run in a Node API?",
          why: "Off the event-loop thread. The options, roughly in order of how much traffic they handle:\n\n- **`worker_threads`** — a worker inside the same process, good for occasional work.\n- **A background job queue** (BullMQ + Redis) — the endpoint returns `202 Accepted` with a job id and the client polls or gets notified. This is the standard production answer.\n- **A separate service** — full isolation, independent scaling.\n\nDoing it inline blocks *every* concurrent request. `setTimeout` or `setImmediate` do not help: they defer the work but it still runs on the same thread and still blocks.",
          c: ["runtime", "performance", "concurrency"],
          d: 3,
          choices: [
            {
              t: "In a worker thread or a background job queue, with the endpoint returning immediately",
              ok: true,
              why: "Correct — keep the event loop free.",
            },
            { t: "Inline in the request handler, it is fine", why: "It blocks every other request in the process." },
            { t: "Wrapped in `setTimeout(..., 0)` to make it async", why: "Defers it but still runs on the same thread." },
            { t: "In an `async` function — `async` moves it off-thread", why: "`async` does not create parallelism for CPU work." },
          ],
        }),
        multi("node-rt-env", {
          q: "Which are correct practices for configuration and secrets in a Node service?",
          why: "Read config from `process.env`, validate it **at startup** so a missing variable crashes immediately with a clear message rather than producing a confusing `undefined` deep in a request, keep `.env` out of version control (commit a `.env.example` instead), and provide secrets through the platform's secret store in production.\n\nWhat is wrong: committing `.env`, hard-coding a fallback secret (`process.env.JWT_SECRET || \"dev-secret\"` will silently ship to production if the variable is ever unset), and shipping different *builds* per environment rather than the same artefact configured differently.",
          c: ["config", "security", "deployment"],
          d: 2,
          choices: [
            { t: "Read values from `process.env`", ok: true },
            { t: "Validate required variables at startup and exit if any are missing", ok: true },
            { t: "Add `.env` to `.gitignore` and commit a `.env.example`", ok: true },
            { t: "Inject production secrets from the platform's secret manager", ok: true },
            { t: '`process.env.JWT_SECRET || "dev-secret"` as a safe fallback', why: "That fallback will eventually run in production." },
            { t: "Commit `.env` so the team shares the same config", why: "Secrets in version control are permanent — history keeps them." },
          ],
        }),
        tf("node-rt-devdeps", {
          q: "`devDependencies` are installed when you run `npm ci --omit=dev` in a production build.",
          answer: false,
          why: "They are not — that is the point of the split. TypeScript, test runners, linters and build tools are only needed to *produce* the artefact, so omitting them makes the production image smaller and reduces the dependency surface.\n\nThe consequence to watch for: anything imported by your **runtime** code must be a real `dependency`. Putting a runtime library in `devDependencies` works locally and fails in production with `MODULE_NOT_FOUND` — a classic first-deploy break.",
          c: ["packages", "deployment"],
          d: 2,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("node-express", {
      title: "Express: Routing & Middleware",
      level: 2,
      summary: "The pipeline, why order matters, and the four-argument error handler.",
      keyIdeas: [
        "Middleware runs in registration order and order is behaviour — parsers before routes, error handler last.",
        "Error middleware has exactly four parameters `(err, req, res, next)`; Express identifies it by arity.",
        "Express 4 does not catch async rejections — the request hangs. Wrap handlers, or use Express 5.",
        "Routes match first-registered-first: put `/users/new` before `/users/:id`.",
        "Call `next(err)` so one handler shapes, logs and sanitises every error.",
      ],
      brief: `Express is a **pipeline**. A request enters, passes through middleware in the order you registered it, and each one may respond, modify the request, or call \`next()\` to continue.

\`\`\`js
app.use(express.json());              // parse JSON body → req.body
app.use(cors());                       // CORS headers
app.use(requireAuth);                  // populate req.user or 401
app.get("/users/:id", getUser);        // route handler
app.use(errorHandler);                 // 4-arg error middleware, registered LAST
\`\`\`

**Order is behaviour.** \`express.json()\` after your routes means \`req.body\` is \`undefined\` in them. Auth after a route means the route is public.

Three things that trip people up:

1. **Error middleware has four parameters** — \`(err, req, res, next)\`. Express identifies it by arity. Write three and it is treated as ordinary middleware and never receives errors.
2. **Errors thrown in async handlers are not caught** by Express 4 — the rejection is unhandled and the request hangs. Wrap handlers, use \`express-async-errors\`, or use Express 5, which handles it.
3. **Route order matters** — \`/users/:id\` registered before \`/users/new\` means \`"new"\` is captured as an \`id\`.

Always call \`next(err)\` rather than handling every error inline: one place shapes the response, logs it, and hides internals.`,
      items: [
        mcq("node-exp-order", {
          q: "`req.body` is `undefined` in the POST handler. What is the most likely cause?",
          code: `app.post("/users", (req, res) => {
  console.log(req.body);   // undefined
});
app.use(express.json());`,
          why: "`express.json()` is registered **after** the route. Middleware only applies to routes registered later in the pipeline, so the body was never parsed by the time the handler ran.\n\nMove `app.use(express.json())` above your routes. The other candidate cause is the client not sending `Content-Type: application/json` — `express.json()` inspects the header and skips bodies that do not match, which produces the identical symptom and is worth mentioning as the second thing to check.",
          tip: "'Middleware order is behaviour' is the sentence to say.",
          c: ["middleware"],
          d: 2,
          choices: [
            {
              t: "`express.json()` is registered after the route, so the body was never parsed",
              ok: true,
              why: "Correct — register body parsers first.",
            },
            { t: "Express cannot parse JSON without a third-party package", why: "`express.json()` is built in since 4.16." },
            { t: "`req.body` only exists on PUT requests", why: "It exists for any request with a parsed body." },
            { t: "The route needs to be `async`", why: "Unrelated to body parsing." },
          ],
        }),
        mcq("node-exp-async-error", {
          q: "In Express 4, the database call rejects. What does the client see?",
          code: `app.get("/users", async (req, res) => {
  const users = await db.getUsers();   // rejects
  res.json(users);
});`,
          why: "**Nothing — the request hangs** until the client times out. Express 4 does not await your handler, so the rejected promise becomes an unhandled rejection. No response is ever sent and no error middleware runs.\n\nFixes: wrap with a helper (`const wrap = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)`), import `express-async-errors` which patches this globally, use an explicit `try/catch` calling `next(err)`, or upgrade to Express 5, which forwards async rejections automatically.\n\nThis is one of the most valuable Express gotchas because the symptom — a silent hang — gives no clue about the cause.",
          tip: "Silent hangs are memorable. Interviewers use this to find people who have run a real Express service.",
          c: ["error-handling", "middleware", "async-await"],
          d: 3,
          choices: [
            {
              t: "The request hangs — Express 4 does not catch async rejections",
              ok: true,
              why: "Correct: wrap the handler or use Express 5.",
            },
            { t: "A 500 from the default error handler", why: "Only if the error reaches `next()`, which it does not here." },
            { t: "An empty 200 response", why: "No response is sent at all." },
            { t: "Node crashes the process immediately", why: "It logs an unhandled rejection warning; the request still hangs." },
          ],
        }),
        blank("node-exp-errorhandler", {
          q: "Complete the Express error-handling middleware signature.",
          template: `app.use(({{1}}, req, res, {{2}}) => {
  logger.error({ err, path: req.path });
  res.status(err.status || 500).json({ error: err.publicMessage ?? "Internal Server Error" });
});`,
          answers: [["err", "error"], ["next", "_next"]],
          hints: ["The error, which comes first", "The fourth parameter Express checks for"],
          why: "Express identifies error middleware by **arity**: exactly four parameters, with `err` first. Three parameters and it is treated as ordinary middleware that never sees errors — a silent misconfiguration.\n\nRegister it **last**, after all routes. Note the response shape: the client gets a safe message while the full error goes to the log. Leaking `err.message` or a stack trace to the client exposes internal paths, library versions and sometimes query fragments.",
          c: ["error-handling", "middleware", "security"],
          d: 2,
          secs: 65,
        }),
        order("node-exp-pipeline", {
          q: "Order these middleware registrations for a typical Express API.",
          steps: [
            "Security headers (helmet) and CORS",
            "Request logging with a correlation id",
            "Body parsing (express.json)",
            "Rate limiting",
            "Authentication — populate req.user",
            "Route handlers",
            "404 handler for unmatched routes",
            "Error-handling middleware (4 args)",
          ],
          why: "Security headers and CORS go first so *every* response carries them, including errors. Logging early captures the whole request lifecycle. Body parsing must precede any route that reads `req.body`. Rate limiting sits before authentication so unauthenticated floods are cheap to reject.\n\nAuthentication runs before routes so handlers can rely on `req.user`. The 404 handler catches anything no route matched, and the four-argument error handler must be **last** — Express only forwards errors to middleware registered after the point they occurred.\n\nThe exact ordering has some flexibility, but the two hard rules are: parsers before consumers, error handler last.",
          tip: "A good whiteboard question — draw the pipeline and talk through why each one sits where it does.",
          c: ["middleware", "security"],
          d: 3,
          secs: 100,
        }),
        mcq("node-exp-routeorder", {
          q: "`GET /users/new` returns 'user not found'. Why?",
          code: `app.get("/users/:id", getUser);
app.get("/users/new", newUserForm);`,
          why: "Express matches routes **in registration order** and takes the first match. `/users/:id` matches `/users/new` with `id = \"new\"`, so `getUser` runs, looks up a user with the id `\"new\"`, and reports not found. The second route is unreachable.\n\nThe fix is to register **specific routes before parameterised ones**. The general principle — literal paths before wildcards — applies to most routers, including React Router and ASP.NET's conventional routing.",
          c: ["rest", "middleware"],
          d: 2,
          choices: [
            {
              t: "`/users/:id` is registered first and matches `new` as an id — put specific routes first",
              ok: true,
              why: "Correct: first match wins.",
            },
            { t: "Express does not support static segments after a parameter", why: "It does; the ordering is the issue." },
            { t: "`new` is a reserved word in route paths", why: "It is not reserved." },
            { t: "The routes need different HTTP methods", why: "Both are legitimately GET." },
          ],
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("node-api", {
      title: "Building a REST API",
      level: 3,
      summary: "Layers, status codes, validation and pagination — the CRUD job itself.",
      keyIdeas: [
        "Layers: route (HTTP only) → service (business rules, no `req`/`res`) → repository (data only).",
        "Validate every input at the boundary with a schema; return 400 naming the failing fields.",
        "201 + Location on create; 204 on delete; 401 who are you; 403 I know and no; 409 conflict; never 200 with an error body.",
        "Paginate every list endpoint from day one; cap the page size server-side.",
        "Offset pagination is simple but slow at depth and unstable under inserts; cursor is stable and fast.",
      ],
      brief: `A maintainable Node API has three layers:

- **Route/controller** — parse and validate input, call the service, shape the response. No business logic, no SQL.
- **Service** — the business rules. Knows nothing about HTTP; testable without a server.
- **Repository/data** — database access only.

The payoff is that business logic can be unit-tested without spinning up Express, and swapping the database or the transport touches one layer.

**Validate at the boundary.** Every request body, query parameter and route parameter is untrusted. A schema library (Zod) both validates and gives you the TypeScript type from one definition. Return \`400\` with a body naming which fields failed — not just \`"Bad Request"\`.

**Status codes you must use correctly:**

| Code | Meaning |
|---|---|
| 200 / 201 | OK / Created (with a \`Location\` header) |
| 204 | Success, no body — typical for DELETE |
| 400 | Malformed or invalid input |
| 401 | Not authenticated |
| 403 | Authenticated but not permitted |
| 404 | Resource does not exist |
| 409 | Conflict — duplicate, or a version clash |
| 422 | Well-formed but semantically invalid |
| 500 | We broke |

**Never return 200 with \`{"error": ...}\`.** Clients, proxies, monitoring and retry logic all read the status code.

**Paginate every list endpoint** from day one. Retrofitting it is a breaking change.`,
      items: [
        mcq("node-api-status", {
          q: "A `POST /orders` succeeds and creates a resource. What should it return?",
          why: "**`201 Created`**, with a `Location` header pointing at the new resource (`Location: /orders/abc123`) and usually the created object in the body so the client does not need a second request for the server-generated id and timestamps.\n\n`200 OK` is acceptable in many real APIs but `201` is the precise semantic. `204 No Content` is wrong here because there *is* content worth returning. And returning the id inside a `200` with no `Location` is the common shortcut — fine in practice, but knowing the correct answer is the point of the question.",
          c: ["rest", "http-semantics"],
          d: 2,
          choices: [
            { t: "`201 Created` with a `Location` header and the new resource", ok: true, why: "Correct and precise." },
            { t: "`200 OK` with the new id — always the right choice", why: "Common, but `201` is the accurate status for creation." },
            { t: "`204 No Content`", why: "There is content worth returning." },
            { t: "`202 Accepted`", why: "That means 'queued, not done yet' — right only for async processing." },
          ],
        }),
        mcq("node-api-401-403", {
          q: "A logged-in user requests another user's private order. Which status?",
          why: "**`403 Forbidden`**. The user is authenticated — the server knows who they are — but is not permitted to access this resource. `401 Unauthorized` means 'I don't know who you are; authenticate and try again', and is what you return for a missing or expired token.\n\nThe memorable phrasing: **401 is 'who are you?', 403 is 'I know who you are, and no'.**\n\nOne nuance worth raising: some APIs deliberately return `404` here instead, so an attacker cannot use `403` vs `404` to discover which resource ids exist. That trade-off — correctness versus information leakage — is a strong thing to mention.",
          tip: "Volunteering the 404-for-privacy trade-off marks you out as security-aware.",
          c: ["http-semantics", "auth", "security"],
          d: 2,
          choices: [
            { t: "`403 Forbidden`", ok: true, why: "Correct — authenticated but not permitted." },
            { t: "`401 Unauthorized`", why: "That is for missing or invalid authentication." },
            { t: "`400 Bad Request`", why: "The request is well-formed; it is a permission issue." },
            { t: "`500 Internal Server Error`", why: "Nothing is broken — the server is working correctly." },
          ],
        }),
        multi("node-api-validation", {
          q: "Which are true about validating input in an API?",
          why: "Every input from the network is untrusted, including headers and query strings — client-side validation is UX only and trivially bypassed with curl. A `400` should name **which** fields failed so the client can display useful messages. A schema library gives you validation and the TypeScript type from one definition, removing drift.\n\nWhat is wrong: trusting the client because your own front end validates; and echoing raw exception messages or stack traces back to the caller, which leaks internal structure. Validate at the edge, fail with a specific but safe message.",
          c: ["validation", "security", "rest"],
          d: 2,
          choices: [
            { t: "All network input is untrusted, including query params and headers", ok: true },
            { t: "A 400 response should identify which fields failed", ok: true },
            { t: "A schema library can produce both the runtime check and the static type", ok: true },
            { t: "Server validation is required even when the client already validates", ok: true },
            { t: "If your own SPA is the only client, server validation is optional", why: "Anyone can call the endpoint directly." },
            { t: "Returning the raw exception message helps clients debug", why: "It leaks internals — log it, return something safe." },
          ],
        }),
        mcq("node-api-pagination", {
          q: "`GET /orders` returns every order. It works with 500 rows. What is the problem and the fix?",
          why: "It fails once the table grows: a large query, a large JSON serialisation and a large payload, all of which occupy the event loop and memory. At some point it takes the service down.\n\nAdd pagination. **Offset pagination** (`?page=2&limit=50`) is simple and lets you jump to a page, but `OFFSET 100000` makes the database walk and discard those rows, and items shift between pages if data changes mid-scroll. **Cursor pagination** (`?after=<id>&limit=50`) stays fast at any depth and is stable under inserts, but cannot jump to an arbitrary page.\n\nEither is fine — being able to state the trade-off is what the question is testing. Also cap `limit` server-side so a client cannot request a million rows.",
          tip: "'And I'd cap the page size server-side' is the detail that shows production experience.",
          c: ["rest", "performance", "sql-basics"],
          d: 3,
          choices: [
            {
              t: "It will not scale — add pagination, choosing offset or cursor based on the access pattern",
              ok: true,
              why: "Correct, and the trade-off is the real answer.",
            },
            { t: "No problem — the database is fast", why: "The payload and serialisation cost grow regardless." },
            { t: "Fix it by caching the full response", why: "Caching a growing payload defers the problem and adds staleness." },
            { t: "Stream the JSON so memory stays flat", why: "Helps memory, but the client still receives an unbounded list." },
          ],
        }),
        short("node-api-structure", {
          q: "*\"How would you structure a Node + Express API so it stays maintainable?\"*",
          why: "An architecture question with no single right answer. Interviewers want layered thinking and a justification, not a folder screenshot.",
          model:
            "I'd separate by responsibility into three layers. The route or controller layer handles HTTP concerns only: parse and validate the input, call a service, map the result to a status code. The service layer holds the business rules and knows nothing about HTTP — no `req`, no `res` — so it can be unit-tested directly. The repository layer is the only place that talks to the database.\n\nThe reason is testability and change isolation. Business logic tested without booting a server runs in milliseconds, and swapping the database or adding a second transport like a queue consumer touches one layer instead of everything.\n\nFor folder layout I'd group by **feature** rather than by type — `orders/` containing its route, service, repository and tests — because when you work on orders everything you need is together. Grouping by type gives you `controllers/`, `services/`, `models/` and a change touches three distant folders.\n\nCross-cutting concerns go in middleware: auth, request logging with a correlation id, and a single error handler at the end that logs the full error and returns a safe shaped response. Config gets validated once at startup so the process fails fast rather than at the first request.\n\nI'd also keep it proportional — a small service doesn't need every layer, and over-abstracting a three-endpoint API is its own problem.",
          points: [
            "Three layers: route (HTTP) → service (business rules) → repository (data)",
            "Services have no HTTP types, so they unit-test without a server",
            "Group folders by feature, not by technical type",
            "Cross-cutting: auth, logging with correlation id, one error handler last",
            "Validate config at startup; fail fast",
            "Keep it proportional to the size of the service",
          ],
          c: ["component-design", "middleware", "testing"],
          d: 3,
          secs: 170,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("node-auth", {
      title: "Auth, Sessions & JWT",
      level: 3,
      summary: "Hashing, cookies vs tokens, and what actually stops the common attacks.",
      keyIdeas: [
        "Store bcrypt/scrypt/Argon2 hashes — slow by design. Never SHA-256, never reversible encryption.",
        "`httpOnly` + `Secure` + `SameSite` cookies defend tokens against XSS; add CSRF protection for mutations.",
        "`localStorage` is readable by any script on the page — one XSS takes every token.",
        "JWT payloads are readable by anyone; the signature proves origin, not secrecy. Pin the algorithm.",
        "Stateless tokens cannot be revoked — use short-lived access tokens plus revocable refresh tokens.",
        "Return the same 'invalid email or password' for both cases to prevent user enumeration.",
      ],
      brief: `**Never store passwords.** Store a slow hash: **bcrypt**, **scrypt** or **Argon2**, with a per-password salt (bcrypt embeds it in the output). Not MD5, not SHA-256 — general-purpose hashes are far too fast, so an attacker with the hash file can try billions per second.

**Sessions vs JWTs:**

| | Session cookie | JWT |
|---|---|---|
| State | Server holds the session | Self-contained, signed |
| Revocation | Delete the session — instant | Hard; valid until expiry |
| Scaling | Needs shared store | Stateless |
| Common flaw | — | Long-lived tokens that cannot be revoked |

The pragmatic middle ground most teams land on: a **short-lived access token** (5–15 min) plus a **refresh token** stored in an \`httpOnly\` cookie, so a stolen access token expires quickly and refresh can be revoked server-side.

**Where do you put a token in a browser?** \`localStorage\` is readable by any JavaScript on the page, so any XSS steals it. An \`httpOnly\` cookie cannot be read by JavaScript — but cookies are sent automatically, so they need CSRF protection (\`SameSite=Lax\` or \`Strict\`, plus a CSRF token for state-changing requests). Neither option is free; pick the risk you are actually defending against.

Cookie flags worth memorising: \`httpOnly\`, \`Secure\`, \`SameSite\`, \`Max-Age\`, \`Path\`.`,
      items: [
        mcq("node-auth-hash", {
          q: "Which is the right way to store user passwords?",
          why: "**bcrypt / scrypt / Argon2 with a per-password salt.** These are deliberately *slow* and have a tunable work factor you increase as hardware gets faster. That slowness is the entire security property.\n\nSHA-256 is the trap answer: it is cryptographically strong for integrity but far too fast for passwords — a GPU tries billions per second. Salting a fast hash helps against rainbow tables but not against brute force. Encryption is wrong because it is reversible: whoever holds the key holds every password. Plain text needs no comment.",
          c: ["security", "auth"],
          d: 2,
          choices: [
            { t: "bcrypt, scrypt or Argon2 with a per-password salt", ok: true, why: "Correct — deliberately slow, with a tunable work factor." },
            { t: "SHA-256 with a salt", why: "Too fast — salting does not fix brute-force speed." },
            { t: "AES encryption, so they can be recovered", why: "Reversible: one key compromise exposes everything." },
            { t: "MD5 with a long salt", why: "Fast and broken." },
          ],
        }),
        mcq("node-auth-storage", {
          q: "Where should a browser SPA keep its auth token?",
          why: "An **`httpOnly` cookie** with `Secure` and `SameSite` is generally the better default. `httpOnly` means JavaScript cannot read it, so an XSS payload cannot exfiltrate it — and XSS is the more common and more damaging attack.\n\nThe trade-off is that cookies are sent automatically, which opens CSRF. You mitigate that with `SameSite=Lax` (which blocks most cross-site sends by default in modern browsers) plus a CSRF token for state-changing requests.\n\n`localStorage` is readable by any script on the page, so one XSS — including one from a compromised dependency — takes every user's token. The honest framing: neither is free; you are choosing which attack to defend against, and XSS is usually the bigger risk.",
          tip: "Answering 'localStorage, it's easier' is a red flag. Answering with the trade-off is the win.",
          c: ["auth", "security"],
          d: 3,
          choices: [
            {
              t: "An `httpOnly`, `Secure`, `SameSite` cookie — plus CSRF protection for mutations",
              ok: true,
              why: "Correct: protects against XSS exfiltration, with CSRF handled separately.",
            },
            { t: "`localStorage` — simple and not sent automatically", why: "Any XSS reads it. That is the dominant risk." },
            { t: "`sessionStorage` — safer because it clears on tab close", why: "Equally readable by JavaScript." },
            { t: "A regular (non-httpOnly) cookie", why: "Readable by script, and still CSRF-exposed — the worst of both." },
          ],
        }),
        multi("node-auth-jwt", {
          q: "Which statements about JWTs are true?",
          why: "A JWT's payload is **base64url-encoded, not encrypted** — anyone holding the token can read its claims, so never put secrets in it. The signature proves it was issued by someone with the key and has not been altered.\n\nRevocation is the real weakness: a stateless token stays valid until it expires, so 'log out everywhere' or 'ban this user now' requires a denylist or short expiry plus revocable refresh tokens — which reintroduces the state JWTs were meant to avoid.\n\nAnd you must **pin the algorithm** when verifying. Historic libraries accepted `alg: none` or allowed an attacker to switch RS256 to HS256 and sign with the public key.",
          c: ["auth", "security"],
          d: 3,
          choices: [
            { t: "The payload is encoded, not encrypted — anyone can read the claims", ok: true },
            { t: "The signature proves integrity and issuer, not confidentiality", ok: true },
            { t: "Revoking a JWT before expiry requires extra server state", ok: true },
            { t: "You should pin the expected algorithm when verifying", ok: true },
            { t: "JWT payloads are encrypted, so they can hold sensitive data", why: "Base64 is encoding — trivially decoded." },
            { t: "A JWT can be invalidated instantly by deleting it client-side", why: "A copied token keeps working until it expires." },
          ],
        }),
        order("node-auth-login", {
          q: "Order the steps of a password login on the server.",
          steps: [
            "Validate the request body has an email and password",
            "Look up the user by email",
            "Compare the submitted password against the stored hash with bcrypt.compare",
            "On success, create a session or sign a short-lived access token",
            "Set it in an httpOnly, Secure, SameSite cookie",
            "Return 200 with safe user fields — never the hash",
          ],
          why: "Two details reviewers look for. **Use `bcrypt.compare`**, never re-hash and compare strings yourself — `compare` extracts the salt from the stored hash and is timing-safe.\n\nAnd return the **same generic error** ('Invalid email or password') for both an unknown email and a wrong password. Distinguishing them lets an attacker enumerate which emails have accounts. Ideally you also do the hash comparison even when the user does not exist, so response timing does not leak it either.\n\nThe response must never include the password hash — an easy mistake when you return the whole user row.",
          tip: "Mentioning user enumeration unprompted is a strong security signal.",
          c: ["auth", "security", "validation"],
          d: 3,
          secs: 90,
        }),
      ],
    }),

    // ─────────────────────────────────────────────────────────
    mod("node-prod", {
      title: "Production Concerns",
      level: 4,
      summary: "Logging, graceful shutdown, health checks and not leaking internals.",
      keyIdeas: [
        "Structured JSON logs with a correlation id per request; never log tokens, passwords or full bodies.",
        "Log the full error server-side; return a generic message plus a reference id — never a stack trace.",
        "On SIGTERM: stop accepting connections, drain in-flight requests, close pools, then exit.",
        "Liveness checks stay cheap and local; dependency checks belong in a separate readiness probe.",
        "Use helmet for headers and rate limiting on auth endpoints; never run as root in a container.",
      ],
      brief: `The gap between an app that runs and a service you can operate:

**Structured logging.** JSON, not \`console.log("user " + id + " did thing")\`. Include a **correlation id** per request so you can trace one user's journey across log lines. Log at boundaries — request in, external call out, error — with the identifiers you would search by. Never log secrets, tokens, passwords or full request bodies.

**Error responses.** Log the full error server-side; return a safe shape to the client. A stack trace in the response tells an attacker your framework, versions and file layout.

**Graceful shutdown.** On \`SIGTERM\` — which is what a container orchestrator sends — stop accepting new connections, finish in-flight requests, close the database pool, then exit. Without it, every deploy drops live requests.

**Health checks.** \`/health\` for liveness (is the process up?) and a separate readiness check that verifies dependencies (is the database reachable?). Keep liveness cheap: if it queries the database, a slow database triggers a restart loop that makes things worse.

**Don't reinvent:** \`helmet\` for security headers, \`express-rate-limit\` for abuse, and never run as root in a container.`,
      items: [
        multi("node-prod-logging", {
          q: "Which are good logging practices for a production service?",
          why: "Structured JSON logs are queryable — you can filter by user id or status code instead of grepping prose. A **correlation id** propagated through the request (and to downstream calls) lets you reconstruct one user's journey across many log lines and services. Log levels let you turn up detail without redeploying.\n\nWhat is harmful: logging tokens, passwords or full request bodies, which puts secrets and personal data into a system with wide read access and long retention. And `console.log` in a hot path is a synchronous write that can measurably slow the event loop.",
          c: ["logging", "security", "performance"],
          d: 3,
          choices: [
            { t: "Structured JSON output so logs are queryable", ok: true },
            { t: "A correlation id per request, propagated to downstream calls", ok: true },
            { t: "Log levels (debug/info/warn/error) configurable per environment", ok: true },
            { t: "Include the identifiers you would want to search by", ok: true },
            { t: "Log the full request body including auth headers for debugging", why: "Writes secrets and personal data into your logs permanently." },
            { t: "`console.log` everywhere — it is simplest", why: "Unstructured, and synchronous writes can block the loop." },
          ],
        }),
        mcq("node-prod-shutdown", {
          q: "Your container platform sends `SIGTERM` before replacing a pod. What should the app do?",
          why: "**Graceful shutdown**: stop accepting new connections (`server.close()`), let in-flight requests finish within a timeout, close the database pool and other resources, then exit `0`. Add a hard timeout so a stuck request cannot block the shutdown indefinitely.\n\nIgnoring `SIGTERM` means the platform waits its grace period and then sends `SIGKILL`, terminating live requests mid-flight — users see failures on every deploy. Exiting immediately on `SIGTERM` has exactly the same effect.\n\nThis is one of the clearest 'has this person operated a service?' questions.",
          c: ["deployment", "runtime", "error-handling"],
          d: 3,
          choices: [
            {
              t: "Stop accepting new connections, drain in-flight requests, close resources, then exit",
              ok: true,
              why: "Correct — with a hard timeout as a backstop.",
            },
            { t: "Call `process.exit(0)` immediately", why: "Kills in-flight requests — the thing graceful shutdown prevents." },
            { t: "Ignore it; the platform will handle it", why: "It escalates to SIGKILL and drops requests." },
            { t: "Restart the process to clear memory", why: "The platform is already replacing it." },
          ],
        }),
        mcq("node-prod-error-response", {
          q: "What is wrong with this error handler?",
          code: `app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message, stack: err.stack });
});`,
          why: "It **leaks internals to the client**. A stack trace reveals your file paths, framework and library versions, and internal module names — a map for anyone probing the service. Database errors are worse: `err.message` can contain table names, column names and fragments of the query.\n\nThe correct shape is to log the full error server-side with the correlation id, and return a generic message plus a reference id the user can quote to support:\n\n```js\nlogger.error({ err, requestId: req.id });\nres.status(err.status ?? 500).json({\n  error: err.publicMessage ?? \"Internal Server Error\",\n  requestId: req.id,\n});\n```\n\nAlso note it always returns 500 — a validation error that set `err.status = 400` would be reported as a server fault.",
          c: ["security", "error-handling", "logging"],
          d: 3,
          choices: [
            {
              t: "It leaks stack traces and internal details — log them, return a safe message and a reference id",
              ok: true,
              why: "Correct on both the leak and the fix.",
            },
            { t: "Nothing — detailed errors help clients debug", why: "They help attackers more than clients." },
            { t: "It should use `res.send` rather than `res.json`", why: "Cosmetic; the leak is the issue." },
            { t: "It is missing `next(err)` at the end", why: "This is the final handler; forwarding again is not needed." },
          ],
        }),
        tf("node-prod-health-db", {
          q: "A liveness `/health` endpoint should query the database to confirm the service is fully working.",
          answer: false,
          why: "Not for **liveness**. Liveness answers 'is this process alive, or should it be restarted?'. If it depends on the database, a brief database outage makes every instance report unhealthy, the orchestrator restarts them all, and you have turned a recoverable dependency blip into a full outage — restarting the app does nothing to fix the database.\n\nDependency checks belong in a separate **readiness** probe, which controls whether traffic is *routed* to the instance rather than whether it is killed. Keep liveness cheap and local.",
          tip: "This distinction is a genuine production lesson and it comes up in platform-flavoured interviews.",
          c: ["deployment", "runtime"],
          d: 3,
        }),
      ],
    }),
  ],
});
