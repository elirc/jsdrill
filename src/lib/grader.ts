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
import { runTests } from "./executor";

export function grade(item: Item, response: Response): Grade {
  switch (item.kind) {
    case "mcq":
    case "predict-output":
      return gradeSingle(
        (item.payload as McqPayload | PredictOutputPayload).choices,
        response.kind === "mcq" || response.kind === "predict-output"
          ? response.choiceId
          : null
      );

    case "multi":
      return gradeMulti(
        (item.payload as MultiPayload).choices,
        response.kind === "multi" ? response.choiceIds : []
      );

    case "truefalse":
      return gradeTrueFalse(
        (item.payload as TrueFalsePayload).answer,
        response.kind === "truefalse" ? response.value : null
      );

    case "fill-blank":
      return gradeBlanks(
        item.payload as FillBlankPayload,
        response.kind === "fill-blank" ? response.values : {}
      );

    case "order":
      return gradeOrder(
        item.payload as OrderPayload,
        response.kind === "order" ? response.order : []
      );

    case "code":
      return gradeCode(
        item.payload as CodePayload,
        response.kind === "code" ? response.code : ""
      );

    case "short":
      return gradeSelf(response.kind === "short" ? response.selfRating : null);
  }
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

  // Each wrong pick cancels one right pick; never negative.
  const net = Math.max(0, hits - falsePositives);
  const score = rights.length === 0 ? 0 : net / rights.length;
  const correct = hits === rights.length && falsePositives === 0;

  return { correct, score, choices: verdicts };
}

// ─── True / false ───
function gradeTrueFalse(answer: boolean, value: boolean | null): Grade {
  const correct = value !== null && value === answer;
  return { correct, score: correct ? 1 : 0 };
}

// ─── Fill in the blanks ───
export function normalizeBlank(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    // Treat quote styles as equivalent so `"user"` matches `'user'`.
    .replace(/[`'"]/g, '"')
    // Trailing semicolons are noise in a snippet answer.
    .replace(/;$/, "");
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
function gradeCode(payload: CodePayload, code: string): Grade {
  const result = runTests(code, payload.tests, payload.harness);
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
  const r = rating ?? 1;
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
