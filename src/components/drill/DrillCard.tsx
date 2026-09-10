"use client";

import { CodeBlock } from "@/components/CodeBlock";
import { Badge, Card, Inline, Markdown } from "@/components/ui";
import { AnswerFor } from "./Answers";
import { ERROR_HINTS } from "@/lib/executor";
import { levelShort, tint } from "@/lib/utils";
import { ITEM_KIND_META, type DrillItem, type Grade, type Response } from "@/types";

export function DrillCard({
  item,
  response,
  onChange,
  grade,
  onSubmit,
  bookmarked,
  onBookmark,
}: {
  item: DrillItem;
  response: Response;
  onChange: (r: Response) => void;
  grade: Grade | null;
  onSubmit: () => void;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const kind = ITEM_KIND_META[item.kind];

  return (
    <div className="flex flex-col gap-4">
      {/* ─── Header ─── */}
      <Card padding="none" accent={item.trackColor}>
        <div
          className="flex items-center gap-2 px-4 py-2.5 border-b flex-wrap"
          style={{ borderColor: "var(--border)", background: tint(item.trackColor, 0.05) }}
        >
          <Badge color={item.trackColor}>{item.trackName}</Badge>
          <Badge>{levelShort(item.level)}</Badge>
          <span className="text-[12px] truncate" style={{ color: "var(--text-faint)" }}>
            {item.moduleTitle}
          </span>

          <div className="ml-auto flex items-center gap-2">
            {item.isReview && <Badge tone="warn">↻ Review</Badge>}
            <Badge>
              {kind.icon} {kind.label}
            </Badge>
            <button
              type="button"
              onClick={onBookmark}
              aria-label={bookmarked ? "Remove bookmark" : "Bookmark for later"}
              title={bookmarked ? "Bookmarked" : "Save for later"}
              className="text-[15px] leading-none px-1 transition-transform hover:scale-110"
              style={{ color: bookmarked ? "var(--warn)" : "var(--text-faint)" }}
            >
              {bookmarked ? "★" : "☆"}
            </button>
          </div>
        </div>

        {/* ─── Prompt ─── */}
        <div className="px-5 py-4">
          <h2
            className="text-[16.5px] font-medium leading-[1.6] prose-inline"
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
          onSubmit={onSubmit}
        />
      </div>

      {/* ─── Feedback ─── */}
      {grade && <Feedback item={item} grade={grade} />}
    </div>
  );
}

function Feedback({ item, grade }: { item: DrillItem; grade: Grade }) {
  const tone = grade.selfGraded
    ? "neutral"
    : grade.correct
      ? "good"
      : grade.score > 0
        ? "warn"
        : "bad";

  const headline = grade.selfGraded
    ? "Logged"
    : grade.correct
      ? "Correct"
      : grade.score > 0
        ? `Partly right — ${Math.round(grade.score * 100)}%`
        : "Not quite";

  const colors: Record<string, string> = {
    good: "var(--good)",
    warn: "var(--warn)",
    bad: "var(--bad)",
    neutral: "var(--accent)",
  };

  const hint = grade.errorType ? ERROR_HINTS[grade.errorType] : null;

  return (
    <Card padding="none" className="animate-rise overflow-hidden">
      <div
        className="flex items-center gap-2.5 px-5 py-3 border-b"
        style={{
          borderColor: "var(--border)",
          background: `color-mix(in srgb, ${colors[tone]} 9%, transparent)`,
        }}
      >
        <span
          className="h-5 w-5 rounded-full flex items-center justify-center text-[11px] font-bold flex-none"
          style={{ background: colors[tone], color: "#0a0d14" }}
        >
          {grade.correct || grade.selfGraded ? "✓" : "!"}
        </span>
        <span className="text-[14px] font-semibold" style={{ color: colors[tone] }}>
          {headline}
        </span>
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

        <Markdown>{item.explanation}</Markdown>

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
              <a key={c.id} href={`/app/concepts?c=${c.slug}`}>
                <Badge className="hover:brightness-125 transition-all">{c.name}</Badge>
              </a>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
