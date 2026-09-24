/**
 * Pure grading for every item kind.
 *
 * Runs client-side for instant feedback and again on the server when
 * the attempt is recorded, so a tampered client cannot inflate a score.
 */
import type {
  Choice,
  CodePayload,
  FillBlankPayload,
  Grade,
  Item,
  McqPayload,
  MultiPayload,
  OrderPayload,
  PredictOutputPayload,
  Response,
  ShortPayload,
  TrueFalsePayload,
} from "@/types";
import { extractFunctionName, runTests, type RunOptions, type RunResult } from "./executor";

export type GradeOptions = {
  /**
   * Replaces the code runner. The server passes the `node:vm` runner
   * (executor.server.ts) so a runaway loop hits a hard timeout; the
   * browser uses the default.
   */
  runTests?: (
    code: string,
    tests: CodePayload["tests"],
    harness: string | undefined,
    options: Omit<RunOptions, "compile">
  ) => RunResult;
};

export function grade(item: Item, response: Response, options: GradeOptions = {}): Grade {
  switch (item.kind) {
    case "mcq":
    case "predict-output":
      return gradeSingle(
        (item.payload as McqPayload | PredictOutputPayload).choices,
        (response.kind === "mcq" || response.kind === "predict-output") &&
          typeof response.choiceId === "string"
          ? response.choiceId
          : null
      );

    case "multi":
      return gradeMulti(
        (item.payload as MultiPayload).choices,
        response.kind === "multi" && Array.isArray(response.choiceIds)
          ? response.choiceIds.filter((id): id is string => typeof id === "string")
          : []
      );

    case "truefalse":
      return gradeTrueFalse(
        (item.payload as TrueFalsePayload).answer,
        response.kind === "truefalse" && typeof response.value === "boolean"
          ? response.value
          : null
      );

    case "fill-blank":
      return gradeBlanks(
        item.payload as FillBlankPayload,
        response.kind === "fill-blank" && isStringRecord(response.values)
          ? response.values
          : {}
      );

    case "order":
      return gradeOrder(
        item.payload as OrderPayload,
        response.kind === "order" && Array.isArray(response.order)
          ? response.order.filter((id): id is string => typeof id === "string")
          : []
      );

    case "code":
      return gradeCode(
        item.payload as CodePayload,
        response.kind === "code" && typeof response.code === "string" ? response.code : "",
        options
      );

    case "short":
      return gradeSelf(response.kind === "short" ? response.selfRating : null);
  }
}

function isStringRecord(v: unknown): v is Record<string, string> {
  return (
    typeof v === "object" &&
    v !== null &&
    !Array.isArray(v) &&
    Object.values(v).every((x) => typeof x === "string")
  );
}

// ─── Single choice ───
function gradeSingle(choices: Choice[], chosen: string | null): Grade {
  const verdicts = choices.map((c) => ({
    id: c.id,
    chosen: c.id === chosen,
    correct: c.correct === true,
  }));
  const correct = choices.some((c) => c.id === chosen && c.correct);
  return { correct, score: correct ? 1 : 0, choices: verdicts };
}

// ─── Multi-select, with partial credit ───
function gradeMulti(choices: Choice[], chosen: string[]): Grade {
  const picked = new Set(chosen);
  const verdicts = choices.map((c) => ({
    id: c.id,
    chosen: picked.has(c.id),
    correct: c.correct === true,
  }));

  const rights = choices.filter((c) => c.correct);
  const hits = rights.filter((c) => picked.has(c.id)).length;
  const falsePositives = choices.filter((c) => !c.correct && picked.has(c.id)).length;

  // Each wrong pick cancels one right pick; never negative. So
  // "select everything" scores 0 rather than harvesting every hit.
  const net = Math.max(0, hits - falsePositives);
  const correct = hits === rights.length && falsePositives === 0;
  const score = correct ? 1 : rights.length === 0 ? 0 : net / rights.length;

  return { correct, score, choices: verdicts };
}

// ─── True / false ───
function gradeTrueFalse(answer: boolean, value: boolean | null): Grade {
  const correct = value !== null && value === answer;
  return { correct, score: correct ? 1 : 0 };
}

