import { defineTrack, mod, mcq, multi, tf, out, order, short } from "../builder";

export default defineTrack({
  slug: "web",
  name: "Web & HTTP",
  tagline: "How the request actually gets there",
  description:
    "HTTP methods and status codes, REST design, the browser, cookies and CORS, and the web security vocabulary you are expected to have.",
  icon: "◍",
  color: "#ec4899",
  modules: [
    mod("web-http", {
      title: "HTTP Fundamentals",
      level: 1,
      summary: "Methods, status codes, idempotency and headers.",
      keyIdeas: [
        "GET/HEAD are safe and idempotent; PUT/DELETE idempotent; POST neither — retry POST only with an idempotency key.",
        "2xx success, 3xx redirect, 4xx the client erred, 5xx we erred.",
        "401 = not authenticated (who are you?); 403 = authenticated but forbidden; 404 missing; 409 conflict; 429 rate limited.",
        "HTTP is stateless — sessions are a convention built on cookies or tokens.",
        "GET responses can be cached and revalidated with ETag/304; POST responses are not.",
      ],
      brief: `HTTP is **stateless**: each request carries everything needed to serve it. Sessions are a convention layered on top with cookies or tokens.

**Methods and their properties:**

| Method | Safe | Idempotent | Body |
|---|---|---|---|
| GET | yes | yes | no |
| HEAD | yes | yes | no |
| POST | no | **no** | yes |
| PUT | no | yes | yes |
| PATCH | no | no* | yes |
| DELETE | no | yes | usually not |

**Safe** = does not change state. **Idempotent** = the same request repeated has the same effect as sending it once. That is why a client can safely retry a \`PUT\` or \`DELETE\` after a timeout, but retrying a \`POST\` may create a second order.

**Status code families:** 1xx informational, 2xx success, 3xx redirection, 4xx *you* made a mistake, 5xx *we* made a mistake.

The ones to know precisely: **200** OK, **201** Created, **204** No Content, **301** moved permanently (cached by browsers — be careful), **302/307** temporary, **304** Not Modified, **400** bad request, **401** not authenticated, **403** not permitted, **404** not found, **409** conflict, **422** semantically invalid, **429** rate limited, **500** server error, **502/503/504** gateway and availability failures.

**Headers that matter**: \`Content-Type\`, \`Authorization\`, \`Accept\`, \`Cache-Control\`, \`ETag\`, \`Set-Cookie\`, \`Location\`.`,
      items: [
        mcq("web-http-idempotent", {
          q: "A `POST /orders` times out. Is it safe for the client to retry automatically?",
          why: "**No** — `POST` is not idempotent. The timeout tells you nothing about whether the server processed the request; it may have created the order and simply failed to deliver the response. Retrying may create a duplicate.\n\nThe standard fix is an **idempotency key**: the client generates a unique id, sends it as a header, and the server stores the outcome against that key so a retry returns the original result rather than repeating the work. Payment APIs like Stripe do exactly this.\n\nBy contrast, `PUT /orders/123` and `DELETE /orders/123` are idempotent by definition, so retrying them is safe.",
          tip: "Naming idempotency keys turns a definition answer into a design answer.",
          c: ["http-semantics", "rest"],
          d: 3,
          choices: [
            {
              t: "No — POST is not idempotent; use an idempotency key to make retries safe",
              ok: true,
              why: "Correct: the timeout does not tell you whether it succeeded.",
            },
            { t: "Yes — a timeout means it did not reach the server", why: "It may have been processed and only the response lost." },
            { t: "Yes — HTTP retries are always safe", why: "Only for idempotent methods." },
            { t: "No — but changing it to GET would fix it", why: "GET must not create resources." },
          ],
        }),
        mcq("web-http-401403", {
          q: "Which pair of status codes is correctly described?",
          why: "**401 Unauthorized** actually means *unauthenticated* — the name is a historical misnomer. It says 'I don't know who you are'; the client should authenticate and retry, and the response should include a `WWW-Authenticate` header. **403 Forbidden** means 'I know who you are and you may not do this' — retrying with the same credentials will not help.\n\nThe short version: **401 is who are you, 403 is I know and no.**\n\nAlso worth having straight: **404** for a missing resource, **409** for a conflict such as a duplicate or a version clash, **422** for well-formed but semantically invalid input, and **429** for rate limiting.",
          c: ["http-semantics", "auth"],
          d: 2,
          choices: [
            { t: "401 = not authenticated; 403 = authenticated but not permitted", ok: true, why: "Correct." },
            { t: "401 = no permission; 403 = not logged in", why: "Reversed." },
            { t: "401 = bad credentials; 403 = server error", why: "403 is not a server error." },
            { t: "Both mean the same thing", why: "They distinguish identity from permission." },
          ],
        }),
        multi("web-http-status", {
          q: "Which status code usages are correct?",
          why: "`201 Created` with a `Location` header for a successful POST. `204 No Content` for a DELETE with nothing to return. `409 Conflict` for a duplicate resource or an optimistic-concurrency version clash. `429 Too Many Requests` for rate limiting, ideally with a `Retry-After` header.\n\nWhat is wrong: returning `200` with an error body — clients, proxies, monitoring and retry logic all read the status code, so a `200` carrying `{\"error\": ...}` defeats every layer of tooling. And a validation failure is `400`/`422`, not `500`, because nothing on the server actually broke.",
          c: ["http-semantics", "rest"],
          d: 2,
          choices: [
            { t: "201 with a `Location` header after creating a resource", ok: true },
            { t: "204 for a successful DELETE with no response body", ok: true },
            { t: "409 for a duplicate or version conflict", ok: true },
            { t: "429 with `Retry-After` for rate limiting", ok: true },
            { t: '200 with `{"success": false, "error": "..."}`', why: "Tooling reads the status code — this hides the failure." },
            { t: "500 when the client sends an invalid email address", why: "That is a 400/422; the server is working correctly." },
          ],
        }),
        order("web-http-lifecycle", {
          q: "Order what happens when a user types a URL and presses Enter.",
          steps: [
            "The browser resolves the domain to an IP via DNS",
            "A TCP connection is opened (and a TLS handshake for HTTPS)",
            "The browser sends an HTTP request with headers and cookies",
            "The server processes it and returns a status, headers and body",
            "The browser parses the HTML and requests linked CSS, JS and images",
            "The DOM and CSSOM are built, laid out and painted",
            "JavaScript runs and can modify the page",
          ],
          why: "The classic 'what happens when you type a URL' question. It is not testing memorisation of TCP — it is checking that you understand the request lifecycle end to end, since almost every web bug lives at one of these steps.\n\nGood details to add if asked to go deeper: DNS is cached at several layers; HTTP/2 multiplexes many requests over one connection; render-blocking CSS and synchronous scripts delay first paint (hence `defer`/`async`); and the browser may serve from cache without contacting the server at all, or send a conditional request with `If-None-Match` and receive a `304`.",
          c: ["http-semantics", "performance"],
          d: 2,
          secs: 90,
        }),
        mcq("web-http-versions", {
          q: "What does HTTP/3 fix that HTTP/2 does not?",
          why: "**Head-of-line blocking at the TCP layer.** In one line each:\n\n- **HTTP/1.1** — text protocol, effectively one request at a time per connection, so browsers open around six connections per host.\n- **HTTP/2** — binary framing, many requests **multiplexed** as streams over one TCP connection, plus header compression. But TCP delivers bytes strictly in order, so one lost packet stalls *every* stream on the connection until it is retransmitted.\n- **HTTP/3** — the same model running over **QUIC** on UDP. QUIC handles loss per stream, so a dropped packet only delays the stream it belongs to, and it combines the transport and TLS handshakes for faster connection setup. It also lets a connection survive a network change, such as Wi-Fi to mobile.\n\nThe request and response semantics — methods, status codes, headers — are identical across all three; application code rarely notices which one is in use.",
          tip: "Say 'HTTP/2 fixed HTTP-level head-of-line blocking; HTTP/3 fixed TCP-level' — that framing is exactly right.",
          c: ["http-semantics", "performance"],
          d: 2,
          choices: [
            {
              t: "One lost packet no longer stalls every multiplexed stream, because QUIC recovers loss per stream over UDP",
              ok: true,
              why: "Correct — TCP's in-order delivery was the remaining bottleneck.",
            },
            {
              t: "It introduces multiplexing many requests over one connection",
              why: "HTTP/2 already did that. HTTP/3 keeps multiplexing but moves it onto QUIC.",
            },
            {
              t: "It adds new methods and status codes",
              why: "Semantics are unchanged; only the transport differs.",
            },
            {
              t: "It makes encryption optional to reduce latency",
              why: "The reverse: QUIC has TLS 1.3 built in, so HTTP/3 is always encrypted.",
            },
          ],
        }),
        multi("web-http-caching", {
          q: "Which statements about HTTP caching headers are correct?",
          why: "Correct: **`max-age=3600`** means the response is fresh for an hour and can be reused without contacting the server. **`no-store`** means do not store it anywhere — for sensitive responses. And with an **`ETag`**, the client revalidates by sending `If-None-Match`; if nothing changed, the server replies `304 Not Modified` with no body, saving the transfer.\n\nThe trap is **`no-cache`**: it does *not* mean 'do not cache'. It means the response may be stored but must be **revalidated with the server before every use** — typically via the ETag, so an unchanged resource still costs only a small 304.\n\nA common production pattern follows from this: fingerprinted static assets (`app.3f9a1c.js`) get `Cache-Control: public, max-age=31536000, immutable` because a new build means a new filename, while the HTML that references them gets `no-cache` so users always pick up the latest build.",
          tip: "The `no-cache` versus `no-store` distinction is the single most-asked caching detail.",
          c: ["http-semantics", "performance"],
          d: 2,
          choices: [
            { t: "`max-age=3600` lets the response be reused for an hour without contacting the server", ok: true },
            { t: "`no-store` means the response must not be stored in any cache", ok: true },
            { t: "A matching `If-None-Match` lets the server reply `304 Not Modified` without a body", ok: true },
            {
              t: "`no-cache` means the response is never stored",
              why: "It may be stored, but must be revalidated before each use. `no-store` is the one that forbids storing.",
            },
            {
              t: "`Cache-Control` only affects CDNs, not browsers",
              why: "Browsers, CDNs and proxies all honour it; `private` and `s-maxage` let you target them separately.",
            },
          ],
        }),
        mcq("web-http-cdn", {
          q: "What does putting a CDN in front of a web app actually do?",
          why: "It **serves cached copies of responses from edge servers close to the user**. The first request for a file in a region goes through to your origin; the CDN stores the response according to its caching headers, and later requests in that region are answered from the edge — lower latency for users, and far less traffic hitting your servers.\n\nWhat gets cached is governed by the headers you send: `Cache-Control` with `max-age`, or `s-maxage`, which applies only to shared caches such as CDNs and proxies, and `private` for anything per-user. That is why static assets (JS, CSS, images, fonts) are the natural fit, and why fingerprinted filenames matter — you can cache for a year and still deploy instantly.\n\nMost CDNs also terminate TLS near the user and absorb some DDoS traffic. What a CDN does not do is make an uncacheable, per-user API response faster by caching it — sending `private` or authenticated responses through a shared cache would be a data leak.",
          tip: "Tie the CDN back to `Cache-Control` — it shows you know the headers are what actually drive it.",
          c: ["performance", "deployment", "http-semantics"],
          d: 1,
          choices: [
            {
              t: "Caches responses at edge locations near users, driven by your caching headers, reducing latency and origin load",
              ok: true,
              why: "Correct — geography plus caching.",
            },
            {
              t: "Replicates your database to multiple regions",
              why: "That is database replication, a separate concern.",
            },
            {
              t: "Compiles and minifies your JavaScript",
              why: "That is the build tool's job; the CDN serves the output.",
            },
            {
              t: "Caches every API response, including per-user data, to speed up the whole app",
              why: "Caching per-user responses in a shared cache would leak data between users; mark them `private`.",
            },
          ],
        }),
      ],
    }),

    mod("web-rest", {
      title: "REST API Design",
      level: 2,
      summary: "Resources and verbs, versioning, and the shape of a good error.",
      keyIdeas: [
        "Nouns in the path, verbs in the method: `GET /orders/123`, not `POST /getOrder`.",
        "PUT replaces the whole resource; PATCH updates the fields you send.",
        "Plural nouns, shallow nesting, filtering/sorting/paging in the query string.",
        "Wrap list responses in an object so pagination metadata can be added without a breaking change.",
        "One consistent error shape with a machine-readable code; version from day one.",
      ],
      brief: `REST models your API as **resources** (nouns) acted on by HTTP **methods** (verbs).

\`\`\`
GET    /orders            list
GET    /orders/123        fetch one
POST   /orders            create
PUT    /orders/123        full replace
PATCH  /orders/123        partial update
DELETE /orders/123        remove
GET    /orders/123/items  sub-resource
\`\`\`

The tells of an API designed by someone who has only consumed them: verbs in the path (\`POST /createOrder\`, \`GET /getUserById?id=1\`), everything as \`POST\`, and \`200 OK\` for failures.

**Design points that come up:**

- **Plural nouns** consistently — \`/orders\`, not \`/order\`.
- **Nest one level** for genuine sub-resources; deeper than \`/a/1/b/2\` gets unusable. Prefer filtering: \`/items?orderId=123\`.
- **Paginate every list** from day one — adding it later is a breaking change.
- **Filter, sort and page in the query string**: \`?status=open&sort=-created&page=2&limit=50\`.
- **Version from the start** — \`/api/v1/...\` or a header. You will need it.
- **Consistent error shape** across every endpoint, with a machine-readable code and a human message. \`ProblemDetails\` (RFC 7807) is a reasonable standard to adopt.

Not everything must be REST. A \`POST /orders/123/cancel\` action endpoint is pragmatic and widely accepted where a state transition does not map cleanly to CRUD.`,
      items: [
        mcq("web-rest-verbs", {
          q: "Which endpoint set is idiomatic REST?",
          why: "`GET /users/123` and `DELETE /users/123` — the **noun** is in the path and the **verb** is the HTTP method. That is the core of REST, and it means caches, proxies, retry logic and monitoring can reason about your API without knowing anything about it.\n\n`POST /getUser` and `POST /deleteUser` put the verb in the path and make everything a POST, which breaks caching (a GET is cacheable, a POST is not), breaks safe retries, and forces every client to read your documentation to know what is safe to call.\n\nA pragmatic exception worth mentioning: action endpoints like `POST /orders/123/cancel` for state transitions that do not map cleanly onto CRUD.",
          c: ["rest", "http-semantics"],
          d: 1,
          choices: [
            { t: "`GET /users/123`, `DELETE /users/123`", ok: true, why: "Correct — nouns in the path, verbs as methods." },
            { t: "`POST /getUser`, `POST /deleteUser`", why: "Verbs in the path; loses caching and safe retries." },
            { t: "`GET /users/delete?id=123`", why: "GET must be safe — it must never delete anything." },
            { t: "`POST /users?action=delete`", why: "Same problem in a different shape." },
          ],
        }),
        multi("web-rest-design", {
          q: "Which are good REST API design practices?",
          why: "Plural nouns consistently; pagination on every list endpoint from day one (adding it later breaks clients); a single consistent error shape with a machine-readable code plus a human message; and versioning from the start.\n\nWhat is wrong: returning bare arrays from list endpoints leaves nowhere to put pagination metadata later without a breaking change — wrap them in an object (`{ data: [...], page, total }`). And exposing raw database column names ties your public contract to your schema, so a rename becomes a breaking API change.",
          c: ["rest"],
          d: 3,
          choices: [
            { t: "Consistent plural nouns for collections", ok: true },
            { t: "Pagination on list endpoints from the beginning", ok: true },
            { t: "One error shape across all endpoints, with a machine-readable code", ok: true },
            { t: "Version the API from day one", ok: true },
            { t: "Return a bare JSON array from list endpoints", why: "No room for pagination metadata without a breaking change." },
            { t: "Expose database column names directly in responses", why: "Couples the public contract to your schema." },
          ],
        }),
        mcq("web-rest-put-patch", {
          q: "What is the difference between `PUT` and `PATCH`?",
          why: "**`PUT` replaces the entire resource** — you send the complete representation, and fields you omit should be cleared or reset. **`PATCH` applies a partial update** — you send only the fields you want changed.\n\nThe practical consequence: sending `{\"name\": \"new\"}` to `PUT /users/1` should wipe every other field. If your API treats that as a partial update, it is a PATCH wearing a PUT's name — a common inconsistency worth flagging.\n\nPUT is idempotent (sending it twice gives the same state). PATCH usually is too, but need not be — a patch expressing 'increment by one' is not.",
          c: ["rest", "http-semantics"],
          d: 2,
          choices: [
            { t: "PUT replaces the whole resource; PATCH updates only the supplied fields", ok: true, why: "Correct." },
            { t: "PUT creates, PATCH updates", why: "Both update; PUT may create at a known URI." },
            { t: "PATCH is idempotent and PUT is not", why: "Reversed — PUT is idempotent by definition." },
            { t: "They are interchangeable", why: "They carry different guarantees to clients." },
          ],
        }),
        tf("web-rest-cache-get", {
          q: "`GET` responses can be cached by browsers and intermediaries, but `POST` responses generally are not.",
          answer: true,
          why: "True, and it is one of the strongest practical arguments for using the correct method. `GET` is **safe and idempotent**, so browsers, CDNs and proxies can cache the response, revalidate it with `ETag`/`If-None-Match`, and return a cheap `304 Not Modified`.\n\n`POST` is neither, so caching it would be unsafe and it is not cached by default. This is why an API that tunnels reads through `POST /getUser` gives up an entire layer of free performance — every request must reach your origin server.",
          c: ["http-semantics", "performance"],
          d: 2,
        }),
      ],
    }),

    mod("web-browser", {
      title: "Browser, Storage & CORS",
      level: 2,
      summary: "Cookies vs storage, same-origin, and why CORS is not security.",
      keyIdeas: [
        "An origin is scheme + host + port; a subdomain or a different port is a different origin.",
        "Cookies are sent automatically (convenient, CSRF-exposed); `httpOnly` hides them from script.",
        "`localStorage` is plain text, readable by any script, never sent automatically.",
        "CORS is browser-enforced and protects users, not your API — curl ignores it entirely.",
        "Non-simple requests trigger an OPTIONS preflight; cache it with `Access-Control-Max-Age`.",
      ],
      brief: `**Storage options:**

| | Size | Sent to server | Expires | JS-readable |
|---|---|---|---|---|
| Cookie | ~4KB | **Yes, automatically** | Configurable | Unless \`httpOnly\` |
| localStorage | ~5–10MB | No | Never | Yes |
| sessionStorage | ~5–10MB | No | On tab close | Yes |

Cookies being sent automatically is both their convenience and the reason CSRF exists.

**Cookie flags**: \`httpOnly\` (JS cannot read it — the XSS defence), \`Secure\` (HTTPS only), \`SameSite=Lax|Strict|None\` (the CSRF defence), \`Max-Age\`, \`Domain\`, \`Path\`.

**Same-origin policy**: two URLs share an origin only if **scheme, host and port** all match. \`http://\` vs \`https://\`, or port 3000 vs 5000, are different origins.

**CORS** relaxes that policy for browser-initiated cross-origin requests. Three things people get wrong:

1. It is enforced **by the browser**, not the server. Your API still processed the request — the browser just refuses to hand the response to JavaScript. That is why curl and Postman work.
2. It is **not a security mechanism** for your API. It protects *users* from malicious sites reading their data; it does nothing to stop a non-browser client.
3. **Preflight**: "non-simple" requests (custom headers, \`PUT\`/\`DELETE\`, JSON content type) trigger an \`OPTIONS\` request first. If that fails, the real request is never sent.`,
      items: [
        mcq("web-cors-nature", {
          q: "Which statement about CORS is accurate?",
          why: "CORS is enforced **by the browser**. The request typically reaches your server and is processed; the browser then blocks JavaScript from reading the response because the `Access-Control-Allow-Origin` header does not permit the calling origin.\n\nTwo consequences. First, CORS is **not** a security control for your API — anyone can call it with curl, a script or Postman, none of which enforce CORS. Authentication and authorisation are what protect your endpoints. Second, a blocked *GET* may still have executed on your server — and if that GET had side effects, they happened.\n\nIt is best described as a controlled relaxation of the same-origin policy, protecting *users* rather than servers.",
          tip: "'CORS protects the user, not the API' is the line that shows you actually understand it.",
          c: ["cors", "security"],
          d: 3,
          choices: [
            {
              t: "It is browser-enforced and protects users — it does not secure your API from non-browser clients",
              ok: true,
              why: "Correct on both halves.",
            },
            { t: "It prevents unauthorised clients from calling your API", why: "curl and Postman ignore it entirely." },
            { t: "The server rejects the request when the origin is not allowed", why: "The server usually processes it; the browser blocks the response." },
            { t: "It encrypts cross-origin traffic", why: "That is TLS." },
          ],
        }),
        mcq("web-cors-preflight", {
          q: "The browser sends an `OPTIONS` request before your `PUT`. What is it and why?",
          why: "A **CORS preflight**. For requests that are not 'simple' — anything using `PUT`, `DELETE` or `PATCH`, a custom header like `Authorization`, or `Content-Type: application/json` — the browser first asks the server, via `OPTIONS`, whether the real request is permitted.\n\nThe server must answer with `Access-Control-Allow-Origin`, `-Methods` and `-Headers`. If it does not, the actual request is **never sent**.\n\nThe safety reason: a `PUT` might modify data, so the browser confirms permission *before* causing any side effect. Preflights can be cached with `Access-Control-Max-Age` to avoid the extra round trip on every call — a genuine performance consideration for chatty APIs.",
          c: ["cors", "http-semantics"],
          d: 3,
          choices: [
            {
              t: "A preflight asking permission before sending a non-simple request",
              ok: true,
              why: "Correct — and it can be cached with `Access-Control-Max-Age`.",
            },
            { t: "A health check the browser performs periodically", why: "It is tied to this specific request." },
            { t: "A retry after the first attempt failed", why: "It happens before the real request." },
            { t: "The browser negotiating HTTP/2", why: "Protocol negotiation is unrelated." },
          ],
        }),
        multi("web-storage-choice", {
          q: "Which statements about browser storage are correct?",
          why: "Cookies are sent **automatically** with every matching request, which is what makes them convenient for sessions and what creates CSRF exposure. `httpOnly` prevents JavaScript reading a cookie, which is the defence against XSS token theft. `localStorage` persists indefinitely and is readable by any script on the page. `sessionStorage` is scoped to a single tab and cleared when it closes.\n\nWhat is false: `localStorage` is **not** sent to the server automatically — you must attach it yourself. And it is not encrypted; it is plain text on disk, readable by anything with access to the profile.",
          c: ["auth", "security"],
          d: 2,
          choices: [
            { t: "Cookies are attached automatically to matching requests", ok: true },
            { t: "`httpOnly` stops JavaScript reading a cookie", ok: true },
            { t: "localStorage persists until explicitly cleared", ok: true },
            { t: "sessionStorage is per-tab and clears on close", ok: true },
            { t: "localStorage is sent to the server automatically", why: "You must attach it to requests yourself." },
            { t: "localStorage is encrypted at rest by the browser", why: "It is plain text." },
          ],
        }),
        out("web-origin", {
          q: "Is `https://app.example.com:443` the same origin as `https://api.example.com:443`?",
          code: `https://app.example.com  →  https://api.example.com`,
          lang: "text",
          why: "**No.** An origin is the triple **scheme + host + port**, and the hosts differ — a subdomain is a different host. So calls from `app.` to `api.` are cross-origin and need CORS.\n\nOther common cases: `http://` and `https://` on the same host are different origins; `localhost:3000` and `localhost:5000` are different origins; but `https://example.com` and `https://example.com/other/path` are the **same** origin, since the path is not part of it.\n\nCookies follow slightly different rules — they use `Domain` and can be shared across subdomains — which is why a cookie can be sent on a request that CORS still blocks from being read.",
          c: ["cors", "security"],
          d: 2,
          choices: [
            { t: "No — different host means a different origin, so CORS applies", ok: true, why: "Correct: scheme + host + port must all match." },
            { t: "Yes — they share the parent domain", why: "Subdomains are distinct origins for CORS." },
            { t: "Yes — the port and scheme match", why: "All three parts must match." },
            { t: "Only if both use HTTPS", why: "They both do here, and it is still cross-origin." },
          ],
        }),
        mcq("web-realtime", {
          q: "A dashboard must show order-status changes as they happen. The browser only receives updates; it never sends data back over that channel. What fits best?",
          why: "**Server-Sent Events (SSE).** The browser opens a normal HTTP request with `new EventSource(\"/api/orders/stream\")` and the server keeps the response open, writing `text/event-stream` messages whenever something changes. It is one-directional (server to client), works through ordinary HTTP infrastructure, and the browser **reconnects automatically**, resuming from the last event id.\n\n**WebSockets** give a full-duplex channel for both directions — the right choice for chat, multiplayer or collaborative editing. They also work here, but you take on more: a protocol upgrade, your own reconnection, heartbeats and message format, and proxies or load balancers configured for long-lived connections.\n\n**Polling** (request every N seconds) is the simplest and perfectly reasonable when a small delay is acceptable, but it wastes requests when nothing changes and adds up to N seconds of latency. Long polling reduces the waste but is effectively a workaround that SSE replaced.",
          tip: "Match the tool to the direction of data: one-way push is SSE, two-way is WebSockets, 'every minute is fine' is polling.",
          c: ["http-semantics", "performance"],
          d: 2,
          choices: [
            {
              t: "Server-Sent Events: a one-way stream over HTTP with automatic reconnection",
              ok: true,
              why: "Correct — the simplest tool that matches one-way push.",
            },
            {
              t: "WebSockets, because they are the only way to push from the server",
              why: "SSE also pushes from the server. WebSockets earn their extra complexity when the client sends messages too.",
            },
            {
              t: "Polling every 100ms, which is effectively real time",
              why: "That is a constant stream of mostly empty requests per user — very expensive at scale.",
            },
            {
              t: "HTTP/2 server push",
              why: "Server push pushed resources for the browser's cache, never data to your JavaScript, and browsers have since removed support.",
            },
          ],
        }),
      ],
    }),

    mod("web-security", {
      title: "Web Security Essentials",
      level: 4,
      summary: "XSS, CSRF, injection — what they are and what actually stops them.",
      keyIdeas: [
        "XSS: escape on output. React does this except `dangerouslySetInnerHTML` and `javascript:` URLs. Add a CSP.",
        "CSRF needs automatically-attached credentials (cookies); `SameSite` plus a token defends. Bearer headers are not exposed.",
        "SQL injection: parameterised queries, always — including raw SQL inside an ORM.",
        "IDOR: check ownership on every id-taking endpoint; scope queries by the current user. UUIDs are not a fix.",
        "HTTPS everywhere, no stack traces in responses, secrets out of the repo, dependencies audited.",
      ],
      brief: `You are expected to name these, describe the attack, and give the real mitigation.

**XSS (Cross-Site Scripting)** — untrusted data rendered as executable markup, so attacker JavaScript runs with your page's privileges: reading \`localStorage\`, making authenticated requests, keylogging. Mitigation: **escape on output** (React does this by default for \`{}\` interpolation — \`dangerouslySetInnerHTML\` is the deliberate hole), plus a Content-Security-Policy. Input sanitisation alone is not sufficient.

**CSRF (Cross-Site Request Forgery)** — a malicious site causes the *user's browser* to send an authenticated request to your app, relying on cookies being attached automatically. Mitigation: \`SameSite=Lax\` or \`Strict\` cookies, plus an anti-CSRF token for state-changing requests. Note that CSRF only applies to **automatic** credentials — an \`Authorization\` header your JS sets manually is not attached by the browser, so bearer-token APIs are not CSRF-exposed in the same way.

**SQL injection** — input concatenated into a query and parsed as code. Mitigation: **parameterised queries**, always. Escaping by hand is a losing game, and an ORM protects you only while you use its parameterised paths — raw SQL with interpolation is just as vulnerable.

**Others worth naming**: insecure direct object references (\`/orders/124\` returning someone else's order — always check ownership server-side), mass assignment / over-posting, secrets in the repository, and outdated dependencies with known CVEs.

**Always HTTPS.** Cookies without \`Secure\`, or any plaintext HTTP, means credentials in the clear.`,
      items: [
        mcq("web-sec-xss", {
          q: "What actually prevents XSS in a React app?",
          why: "**Escaping on output**, which React does automatically: `{userInput}` is rendered as text, never parsed as HTML. The deliberate hole is `dangerouslySetInnerHTML` — the name is a warning, and any content passed to it must be sanitised with something like DOMPurify.\n\nInput sanitisation alone is not sufficient: data can enter your database from many paths (an import, another service, an older version of the app), so the safe place to defend is where it is *rendered*. A Content-Security-Policy is a valuable second layer that limits what injected script can do even if something slips through.\n\nAlso note that `href={userInput}` can carry a `javascript:` URL — React does not escape that, so URLs need their own validation.",
          tip: "Mentioning that React's protection has specific holes is better than saying 'React handles it'.",
          c: ["security"],
          d: 3,
          choices: [
            {
              t: "Escaping on output — React does it by default, with `dangerouslySetInnerHTML` as the exception",
              ok: true,
              why: "Correct, plus CSP as defence in depth.",
            },
            { t: "Stripping tags from user input on the way in", why: "Data arrives by many paths; defend at render time." },
            { t: "HTTPS", why: "Protects data in transit, not injected markup." },
            { t: "`httpOnly` cookies", why: "Limits the damage of XSS but does not prevent it." },
          ],
        }),
        mcq("web-sec-csrf", {
          q: "Which API is inherently exposed to CSRF?",
          why: "The **cookie-authenticated** one. CSRF depends on the browser attaching credentials **automatically**: a malicious page submits a form or fires a request to your domain, and the browser helpfully includes the session cookie. The user is authenticated, so the request succeeds.\n\nAn API authenticated by an `Authorization: Bearer` header set by your JavaScript is not exposed the same way — the attacker's page cannot make the victim's browser add that header, and cannot read the token cross-origin.\n\nMitigations for the cookie case: `SameSite=Lax` (now the browser default) or `Strict`, plus an anti-CSRF token for state-changing requests. The trade-off, of course, is that bearer tokens in `localStorage` are exposed to XSS instead.",
          c: ["security", "auth"],
          d: 3,
          choices: [
            { t: "One using session cookies for authentication", ok: true, why: "Correct — automatic credentials are the prerequisite." },
            { t: "One using an `Authorization: Bearer` header set by JavaScript", why: "Not attached automatically, so not CSRF-exposed." },
            { t: "Any API served over HTTP", why: "HTTPS is a separate concern." },
            { t: "Any API that accepts JSON", why: "Content type is not the deciding factor." },
          ],
        }),
        out("web-sec-sqli", {
          q: "What is wrong with this?",
          code: `const q = "SELECT * FROM users WHERE email = '" + email + "'";
db.query(q);`,
          why: "**SQL injection.** The input is concatenated into the query string, so it is parsed as *code*, not data. An email of `' OR '1'='1` turns the predicate into something always true and returns every user; `'; DROP TABLE users; --` is the textbook worst case.\n\nThe fix is a **parameterised query**:\n\n```js\ndb.query(\"SELECT * FROM users WHERE email = $1\", [email]);\n```\n\nThe driver sends the SQL and the values separately, so the value can never be interpreted as syntax. Hand-escaping quotes is not a fix — encoding edge cases and different database dialects defeat it.\n\nAn ORM protects you only along its parameterised paths; raw SQL with string interpolation inside an ORM is exactly as vulnerable.",
          c: ["security", "sql-basics"],
          d: 2,
          choices: [
            { t: "SQL injection — use a parameterised query", ok: true, why: "Correct: separate code from data." },
            { t: "Nothing, provided the email was validated on the client", why: "Client validation is trivially bypassed." },
            { t: "Only a performance issue — no prepared-statement caching", why: "There is a real, critical vulnerability." },
            { t: "It needs double quotes rather than single", why: "Quoting style does not address injection." },
          ],
        }),
        multi("web-sec-idor", {
          q: "`GET /api/orders/124` returns another user's order to a logged-in user. What is true?",
          why: "This is an **insecure direct object reference (IDOR)** — a broken *authorization* check. The user is authenticated, so authentication is working; nothing verifies that *this* user owns *that* order. The fix is a server-side ownership check on every request: scope the query by the authenticated user (`WHERE id = @id AND user_id = @currentUser`), which makes it structurally impossible to forget.\n\nUsing UUIDs instead of sequential ids makes ids harder to guess but is **not** a fix — that is security by obscurity, and ids leak through URLs, logs and shared links. Hiding the link in the UI is no protection at all, since the API is callable directly.",
          tip: "IDOR sits near the top of the OWASP list and is very common in CRUD apps. Naming it is worth real credit.",
          c: ["security", "auth"],
          d: 3,
          choices: [
            { t: "It is an IDOR — a missing authorization check, not an authentication failure", ok: true },
            { t: "The fix is a server-side ownership check on every request", ok: true },
            { t: "Scoping the query by the current user makes it hard to forget", ok: true },
            { t: "Switching to UUIDs fixes it", why: "Harder to guess is not the same as protected." },
            { t: "Hiding the link in the UI is sufficient", why: "The API can be called directly." },
          ],
        }),
        short("web-sec-explain", {
          q: "*\"What security issues would you check for in a CRUD app before it goes live?\"*",
          why: "A broad question where the strong answer is organised rather than exhaustive. Grouping by category, with the mitigation for each, beats listing attack names.",
          model:
            "I'd group it into a few areas.\n\n**Authentication and authorisation.** Passwords hashed with bcrypt or Argon2, never a fast hash. Then the one people miss: every endpoint that takes a resource id must check the caller actually owns it. IDOR — where you change `/orders/123` to `/orders/124` and get someone else's data — is extremely common in CRUD apps, and the reliable fix is scoping every query by the authenticated user rather than checking ownership as a separate step you can forget.\n\n**Input handling.** Parameterised queries everywhere, no string-concatenated SQL, including in raw ORM queries. Server-side validation on everything, because client validation is UX only. And DTOs rather than binding request bodies straight onto entities, so a caller can't set fields like `isAdmin` that the UI never exposes.\n\n**Output and transport.** HTTPS everywhere with `Secure` cookies. Escape on output — React handles this unless someone reached for `dangerouslySetInnerHTML`. And error responses must not leak stack traces or database messages; log those server-side and return something generic with a correlation id.\n\n**Secrets and dependencies.** Nothing sensitive in the repo, secrets from the platform's store, and an audit of dependencies for known CVEs — a lot of real incidents come in through an outdated package rather than our own code.\n\nI'd also add rate limiting on auth endpoints, and check that logs don't contain tokens or personal data, since that's a slow-burning problem people find much later.",
          points: [
            "Auth: strong password hashing; ownership checks on every id-taking endpoint (IDOR)",
            "Scope queries by current user so the check can't be forgotten",
            "Parameterised queries; server-side validation; DTOs to prevent over-posting",
            "HTTPS, Secure cookies, escape on output",
            "No stack traces in responses — log server-side with a correlation id",
            "Secrets out of the repo; audit dependencies for CVEs",
            "Rate limit auth endpoints; keep secrets out of logs",
          ],
          c: ["security", "auth", "validation"],
          d: 3,
          secs: 200,
        }),
        mcq("web-sec-oauth-oidc", {
          q: "What is the difference between OAuth 2.0 and OpenID Connect?",
          why: "**OAuth 2.0 is about authorization; OpenID Connect adds authentication (identity) on top of it.**\n\nOAuth 2.0 lets a user grant an application limited access to an API on their behalf. The app receives an **access token** meant for the API — the app is not supposed to interpret it as proof of who the user is. That was a real problem historically: sites used OAuth for 'log in with X' and had to invent their own ways of learning the identity.\n\nOpenID Connect standardises that missing piece. It is a layer on OAuth 2.0 that adds an **ID token** — a signed JWT with claims about the authenticated user (`sub`, `email`, `name`), intended for the client application — plus a standard `userinfo` endpoint and discovery metadata.\n\nIn a typical SPA plus API setup, the front end uses the ID token to know who is signed in, and sends the access token to the API, which validates it and checks its scopes.",
          tip: "One sentence wins it: 'OAuth is delegated authorization; OIDC is identity built on it — ID token for the client, access token for the API.'",
          c: ["auth", "security"],
          d: 2,
          choices: [
            {
              t: "OAuth 2.0 delegates access to APIs via access tokens; OIDC adds an identity layer with an ID token describing the user",
              ok: true,
              why: "Correct — authorization versus identity, with OIDC built on OAuth.",
            },
            {
              t: "They are competing standards; you choose one or the other",
              why: "OIDC is built on OAuth 2.0 and uses its flows.",
            },
            {
              t: "OAuth 2.0 is for logging users in; OIDC is for calling APIs",
              why: "Backwards — using bare OAuth for login is the gap OIDC was created to fill.",
            },
            {
              t: "OIDC replaces passwords with JWTs stored in cookies",
              why: "OIDC defines tokens and flows, not where you store them or how the provider verifies the user.",
            },
          ],
        }),
      ],
    }),
  ],
});
