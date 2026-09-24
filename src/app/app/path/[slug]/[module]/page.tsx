"use client";

import Link from "next/link";
import { use } from "react";
import { useApi } from "@/components/useApi";
import {
  Badge,
  type BadgeTone,
  Card,
  EmptyState,
  ErrorState,
  Inline,
  LinkButton,
  Markdown,
  ProgressBar,
  Spinner,
} from "@/components/ui";
import {
  ITEM_KIND_META,
  LEVEL_META,
  type ItemKind,
  type Level,
  type ModuleProgress,
  type Track,
} from "@/types";
import { tint } from "@/lib/utils";

type ModuleItem = {
  id: string;
  kind: ItemKind;
  prompt: string;
  difficulty: 1 | 2 | 3;
  estSeconds: number;
  status: "unseen" | "due" | "learning" | "mastered";
  accuracy: number | null;
};

type ModuleDetail = {
  track: Track;
  module: {
    id: string;
    slug: string;
    title: string;
    level: Level;
    summary: string;
    brief: string;
    keyIdeas: string[];
  };
  progress: ModuleProgress | undefined;
  items: ModuleItem[];
  prev: ModuleProgress | null;
  next: ModuleProgress | null;
};

const STATUS_META: Record<
  ModuleItem["status"],
  { label: string; tone: BadgeTone }
> = {
  unseen: { label: "New", tone: "neutral" },
  learning: { label: "Learning", tone: "accent" },
  due: { label: "Due", tone: "warn" },
  mastered: { label: "Mastered", tone: "good" },
};

/**
 * One module, read end to end: the brief, the key ideas, and every
 * question in it with where the learner stands on each.
 */
