import { describe, expect, it } from "vitest";
import {
  classifyError,
  extractFunctionName,
  runTests,
  TimeoutError,
} from "@/lib/executor";
import { runTestsServer, vmCompile } from "@/lib/executor.server";
import type { TestCase } from "@/types";

const tc = (input: unknown[], expected: unknown, isEdgeCase = false): TestCase => ({
  input,
  expected,
  description: JSON.stringify(input),
  isEdgeCase,
});

describe("extractFunctionName", () => {
  it("finds declarations, arrows and function expressions", () => {
    expect(extractFunctionName("function add(a, b) { return a + b }")).toBe("add");
    expect(extractFunctionName("const add = (a, b) => a + b")).toBe("add");
    expect(extractFunctionName("const add = a => a")).toBe("add");
    expect(extractFunctionName("let add = async function () {}")).toBe("add");
  });

  it("ignores names mentioned in comments", () => {
    expect(extractFunctionName("// the function fake(x) is old\nfunction real() {}")).toBe("real");
  });

  it("prefers the expected name when the code defines it", () => {
    expect(extractFunctionName("function h() {}\nfunction main() {}", "main")).toBe("main");
    expect(extractFunctionName("function h() {}", "main")).toBe("h");
  });
});

describe("runTests (browser runner)", () => {
  it("runs a named function against every case", () => {
    const r = runTests("function double(n) { return n * 2 }", [tc([2], 4), tc([0], 0)]);
    expect(r.allPassed).toBe(true);
    expect(r.errorType).toBeNull();
  });

  it("uses a harness for higher-order exercises", () => {
    const code = "function makeCounter() { let n = 0; return () => ++n; }";
    const harness = "(times) => { const next = makeCounter(); let v; for (let i = 0; i < times; i++) v = next(); return v; }";
    const r = runTests(code, [tc([3], 3), tc([1], 1)], harness);
    expect(r.allPassed).toBe(true);
  });

  it("reports a syntax error once per test, classified as syntax-error", () => {
    const r = runTests("function broken( { return 1 }", [tc([], 1), tc([], 1)]);
    expect(r.allPassed).toBe(false);
    expect(r.errorType).toBe("syntax-error");
    expect(r.results).toHaveLength(2);
    expect(r.results[0].error).toMatch(/SyntaxError/);
  });

  it("reports a missing function as a syntax error", () => {
    expect(runTests("return 1", [tc([], 1)]).errorType).toBe("syntax-error");
  });

  it("classifies a throw as a runtime error", () => {
    const r = runTests("function f() { throw new TypeError('nope') }", [tc([], 1)]);
    expect(r.errorType).toBe("runtime-error");
    expect(r.results[0].error).toBe("TypeError: nope");
  });

  it("clones inputs so a mutating solution cannot corrupt later cases", () => {
    const shared = [1, 2, 3];
    const code = "function f(arr) { arr.push(99); return arr.length }";
    const r = runTests(code, [tc([shared], 4), tc([shared], 4)]);
    expect(r.allPassed).toBe(true);
    expect(shared).toEqual([1, 2, 3]);
  });

  it("passes functions through and survives unclonable inputs", () => {
    const code = "function apply(fn, box) { return fn(box.value) }";
    const unclonable = { value: 5, callback: () => 0 };
    const r = runTests(code, [tc([(x: number) => x + 1, unclonable], 6)]);
    expect(r.allPassed).toBe(true);
  });

  it("accepts undefined where JSON stored null", () => {
    expect(runTests("function f() {}", [tc([], null)]).allPassed).toBe(true);
  });

  it("an empty test list never counts as passing", () => {
    expect(runTests("function f() {}", []).allPassed).toBe(false);
  });

  it("maps a TimeoutError from a custom compiler to a timeout", () => {
    const r = runTests("function f() {}", [tc([], 1)], undefined, {
      compile: () => () => {
        throw new TimeoutError(10);
      },
    });
    expect(r.errorType).toBe("timeout");
    expect(r.results[0].error).toMatch(/^Timed out/);
  });
});

describe("classifyError", () => {
  it("spots off-by-one and type mismatches", () => {
    expect(runTests("function f(n) { return n + 1 }", [tc([1], 1), tc([2], 2)]).errorType).toBe(
      "off-by-one"
    );
    expect(runTests("function f(n) { return String(n) }", [tc([1], 1)]).errorType).toBe(
      "type-mismatch"
    );
  });

  it("is not an edge-case miss when every case fails", () => {
    const r = runTests("function f() { return -1 }", [tc([], 5, true), tc([], 7, true)]);
    expect(r.errorType).toBe("logic-error");
  });

  it("is null when everything passed", () => {
    expect(classifyError([{ passed: true, testCase: tc([], 1) }])).toBeNull();
  });
});