// ─── Fill in the blanks ───
/**
 * Canonical form for comparing a typed blank with an accepted answer.
 *
 * - case-insensitive, whitespace collapsed (as documented on `Blank`)
 * - every quote style is one quote, including the curly quotes phones
 *   and macOS substitute automatically: `"user"` = `'user'` = `“user”`
 * - whitespace next to punctuation is dropped, so `(x) => x` = `(x)=>x`
 *   and `a, b` = `a,b`; whitespace *between words* is kept, so
 *   `new Foo` never matches `newFoo`
 * - trailing semicolons are noise in a snippet answer
 */
export function normalizeBlank(s: string): string {
  return String(s ?? "")
    .toLowerCase()
    .replace(/[`'"\u2018\u2019\u201A\u201B\u201C\u201D\u201E\u201F\u2032\u2033]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[\s;]+$/, "")
    .replace(/ ?([^\w\s$]) ?/g, "$1");
}

function gradeBlanks(payload: FillBlankPayload, values: Record<string, string>): Grade {
  const verdicts = payload.blanks.map((b) => {
    const given = values[b.id] ?? "";
    const ok = b.accept.some((a) => normalizeBlank(a) === normalizeBlank(given));
    return { id: b.id, given, correct: ok, accept: b.accept };
  });

  const hits = verdicts.filter((v) => v.correct).length;
  return {
    correct: hits === verdicts.length && verdicts.length > 0,
    score: verdicts.length === 0 ? 0 : hits / verdicts.length,
    blanks: verdicts,
  };
}

// ─── Ordering ───
function gradeOrder(payload: OrderPayload, given: string[]): Grade {
  const correctOrder = payload.steps.map((s) => s.id);
  const textById = new Map(payload.steps.map((s) => [s.id, s.text]));

  const verdicts = correctOrder.map((id, correctIndex) => ({
    id,
    text: textById.get(id) ?? "",
    correctIndex,
    givenIndex: given.indexOf(id),
  }));

  const inPlace = verdicts.filter((v) => v.givenIndex === v.correctIndex).length;
  return {
    correct: inPlace === correctOrder.length,
    score: correctOrder.length === 0 ? 0 : inPlace / correctOrder.length,
    order: verdicts,
  };
}

// ─── Code ───
function gradeCode(payload: CodePayload, code: string, options: GradeOptions): Grade {
  const run = options.runTests ?? runTests;
  const expectedName = extractFunctionName(payload.starterCode ?? "") ?? undefined;
  const result = run(code, payload.tests, payload.harness, { expectedName });
  const passed = result.results.filter((r) => r.passed).length;
  return {
    correct: result.allPassed,
    score: result.results.length === 0 ? 0 : passed / result.results.length,
    tests: result.results,
    errorType: result.errorType,
  };
}

// ─── Self-graded explain-it ───
function gradeSelf(rating: number | null): Grade {
  // 1 Blanked · 2 Shaky · 3 Solid · 4 Nailed it
  // Anything outside 1–4 (a tampered request) is treated as "Blanked".
  const r =
    typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 4
      ? rating
      : 1;
  return {
    correct: r >= 3,
    score: (r - 1) / 3,
    selfGraded: true,
  };
}

// ─── Response helpers ───

/** An empty response of the right shape for an item kind. */
export function emptyResponse(kind: Item["kind"]): Response {
  switch (kind) {
    case "mcq":
      return { kind: "mcq", choiceId: null };
    case "predict-output":
      return { kind: "predict-output", choiceId: null };
    case "multi":
      return { kind: "multi", choiceIds: [] };
    case "truefalse":
      return { kind: "truefalse", value: null };
    case "fill-blank":
      return { kind: "fill-blank", values: {} };
    case "order":
      return { kind: "order", order: [] };
    case "code":
      return { kind: "code", code: "" };
    case "short":
      return { kind: "short", text: "", selfRating: null };
  }
}

/** Whether the learner has supplied enough to submit. */
export function isAnswered(item: Item, response: Response): boolean {
  switch (response.kind) {
    case "mcq":
    case "predict-output":
      return response.choiceId !== null;
    case "multi":
      return response.choiceIds.length > 0;
    case "truefalse":
      return response.value !== null;
    case "fill-blank":
      return Object.values(response.values).some((v) => v.trim().length > 0);
    case "order":
      return response.order.length === (item.payload as OrderPayload).steps.length;
    case "code":
      return response.code.trim().length > 0;
    case "short":
      // Self-graded: revealing the model answer is the "submit".
      return true;
  }
}

/** The key points an `explain it` item wants the learner to hit. */
export function keyPointsOf(item: Item): string[] {
  return item.kind === "short" ? (item.payload as ShortPayload).keyPoints : [];
}
