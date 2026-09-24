/**
 * Runs `code` items against their tests.
 *
 * The learner's code is their own, so this is a correctness harness,
 * not a security sandbox.
 *
 * ## The time limit, honestly
 *
 * JavaScript cannot interrupt a synchronous function from the same
 * thread. In the **browser** (the default `compile`, via `new Function`)
 * an infinite loop therefore still hangs the tab: `TIME_BUDGET_MS` is
 * checked only *after* a call returns, so it catches code that is slow
 * but finishes and reports it as a timeout. Truly preempting a runaway
 * loop client-side needs a Worker that can be terminated.
 *
 * On the **server** (`executor.server.ts`) each call runs inside a
 * `node:vm` context with a hard `timeout`, which V8 *does* enforce
 * mid-loop. That path plugs in through `RunOptions.compile`.
 *
 * The budget is per **submission**, not per test case: each call gets
 * only what is left of `TIME_BUDGET_MS`, and once a case times out the
 * remaining cases are skipped (reported as timed out) without running.
 * So on the server a submitted infinite loop blocks the process for at
 * most about `TIME_BUDGET_MS` in total, whatever the number of cases.
 */
import type { TestCase, TestVerdict } from "@/types";
import { deepEqual } from "./utils";

export type RunResult = {
  allPassed: boolean;
  results: TestVerdict[];
  errorType: string | null;
};

export const TIME_BUDGET_MS = 2000;

/**
 * A compiled entry point: call it with one test's (cloned) inputs.
 * `budgetMs` is what is left of the submission's time budget; a compiler
 * that can enforce a hard limit (the vm one) should not exceed it.
 */
export type Invoke = (args: unknown[], budgetMs?: number) => unknown;

export type RunOptions = {
  /**
   * Turns the generated function body into something callable. Throws
   * on a syntax error. Defaults to `new Function` (works everywhere).
   */
  compile?: (body: string) => Invoke;
  /**
   * The function name the exercise expects (taken from the starter
   * code). Preferred over "first function in the file" when the learner
   * defines it, so a helper written above it is not called instead.
   */
  expectedName?: string;
};

/** Thrown by a `compile`d invoke when it hit a hard time limit. */
export class TimeoutError extends Error {
  constructor(ms: number = TIME_BUDGET_MS) {
    super(`Timed out after ${ms}ms — check for an infinite loop.`);
    this.name = "TimeoutError";
  }
}

const IDENT = "[a-zA-Z_$][\\w$]*";

const DECLARATION = new RegExp(
  `(?:^|[^.\\w$])(?:async\\s+)?function\\s*\\*?\\s*(${IDENT})\\s*\\(`,
  "g"
);
// `const fn = (…) => …` / `const fn = function (…) {}` / `const fn = x => …`
const EXPRESSION = new RegExp(
  `(?:const|let|var)\\s+(${IDENT})\\s*=\\s*(?:async\\s*)?(?:function\\b|\\(|${IDENT}\\s*=>)`,
  "g"
);

/** Drops block and line comments so "the function sum(a)" in a comment is not a match. */
function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");
}

/** Names of function definitions in `code`, in source order. */
export function definedFunctionNames(code: string): string[] {
  const stripped = stripComments(code);
  const found: { name: string; at: number }[] = [];
  for (const re of [DECLARATION, EXPRESSION]) {
    for (const m of stripped.matchAll(re)) found.push({ name: m[1], at: m.index ?? 0 });
  }
  found.sort((a, b) => a.at - b.at);
  const names: string[] = [];
  for (const f of found) if (!names.includes(f.name)) names.push(f.name);
  return names;
}

export function extractFunctionName(code: string, expected?: string): string | null {
  const names = definedFunctionNames(code);
  if (expected && names.includes(expected)) return expected;
  return names[0] ?? null;
}

/** The function body the runner compiles: learner code plus a call into it. */
export function buildBody(userCode: string, fnName: string | null, harness?: string): string {
  // A harness wraps the learner's code for higher-order exercises,
  // where the value under test is produced by calling what they
  // returned. Otherwise the named function is invoked directly.
  return harness
    ? `"use strict";\n${userCode}\n;return (${harness})(...arguments);`
    : `"use strict";\n${userCode}\n;return ${fnName}(...arguments);`;
}

function browserCompile(body: string): Invoke {
  const fn = new Function(body) as (...args: unknown[]) => unknown;
  return (args) => fn(...args);
}

/** `Name: message` for anything thrown, including errors from another realm. */
export function describeError(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) {
    const name = "name" in e && typeof e.name === "string" ? e.name : "Error";
    return `${name}: ${String((e as { message: unknown }).message)}`;
  }
  return String(e);
}

function isTimeout(e: unknown): boolean {
  return (
    e instanceof TimeoutError ||
    (typeof e === "object" && e !== null && "name" in e && e.name === "TimeoutError")
  );
}

