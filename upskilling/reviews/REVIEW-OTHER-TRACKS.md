# Review: 48 new items (dotnet, typescript, react, node, web, sql, testing, devops)

Scope: the 48 newly appended ids only. javascript.ts and csharp.ts were not touched.

## (A) Confirmed errors (all fixed in place)

1. **ts-config-satisfies** (typescript.ts), the most serious one. The `why` said that with `satisfies`, "`paths.home` and `paths.orders` are known to exist and nothing is widened". Both halves are wrong:
   - With the `: Record<Route, string>` annotation, `paths.home` is also known to exist.
   - `"/"` is widened to `string` under `satisfies` too, because only `as const` keeps the literal.

   In the original code the two forms were almost identical, so the question "what does `satisfies` do *here* that an annotation would not?" had no real answer.
   **Fix:** changed the snippet to `orders: ["/orders", "/orders/:id"]` with `satisfies Record<Route, string | string[]>`, and updated the question to match. The `why` now says `paths` keeps `{ home: string; orders: string[] }`, so `.toUpperCase()` and `.map()` compile without narrowing. With the annotation, every property becomes the union. The `as const` note now says plainly that the strings are still widened.
2. **net-api-minimal** (dotnet.ts). It said minimal APIs and controllers "sit on the same ... model-binding foundations". That is false. Minimal APIs use their own parameter binding (RequestDelegateFactory), with no `ModelState` and no MVC `IModelBinder`s.
   **Fix:** now reads "same routing, DI, authentication and authorization foundations", plus a note that parameter binding is a separate implementation.
3. **web-http-cdn** (web.ts). It called `s-maxage` "CDN-specific". `s-maxage` is a standard directive that applies to all shared caches (CDNs and proxies), not something the CDN vendors define.
   **Fix:** "`s-maxage`, which applies only to shared caches such as CDNs and proxies".
4. **web-realtime** (web.ts). It said that with WebSockets you take on "your own ... message framing". The WebSocket protocol already frames messages. What you do build yourself is the application message format, reconnection and heartbeats.
   **Fix:** "your own reconnection, heartbeats and message format".

## (B) Debatable or imprecise (reworded where marked "applied")

- **net-prod-cache**: ".NET 9 introduced `HybridCache`" is loose. It is the `Microsoft.Extensions.Caching.Hybrid` NuGet package. It was announced with .NET 9 and went GA in early 2025 (v9.3), and it also targets older TFMs. *Applied.* The L1 layer is still per-instance, so the text doesn't claim cross-node invalidation, which is correct.
- **net-di-hosted**, distractor "controller action starts the loop": "work started from a request is tied to that request's scope" is only half true. A `Task.Run` loop outlives the request. The real problems are that the host doesn't know about it (no graceful shutdown) and that captured scoped services get disposed. *Applied.*
- **net-api-binding-sources**: "complex types come from the body" has exceptions. Types registered in DI are inferred as `[FromServices]` in .NET 7+, and `IFormFile` binds from the form. *Applied.*
- **ts-config-strictnull**: "enable it file by file" suggests the flag works per file, but it is project-wide. Per-file rollout goes through a secondary tsconfig or `typescript-strict-plugin`. *Applied.*
- **ts-basics-merging**: "an interface named the same as a global one silently extends it" only holds in global scripts or inside `declare global`. In a module file, a local interface shadows the global one. *Applied.*
- **sql-des-pk-unique / sql-perf-clustered**: "the PK is clustered by default" only when the table doesn't already have a clustered index. Added that, plus `PRIMARY KEY NONCLUSTERED`. *Applied.* Also, "Both are enforced using a unique index" is not universal: Oracle can enforce a deferrable PK or UNIQUE constraint with a non-unique index. It is fine for an SQL Server/PostgreSQL-focused track. Left as is.
- **git-bisect**: "`bisect run` exit code non-zero = bad" leaves out two cases. Exit code 125 means skip, and codes of 128 or more abort the bisect. *Applied.* Optionally, also mention `git bisect start` as the first step.
- **node-rt-esm**: "recent Node versions can require() an ES module" is correct. It was unflagged in 23.0 and backported to 22.12 and 20.19. The versions are now stated. *Applied.*
- **node-rt-cluster-workers**: "the primary distributes incoming connections" describes the round-robin default on every OS except Windows. On Windows the OS distributes them. Not changed.
- **react-ctx-portal**: native DOM listeners on `body`/`document` *also* see the click, because the native event bubbles through the DOM. The answer is right for React handlers. Consider adding "(native listeners still follow the DOM)". Not changed.
- **ts-config-satisfies tip**: "validate without widening" is the standard phrase, but strings are still widened to `string` without `as const`. Acceptable, since the `why` now explains it.

