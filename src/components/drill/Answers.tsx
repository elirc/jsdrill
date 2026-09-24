"use client";

import { useEffect, useEffectEvent, useMemo, useState } from "react";
import { CodeBlock, CodeInline } from "@/components/CodeBlock";
import { Button, Inline } from "@/components/ui";
import { cn } from "@/lib/utils";
import type {
  Choice,
  CodePayload,
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
};

/** Kinds that offer a second attempt after a first miss. */
export const RETRYABLE_KINDS: ReadonlySet<DrillItem["kind"]> = new Set([
  "mcq",
  "predict-output",
  "fill-blank",
]);

/**
 * Answer buttons carry this attribute so the session's Enter handler
 * treats "focus on an option, press Enter" as "check my answer" rather
 * than re-clicking the option.
 */
const CHOICE_ATTR = { "data-drill-choice": "" };

/** Digit shortcuts (1–9) for picking an option, ignored while typing. */
function useDigitShortcuts(count: number, enabled: boolean, pick: (index: number) => void) {
  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    const target = e.target as HTMLElement | null;
    if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
      return;
    }
    const n = Number.parseInt(e.key, 10);
    if (n >= 1 && n <= count) {
      e.preventDefault();
      pick(n - 1);
    }
  });

  useEffect(() => {
    if (!enabled) return;
    const listener = (e: KeyboardEvent) => onKey(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [enabled]);
}

/** Screen-reader-only verdict text, so colour is never the only signal. */
function SrVerdict({ children }: { children: string }) {
  return <span className="sr-only"> — {children}</span>;
}

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

  useDigitShortcuts(choices.length, !revealed, (index) => {
    const choice = choices[index];
    if (!eliminated.has(choice.id)) onToggle(choice.id);
  });

  return (
    <div
      role="group"
      aria-label={multi ? "Answer options — select all that apply" : "Answer options — pick one"}
      className="flex flex-col gap-2"
    >
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
        const srVerdict =
          tone === "right"
            ? verdict?.chosen
              ? "correct, your pick"
              : "correct answer"
            : tone === "wrong"
              ? isEliminated
                ? "your first pick, wrong"
                : "your pick, wrong"
              : null;

        return (
          <div key={choice.id}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onToggle(choice.id)}
              aria-pressed={isSelected}
              {...CHOICE_ATTR}
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
                aria-hidden
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
                {srVerdict && <SrVerdict>{srVerdict}</SrVerdict>}
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

function SingleChoice({ item, response, onChange, grade, revealed }: AnswerProps) {
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

function MultiChoice({ item, response, onChange, grade, revealed }: AnswerProps) {
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

const TRUE_FALSE = [true, false] as const;

function TrueFalse({ item, response, onChange, revealed }: AnswerProps) {
  const payload = item.payload as TrueFalsePayload;
  const value = response.kind === "truefalse" ? response.value : null;

  useDigitShortcuts(2, !revealed, (index) =>
    onChange({ kind: "truefalse", value: TRUE_FALSE[index] })
  );

  return (
    <div role="group" aria-label="True or false" className="grid grid-cols-2 gap-3">
      {TRUE_FALSE.map((option, index) => {
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
            aria-pressed={selected}
            {...CHOICE_ATTR}
            className={cn(
              "rounded-lg border py-4 font-medium text-[16px] transition-all duration-150",
              "inline-flex items-center justify-center gap-2",
              !revealed && "hover:brightness-[1.15] cursor-pointer"
            )}
            style={styles[tone]}
          >
            {tone === "right" && <span aria-hidden>✓</span>}
            {tone === "wrong" && <span aria-hidden>✕</span>}
            {!revealed && (
              <span aria-hidden className="text-[12px] opacity-50 tabular-nums">
                {index + 1}
              </span>
            )}
            {option ? "True" : "False"}
            {tone === "right" && <SrVerdict>{selected ? "correct, your pick" : "correct answer"}</SrVerdict>}
            {tone === "wrong" && <SrVerdict>your pick, wrong</SrVerdict>}
          </button>
        );
      })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Fill in the blanks
// ─────────────────────────────────────────────────────────────

function FillBlank({ item, response, onChange, grade, revealed }: AnswerProps) {
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

  // Enter in a blank is handled by the session (it checks the answer).
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

            const blankIndex = payload.blanks.findIndex((b) => b.id === seg.id);
            const blank = payload.blanks[blankIndex];
            const verdict = grade?.blanks?.find((b) => b.id === seg.id);
            // During a retry, blanks already correct are locked; only
            // the wrong ones stay editable.
            const locked = revealed || (retrying && verdict?.correct === true);
            const marked = verdict !== undefined && (revealed || retrying);
            const right = marked && verdict?.correct === true;
            const label = `Blank ${blankIndex + 1}${blank?.hint ? ` (hint: ${blank.hint})` : ""}${
              marked ? (right ? ", correct" : ", wrong") : ""
            }`;

            return (
              <span key={i} className="inline-flex items-center whitespace-nowrap">
                <input
                  type="text"
                  value={values[seg.id] ?? ""}
                  disabled={locked}
                  spellCheck={false}
                  autoComplete="off"
                  autoCapitalize="off"
                  aria-label={label}
                  aria-invalid={marked && !right ? true : undefined}
                  placeholder={blank?.hint ? "?" : ""}
                  title={blank?.hint}
                  onChange={(e) =>
                    onChange({
                      kind: "fill-blank",
                      values: { ...values, [seg.id]: e.target.value },
                    })
                  }
                  className="font-mono text-[14px] px-2 py-0.5 mx-0.5 rounded outline-none text-center"
                  style={{
                    width: `${Math.max(6, (blank?.width ?? 8) + 1)}ch`,
                    background: marked
                      ? right
                        ? "var(--good-soft)"
                        : "var(--bad-soft)"
                      : "var(--surface)",
                    border: `1px solid ${
                      marked ? (right ? "var(--good)" : "var(--bad)") : "var(--border-strong)"
                    }`,
                    color: "var(--text)",
                  }}
                />
                {marked && (
                  <span
                    aria-hidden
                    className="text-[12px] font-bold mr-0.5"
                    style={{ color: right ? "var(--good)" : "var(--bad)" }}
                  >
                    {right ? "✓" : "✕"}
                  </span>
                )}
              </span>
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
              <span aria-hidden style={{ color: "var(--bad)" }}>
                ✕{" "}
              </span>
              Blank {payload.blanks.findIndex((p) => p.id === b.id) + 1}: expected{" "}
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

function OrderSteps({ item, response, onChange, grade, revealed }: AnswerProps) {
  const payload = item.payload as OrderPayload;
  // The session seeds a shuffled order when the item loads.
  const current = response.kind === "order" ? response.order : [];
  const [announcement, setAnnouncement] = useState("");

  const textById = new Map(payload.steps.map((s) => [s.id, s.text]));

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= current.length) return;
    const next = [...current];
    [next[index], next[target]] = [next[target], next[index]];
    onChange({ kind: "order", order: next });
    setAnnouncement(`Moved to position ${target + 1} of ${next.length}.`);
  }

  return (
    <div className="flex flex-col gap-2">
      {!revealed && (
        <p className="text-[13px] mb-1" style={{ color: "var(--text-muted)" }} id={`order-help-${item.id}`}>
          Use the arrows to put these in the correct order.
        </p>
      )}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      <ol className="flex flex-col gap-2" aria-describedby={revealed ? undefined : `order-help-${item.id}`}>
        {(revealed ? payload.steps.map((s) => s.id) : current).map((id, index) => {
          const verdict = grade?.order?.find((o) => o.id === id);
          const wasRight = verdict ? verdict.givenIndex === verdict.correctIndex : false;
          const text = textById.get(id) ?? "";
          const short = text.length > 40 ? `${text.slice(0, 40)}…` : text;
          const atTop = index === 0;
          const atBottom = index === current.length - 1;

          return (
            <li
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
                aria-hidden
                className="flex-none w-10 flex items-center justify-center gap-0.5 text-[13px] font-semibold border-r"
                style={{
                  color: revealed ? (wasRight ? "var(--good)" : "var(--bad)") : "var(--text-faint)",
                  borderColor: "var(--border)",
                }}
              >
                {revealed && <span>{wasRight ? "✓" : "✕"}</span>}
                {index + 1}
              </div>

              <div
                className="flex-1 min-w-0 py-3 pr-2 text-[14.5px] leading-relaxed"
                style={{ color: "var(--text)" }}
              >
                {text}
                {revealed && verdict && (
                  <span
                    className={cn("ml-2 text-[12px]", wasRight && "sr-only")}
                    style={{ color: wasRight ? "var(--good)" : "var(--bad)" }}
                  >
                    {wasRight ? "— in the right place" : `(you had it at ${verdict.givenIndex + 1})`}
                  </span>
                )}
              </div>

              {!revealed && (
                <div className="flex-none flex items-center pr-1.5 gap-1">
                  {/* aria-disabled rather than disabled, so focus stays on
                      the button when a step reaches the top or bottom. */}
                  <button
                    type="button"
                    aria-label={`Move up: ${short}`}
                    aria-disabled={atTop}
                    onClick={() => move(index, -1)}
                    className={cn(
                      "h-9 w-9 rounded-md text-[12px] transition-all",
                      atTop ? "opacity-25 cursor-default" : "hover:brightness-150"
                    )}
                    style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                  >
                    <span aria-hidden>▲</span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Move down: ${short}`}
                    aria-disabled={atBottom}
                    onClick={() => move(index, 1)}
                    className={cn(
                      "h-9 w-9 rounded-md text-[12px] transition-all",
                      atBottom ? "opacity-25 cursor-default" : "hover:brightness-150"
                    )}
                    style={{ background: "var(--bg-inset)", color: "var(--text-muted)" }}
                  >
                    <span aria-hidden>▼</span>
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ol>
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

function ExplainIt({ response, onChange, grade, revealed, item }: AnswerProps) {
  const payload = item.payload as ShortPayload;
  const text = response.kind === "short" ? response.text : "";
  const rating = response.kind === "short" ? response.selfRating : null;
  const [peeked, setPeeked] = useState(false);
  const showAnswer = peeked || revealed;
  const locked = grade !== null && revealed;
  const notesId = `explain-notes-${item.id}`;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label
          className="block text-[13.5px] mb-2"
          style={{ color: "var(--text-muted)" }}
          htmlFor={notesId}
        >
          Say your answer out loud first — that&apos;s the actual practice. Jot the key points if it helps.
        </label>
        <textarea
          id={notesId}
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
                  <span aria-hidden style={{ color: "var(--accent)" }}>
                    •
                  </span>
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </div>

          {!locked && (
            <div>
              <div className="text-[13.5px] mb-2" style={{ color: "var(--text-muted)" }} id={`rate-${item.id}`}>
                How did you do? This sets when you&apos;ll see it again.
              </div>
              <div
                role="group"
                aria-labelledby={`rate-${item.id}`}
                className="grid grid-cols-2 sm:grid-cols-4 gap-2"
              >
                {SELF_RATINGS.map((option) => {
                  const selected = rating === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      aria-pressed={selected}
                      {...CHOICE_ATTR}
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
                        {selected && <span aria-hidden>✓ </span>}
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

function WriteCode({ item, response, onChange, grade, revealed }: AnswerProps) {
  const payload = item.payload as CodePayload;
  // The session seeds the starter code when the item loads, so an empty
  // string here means the learner cleared the editor — respect that.
  const code = response.kind === "code" ? response.code : "";
  const [showSolution, setShowSolution] = useState(false);

  return (
    <div className="flex flex-col gap-3">
      <LazyEditor
        value={code}
        readOnly={revealed}
        onChange={(next) => onChange({ kind: "code", code: next })}
      />

      {revealed && grade?.tests && (
        <ul className="flex flex-col gap-1.5 animate-rise" aria-label="Test results">
          {grade.tests.map((test, i) => (
            <li
              key={i}
              className="rounded-lg border px-3.5 py-3 text-[13.5px]"
              style={{
                background: test.passed ? "var(--good-soft)" : "var(--bad-soft)",
                borderColor: test.passed ? "var(--good)" : "var(--bad)",
              }}
            >
              <div className="flex items-center gap-2">
                <span aria-hidden style={{ color: test.passed ? "var(--good)" : "var(--bad)" }}>
                  {test.passed ? "✓" : "✕"}
                </span>
                <span className="sr-only">{test.passed ? "Passed:" : "Failed:"}</span>
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
            </li>
          ))}
        </ul>
      )}

      {revealed && (
        <div>
          <Button
            size="sm"
            variant="ghost"
            aria-expanded={showSolution}
            onClick={() => setShowSolution((s) => !s)}
          >
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
        role="status"
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