export function runTests(
  userCode: string,
  tests: TestCase[],
  harness?: string,
  options: RunOptions = {}
): RunResult {
  const code = typeof userCode === "string" ? userCode : "";
  const fnName = extractFunctionName(code, options.expectedName);

  // Without a harness we call the learner's function directly, so we
  // need to know its name. A harness references it itself.
  if (!fnName && !harness) {
    return {
      allPassed: false,
      results: tests.map((tc) => ({
        passed: false,
        error: "No function declaration found. Define a named function.",
        testCase: tc,
      })),
      errorType: "syntax-error",
    };
  }

  // Compile once so a syntax error is reported as one failure, not N.
  let invoke: Invoke;
  try {
    invoke = (options.compile ?? browserCompile)(buildBody(code, fnName, harness));
  } catch (e) {
    return {
      allPassed: false,
      results: tests.map((tc) => ({ passed: false, error: describeError(e), testCase: tc })),
      errorType: "syntax-error",
    };
  }

  // The budget covers the whole submission (see the header comment).
  let spent = 0;
  let timedOut = false;
  const timeoutVerdict = (tc: TestCase, ms: number): TestVerdict => {
    timedOut = true;
    return {
      passed: false,
      error: `Timed out after ${Math.round(ms)}ms — check for an infinite loop.`,
      testCase: tc,
    };
  };

  const results: TestVerdict[] = tests.map((tc) => {
    if (timedOut) {
      return {
        passed: false,
        error: "Timed out — skipped after an earlier case timed out.",
        testCase: tc,
      };
    }
    const started = performance.now();
    try {
      // Structured-clone the inputs so a mutating solution cannot
      // corrupt the expectations of later test cases.
      const result = invoke(cloneArgs(tc.input), TIME_BUDGET_MS - spent);
      const elapsed = performance.now() - started;
      spent += elapsed;

      // Only reached if the call returned — see the header comment.
      if (spent > TIME_BUDGET_MS) return timeoutVerdict(tc, spent);

      // A test whose `expected` is `undefined` only asserts "it ran".
      // `null` also accepts `undefined`: JSON stores `undefined` as null.
      const passed =
        tc.expected === undefined
          ? true
          : deepEqual(result, tc.expected) || (tc.expected === null && result === undefined);

      return { passed, result, expected: tc.expected, testCase: tc };
    } catch (e) {
      spent += performance.now() - started;
      if (isTimeout(e)) return timeoutVerdict(tc, TIME_BUDGET_MS);
      return { passed: false, error: describeError(e), testCase: tc };
    }
  });

  return {
    allPassed: results.length > 0 && results.every((r) => r.passed),
    results,
    errorType: classifyError(results),
  };
}

export function cloneArgs(args: unknown): unknown[] {
  if (!Array.isArray(args)) return [];
  return args.map((a) => {
    // Functions are passed through — some tests supply a callback.
    if (typeof a === "function") return a;
    try {
      return structuredClone(a);
    } catch {
      // Not cloneable (an object holding a function, say): pass it as-is
      // and accept that a mutating solution could see its own changes.
      return a;
    }
  });
}

/**
 * A rough diagnosis, surfaced in the feedback panel so the learner
 * gets a nudge rather than just "3 of 5 failed".
 */
export function classifyError(results: TestVerdict[]): string | null {
  if (results.every((r) => r.passed)) return null;
  const failures = results.filter((r) => !r.passed);

  if (failures.some((r) => r.error?.startsWith("Timed out"))) return "timeout";
  if (failures.some((r) => r.error)) return "runtime-error";

  // Only an edge-case miss if the main cases actually pass.
  if (
    failures.length <= 2 &&
    failures.length < results.length &&
    failures.every((r) => r.testCase.isEdgeCase)
  ) {
    return "edge-case-miss";
  }

  if (
    failures.some(
      (r) =>
        r.result !== undefined &&
        r.expected !== undefined &&
        typeof r.result !== typeof r.expected
    )
  ) {
    return "type-mismatch";
  }

  if (
    failures.some(
      (r) =>
        typeof r.result === "number" &&
        typeof r.expected === "number" &&
        Math.abs(r.result - r.expected) === 1
    )
  ) {
    return "off-by-one";
  }

  return failures.length === results.length ? "logic-error" : "partial-failure";
}

export const ERROR_HINTS: Record<string, string> = {
  "syntax-error": "The code did not parse. Check brackets, quotes and the function name.",
  "runtime-error": "It threw while running. Read the message — it usually names the line.",
  timeout: "Something did not terminate. Check your loop condition or recursion base case.",
  "edge-case-miss": "The main logic works; an edge case does not. Empty input? A single element?",
  "type-mismatch": "You returned the right idea in the wrong type — a string instead of a number, perhaps.",
  "off-by-one": "Off by exactly one. Check `<` vs `<=`, or where your loop starts.",
  "logic-error": "Every case failed, so the approach is off rather than a detail.",
  "partial-failure": "Some cases pass. Compare a failing input with a passing one.",
};
