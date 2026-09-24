import { describe, expect, it } from "vitest";
import { emptyResponse, grade, isAnswered, normalizeBlank } from "@/lib/grader";
import type { CodePayload, Response } from "@/types";
import { makeItem } from "./fixtures";

const choices = [
  { id: "a", text: "A", correct: true },
  { id: "b", text: "B" },
  { id: "c", text: "C" },
];

describe("single choice (mcq / predict-output)", () => {
  const mcq = makeItem("mcq", { choices });

  it("marks the right choice correct with full score", () => {
    const g = grade(mcq, { kind: "mcq", choiceId: "a" });
    expect(g.correct).toBe(true);
    expect(g.score).toBe(1);
    expect(g.choices?.find((c) => c.id === "a")).toEqual({ id: "a", chosen: true, correct: true });
  });

  it("marks a wrong or missing choice incorrect", () => {
    expect(grade(mcq, { kind: "mcq", choiceId: "b" }).correct).toBe(false);
    expect(grade(mcq, { kind: "mcq", choiceId: null }).score).toBe(0);
  });

  it("grades predict-output the same way", () => {
    const po = makeItem("predict-output", { choices });
    expect(grade(po, { kind: "predict-output", choiceId: "a" }).correct).toBe(true);
  });

  it("rejects a response of the wrong kind", () => {
    expect(grade(mcq, { kind: "truefalse", value: true }).correct).toBe(false);
  });
});

describe("multi-select partial credit", () => {
  const multi = makeItem("multi", {
    choices: [
      { id: "a", text: "A", correct: true },
      { id: "b", text: "B", correct: true },
      { id: "c", text: "C" },
      { id: "d", text: "D" },
    ],
  });
  const pick = (...ids: string[]) => grade(multi, { kind: "multi", choiceIds: ids });

  it("all right and nothing wrong is correct", () => {
    expect(pick("a", "b")).toMatchObject({ correct: true, score: 1 });
  });

  it("half the right answers is half credit", () => {
    expect(pick("a")).toMatchObject({ correct: false, score: 0.5 });
  });

  it("each wrong pick cancels a right one, so select-all scores 0", () => {
    expect(pick("a", "b", "c").score).toBe(0.5);
    expect(pick("a", "b", "c", "d").score).toBe(0);
  });

  it("never goes negative and ignores duplicates and unknown ids", () => {
    expect(pick("c", "d").score).toBe(0);
    expect(pick("a", "a", "zzz")).toMatchObject({ correct: false, score: 0.5 });
  });

  it("survives a malformed choiceIds", () => {
    const bad = { kind: "multi", choiceIds: "ab" } as unknown as Response;
    expect(grade(multi, bad)).toMatchObject({ correct: false, score: 0 });
  });
});

describe("true / false", () => {
  const tf = makeItem("truefalse", { answer: false });
  it("matches the stated answer only", () => {
    expect(grade(tf, { kind: "truefalse", value: false }).correct).toBe(true);
    expect(grade(tf, { kind: "truefalse", value: true }).correct).toBe(false);
    expect(grade(tf, { kind: "truefalse", value: null }).correct).toBe(false);
  });
});

describe("fill in the blank", () => {
  const fb = makeItem("fill-blank", {
    template: "const {{a}} = useState({{b}});",
    blanks: [
      { id: "a", accept: ["[count, setCount]"] },
      { id: "b", accept: ["0"] },
    ],
  });

  it("gives per-blank partial credit", () => {
    const g = grade(fb, { kind: "fill-blank", values: { a: "[count, setCount]", b: "1" } });
    expect(g.correct).toBe(false);
    expect(g.score).toBe(0.5);
    expect(g.blanks?.map((b) => b.correct)).toEqual([true, false]);
  });

  it("is lenient about spacing around punctuation and case", () => {
    const g = grade(fb, { kind: "fill-blank", values: { a: "[Count,setCount ]", b: " 0 " } });
    expect(g.correct).toBe(true);
  });

  it("treats a malformed values object as empty", () => {
    const bad = { kind: "fill-blank", values: null } as unknown as Response;
    expect(grade(fb, bad)).toMatchObject({ correct: false, score: 0 });
  });
});

