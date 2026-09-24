"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Badge, Card, Inline, Markdown } from "@/components/ui";
import { AnswerFor } from "./Answers";
import { ERROR_HINTS } from "@/lib/executor";
import { levelShort, tint } from "@/lib/utils";
import { ITEM_KIND_META, type DrillItem, type Grade, type Response } from "@/types";

function moduleHref(item: DrillItem) {
  return `/app/path/${item.trackSlug}/${item.moduleSlug}`;
}

/**
 * One question: optional primer, header, prompt, answer UI and feedback.
 * Render it with `key={item.id}` so per-item UI state (a peeked model
 * answer, a shown solution, the editor) resets between questions.
 */
export function DrillCard({
  item,
  response,
  onChange,
  grade,
  revealed,
  showPrimer,
  bookmarked = false,
  onBookmark,
}: {
  item: DrillItem;
  response: Response;
  onChange: (r: Response) => void;
  grade: Grade | null;
  revealed: boolean;
  showPrimer: boolean;
  bookmarked?: boolean;
  /** Omit to hide the bookmark control (the interview has none). */
  onBookmark?: () => void;
}) {
  const kind = ITEM_KIND_META[item.kind];
  const primer =
    showPrimer && item.moduleKeyIdeas && item.moduleKeyIdeas.length > 0
      ? item.moduleKeyIdeas
      : null;
  const promptRef = useRef<HTMLHeadingElement>(null);

  // A new question mounts (keyed by id): bring it into view and move focus
  // to its prompt so screen readers announce it and the keyboard flow
  // (1–4, Enter) keeps working without a stray focused control.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    promptRef.current?.focus({ preventScroll: true });
  }, []);

  const retrying = grade !== null && !revealed;
  const announcement = revealed && grade ? verdictFor(grade).headline : retrying ? "Not quite — one more try." : "";

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Primer (first question from a brand-new module) ─── */}
      {primer && (
        <Card padding="md" accent={item.trackColor} className="animate-rise">
          <div
            className="text-[10.5px] font-semibold uppercase tracking-wider"
            style={{ color: item.trackColor }}
          >
            New topic
          </div>

          <h2 className="text-[16px] font-semibold mt-1.5" style={{ color: "var(--text)" }}>
            {item.moduleTitle}
          </h2>

          <p className="text-[14px] leading-relaxed mt-1" style={{ color: "var(--text-muted)" }}>
            {item.moduleSummary}
          </p>

          <ul className="mt-3 flex flex-col gap-1.5">
            {primer.map((idea) => (
              <li key={idea} className="flex gap-2.5">
                <span
                  aria-hidden
                  className="mt-[7px] h-[5px] w-[5px] rounded-full flex-none"
                  style={{ background: item.trackColor }}
                />
                <span
                  className="text-[14.5px] leading-[1.6] prose-inline"
                  style={{ color: "var(--text)" }}
                >
                  <Inline>{idea}</Inline>
                </span>
              </li>
            ))}
          </ul>

          <Link
            href={moduleHref(item)}
            className="inline-block mt-3.5 text-[12.5px] hover:underline"
            style={{ color: item.trackColor }}
          >
            Read the full brief →
          </Link>
        </Card>
      )}

      {/* ─── Header ─── */}
      <Card padding="none" accent={item.trackColor}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b flex-wrap"
          style={{ borderColor: "var(--border)", background: tint(item.trackColor, 0.05) }}
        >
          <Badge color={item.trackColor}>{item.trackName}</Badge>
          <Badge>{levelShort(item.level)}</Badge>
          <span className="text-[12px] truncate min-w-0" style={{ color: "var(--text-faint)" }}>
            {item.moduleTitle}
          </span>
          <Link
            href={moduleHref(item)}
            className="text-[12px] hover:underline whitespace-nowrap"
            style={{ color: "var(--text-faint)" }}
            aria-label={`Brief for ${item.moduleTitle}`}
          >
            Brief ↗
          </Link>

          <div className="ml-auto flex items-center gap-2">
            {item.isReview && <Badge tone="warn">↻ Review</Badge>}
            <Badge>
              <span aria-hidden>{kind.icon}</span> {kind.label}
            </Badge>
            {onBookmark && (
              <button
                type="button"
                onClick={onBookmark}
                aria-pressed={bookmarked}
                aria-label="Bookmark this question"
                title={bookmarked ? "Bookmarked" : "Save for later"}
                className="text-[15px] leading-none h-8 w-8 -my-1.5 -mr-1.5 rounded-md flex items-center justify-center transition-transform hover:scale-110"
                style={{ color: bookmarked ? "var(--warn)" : "var(--text-faint)" }}
              >
                <span aria-hidden>{bookmarked ? "★" : "☆"}</span>
              </button>
            )}
          </div>
        </div>

        {/* ─── Prompt ─── */}
        <div className="px-5 py-4">
          <h2
            ref={promptRef}
            tabIndex={-1}
            className="text-[18px] font-medium leading-[1.55] prose-inline outline-none"
            style={{ color: "var(--text)" }}
          >
            <Inline>{item.prompt}</Inline>
          </h2>

          {item.code && (
            <div className="mt-3.5">
              <CodeBlock code={item.code} lang={item.lang ?? "javascript"} />
            </div>
          )}
        </div>
      </Card>

      {/* ─── Answer ─── */}
      <div>
        <AnswerFor
          item={item}
          response={response}
          onChange={onChange}
          grade={grade}
          revealed={revealed}
        />
      </div>

      {/* Verdicts are announced from a region that is always mounted;
          a live region that mounts with its content is often missed. */}
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>

      {/* ─── Feedback ─── */}
      {grade && revealed && <Feedback item={item} grade={grade} />}
    </div>
  );
}

