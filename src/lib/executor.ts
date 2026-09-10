/**
 * Runs `code` items in the browser.
 *
 * The learner's code is their own, so this is a correctness harness
 * rather than a security sandbox — but it still guards against the
 * accidental infinite loop, which would otherwise hang the tab.
 */
import type { TestCase, TestVerdict } from "@/types";
import { deepEqual } from "./utils";

export type RunResult = {
  allPassed: boolean;
  results: TestVerdict[];
  errorType: string | null;
};

const TIME_BUDGET_MS = 2000;

function extractFunctionName(code: string): string | null {
  const declaration = code.match(/function\s+([a-zA-Z_$][\w$]*)\s*\(/);
  if (declaration) return declaration[1];

  // `const fn = (…) => …` / `const fn = function (…) {}`
  const expression = code.match(
    /(?:const|let|var)\s+([a-zA-Z_$][\w$]*)\s*=\s*(?:async\s*)?(?:function\b|\(|[a-zA-Z_$])/
  );
  return expression ? expression[1] : null;
}

export function runTests(
  userCode: string,
  tests: TestCase[],
  harness?: string
): RunResult {
  const fnName = extractFunctionName(userCode);

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
  let factory: (...args: unknown[]) => unknown;
  try {
    // A harness wraps the learner's code for higher-order exercises,
    // where the value under test is produced by calling what they
    // returned. Otherwise the named function is invoked directly.
    const body = harness
      ? `"use strict";\n${userCode}\n;return (${harness})(...arguments);`
      : `"use strict";\n${userCode}\n;return ${fnName}(...arguments);`;
    factory = new Function(body) as (...args: unknown[]) => unknown;
  } catch (e) {
    return {
      allPassed: false,
      results: tests.map((tc) => ({
        passed: false,
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        testCase: tc,
      })),
      errorType: "syntax-error",
    };
  }

  const results: TestVerdict[] = tests.map((tc) => {
    try {
      const started = performance.now();
      // Structured-clone the inputs so a mutating solution cannot
      // corrupt the expectations of later test cases.
      const result = factory(...cloneArgs(tc.input));
      const elapsed = performance.now() - started;

      if (elapsed > TIME_BUDGET_MS) {
        return {
          passed: false,
          error: `Timed out after ${Math.round(elapsed)}ms — check for an infinite loop.`,
          testCase: tc,
        };
      }

      // A test whose `expected` is `undefined` only asserts "it ran".
      const passed =
        tc.expected === undefined
          ? true
          : deepEqual(result, tc.expected) ||
            (tc.expected === null && result === undefined);

      return { passed, result, expected: tc.expected, testCase: tc };
    } catch (e) {
      return {
        passed: false,
        error: e instanceof Error ? `${e.name}: ${e.message}` : String(e),
        testCase: tc,
      };
    }
  });

  return {
    allPassed: results.every((r) => r.passed),
    results,
    errorType: classifyError(results),
  };
}

function cloneArgs(args: unknown[]): unknown[] {
  return args.map((a) => {
    // Functions are passed through — some tests supply a callback.
    if (typeof a === "function") return a;
    try {
      return structuredClone(a);
    } catch {
      return a;
    }
  });
}

/**
 * A rough diagnosis, surfaced in the feedback panel so the learner
 * gets a nudge rather than just "3 of 5 failed".
 */
function classifyError(results: TestVerdict[]): string | null {
  if (results.every((r) => r.passed)) return null;
  const failures = results.filter((r) => !r.passed);

  if (failures.some((r) => r.error?.startsWith("Timed out"))) return "timeout";
  if (failures.some((r) => r.error)) return "runtime-error";

  if (failures.length <= 2 && failures.every((r) => r.testCase.isEdgeCase)) {
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
