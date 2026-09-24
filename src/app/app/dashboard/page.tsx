"use client";

import Link from "next/link";
import { useApi } from "@/components/useApi";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  ProgressBar,
  Spinner,
  Stat,
} from "@/components/ui";
import { levelLabel, relativeDate, tint } from "@/lib/utils";
import type { ConceptStrength, DashboardData, DayActivity } from "@/types";

// The server keys days as UTC calendar dates ("YYYY-MM-DD", from
// toISOString). `new Date("2026-09-23")` is UTC midnight, so local
// getters (getDay/getDate) are a day early anywhere west of Greenwich.
// Read and format them in UTC to keep the label on the right day.
const dayLabel = new Intl.DateTimeFormat(undefined, {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const utcDay = (key: string) => new Date(`${key}T00:00:00Z`);

export default function DashboardPage() {
  const { data, error, retry } = useApi<DashboardData>("/api/dashboard");

  if (error) {
    return <ErrorState as="h1" title="Couldn’t load your progress" message={error.message} onRetry={retry} />;
  }
  if (!data) return <Spinner label="Crunching your numbers…" />;

  const { stats } = data;

  if (stats.totalAttempts === 0) {
    return (
      <Card padding="lg">
        <EmptyState
          as="h1"
          icon="◔"
          title="No data yet"
          body="Finish a session and this fills up with mastery by track, weak concepts, your review forecast and an activity map."
          action={<LinkButton href="/app">Start a session</LinkButton>}
        />
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
        Progress
      </h1>

      {/* ─── Headline stats ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Stat
          label="Coverage"
          value={`${stats.itemsSeen}/${stats.totalItems}`}
          sub={`${Math.round((stats.itemsSeen / Math.max(1, stats.totalItems)) * 100)}% of the bank`}
        />
        <Stat
          label="Accuracy"
          value={`${stats.accuracy}%`}
          sub={`${stats.correctAttempts} of ${stats.totalAttempts}`}
          color={stats.accuracy >= 75 ? "var(--good)" : stats.accuracy >= 50 ? "var(--warn)" : "var(--bad)"}
        />
        <Stat label="Mastered" value={stats.itemsMastered} sub="retained 3+ weeks" color="var(--good)" />
        <Stat
          label="Streak"
          value={stats.streak > 0 ? `${stats.streak}d` : "—"}
          sub={`${stats.minutesDrilled} min total`}
          color={stats.streak > 0 ? "var(--warn)" : undefined}
        />
      </div>

      {/* ─── Mastery by track ─── */}
      <Card>
        <h2 className="text-[14px] font-semibold mb-4" style={{ color: "var(--text)" }}>
          Mastery by track
        </h2>
        <div className="flex flex-col gap-3">
          {data.trackProgress.map((track) => (
            <Link
              key={track.trackId}
              href={`/app/path/${track.trackSlug}`}
              className="flex items-center gap-3 group rounded-md"
            >
              <span
                aria-hidden
                className="h-7 w-7 rounded-md flex items-center justify-center text-[10.5px] font-bold flex-none"
                style={{ background: tint(track.trackColor, 0.16), color: track.trackColor }}
              >
                {track.trackIcon}
              </span>
              <span
                className="text-[13px] w-32 sm:w-40 flex-none truncate group-hover:underline"
                style={{ color: "var(--text)" }}
              >
                {track.trackName}
              </span>
              <ProgressBar value={track.mastery} color={track.trackColor} height={7} />
              <span
                className="text-[12px] tabular-nums flex-none w-9 text-right"
                style={{ color: "var(--text-faint)" }}
              >
                {track.mastery}%<span className="sr-only"> mastery</span>
              </span>
              <span
                className="hidden sm:block text-[11px] flex-none w-28 text-right"
                style={{ color: "var(--text-faint)" }}
              >
                {levelLabel(track.currentLevel)}
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* ─── Weak spots ─── */}
        <Card>
          <h2 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            Weakest concepts
          </h2>
          <p className="text-[12px] mt-0.5 mb-4" style={{ color: "var(--text-faint)" }}>
            Lowest accuracy and retention among what you&apos;ve seen.
          </p>

          {data.weakest.length === 0 ? (
            <p className="text-[13px] py-4" style={{ color: "var(--text-muted)" }}>
              Nothing weak yet — keep going and this will fill in.
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {data.weakest.map((concept) => (
                <ConceptRow key={concept.conceptId} concept={concept} />
              ))}
              <LinkButton
                href="/app/drill?mode=weak&size=10"
                size="sm"
                variant="secondary"
                className="w-full mt-2"
              >
                Drill weak spots
              </LinkButton>
            </div>
          )}
        </Card>

        {/* ─── Review forecast ─── */}
        <Card>
          <h2 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            Review forecast
          </h2>
          <p className="text-[12px] mt-0.5 mb-4" style={{ color: "var(--text-faint)" }}>
            What the scheduler has queued over the next two weeks.
          </p>
          <Forecast forecast={data.forecast} />
        </Card>
      </div>

      {/* ─── Activity ─── */}
      <Card>
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="text-[14px] font-semibold" style={{ color: "var(--text)" }}>
            Activity
          </h2>
          <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
            last 120 days
          </span>
        </div>
        <HeatMap activity={data.activity} />
      </Card>

      {/* ─── Recent misses ─── */}
      {data.recentMisses.length > 0 && (
        <Card>
          <h2 className="text-[14px] font-semibold mb-3.5" style={{ color: "var(--text)" }}>
            Recently missed
          </h2>
          <div className="flex flex-col gap-2">
            {data.recentMisses.map((miss, i) => (
              <div
                key={`${miss.itemId}-${i}`}
                className="rounded-lg border px-3.5 py-2.5"
                style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={miss.trackColor}>{miss.trackName}</Badge>
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {relativeDate(miss.at)}
                  </span>
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {miss.prompt.replace(/`/g, "")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

const STRENGTH: Record<ConceptStrength["strength"], { color: string; label: string }> = {
  none: { color: "var(--text-faint)", label: "not started" },
  shaky: { color: "var(--bad)", label: "shaky" },
  learning: { color: "var(--warn)", label: "learning" },
  strong: { color: "var(--good)", label: "strong" },
};

function ConceptRow({ concept }: { concept: ConceptStrength }) {
  const strength = STRENGTH[concept.strength];
  return (
    <Link
      href={`/app/concepts?c=${concept.conceptSlug}`}
      className="flex items-center gap-3 py-1 group rounded-md"
    >
      <span
        aria-hidden
        title={strength.label}
        className="h-1.5 w-1.5 rounded-full flex-none"
        style={{ background: strength.color }}
      />
      <span
        className="text-[13px] flex-1 min-w-0 truncate group-hover:underline"
        style={{ color: "var(--text)" }}
      >
        {concept.conceptName}
        <span className="sr-only"> ({strength.label})</span>
      </span>
      <span className="text-[11.5px] flex-none tabular-nums" style={{ color: "var(--text-faint)" }}>
        {concept.accuracy}% · {concept.seenItems}/{concept.totalItems}
      </span>
    </Link>
  );
}

function Forecast({ forecast }: { forecast: { date: string; count: number }[] }) {
  const max = Math.max(1, ...forecast.map((f) => f.count));
  const total = forecast.reduce((n, f) => n + f.count, 0);
  const busiest = forecast.reduce((a, b) => (b.count > a.count ? b : a), forecast[0]);

  return (
    <div
      className="flex items-end gap-1.5 h-28"
      role="img"
      aria-label={
        total === 0
          ? "Nothing scheduled in the next two weeks."
          : `${total} reviews over the next two weeks; ${forecast[0]?.count ?? 0} due today; busiest day ${dayLabel.format(utcDay(busiest.date))} with ${busiest.count}.`
      }
    >
      {forecast.map((day, i) => {
        const height = day.count === 0 ? 2 : Math.max(6, (day.count / max) * 100);
        return (
          <div key={day.date} className="flex-1 flex flex-col items-center gap-1.5 group">
            <div className="flex-1 w-full flex items-end">
              <div
                className="w-full rounded-t transition-all duration-500"
                style={{
                  height: `${height}%`,
                  background: i === 0 ? "var(--warn)" : "var(--accent)",
                  opacity: day.count === 0 ? 0.25 : 1,
                }}
                title={`${day.count} due ${i === 0 ? "today" : `on ${dayLabel.format(utcDay(day.date))}`}`}
              />
            </div>
            <span className="text-[9.5px] tabular-nums" style={{ color: "var(--text-faint)" }}>
              {i === 0 ? "today" : i % 2 === 0 ? utcDay(day.date).getUTCDate() : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function HeatMap({ activity }: { activity: DayActivity[] }) {
  const max = Math.max(1, ...activity.map((d) => d.count));

  // Pad so the first column starts on a Sunday. The server always
  // sends a full 120-day window, so activity[0] is present.
  const firstDate = activity[0]?.date;
  const firstDay = firstDate ? utcDay(firstDate).getUTCDay() : 0;
  const answered = activity.reduce((n, d) => n + d.count, 0);
  const activeDays = activity.filter((d) => d.count > 0).length;
  const cells: (DayActivity | null)[] = [...Array(firstDay).fill(null), ...activity];

  const weeks: (DayActivity | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <div>
      <div
        className="flex gap-[3px] overflow-x-auto pb-1"
        role="img"
        aria-label={`${answered} answers across ${activeDays} active days in the last ${activity.length} days.`}
      >
        {weeks.map((week, w) => (
          <div key={w} className="flex flex-col gap-[3px]">
            {week.map((day, d) => {
              if (!day) return <div key={d} className="h-[11px] w-[11px]" />;
              const intensity = day.count === 0 ? 0 : 0.2 + (day.count / max) * 0.8;
              return (
                <div
                  key={d}
                  className="h-[11px] w-[11px] rounded-[2.5px]"
                  title={`${dayLabel.format(utcDay(day.date))}: ${day.count} answered${day.count ? `, ${day.correct} correct` : ""}`}
                  style={{
                    background:
                      day.count === 0
                        ? "var(--bg-inset)"
                        : `color-mix(in srgb, var(--accent) ${Math.round(intensity * 100)}%, transparent)`,
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div
        className="flex items-center gap-2 mt-3 text-[11px]"
        style={{ color: "var(--text-faint)" }}
        aria-hidden
      >
        <span>Less</span>
        {[0, 0.3, 0.55, 0.8, 1].map((level) => (
          <span
            key={level}
            className="h-[11px] w-[11px] rounded-[2.5px]"
            style={{
              background:
                level === 0
                  ? "var(--bg-inset)"
                  : `color-mix(in srgb, var(--accent) ${Math.round(level * 100)}%, transparent)`,
            }}
          />
        ))}
        <span>More</span>
      </div>
    </div>
  );
}