type Tone = "good" | "warn" | "bad" | "neutral";

function verdictFor(grade: Grade): { tone: Tone; headline: string } {
  const secondTry = grade.correct && grade.attempt === 2;
  if (grade.selfGraded) return { tone: "neutral", headline: "Logged" };
  if (secondTry) return { tone: "warn", headline: "Got there on the second try" };
  if (grade.correct) return { tone: "good", headline: "Correct" };
  if (grade.score > 0) {
    return { tone: "warn", headline: `Partly right — ${Math.round(grade.score * 100)}%` };
  }
  return { tone: "bad", headline: "Not quite" };
}

const TONE_COLOR: Record<Tone, string> = {
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  neutral: "var(--accent)",
};

function Feedback({ item, grade }: { item: DrillItem; grade: Grade }) {
  const { tone, headline } = verdictFor(grade);
  const color = TONE_COLOR[tone];
  const hint = grade.errorType ? ERROR_HINTS[grade.errorType] : null;

  // The first paragraph is the takeaway; anything after it is supporting detail.
  const split = item.explanation.indexOf("\n\n");
  const lead = split === -1 ? item.explanation : item.explanation.slice(0, split);
  const rest = split === -1 ? "" : item.explanation.slice(split + 2).trim();

  return (
    <Card padding="none" className="animate-rise overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b"
        style={{
          borderColor: "var(--border)",
          background: `color-mix(in srgb, ${color} 9%, transparent)`,
        }}
      >
        <span
          aria-hidden
          className="h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-none"
          style={{ background: color, color: "#0a0d14" }}
        >
          {grade.correct || grade.selfGraded ? "✓" : grade.score > 0 ? "!" : "✕"}
        </span>
        <h3 className="text-[14px] font-semibold" style={{ color }}>
          {headline}
        </h3>
      </div>

      <div className="px-5 py-4 flex flex-col gap-4">
        {hint && (
          <div
            className="rounded-lg px-3.5 py-2.5 text-[13px]"
            style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
          >
            {hint}
          </div>
        )}

        {lead && (
          <p className="text-[16px] leading-[1.7] prose-inline" style={{ color: "var(--text)" }}>
            <Inline>{lead}</Inline>
          </p>
        )}

        {rest && <Markdown>{rest}</Markdown>}

        {item.interviewTip && (
          <div
            className="rounded-lg border-l-2 pl-3.5 py-1"
            style={{ borderColor: "var(--accent)" }}
          >
            <div
              className="text-[10.5px] font-semibold uppercase tracking-wider mb-1"
              style={{ color: "var(--accent)" }}
            >
              In the interview
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-muted)" }}>
              <Inline>{item.interviewTip}</Inline>
            </p>
          </div>
        )}

        {item.concepts.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
              Concepts:
            </span>
            {item.concepts.map((c) => (
              <Link key={c.id} href={`/app/concepts?c=${c.slug}`} className="rounded-md">
                <Badge className="hover:brightness-125 transition-all">{c.name}</Badge>
              </Link>
            ))}
          </div>
        )}

        <Link
          href={moduleHref(item)}
          className="text-[12.5px] hover:underline w-fit"
          style={{ color: "var(--text-faint)" }}
        >
          Read the brief for {item.moduleTitle} →
        </Link>
      </div>
    </Card>
  );
}
