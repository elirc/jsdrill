"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Badge, Button, Card, ProgressBar, ProgressRing, Spinner } from "@/components/ui";
import { levelLabel, masteryLabel, tint } from "@/lib/utils";
import type { TrackProgress } from "@/types";

type PathData = {
  tracks: TrackProgress[];
  today: { answered: number; goal: number; due: number; streak: number; targetRole: string };
};

const SESSION_SIZES = [
  { size: 6, label: "Quick", detail: "~4 min" },
  { size: 12, label: "Standard", detail: "~9 min" },
  { size: 20, label: "Long", detail: "~15 min" },
];

export default function TodayPage() {
  const [data, setData] = useState<PathData | null>(null);
  const [size, setSize] = useState(12);

  useEffect(() => {
    fetch("/api/path")
      .then((r) => r.json())
      .then((json) => json.success && setData(json.data))
      .catch(console.error);
  }, []);

  if (!data) return <Spinner label="Loading your plan…" />;

  const { today, tracks } = data;
  const goalPct = today.goal > 0 ? (today.answered / today.goal) * 100 : 0;
  const goalMet = today.answered >= today.goal;

  const started = tracks.filter((t) => t.seenItems > 0);
  const totalItems = tracks.reduce((sum, t) => sum + t.totalItems, 0);
  const totalSeen = tracks.reduce((sum, t) => sum + t.seenItems, 0);

  // Suggest the least-covered started track, or the first untouched one.
  const suggestion =
    [...tracks].sort((a, b) => {
      if (a.dueItems !== b.dueItems) return b.dueItems - a.dueItems;
      return a.mastery - b.mastery;
    })[0] ?? null;

  return (
    <div className="flex flex-col gap-6">
      {/* ─── Hero: goal + start ─── */}
      <Card raised padding="lg">
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <ProgressRing value={goalPct} size={84} stroke={7} color={goalMet ? "var(--good)" : "var(--accent)"}>
            <div className="text-center leading-none">
              <div className="text-[19px] font-semibold tabular-nums" style={{ color: "var(--text)" }}>
                {today.answered}
              </div>
              <div className="text-[10px] mt-0.5" style={{ color: "var(--text-faint)" }}>
                / {today.goal}
              </div>
            </div>
          </ProgressRing>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
                {goalMet ? "Goal hit for today" : "Today's session"}
              </h1>
              {today.streak > 0 && (
                <Badge tone="warn">🔥 {today.streak} day streak</Badge>
              )}
            </div>
            <p className="text-[13.5px] mt-1.5" style={{ color: "var(--text-muted)" }}>
              {today.due > 0 ? (
                <>
                  <strong style={{ color: "var(--text)" }}>{today.due}</strong> item
                  {today.due === 1 ? "" : "s"} due for review
                  {goalMet ? "." : ", plus new material."}
                </>
              ) : totalSeen === 0 ? (
                "Nothing scheduled yet — start anywhere and the algorithm takes over."
              ) : (
                "No reviews due. Time to take on something new."
              )}
            </p>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t flex flex-col sm:flex-row gap-3 sm:items-center" style={{ borderColor: "var(--border)" }}>
          <div className="flex gap-1.5 p-1 rounded-lg flex-none" style={{ background: "var(--bg-inset)" }}>
            {SESSION_SIZES.map((option) => (
              <button
                key={option.size}
                type="button"
                onClick={() => setSize(option.size)}
                className="px-3 py-1.5 rounded-md text-[12.5px] font-medium transition-all"
                style={{
                  background: size === option.size ? "var(--surface)" : "transparent",
                  color: size === option.size ? "var(--text)" : "var(--text-faint)",
                }}
              >
                {option.label}
                <span className="ml-1.5 text-[11px] opacity-60">{option.detail}</span>
              </button>
            ))}
          </div>

          <Link href={`/app/drill?mode=mixed&size=${size}`} className="flex-1 sm:flex-none sm:ml-auto">
            <Button size="lg" className="w-full sm:w-auto">
              Start drilling →
            </Button>
          </Link>
        </div>
      </Card>

      {/* ─── Quick starts ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <QuickStart
          href={`/app/drill?mode=weak&size=10`}
          title="Weak spots"
          body="Only the items you've got wrong or nearly forgotten."
          icon="◎"
          disabled={totalSeen < 5}
          disabledNote="Drill a few items first"
        />
        <QuickStart
          href="/app/interview"
          title="Mock interview"
          body="15 rapid-fire questions across every track, then a scorecard."
          icon="◈"
        />
        <QuickStart
          href="/app/path"
          title="Pick a topic"
          body="Read a brief and drill one module at a time."
          icon="◱"
        />
      </div>

      {/* ─── Suggestion ─── */}
      {suggestion && suggestion.totalItems > 0 && (
        <Card accent={suggestion.trackColor}>
          <div className="flex items-center gap-3 flex-wrap">
            <span
              className="h-9 w-9 rounded-lg flex items-center justify-center text-[13px] font-bold flex-none"
              style={{ background: tint(suggestion.trackColor, 0.16), color: suggestion.trackColor }}
            >
              {suggestion.trackIcon}
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
                Suggested next
              </div>
              <div className="text-[14.5px] font-medium" style={{ color: "var(--text)" }}>
                {suggestion.trackName}
                <span className="font-normal ml-2 text-[13px]" style={{ color: "var(--text-muted)" }}>
                  {suggestion.dueItems > 0
                    ? `${suggestion.dueItems} due for review`
                    : `${levelLabel(suggestion.currentLevel)} · ${suggestion.totalItems - suggestion.seenItems} unseen`}
                </span>
              </div>
            </div>
            <Link href={`/app/drill?mode=track&trackId=${suggestion.trackId}&size=10`}>
              <Button variant="secondary" size="sm">
                Drill
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* ─── Track overview ─── */}
      <div>
        <div className="flex items-baseline justify-between mb-3">
          <h2 className="text-[15px] font-semibold" style={{ color: "var(--text)" }}>
            Your tracks
          </h2>
          <span className="text-[12.5px]" style={{ color: "var(--text-faint)" }}>
            {totalSeen} of {totalItems} items seen
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {tracks.map((track) => (
            <Link key={track.trackId} href={`/app/path/${track.trackSlug}`}>
              <Card
                className="h-full transition-all duration-150 hover:-translate-y-0.5"
                style={{ cursor: "pointer" }}
              >
                <div className="flex items-start gap-3">
                  <span
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-[12px] font-bold flex-none"
                    style={{ background: tint(track.trackColor, 0.16), color: track.trackColor }}
                  >
                    {track.trackIcon}
                  </span>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-medium truncate" style={{ color: "var(--text)" }}>
                        {track.trackName}
                      </span>
                      {track.dueItems > 0 && (
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-none"
                          style={{ background: "var(--warn-soft)", color: "var(--warn)" }}
                        >
                          {track.dueItems}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                      <span>{levelLabel(track.currentLevel)}</span>
                      <span>·</span>
                      <span>{masteryLabel(track.mastery)}</span>
                    </div>

                    <div className="mt-2.5 flex items-center gap-2.5">
                      <ProgressBar value={track.mastery} color={track.trackColor} height={5} />
                      <span
                        className="text-[11px] tabular-nums flex-none w-8 text-right"
                        style={{ color: "var(--text-faint)" }}
                      >
                        {track.mastery}%
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {started.length === 0 && (
        <p className="text-center text-[13px] pb-4" style={{ color: "var(--text-faint)" }}>
          Nothing seen yet — a Standard session touches several tracks so you can find your level.
        </p>
      )}
    </div>
  );
}

function QuickStart({
  href,
  title,
  body,
  icon,
  disabled,
  disabledNote,
}: {
  href: string;
  title: string;
  body: string;
  icon: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const content = (
    <Card
      className="h-full transition-all duration-150"
      style={{
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "default" : "pointer",
      }}
    >
      <div className="text-[17px] mb-2" style={{ color: "var(--accent)" }}>
        {icon}
      </div>
      <div className="text-[14px] font-medium" style={{ color: "var(--text)" }}>
        {title}
      </div>
      <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: "var(--text-muted)" }}>
        {disabled ? disabledNote : body}
      </p>
    </Card>
  );

  return disabled ? content : <Link href={href}>{content}</Link>;
}
