"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { Badge, Button, Card, EmptyState, ProgressBar, Spinner } from "@/components/ui";
import { LevelPips } from "../page";
import { LEVEL_META, LEVELS, type ModuleProgress, type Track, type TrackProgress } from "@/types";
import { masteryLabel, tint } from "@/lib/utils";

type TrackDetail = {
  track: Track;
  modules: ModuleProgress[];
  progress?: TrackProgress;
};

export default function TrackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const [data, setData] = useState<TrackDetail | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    fetch(`/api/path?track=${slug}`)
      .then((r) => r.json())
      .then((json) => (json.success ? setData(json.data) : setNotFound(true)))
      .catch(() => setNotFound(true));
  }, [slug]);

  if (notFound) {
    return (
      <Card padding="lg">
        <EmptyState
          title="Track not found"
          body="That track doesn't exist."
          action={
            <Link href="/app/path">
              <Button>Back to roadmap</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  if (!data) return <Spinner label="Loading track…" />;

  const { track, modules, progress } = data;
  const byLevel = LEVELS.map((level) => ({
    level,
    modules: modules.filter((m) => m.level === level),
  })).filter((group) => group.modules.length > 0);

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/app/path"
        className="text-[12.5px] hover:underline w-fit"
        style={{ color: "var(--text-faint)" }}
      >
        ← Roadmap
      </Link>

      {/* ─── Header ─── */}
      <Card raised padding="lg" accent={track.color}>
        <div className="flex items-start gap-4">
          <span
            className="h-12 w-12 rounded-xl flex items-center justify-center text-[15px] font-bold flex-none"
            style={{ background: tint(track.color, 0.16), color: track.color }}
          >
            {track.icon}
          </span>

          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
              {track.name}
            </h1>
            <p className="text-[13.5px] mt-0.5" style={{ color: track.color }}>
              {track.tagline}
            </p>
            <p className="text-[13.5px] mt-2.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {track.description}
            </p>
          </div>
        </div>

        {progress && (
          <div
            className="mt-5 pt-4 border-t flex flex-wrap items-center gap-x-6 gap-y-3"
            style={{ borderColor: "var(--border)" }}
          >
            <div>
              <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                Level
              </div>
              <div className="flex items-center gap-2 mt-1">
                <LevelPips current={progress.currentLevel} color={track.color} />
                <span className="text-[12.5px]" style={{ color: "var(--text)" }}>
                  {LEVEL_META[progress.currentLevel].name}
                </span>
              </div>
            </div>

            <Metric label="Mastery" value={`${progress.mastery}%`} sub={masteryLabel(progress.mastery)} />
            <Metric label="Seen" value={`${progress.seenItems}/${progress.totalItems}`} />
            <Metric label="Accuracy" value={progress.seenItems ? `${progress.accuracy}%` : "—"} />

            <Link
              href={`/app/drill?mode=track&trackId=${track.id}&size=12`}
              className="ml-auto"
            >
              <Button>
                {progress.dueItems > 0 ? `Review ${progress.dueItems} due` : "Drill this track"}
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* ─── Modules by level ─── */}
      {byLevel.map((group) => (
        <section key={group.level}>
          <div className="flex items-baseline gap-2.5 mb-3">
            <span
              className="text-[11px] font-bold px-1.5 py-0.5 rounded"
              style={{ background: tint(track.color, 0.16), color: track.color }}
            >
              {LEVEL_META[group.level].short}
            </span>
            <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
              {LEVEL_META[group.level].name}
            </h2>
            <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
              {LEVEL_META[group.level].blurb}
            </span>
          </div>

          <div className="flex flex-col gap-2.5">
            {group.modules.map((module) => (
              <Link key={module.moduleId} href={`/app/path/${slug}/${module.moduleSlug}`}>
                <Card
                  className="transition-all duration-150 hover:-translate-y-0.5"
                  style={{ cursor: "pointer" }}
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[16px] font-medium" style={{ color: "var(--text)" }}>
                      {module.title}
                    </span>
                    {module.dueItems > 0 && <Badge tone="warn">{module.dueItems} due</Badge>}
                    {module.locked && <Badge>Ahead of your level</Badge>}
                  </div>

                  <p className="text-[14px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {module.summary}
                  </p>

                  <div className="flex items-center gap-2.5 mt-3">
                    <ProgressBar value={module.mastery} color={track.color} height={4} />
                    <span
                      className="text-[12px] tabular-nums flex-none"
                      style={{ color: "var(--text-faint)" }}
                    >
                      {module.seenItems}/{module.totalItems}
                    </span>
                  </div>

                  <p className="text-[12px] mt-2" style={{ color: "var(--text-faint)" }}>
                    {module.keyIdeas.length} key idea{module.keyIdeas.length === 1 ? "" : "s"} ·{" "}
                    {module.totalItems} question{module.totalItems === 1 ? "" : "s"}
                  </p>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-[10.5px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
        {label}
      </div>
      <div className="text-[15px] font-semibold mt-1 tabular-nums" style={{ color: "var(--text)" }}>
        {value}
        {sub && (
          <span className="ml-1.5 text-[12px] font-normal" style={{ color: "var(--text-muted)" }}>
            {sub}
          </span>
        )}
      </div>
    </div>
  );
}