### Author-flagged claims, verified correct as written

- **node-prod-npm-hooks**: npm runs `pre<name>`/`post<name>` for `npm run <name>`, and a failing pre-script stops the chain. Yarn 2+ (Berry) doesn't run arbitrary pre/post scripts. The item makes **no pnpm claim**, so nothing needed removing. Recommendation: do not add one. pnpm changed its default for running pre/post scripts between major versions (the `enable-pre-post-scripts` setting), so any single-sentence pnpm claim ages badly.
- **ts-basics-enum**: correct. Type stripping, which Node runs by default since 22.18/23.6, rejects `enum` unless you use `--experimental-transform-types`.
- **net-di-hosted**: `BackgroundServiceExceptionBehavior.StopHost` has been the default since .NET 6. Correct.
- **net-di-httpclient**: `TIME_WAIT` port exhaustion, factory handler pooling and rotation, stale DNS on a static client, and `PooledConnectionLifetime`: all correct.
- **net-pipe-jwt / net-pipe-policies**: local validation of signature, `iss`, `aud` and `exp`, with signing keys cached from metadata. The introspection contrast is right. Policy vs role semantics and resource-based `IAuthorizationService` are correct.
- **net-ef-update-attach**: `Update` marks the entity Modified with all columns. `Attach` marks it Unchanged. The graph behaviour (key set means Modified, no key means Added, for generated keys) is correct.
- **net-ef-pooling**: sequential reuse, state reset, and the ban on per-instance constructor state are correct.
- **react-data-error-boundary**: the catch and no-catch lists are correct. React 19 still has no hook API for boundaries, so they must be class components.
- **react-data-hydration**, **react-ctx-portal** (React-tree bubbling), **web-http-versions**, **web-http-caching** (`no-cache` vs `no-store`, ETag and 304), **web-realtime** (SSE, apart from item A4), **web-sec-oauth-oidc**: correct.
- **sql-q-delete-truncate**: per-vendor TRUNCATE rollback is correct. SQL Server and PostgreSQL are transactional. MySQL and Oracle commit implicitly.
- **sql-des-pk-unique**: SQL Server allows one NULL. PostgreSQL allows many by default (`NULLS NOT DISTINCT` is opt-in from PG15). Correct.
- **sql-perf-clustered**, **git-cherry-pick**, **git-bisect** (2^9 = 512 ≥ 400), **deploy-image-container**, **test-unit-doubles**, **test-unit-time** (`TimeProvider`, `FakeTimeProvider.Advance`, `vi.setSystemTime`): correct.

## (C) Duplicates and quality

- **ts-basics-merging** repeats the declaration-merging point in `ts-basics-type-vs-interface` and the module brief. It adds augmentation examples, so it is acceptable.
- **node-rt-cluster-workers** overlaps with `node-rt-cpu`, which also presents `worker_threads` as an option. Different angle (cluster vs threads), so acceptable.
- **react-form-uncontrolled** restates a keyIdea from `react-forms`. Fine as a drill.
- No MCQ has two defensible answers. No `multi` has an all-correct distractor. The single `tf` answers (net-ef-pooling false, ts-basics-merging false, node-prod-npm-hooks true) are correct.

## (D) Verdict

- 48 items reviewed.
- **4 confirmed errors (A)**, all fixed. The most serious is ts-config-satisfies: its explanation wrongly contrasted `satisfies` with an annotation, and its example didn't show any difference.
- **12 debatable points (B)**: 8 reworded, 4 left with notes.
- **3 minor overlaps (C)**, none needing action.
- The other 44 items have no factual errors beyond the B nuances. Quality is high overall.
