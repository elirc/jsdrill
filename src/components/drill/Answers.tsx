"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CodeBlock, CodeInline } from "@/components/CodeBlock";
import { Button, Inline } from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  Choice,
  DrillItem,
  FillBlankPayload,
  Grade,
  McqPayload,
  MultiPayload,
  OrderPayload,
  PredictOutputPayload,
  Response,
  SelfRating,
  ShortPayload,
  TrueFalsePayload,
} from "@/types";

export type AnswerProps = {
  item: DrillItem;
  response: Response;
  onChange: (r: Response) => void;
  /**
   * The most recent grade. May be set while `revealed` is false: that
   * is the retry state — the learner missed once and gets one more
   * go before the answer is shown, so only their wrong pick is marked.
   */
  grade: Grade | null;
  /** Once true the answer is shown and inputs lock. */
  revealed: boolean;
  onSubmit: () => void;
};

/** Kinds that offer a second attempt after a first miss. */
export const RETRYABLE_KINDS: ReadonlySet<DrillItem["kind"]> = new Set([
  "mcq",
  "predict-output",
  "fill-blank",
]);

// ─────────────────────────────────────────────────────────────
// Choice list — shared by mcq, multi and predict-output
// ─────────────────────────────────────────────────────────────

function ChoiceList({
  choices,
  selected,
  multi,
  grade,
  revealed,
  onToggle,
}: {
  choices: Choice[];
  selected: Set<string>;
  multi: boolean;
  grade: Grade | null;
  revealed: boolean;
  onToggle: (id: string) => void;
}) {
  const retrying = grade !== null && !revealed;

  // In a retry the first wrong pick is eliminated; everything else stays live.
  const eliminated = useMemo(() => {
    if (!retrying) return new Set<string>();
    return new Set(
      (grade?.choices ?? []).filter((c) => c.chosen && !c.correct).map((c) => c.id)
    );
  }, [retrying, grade]);

  // Keyboard shortcuts: 1-9 pick an option.
  useEffect(() => {
    if (revealed) return;
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      const n = Number.parseInt(e.key, 10);
      if (n >= 1 && n <= choices.length && !eliminated.has(choices[n - 1].id)) {
        e.preventDefault();
        onToggle(choices[n - 1].id);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [choices, revealed, eliminated, onToggle]);

  return (
    <div className="flex flex-col gap-2">
      {choices.map((choice, index) => {
        const isSelected = selected.has(choice.id);
        const verdict = grade?.choices?.find((c) => c.id === choice.id);
        const isEliminated = eliminated.has(choice.id);

        let tone: "idle" | "picked" | "right" | "wrong" = "idle";
        if (revealed && verdict?.correct) tone = "right";
        else if (revealed && verdict?.chosen) tone = "wrong";
        else if (isEliminated) tone = "wrong";
        else if (!revealed && isSelected) tone = "picked";

        const styles: Record<string, React.CSSProperties> = {
          idle: { background: "var(--surface)", borderColor: "var(--border)" },
          picked: { background: "var(--accent-soft)", borderColor: "var(--accent)" },
          right: { background: "var(--good-soft)", borderColor: "var(--good)" },
          wrong: { background: "var(--bad-soft)", borderColor: "var(--bad)" },
        };

        const disabled = revealed || isEliminated;

        return (
          <div key={choice.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onToggle(choice.id)}
              aria-pressed={isSelected}
              className={cn(
                "w-full text-left rounded-lg border px-4 py-3.5 flex items-start gap-3",
                "transition-all duration-150",
                !disabled && "hover:brightness-[1.15] cursor-pointer",
                disabled && "cursor-default",
                isEliminated && "opacity-60"
              )}
              style={styles[tone]}
            >
              <span
                className={cn(
                  "flex-none mt-0.5 h-6 w-6 flex items-center justify-center text-[12px] font-semibold",
                  multi ? "rounded-[6px]" : "rounded-full"
                )}
                style={{
                  background:
                    tone === "right"
                      ? "var(--good)"
                      : tone === "wrong"
                        ? "var(--bad)"
                        : tone === "picked"
                          ? "var(--accent)"
                          : "var(--bg-inset)",
                  color:
                    tone === "idle" ? "var(--text-faint)" : tone === "right" ? "#04160f" : "#fff",
                  border: tone === "idle" ? "1px solid var(--border-strong)" : "1px solid transparent",
                }}
              >
                {tone === "right" ? "✓" : tone === "wrong" ? "✕" : index + 1}
              </span>

              <span
                className="flex-1 min-w-0 text-[15px] leading-[1.6]"
                style={{ color: "var(--text)" }}
              >
                {choice.code ? (
                  <span className="block whitespace-pre-wrap">
                    <CodeInline code={choice.text} />
                  </span>
                ) : (
                  <Inline>{choice.text}</Inline>
                )}
              </span>
            </button>

            {/* Per-option feedback: after reveal for the correct and chosen
                options; during a retry, only for the eliminated one so it
                nudges without giving the answer away. */}
            {choice.explain &&
              ((revealed && (verdict?.correct || verdict?.chosen)) || isEliminated) && (
                <p
                  className="text-[13.5px] leading-relaxed mt-1.5 ml-10 pr-2 animate-rise"
                  style={{ color: "var(--text-muted)" }}
                >
                  <Inline>{choice.explain}</Inline>
                </p>
              )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Single choice (mcq / predict-output)
// ─────────────────────────────────────────────────────────────

export function SingleChoice({ item, response, onChange, grade, revealed }: AnswerProps) {
  const payload = item.payload as McqPayload | PredictOutputPayload;
  const chosen =
    response.kind === "mcq" || response.kind === "predict-output" ? response.choiceId : null;

  return (
    <ChoiceList
      choices={payload.choices}
      selected={new Set(chosen ? [chosen] : [])}
      multi={false}
      grade={grade}
      revealed={revealed}
      onToggle={(id) =>
        onChange(
          item.kind === "predict-output"
            ? { kind: "predict-output", choiceId: id }
            : { kind: "mcq", choiceId: id }
        )
      }
    />
  );
}

// ─────────────────────────────────────────────────────────────
// Multi-select
// ─────────────────────────────────────────────────────────────

export function MultiChoice({ item, response, onChange, grade, revealed }: AnswerProps) {
  const payload = item.payload as MultiPayload;
  const chosen = response.kind === "multi" ? response.choiceIds : [];
  const correctCount = payload.choices.filter((c) => c.correct).length;

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px]" style={{ color: "var(--text-muted)" }}>
        Select all that apply — {correctCount} of {payload.choices.length} are correct.
      </p>
      <ChoiceList
        choices={payload.choices}
        selected={new Set(chosen)}
        multi
        grade={grade}
        revealed={revealed}
        onToggle={(id) => {
          const next = chosen.includes(id) ? chosen.filter((c) => c !== id) : [...chosen, id];
          onChange({ kind: "multi", choiceIds: next });
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// True / false
// ─────────────────────────────────────────────────────────────

export function TrueFalse({ item, response, onChange, revealed }: AnswerProps) {
  const payload = item.payload as TrueFalsePayload;
  const value = response.kind === "truefalse" ? response.value : null;

  return (
    <div className="grid grid-cols-2 gap-3">
      {[true, false].map((option) => {
        const selected = value === option;
        const isAnswer = payload.answer === option;

        let tone: "idle" | "picked" | "right" | "wrong" = "idle";
        if (revealed && isAnswer) tone = "right";
        else if (revealed && selected) tone = "wrong";
        else if (selected) tone = "picked";

        const styles: Record<string, React.CSSProperties> = {
          idle: { background: "var(--surface)", borderColor: "var(--border)", color: "var(--text)" },
          picked: { background: "var(--accent-soft)", borderColor: "var(--accent)", color: "var(--text)" },
          right: { background: "var(--good-soft)", borderColor: "var(--good)", color: "var(--good)" },
          wrong: { background: "var(--bad-soft)", borderColor: "var(--bad)", color: "var(--bad)" },
        };

        return (
          <button
            key={String(option)}
            type="button"
            disabled={revealed}
            onClick={() => onChange({ kind: "truefalse", value: option })}
            className={cn(
              "rounded-lg border py-4 font-medium text-[16px] transition-all duration-150",
              !revealed && "hover:brightness-[1.15] cursor-pointer"
            )}
            style={styles[tone]}
          >
            {option ? "True" : "False"}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Fill in the blanks
// ─────────────────────────────────────────────────────────────

export function FillBlank({ item, response, onChange, grade, revealed, onSubmit }: AnswerProps) {
  const payload = item.payload as FillBlankPayload;
  const values = response.kind === "fill-blank" ? response.values : {};
  const retrying = grade !== null && !revealed;

  const segments = useMemo(() => {
    const parts: ({ type: "text"; value: string } | { type: "blank"; id: string })[] = [];
    const regex = /\{\{(\w+)\}\}/g;
    let last = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(payload.template)) !== null) {
      if (match.index > last) {
        parts.push({ type: "text", value: payload.template.slice(last, match.index) });
      }
      parts.push({ type: "blank", id: match[1] });
      last = match.index + match[0].length;
    }
    if (last < payload.template.length) {
      parts.push({ type: "text", value: payload.template.slice(last) });
    }
    return parts;
  }, [payload.template]);

  return (
    <div className="flex flex-col gap-3">
      <div
        className="rounded-lg border px-4 py-4 overflow-x-auto"
        style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
      >
        <pre className="font-mono text-[14px] leading-[2.1] whitespace-pre-wrap">
          {segments.map((seg, i) => {
            if (seg.type === "text") {
              return (
                <span key={i} style={{ color: "var(--text-muted)" }}>
                  {seg.value}
                </span>
              );
            }

            const blank = payload.blanks.find((b) => b.id === seg.id);
            const verdict = grade?.blanks?.find((b) => b.id === seg.id);
            // During a retry, blanks already correct are locked; only
            // the wrong ones stay editable.
            const locked = revealed || (retrying && verdict?.correct === true);
            const marked = verdict !== undefined && (revealed || retrying);

            return (
              <input
                key={i}
                type="text"
                value={values[seg.id] ?? ""}
                disabled={locked}
                spellCheck={false}
                autoComplete="off"
                placeholder={blank?.hint ? "?" : ""}
                title={blank?.hint}
                onChange={(e) =>
                  onChange({
                    kind: "fill-blank",
                    values: { ...values, [seg.id]: e.target.value },
                  })
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !revealed) onSubmit();
                }}
                className="font-mono text-[14px] px-2 py-0.5 mx-0.5 rounded outline-none text-center"
                style={{
                  width: `${Math.max(6, (blank?.width ?? 8) + 1)}ch`,
                  background: marked
                    ? verdict?.correct
                      ? "var(--good-soft)"
                      : "var(--bad-soft)"
                    : "var(--surface)",
                  border: `1px solid ${
                    marked
                      ? verdict?.correct
                        ? "var(--good)"
                        : "var(--bad)"
                      : "var(--border-strong)"
                  }`,
                  color: "var(--text)",
                }}
              />
            );
          })}
        </pre>
      </div>

      {!revealed && payload.blanks.some((b) => b.hint) && (
        <div className="flex flex-wrap gap-2">
          {payload.blanks.map((b, i) =>
            b.hint ? (
              <span
                key={b.id}
                className="text-[12.5px] px-2 py-1 rounded-md border"
                style={{
                  background: "var(--bg-inset)",
                  borderColor: "var(--border)",
                  color: "var(--text-muted)",
                }}
              >
                <strong style={{ color: "var(--text)" }}>{i + 1}.</strong> {b.hint}
              </span>
            ) : null
          )}
        </div>
      )}

      {revealed &&
        grade?.blanks
          ?.filter((b) => !b.correct)
          .map((b) => (
            <p key={b.id} className="text-[13.5px] animate-rise" style={{ color: "var(--text-muted)" }}>
              Blank {Number(b.id)}: expected{" "}
              <code className="md-code" style={{ color: "var(--good)" }}>
                {b.accept[0]}
              </code>
              {b.accept.length > 1 && (
                <span style={{ color: "var(--text-faint)" }}>
                  {" "}
                  (also accepted: {b.accept.slice(1).join(", ")})
                </span>
              )}
            </p>
          ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Ordering
// ─────────────────────────────────────────────────────────────

export function OrderSteps({ item, response, onChange, grade, revealed }: AnswerProps) {
  const payload = item.payload as OrderPayload;

  // Shuffling reads Math.random, so it happens in an effect rather than
  // during render — and only once per item, so re-renders never reorder
  // the list under the user's cursor.
  const shuffled = useRef<string[] | null>(null);
  const current = response.kind === "order" ? response.order : [];

  useEffect(() => {
    if (response.kind !== "order" || response.order.length > 0) return;

    if (!shuffled.current) {
      const ids = payload.steps.map((s) => s.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      if (ids.length > 1 && ids.every((id, i) => id === payload.steps[i].id)) {
        [ids[0], ids[1]] = [ids[1], ids[0]];
      }
      shuffled.current = ids;
    }

    onChange({ kind: "order", order: shuffled.current });
  }, [payload.steps, response, onChange]);

  const textById = new Map(payload.steps.map((s) => [s.id, s.text]));

  function move(index: number, direction: -1 | 1) {
    const next = [...current];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ kind: "order", order: next });
  }

  return (
    <div className="flex flex-col gap-2">
      {!revealed && (
        <p className="text-[13px] mb-1" style={{ color: "var(--text-muted)" }}>
          Use the arrows to put these in the correct order.
        </p>
      )}

      {(revealed ? payload.steps.map((s) => s.id) : current).map((id, index) => {
        const verdict = grade?.order?.find((o) => o.id === id);
        const wasRight = verdict ? verdict.givenIndex === verdict.correctIndex : false;

        return (
          <div
            key={id}
            className="flex items-stretch gap-2 rounded-lg border transition-all duration-150"
            style={{
              background: revealed
                ? wasRight
                  ? "var(--good-soft)"
                  : "var(--bad-soft)"
                : "var(--surface)",
              borderColor: revealed ? (wasRight ? "var(--good)" : "var(--bad)") : "var(--border)",
            }}
          >
            <div
              className="flex-none w-10 flex items-center justify-center text-[13px] font-semibold border-r"
              style={{
                color: revealed ? (wasRight ? "var(--good)" : "var(--bad)") : "var(--text-faint)",
                borderColor: "var(--border)",
              }}
            >
              {index + 1}
            </div>

            <div className="flex-1 py-3 pr-2 text-[14.5px] leading-relaxed" style={{ color: "var(--text)" }}>
              {textById.get(id)}
              {revealed && verdict && !wasRight && (
                <span className="ml-2 text-[12px]" style={{ color: "var(--bad)" }}>
                  (you had it at {verdict.givenIndex + 1})
                </span>
              )}
            </div>

            {!revealed && (
              <div className="flex-none flex flex-col justify-center pr-1.5 gap-0.5">
                <button
                  type="button"
                  aria-label="Move up"
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                  className="h-5 w-7 rounded text-[10px] disabled:opacity-25 hover:brightness-150"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label="Move down"
                  disabled={index === current.length - 1}
                  onClick={() => move(index, 1)}
                  className="h-5 w-7 rounded text-[10px] disabled:opacity-25 hover:brightness-150"
                  style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                >
                  ▼
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Explain it (self-graded)
// ─────────────────────────────────────────────────────────────

const SELF_RATINGS: { value: SelfRating; label: string; hint: string; color: string }[] = [
  { value: 1, label: "Blanked", hint: "Couldn't answer", color: "var(--bad)" },
  { value: 2, label: "Shaky", hint: "Got some of it", color: "var(--warn)" },
  { value: 3, label: "Solid", hint: "Hit the main points", color: "var(--accent)" },
  { value: 4, label: "Nailed it", hint: "Would satisfy an interviewer", color: "var(--good)" },
];

export function ExplainIt({ response, onChange, grade, revealed, item }: AnswerProps) {
  const payload = item.payload as ShortPayload;
  const text = response.kind === "short" ? response.text : "";
  const rating = response.kind === "short" ? response.selfRating : null;
  const [peeked, setPeeked] = useState(false);
  const showAnswer = peeked || revealed;
  const locked = grade !== null && revealed;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          className="block text-[13.5px] mb-2"
          style={{ color: "var(--text-muted)" }}
          htmlFor="explain-notes"
        >
          Say your answer out loud first — that&apos;s the actual practice. Jot the key points if it helps.
        </label>
        <textarea
          id="explain-notes"
          value={text}
          rows={4}
          disabled={locked}
          placeholder="Optional notes…"
          onChange={(e) => onChange({ kind: "short", text: e.target.value, selfRating: rating })}
          className="w-full rounded-lg border px-4 py-3 text-[15px] leading-relaxed outline-none resize-y"
          style={{
            background: "var(--bg-inset)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />
      </div>

      {!showAnswer ? (
        <Button variant="secondary" onClick={() => setPeeked(true)}>
          Reveal the model answer
        </Button>
      ) : (
        <div className="animate-rise flex flex-col gap-4">
          <div
            className="rounded-lg border p-5"
            style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
          >
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-3"
              style={{ color: "var(--text-faint)" }}
            >
              Model answer
            </div>
            <div className="text-[15.5px] leading-[1.8] whitespace-pre-wrap" style={{ color: "var(--text)" }}>
              {payload.modelAnswer}
            </div>
          </div>

          <div>
            <div
              className="text-[11px] font-semibold uppercase tracking-wider mb-2.5"
              style={{ color: "var(--text-faint)" }}
            >
              An interviewer is listening for
            </div>
            <ul className="flex flex-col gap-2">
              {payload.keyPoints.map((point, i) => (
                <li
                  key={i}
                  className="flex gap-2.5 text-[14.5px] leading-relaxed"
                  style={{ color: "var(--text)" }}
                >
                  <span style={{ color: "var(--accent)" }}>•</span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {!locked && (
            <div>
              <div className="text-[13.5px] mb-2" style={{ color: "var(--text-muted)" }}>
                How did you do? This sets when you&apos;ll see it again.
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {SELF_RATINGS.map((option) => {
                  const selected = rating === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onChange({ kind: "short", text, selfRating: option.value })}
                      className="rounded-lg border px-3 py-3 text-left transition-all duration-150 hover:brightness-125"
                      style={{
                        background: selected ? "var(--accent-soft)" : "var(--surface)",
                        borderColor: selected ? option.color : "var(--border)",
                      }}
                    >
                      <div
                        className="text-[14px] font-medium"
                        style={{ color: selected ? option.color : "var(--text)" }}
                      >
                        {option.label}
                      </div>
                      <div className="text-[12px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                        {option.hint}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Write code
// ─────────────────────────────────────────────────────────────

export function WriteCode({ item, response, onChange, grade, revealed }: AnswerProps) {
  const payload = item.payload as { starterCode: string; solutionCode: string };
  const code = response.kind === "code" ? response.code : "";
  const [showSolution, setShowSolution] = useState(false);
  const initialised = useRef(false);

  useEffect(() => {
    if (!initialised.current && response.kind === "code" && response.code === "") {
      initialised.current = true;
      onChange({ kind: "code", code: payload.starterCode });
    }
  }, [payload.starterCode, response, onChange]);

  return (
    <div className="flex flex-col gap-3">
      <LazyEditor
        value={code || payload.starterCode}
        readOnly={revealed}
        onChange={(next) => onChange({ kind: "code", code: next })}
      />

      {revealed && grade?.tests && (
        <div className="flex flex-col gap-1.5 animate-rise">
          {grade.tests.map((test, i) => (
            <div
              key={i}
              className="rounded-lg border px-3.5 py-3 text-[13.5px]"
              style={{
                background: test.passed ? "var(--good-soft)" : "var(--bad-soft)",
                borderColor: test.passed ? "var(--good)" : "var(--bad)",
              }}
            >
              <div className="flex items-center gap-2">
                <span style={{ color: test.passed ? "var(--good)" : "var(--bad)" }}>
                  {test.passed ? "✓" : "✕"}
                </span>
                <span style={{ color: "var(--text)" }}>{test.testCase.description}</span>
                {test.testCase.isEdgeCase && (
                  <span
                    className="text-[10.5px] px-1.5 py-0.5 rounded"
                    style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
                  >
                    edge
                  </span>
                )}
              </div>
              {!test.passed && (
                <div className="mt-1.5 ml-5 font-mono text-[12.5px]" style={{ color: "var(--text-muted)" }}>
                  {test.error ? (
                    test.error
                  ) : (
                    <>
                      expected <span style={{ color: "var(--good)" }}>{JSON.stringify(test.expected)}</span>
                      {" · got "}
                      <span style={{ color: "var(--bad)" }}>{JSON.stringify(test.result)}</span>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {revealed && (
        <div>
          <Button size="sm" variant="ghost" onClick={() => setShowSolution((s) => !s)}>
            {showSolution ? "Hide" : "Show"} a reference solution
          </Button>
          {showSolution && (
            <div className="mt-2 animate-rise">
              <CodeBlock code={payload.solutionCode} lang="javascript" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** CodeMirror is heavy; only `code` items pay for it. */
function LazyEditor(props: { value: string; readOnly: boolean; onChange: (v: string) => void }) {
  const [Editor, setEditor] = useState<React.ComponentType<typeof props> | null>(null);

  useEffect(() => {
    let alive = true;
    import("./CodeEditor").then((m) => {
      if (alive) setEditor(() => m.CodeEditor);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!Editor) {
    return (
      <div
        className="rounded-lg border p-4 font-mono text-[13.5px] min-h-[180px]"
        style={{ background: "var(--bg-inset)", borderColor: "var(--border)", color: "var(--text-faint)" }}
      >
        Loading editor…
      </div>
    );
  }

  return <Editor {...props} />;
}

// ─────────────────────────────────────────────────────────────

export function AnswerFor(props: AnswerProps) {
  switch (props.item.kind) {
    case "mcq":
    case "predict-output":
      return <SingleChoice {...props} />;
    case "multi":
      return <MultiChoice {...props} />;
    case "truefalse":
      return <TrueFalse {...props} />;
    case "fill-blank":
      return <FillBlank {...props} />;
    case "order":
      return <OrderSteps {...props} />;
    case "code":
      return <WriteCode {...props} />;
    case "short":
      return <ExplainIt {...props} />;
  }
}