describe("normalizeBlank", () => {
  it("unifies straight, back and curly quotes", () => {
    expect(normalizeBlank("'user'")).toBe(normalizeBlank('"user"'));
    expect(normalizeBlank("`user`")).toBe(normalizeBlank('"user"'));
    expect(normalizeBlank("“user”")).toBe(normalizeBlank('"user"'));
    expect(normalizeBlank("‘user’")).toBe(normalizeBlank("'user'"));
  });

  it("drops trailing semicolons and the space before them", () => {
    expect(normalizeBlank("return x ;")).toBe("return x");
    expect(normalizeBlank("x;;")).toBe("x");
  });

  it("collapses whitespace, ignores it around punctuation, keeps it between words", () => {
    expect(normalizeBlank("(x)  =>   x")).toBe(normalizeBlank("(x)=>x"));
    expect(normalizeBlank("new Foo")).not.toBe(normalizeBlank("newFoo"));
    expect(normalizeBlank("  SELECT   *  ")).toBe("select*");
  });
});

describe("ordering", () => {
  const order = makeItem("order", {
    steps: [
      { id: "s1", text: "one" },
      { id: "s2", text: "two" },
      { id: "s3", text: "three" },
      { id: "s4", text: "four" },
    ],
  });

  it("scores the share of steps in the right place", () => {
    expect(grade(order, { kind: "order", order: ["s1", "s2", "s3", "s4"] })).toMatchObject({
      correct: true,
      score: 1,
    });
    expect(grade(order, { kind: "order", order: ["s1", "s2", "s4", "s3"] }).score).toBe(0.5);
    expect(grade(order, { kind: "order", order: ["s4", "s3", "s2", "s1"] }).score).toBe(0);
  });
});

describe("code", () => {
  const payload: CodePayload = {
    starterCode: "function sum(a, b) {\n  // your code\n}",
    solutionCode: "function sum(a, b) { return a + b; }",
    tests: [
      { input: [1, 2], expected: 3, description: "adds", isEdgeCase: false },
      { input: [0, 0], expected: 0, description: "zeros", isEdgeCase: true },
    ],
  };
  const code = makeItem("code", payload);

  it("passes the reference solution and fails the starter", () => {
    expect(grade(code, { kind: "code", code: payload.solutionCode }).correct).toBe(true);
    expect(grade(code, { kind: "code", code: payload.starterCode }).correct).toBe(false);
  });

  it("gives partial credit per passing test", () => {
    const g = grade(code, { kind: "code", code: "function sum(a, b) { return a + b || 1; }" });
    expect(g.score).toBe(0.5);
    expect(g.errorType).toBe("edge-case-miss");
  });

  it("calls the starter's function even when a helper is defined first", () => {
    const withHelper =
      "function helper(x) { return x; }\nfunction sum(a, b) { return helper(a) + b; }";
    expect(grade(code, { kind: "code", code: withHelper }).correct).toBe(true);
  });

  it("accepts a custom runner", () => {
    let called = false;
    grade(
      code,
      { kind: "code", code: payload.solutionCode },
      {
        runTests: () => {
          called = true;
          return { allPassed: true, results: [], errorType: null };
        },
      }
    );
    expect(called).toBe(true);
  });
});

describe("self-graded explain-it", () => {
  const short = makeItem("short", { modelAnswer: "x", keyPoints: ["a", "b"] });
  const rate = (selfRating: 1 | 2 | 3 | 4 | null) =>
    grade(short, { kind: "short", text: "", selfRating });

  it("maps the four self-ratings onto correctness and score", () => {
    expect(rate(1)).toMatchObject({ correct: false, score: 0, selfGraded: true });
    expect(rate(2)).toMatchObject({ correct: false, score: 1 / 3 });
    expect(rate(3)).toMatchObject({ correct: true, score: 2 / 3 });
    expect(rate(4)).toMatchObject({ correct: true, score: 1 });
  });

  it("treats a missing or out-of-range rating as Blanked", () => {
    expect(rate(null).score).toBe(0);
    const tampered = { kind: "short", text: "", selfRating: 10 } as unknown as Response;
    expect(grade(short, tampered).score).toBe(0);
  });
});

describe("response helpers", () => {
  it("empty responses are not answered, except explain-it", () => {
    const mcq = makeItem("mcq", { choices });
    expect(isAnswered(mcq, emptyResponse("mcq"))).toBe(false);
    const short = makeItem("short", { modelAnswer: "x", keyPoints: [] });
    expect(isAnswered(short, emptyResponse("short"))).toBe(true);
  });
});
