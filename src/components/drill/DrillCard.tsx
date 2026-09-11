"use client";

import Link from "next/link";
import { CodeBlock } from "@/components/CodeBlock";
import { Badge, Card, Inline, Markdown } from "@/components/ui";
import { AnswerFor } from "./Answers";
import { ERROR_HINTS } from "@/lib/executor";
import { levelShort, tint } from "@/lib/utils";
import { ITEM_KIND_META, type DrillItem, type Grade, type Response } from "@/types";

function moduleHref(item: DrillItem) {
  return `/app/path/${item.trackSlug}/${item.moduleSlug}`;
}

export function DrillCard({
  item,
  response,
  onChange,
  grade,
  onSubmit,
  revealed,
  showPrimer,
  bookmarked,
  onBookmark,
}: {
  item: DrillItem;
  response: Response;
  onChange: (r: Response) => void;
  grade: Grade | null;
  onSubmit: () => void;
  revealed: boolean;
  showPrimer: boolean;
  bookmarked: boolean;
  onBookmark: () => void;
}) {
  const kind = ITEM_KIND_META[item.kind];
  const primer =
    showPrimer && item.moduleKeyIdeas && item.moduleKeyIdeas.length > 0
      ? item.moduleKeyIdeas
      : null;

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

          <h3 className="text-[16px] font-semibold mt-1.5" style={{ color: "var(--text)" }}>
            {item.moduleTitle}
          </h3>

          <p className="text-[14px] leading-relaxed mt-1" style={{ color: "var(--text-muted)" }}>
            {item.moduleSummary}
          </p>

          <ul className="mt-3 flex flex-col gap-1.5">
            {primer.map((idea) => (
              <li key={idea} className="flex gap-2.5">
                <span
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
          <span className="text-[12px] truncate" style={{ color: "var(--text-faint)" }}>
            {item.moduleTitle}
          </span>
          <Link
            href={moduleHref(item)}
            className="text-[12px] hover:underline whitespace-nowrap"
            style={{ color: "var(--text-faint)" }}
          >
            Brief ↗
          </Link>

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
            className="text-[18px] font-medium leading-[1.55] prose-inline"
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
          revealed={revealed}
        />
      </div>

      {/* ─── Feedback ─── */}
      {grade && revealed && <Feedback item={item} grade={grade} />}
    </div>
  );
}

function Feedback({ item, grade }: { item: DrillItem; grade: Grade }) {
  const secondTry = grade.correct && grade.attempt === 2;

  const tone = grade.selfGraded
    ? "neutral"
    : secondTry
      ? "warn"
      : grade.correct
        ? "good"
        : grade.score > 0
          ? "warn"
          : "bad";

  const headline = grade.selfGraded
    ? "Logged"
    : secondTry
      ? "Got there on the second try"
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
              <a key={c.id} href={`/app/concepts?c=${c.slug}`}>
                <Badge className="hover:brightness-125 transition-all">{c.name}</Badge>
              </a>
            ))}
          </div>
        )}

        <Link
          href={moduleHref(item)}
          className="text-[12.5px] hover:underline"
          style={{ color: "var(--text-faint)" }}
        >
          Read the brief for {item.moduleTitle} →
        </Link>
      </div>
    </Card>
  );
}