export default function ModulePage({
  params,
}: {
  params: Promise<{ slug: string; module: string }>;
}) {
  const { slug, module: moduleSlug } = use(params);
  const { data, error, retry } = useApi<ModuleDetail>(
    `/api/path?module=${encodeURIComponent(moduleSlug)}`
  );

  if (error?.status === 404) {
    return (
      <Card padding="lg">
        <EmptyState
          as="h1"
          title="Module not found"
          body="That module doesn't exist, or it has moved."
          action={<LinkButton href={`/app/path/${slug}`}>Back to the track</LinkButton>}
        />
      </Card>
    );
  }

  if (error) {
    return (
      <ErrorState
        as="h1"
        title="Couldn’t load this module"
        message={error.message}
        onRetry={retry}
        extra={
          <LinkButton href={`/app/path/${slug}`} variant="secondary">
            Back to the track
          </LinkButton>
        }
      />
    );
  }

  if (!data) return <Spinner label="Loading the module…" />;

  const { track, module: mod, progress, items, prev, next } = data;
  const seen = progress?.seenItems ?? 0;
  const total = progress?.totalItems ?? items.length;
  const mastered = progress?.masteredItems ?? 0;
  const due = progress?.dueItems ?? 0;
  const mastery = progress?.mastery ?? 0;
  const drillHref = `/app/drill?mode=module&moduleId=${mod.id}&size=${Math.min(items.length, 12)}`;
  const drillLabel = due > 0 ? `Review ${due} due` : "Drill this module";

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Breadcrumb ─── */}
      <nav
        className="flex items-center gap-2 flex-wrap text-[13px]"
        style={{ color: "var(--text-faint)" }}
        aria-label="Breadcrumb"
      >
        <Link href="/app/path" className="hover:underline">
          Roadmap
        </Link>
        <span aria-hidden>›</span>
        <Link href={`/app/path/${slug}`} className="hover:underline" style={{ color: track.color }}>
          {track.name}
        </Link>
        <span aria-hidden>›</span>
        <span style={{ color: "var(--text-muted)" }} aria-current="page">
          {mod.title}
        </span>
      </nav>

      {/* ─── Header ─── */}
      <Card raised padding="lg" accent={track.color}>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge color={track.color}>
            {LEVEL_META[mod.level].short} · {LEVEL_META[mod.level].name}
          </Badge>
          {progress?.locked && <Badge>Ahead of your level</Badge>}
        </div>

        <h1
          className="text-2xl font-semibold tracking-tight mt-3"
          style={{ color: "var(--text)" }}
        >
          {mod.title}
        </h1>
        <p className="text-[15px] mt-2 leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>
          {mod.summary}
        </p>

        <div
          className="mt-5 pt-4 border-t flex flex-wrap items-center gap-x-5 gap-y-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="flex-1 min-w-[220px]">
            <ProgressBar value={mastery} color={track.color} />
            <p className="text-[13px] mt-2 tabular-nums" style={{ color: "var(--text-faint)" }}>
              {seen}/{total} seen · {mastered} mastered · {due} due
            </p>
          </div>

          <LinkButton href={drillHref} size="lg" className="flex-none w-full sm:w-auto">
            {drillLabel}
          </LinkButton>
        </div>
      </Card>

      {/* ─── Key ideas ─── */}
      {mod.keyIdeas.length > 0 && (
        <Card padding="lg">
          <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
            Key ideas
          </h2>
          <ol className="mt-4 flex flex-col gap-3.5">
            {mod.keyIdeas.map((idea, i) => (
              <li key={i} className="flex gap-3.5">
                <span
                  className="flex-none text-[14px] font-semibold tabular-nums mt-[2px]"
                  style={{ color: track.color }}
                >
                  {i + 1}.
                </span>
                <span
                  className="text-[15.5px] leading-[1.7]"
                  style={{ color: "var(--text)" }}
                >
                  <Inline>{idea}</Inline>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}

      {/* ─── The brief ─── */}
      <Card padding="lg">
        <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
          The brief
        </h2>
        <div className="mt-4" style={{ maxWidth: "72ch" }}>
          <Markdown className="prose-lg">{mod.brief}</Markdown>
        </div>
      </Card>

      {/* ─── Items ─── */}
      <Card padding="lg">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
            Questions in this module
          </h2>
          <span className="text-[13px] tabular-nums" style={{ color: "var(--text-faint)" }}>
            {items.length} question{items.length === 1 ? "" : "s"}
          </span>
        </div>

        {items.length === 0 ? (
          <p className="text-[15px] mt-4" style={{ color: "var(--text-muted)" }}>
            No questions have been written for this module yet.
          </p>
        ) : (
          <ul className="mt-4 flex flex-col">
            {items.map((item, i) => {
              const kind = ITEM_KIND_META[item.kind];
              const status = STATUS_META[item.status];
              return (
                <li
                  key={item.id}
                  className="flex items-start gap-3 sm:gap-4 py-3.5"
                  style={{
                    borderTop: i === 0 ? undefined : "1px solid var(--border)",
                  }}
                >
                  {/* Icon-only on phones so the prompt keeps its width. */}
                  <span
                    className="flex-none inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[12px] font-medium sm:min-w-[132px]"
                    style={{
                      background: "var(--bg-inset)",
                      color: "var(--text-muted)",
                    }}
                    title={kind.blurb}
                  >
                    <span aria-hidden>{kind.icon}</span>
                    <span className="sr-only sm:not-sr-only">{kind.label}</span>
                  </span>

                  <p
                    className="flex-1 min-w-0 text-[15px] leading-[1.55]"
                    style={{
                      color: "var(--text)",
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.prompt.replace(/`/g, "")}
                  </p>

                  <span
                    className="flex-none hidden sm:flex items-center gap-1 mt-1.5"
                    title={`Difficulty ${item.difficulty} of 3`}
                    role="img"
                    aria-label={`Difficulty ${item.difficulty} of 3`}
                  >
                    {[1, 2, 3].map((dot) => (
                      <span
                        key={dot}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{
                          background:
                            dot <= item.difficulty ? tint(track.color, 0.85) : "var(--bg-inset)",
                        }}
                      />
                    ))}
                  </span>

                  <span className="flex-none flex items-center gap-2">
                    {item.accuracy !== null && (
                      <span
                        className="text-[12.5px] tabular-nums"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {item.accuracy}%
                      </span>
                    )}
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      {/* ─── Prev / next ─── */}
      {(prev || next) && (
        <nav className="grid grid-cols-2 gap-3" aria-label="Other modules in this track">
          {prev ? (
            <Link href={`/app/path/${slug}/${prev.moduleSlug}`} className="block rounded-xl">
              <Card
                className="h-full transition-all duration-150 hover:-translate-y-0.5"
                style={{ cursor: "pointer" }}
              >
                <div className="text-[12px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  ← Previous
                </div>
                <div className="text-[15px] font-medium mt-1.5" style={{ color: "var(--text)" }}>
                  {prev.title}
                </div>
              </Card>
            </Link>
          ) : (
            <div />
          )}

          {next && (
            <Link href={`/app/path/${slug}/${next.moduleSlug}`} className="col-start-2 block rounded-xl">
              <Card
                className="h-full text-right transition-all duration-150 hover:-translate-y-0.5"
                style={{ cursor: "pointer" }}
              >
                <div className="text-[12px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                  Next →
                </div>
                <div className="text-[15px] font-medium mt-1.5" style={{ color: "var(--text)" }}>
                  {next.title}
                </div>
              </Card>
            </Link>
          )}
        </nav>
      )}

      <div className="flex justify-center pb-2">
        <LinkButton href={drillHref} size="lg">
          {drillLabel}
        </LinkButton>
      </div>
    </div>
  );
}
