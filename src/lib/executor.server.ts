/**
 * Server-side code grading with a *hard* time limit.
 *
 * The browser executor can only notice a slow call after it returns
 * (see executor.ts). On the server we can do better without a worker:
 * `node:vm` runs each test call with `timeout`, which V8 enforces even
 * inside `while (true) {}`. The runner hands each call only what is left
 * of the submission's budget and skips the remaining cases after a
 * timeout, so one submission blocks the process for at most about
 * `TIME_BUDGET_MS` in total, however many test cases it has.
 *
 * Async code is **not** supported in the sandbox: `setTimeout`,
 * `setInterval` and their `clear*` counterparts are inert stubs (a
 * scheduled callback never runs), because a host timer would run learner
 * code on the host event loop, outside any timeout. The runner is
 * synchronous, so a timer could never change a verdict anyway — in the
 * browser such callbacks also fire only after grading. `queueMicrotask`
 * is the context's own, so its jobs drain inside the vm timeout.
 *
 * `vm` is **not** a security boundary — code in the context can still
 * reach the host through prototype tricks. That is acceptable here for
 * the same reason as in the browser: Reps runs locally and the code is
 * the learner's own. The point is liveness and browser parity, not
 * isolation.
 *
 * Import only from server code (route handlers, scripts): it pulls in
 * `node:vm`, which does not exist in the browser bundle.
 */
import vm from "node:vm";
import type { TestCase } from "@/types";
import {
  runTests,
  TIME_BUDGET_MS,
  TimeoutError,
  type Invoke,
  type RunOptions,
  type RunResult,
} from "./executor";

/**
 * Globals a learner's snippet may reasonably use that are not part of
 * the bare ECMAScript context `vm` provides. `console` is a no-op so a
 * debugging `console.log` neither throws nor spams the server log.
 */
function sandboxGlobals(): Record<string, unknown> {
  const noop = () => {};
  return {
    console: { log: noop, info: noop, warn: noop, error: noop, debug: noop, table: noop },
    structuredClone,
    URL,
    URLSearchParams,
    TextEncoder,
    TextDecoder,
    // Inert on purpose (see the header): a host timer would run learner
    // code outside the vm timeout and could wedge the API process.
    setTimeout: () => 0,
    clearTimeout: noop,
    setInterval: () => 0,
    clearInterval: noop,
  };
}

/**
 * Compiled inside each context: rebuilds a host-realm value with the
 * context's own constructors, so `instanceof Array`, `x.constructor ===
 * Object` and `Object.getPrototypeOf(x) === Object.prototype` behave as
 * they do in the browser runner (where inputs and code share a realm).
 * Primitives and functions pass through; cycles are preserved.
 */
const IMPORT_DEEP_SOURCE = `(function importDeep(v, seen = new Map()) {
  if (v === null || typeof v !== "object") return v;
  if (seen.has(v)) return seen.get(v);
  const tag = Object.prototype.toString.call(v);
  let out;
  if (tag === "[object Array]") {
    out = []; seen.set(v, out);
    for (const x of v) out.push(importDeep(x, seen));
  } else if (tag === "[object Date]") {
    out = new Date(v.getTime()); seen.set(v, out);
  } else if (tag === "[object Map]") {
    out = new Map(); seen.set(v, out);
    for (const [k, x] of v) out.set(importDeep(k, seen), importDeep(x, seen));
  } else if (tag === "[object Set]") {
    out = new Set(); seen.set(v, out);
    for (const x of v) out.add(importDeep(x, seen));
  } else if (tag === "[object RegExp]") {
    out = new RegExp(v.source, v.flags); seen.set(v, out);
  } else {
    out = {}; seen.set(v, out);
    for (const k of Object.keys(v)) out[k] = importDeep(v[k], seen);
  }
  return out;
})`;

function isVmTimeout(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "ERR_SCRIPT_EXECUTION_TIMEOUT"
  );
}

/**
 * `RunOptions.compile` backed by a fresh vm context with a hard timeout.
 * `timeoutMs` caps every call; the runner may pass a smaller remaining
 * budget per call.
 */
export function vmCompile(body: string, timeoutMs = TIME_BUDGET_MS): Invoke {
  // No `codeGeneration: { strings: false }`: `eval` / `new Function` work
  // in the browser runner, and vm is not an isolation boundary, so
  // forbidding them here would only make the two runners disagree.
  const context = vm.createContext(sandboxGlobals(), {
    // Promise jobs queued by the code run inside the timeout too.
    microtaskMode: "afterEvaluate",
  });

  // A context-realm queueMicrotask, so its jobs run on the context's own
  // queue, inside the timeout (microtaskMode "afterEvaluate").
  new vm.Script("globalThis.queueMicrotask = (cb) => { Promise.resolve().then(cb); };").runInContext(
    context
  );
  const importDeep = new vm.Script(IMPORT_DEEP_SOURCE).runInContext(context) as (
    v: unknown
  ) => unknown;

  // Compiling throws SyntaxError here, exactly like `new Function` would.
  const factory = new vm.Script(`(function () {\n${body}\n})`, {
    filename: "solution.js",
  }).runInContext(context, { timeout: timeoutMs }) as (...args: unknown[]) => unknown;

  context.__factory = factory;
  const call = new vm.Script("__factory.apply(undefined, __args)");

  return (args, budgetMs) => {
    const limit = Math.max(1, Math.min(timeoutMs, Math.ceil(budgetMs ?? timeoutMs)));
    context.__args = importDeep(args);
    try {
      return call.runInContext(context, { timeout: limit });
    } catch (e) {
      if (isVmTimeout(e)) throw new TimeoutError(limit);
      throw e;
    } finally {
      context.__args = undefined;
    }
  };
}

export function runTestsServer(
  userCode: string,
  tests: TestCase[],
  harness?: string,
  options: Omit<RunOptions, "compile"> = {}
): RunResult {
  return runTests(userCode, tests, harness, { ...options, compile: (b) => vmCompile(b) });
}

/** Grader options for server-side grading: `grade(item, response, serverGradeOptions)`. */
export const serverGradeOptions = { runTests: runTestsServer } as const;