describe("server runner (node:vm)", () => {
  it("grades like the browser runner", () => {
    const r = runTestsServer("const sq = (n) => n * n", [tc([3], 9), tc([-2], 4)]);
    expect(r.allPassed).toBe(true);
  });

  it("compares arrays and objects produced in the vm realm", () => {
    const r = runTestsServer("function f() { return { a: [1, 2], d: new Date(0) } }", [
      tc([], { a: [1, 2], d: new Date(0) }),
    ]);
    expect(r.allPassed).toBe(true);
  });

  it("stops an infinite loop with a hard timeout", () => {
    const started = Date.now();
    const invoke = vmCompile('"use strict"; while (true) {}', 100);
    expect(() => invoke([])).toThrow(TimeoutError);
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it("reports the infinite loop as a timeout verdict", () => {
    const r = runTestsServer("function spin() { for (;;) {} }", [tc([], 1)]);
    expect(r.errorType).toBe("timeout");
  }, 10_000);

  it("reports syntax errors the same way", () => {
    const r = runTestsServer("function f( { return 1 }", [tc([], 1)]);
    expect(r.errorType).toBe("syntax-error");
    expect(r.results[0].error).toMatch(/SyntaxError/);
  });

  it("gives code a no-op console instead of a ReferenceError", () => {
    const r = runTestsServer("function f(n) { console.log(n); return n }", [tc([1], 1)]);
    expect(r.allPassed).toBe(true);
  });
});

describe("runner parity (browser vs server)", () => {
  const cases: { name: string; code: string; tests: TestCase[] }[] = [
    {
      name: "instanceof Array",
      code: "function g(items) { if (!(items instanceof Array)) return 'nope'; return items.length }",
      tests: [tc([[1, 2]], 2), tc([[]], 0)],
    },
    {
      name: "constructor === Array",
      code: "function g(arr) { return arr.constructor === Array ? arr.length : -1 }",
      tests: [tc([[1, 2, 3]], 3)],
    },
    {
      name: "isPlainObject via getPrototypeOf",
      code: `function clone(o) {
  if (o === null || typeof o !== "object") return o;
  if (Array.isArray(o)) return o.map((x) => clone(x));
  if (!isPlain(o)) return "not plain";
  const out = {};
  for (const k of Object.keys(o)) out[k] = clone(o[k]);
  return out;
}
function isPlain(o) { return o !== null && typeof o === "object" && Object.getPrototypeOf(o) === Object.prototype }`,
      tests: [tc([{ a: { b: [1, { c: 2 }] } }], { a: { b: [1, { c: 2 }] } })],
    },
    {
      name: "constructor === Object, Map and Date",
      code: "function g(o, m, d) { return [o.constructor === Object, m instanceof Map, d instanceof Date] }",
      tests: [tc([{ x: 1 }, new Map([["k", 1]]), new Date(0)], [true, true, true])],
    },
    {
      name: "new Function",
      code: "function f() { return new Function('return 1')() }",
      tests: [tc([], 1)],
    },
  ];

  for (const c of cases) {
    it(`gives identical verdicts: ${c.name}`, () => {
      const browser = runTests(c.code, c.tests);
      const server = runTestsServer(c.code, c.tests);
      expect(browser.allPassed).toBe(true);
      expect(server.results.map((r) => [r.passed, r.error])).toEqual(
        browser.results.map((r) => [r.passed, r.error])
      );
      expect(server.errorType).toBe(browser.errorType);
    });
  }

  it("preserves cycles when importing inputs", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const test: TestCase = { input: [cyclic], expected: true, description: "cycle", isEdgeCase: false };
    const r = runTestsServer("function f(o) { return o.self === o }", [test]);
    expect(r.allPassed).toBe(true);
  });
});

describe("server sandbox liveness", () => {
  it("does not run setTimeout callbacks on the host event loop", async () => {
    const code = `function f() {
  setTimeout(() => { const end = Date.now() + 1500; while (Date.now() < end) {} }, 0);
  return 1;
}`;
    const r = runTestsServer(code, [tc([], 1)]);
    expect(r.allPassed).toBe(true);
    const started = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(Date.now() - started).toBeLessThan(500);
  });

  it("drains queueMicrotask jobs inside the vm timeout", async () => {
    const code = `function f() {
  queueMicrotask(() => { for (;;) {} });
  return 1;
}`;
    const started = Date.now();
    runTestsServer(code, [tc([], 1)]);
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(Date.now() - started).toBeLessThan(3000);
  }, 10_000);

  it("spends one budget per submission, then skips the remaining cases", () => {
    const started = Date.now();
    const r = runTestsServer("function spin() { for (;;) {} }", [
      tc([], 1),
      tc([], 2),
      tc([], 3),
      tc([], 4),
    ]);
    expect(Date.now() - started).toBeLessThan(3000);
    expect(r.errorType).toBe("timeout");
    expect(r.results[0].error).toMatch(/^Timed out after/);
    for (const v of r.results.slice(1)) expect(v.error).toMatch(/skipped after an earlier case/);
  }, 10_000);

  it("browser runner also skips after a timeout", () => {
    let calls = 0;
    const r = runTests("function f() {}", [tc([], 1), tc([], 1), tc([], 1)], undefined, {
      compile: () => () => {
        calls++;
        throw new TimeoutError(10);
      },
    });
    expect(calls).toBe(1);
    expect(r.results.slice(1).every((v) => /skipped/.test(v.error ?? ""))).toBe(true);
  });
});
