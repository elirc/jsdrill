"use client";

import Link from "next/link";
import { LevelPips } from "@/components/LevelPips";
import { useApi } from "@/components/useApi";
import { Badge, Card, ErrorState, ProgressBar, Spinner } from "@/components/ui";
import { LEVEL_META, LEVELS, type TrackProgress } from "@/types";
import { tint } from "@/lib/utils";

export default function RoadmapPage() {
  const { data, error, retry } = useApi<{ tracks: TrackProgress[] }>("/api/path");

  if (error) {
    return <ErrorState as="h1" title="Couldn’t load the roadmap" message={error.message} onRetry={retry} />;
  }
  if (!data) return <Spinner label="Loading the roadmap…" />;
  const { tracks } = data;

  return (
    <div className="flex flex-col gap-7">
      <header>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          The roadmap
        </h1>
        <p className="text-[13.5px] mt-1.5 max-w-2xl" style={{ color: "var(--text-muted)" }}>
          Ten tracks, four levels each. Levels unlock as you demonstrate retention, but nothing is
          hidden — you can drill any module you want at any time.
        </p>
      </header>

      {/* ─── Level legend ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {LEVELS.map((level) => (
          <Card key={level} padding="sm">
            <div className="flex items-baseline gap-2">
              <span
                className="text-[11px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                {LEVEL_META[level].short}
              </span>
              <span className="text-[13.5px] font-medium" style={{ color: "var(--text)" }}>
                {LEVEL_META[level].name}
              </span>
            </div>
            <p className="text-[12px] mt-1.5 leading-relaxed" style={{ color: "var(--text-muted)" }}>
              {LEVEL_META[level].blurb}
            </p>
          </Card>
        ))}
      </div>

      {/* ─── Tracks ─── */}
      <div className="flex flex-col gap-3">
        {tracks.map((track) => (
          <Link key={track.trackId} href={`/app/path/${track.trackSlug}`} className="block rounded-xl">
            <Card
              accent={track.trackColor}
              className="transition-all duration-150 hover:-translate-y-0.5"
              style={{ cursor: "pointer" }}
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <span
                  aria-hidden
                  className="h-11 w-11 rounded-xl flex items-center justify-center text-[14px] font-bold flex-none"
                  style={{ background: tint(track.trackColor, 0.16), color: track.trackColor }}
                >
                  {track.trackIcon}
                </span>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-[15px] font-medium" style={{ color: "var(--text)" }}>
                      {track.trackName}
                    </h2>
                    {track.dueItems > 0 && <Badge tone="warn">{track.dueItems} due</Badge>}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                    <LevelPips current={track.currentLevel} color={track.trackColor} />
                    <span className="text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                      {track.seenItems}/{track.totalItems} seen · {track.masteredItems} mastered
                    </span>
                  </div>
                </div>

                <div className="flex-none w-16 sm:w-24 text-right">
                  <div
                    className="text-[17px] font-semibold tabular-nums"
                    style={{ color: track.mastery > 0 ? track.trackColor : "var(--text-faint)" }}
                  >
                    {track.mastery}%<span className="sr-only"> mastery</span>
                  </div>
                  <ProgressBar value={track.mastery} color={track.trackColor} height={4} className="mt-1.5" />
                </div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
