"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { DrillCard } from "@/components/drill/DrillCard";
import { ActionBar, KeyHint } from "@/components/drill/SessionChrome";
import { useDrillSession, type HistoryEntry } from "@/components/drill/useDrillSession";
import { useApi } from "@/components/useApi";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  LinkButton,
  ProgressBar,
  Spinner,
} from "@/components/ui";
import { formatDuration } from "@/lib/utils";

export default function DrillPage() {
  return (
    <Suspense fallback={<Spinner label="Building your session…" />}>
      <Drill />
    </Suspense>
  );
}

function Drill() {
  const params = useSearchParams();
  const mode = params.get("mode") ?? "mixed";

  const query = useMemo(() => {
    const search = new URLSearchParams();
    search.set("mode", params.get("mode") ?? "mixed");
    search.set("size", params.get("size") ?? "12");
    for (const key of ["trackId", "moduleId", "level"]) {
      const value = params.get(key);
      if (value) search.set(key, value);
    }
    return search.toString();
  }, [params]);

  const drill = useDrillSession({ query, mode, allowRetry: true });
  const bookmarks = useBookmarks();

  // ─── States ───

  if (drill.status === "error") {
    return (
      <ErrorState
        as="h1"
        title="Couldn’t build your session"
        message={drill.error ?? undefined}
        onRetry={drill.restart}
        extra={
          <LinkButton href="/app" variant="secondary">
            Back to Today
          </LinkButton>
        }
      />
    );
  }

  if (drill.status === "empty") {
    return (
      <Card padding="lg">
        <EmptyState
          as="h1"
          icon="◌"
          title="No items to drill"
          body="Nothing matched that filter. Try a mixed session, or seed the curriculum with `npm run db:seed`."
          action={<LinkButton href="/app">Back to Today</LinkButton>}
        />
      </Card>
    );
  }

  if (drill.status === "done") {
    return (
      <SessionSummaryView
        history={drill.history}
        seconds={drill.sessionSeconds}
        onAgain={drill.restart}
      />
    );
  }

  const { session, item, response } = drill;
  if (drill.status !== "active" || !session || !item || !response) {
    return <Spinner label="Building your session…" />;
  }

  // Key ideas are shown before the first question from a module the
  // learner has never answered — once per module per session. A module
  // session is always entered from a page that already lists the key
  // ideas (the module page, the cheat sheet), so it skips the primer.
  const firstFromModule = !session.items
    .slice(0, drill.index)
    .some((earlier) => earlier.moduleId === item.moduleId);
  const showPrimer = mode !== "module" && firstFromModule;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Drill session</h1>

      {/* ─── Progress ─── */}
      <div>
        <div className="flex items-center justify-between mb-2 text-[13px]">
          <span style={{ color: "var(--text-muted)" }}>
            {drill.index + 1} of {drill.total}
            {session.reviewCount > 0 && (
              <span style={{ color: "var(--text-faint)" }}>
                {" "}
                · {session.reviewCount} review{session.reviewCount === 1 ? "" : "s"}
              </span>
            )}
          </span>
          <Link href="/app" className="hover:underline" style={{ color: "var(--text-faint)" }}>
            End session
          </Link>
        </div>
        <ProgressBar
          value={((drill.index + (drill.revealed ? 1 : 0)) / drill.total) * 100}
          height={4}
          label="Session progress"
        />
      </div>

      <DrillCard
        key={item.id}
        item={item}
        response={response}
        onChange={drill.setResponse}
        grade={drill.grade}
        revealed={drill.revealed}
        showPrimer={showPrimer}
        bookmarked={bookmarks.has(item.id)}
        onBookmark={() => bookmarks.toggle(item.id)}
      />

      {/* ─── Retry nudge ─── */}
      {drill.retrying && (
        <div
          className="rounded-lg border px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-1 animate-rise"
          style={{ background: "var(--warn-soft)", borderColor: "var(--warn)" }}
        >
          <span className="text-[14px] font-medium" style={{ color: "var(--warn)" }}>
            Not quite — one more try.
          </span>
          <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
            Get it now and it counts as half credit.
          </span>
          <button
            type="button"
            onClick={drill.giveUp}
            className="ml-auto text-[13px] hover:underline whitespace-nowrap py-1"
            style={{ color: "var(--text-muted)" }}
          >
            Just show me
          </button>
        </div>
      )}

      {/* ─── Actions ─── */}
      <ActionBar>
        {drill.unlocked && (
          <Badge tone="good" className="animate-pop">
            ⬆ {drill.unlocked.name} unlocked
          </Badge>
        )}
        {drill.revealed && drill.nextReview && (
          <span className="text-[13px]" style={{ color: "var(--text-faint)" }}>
            Next review in {drill.nextReview}
          </span>
        )}

        <div className="ml-auto flex items-center gap-3">
          <KeyHint item={item} revealed={drill.revealed} />
          {!drill.revealed ? (
            <Button onClick={drill.submit} disabled={!drill.canSubmit}>
              {item.kind === "short" ? "Log & continue" : drill.retrying ? "Check again" : "Check answer"}
            </Button>
          ) : (
            <Button onClick={drill.next} variant={drill.isLast ? "success" : "primary"}>
              {drill.isLast ? "Finish" : "Next"} →
            </Button>
          )}
        </div>
      </ActionBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

/**
 * Bookmarks, loaded once for the session and toggled optimistically.
 * Local toggles are layered over the server's list, so nothing is
 * copied into state from an effect.
 */
function useBookmarks() {
  const { data } = useApi<{ id: string }[]>("/api/bookmarks");
  const [overrides, setOverrides] = useState<Map<string, boolean>>(new Map());

  const saved = useMemo(() => new Set((data ?? []).map((b) => b.id)), [data]);
  const has = (id: string) => overrides.get(id) ?? saved.has(id);

  function set(id: string, value: boolean) {
    setOverrides((m) => new Map(m).set(id, value));
  }

  function toggle(id: string) {
    const was = has(id);
    set(id, !was);
    fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: id }),
    })
      .then((r) => r.json())
      .then((json) => set(id, json?.success ? Boolean(json.data?.bookmarked) : was))
      .catch(() => set(id, was));
  }

  return { has, toggle };
}

// ─────────────────────────────────────────────────────────────

function SessionSummaryView({
  history,
  seconds,
  onAgain,
}: {
  history: HistoryEntry[];
  seconds: number;
  onAgain: () => void;
}) {
  const correct = history.filter((h) => h.grade.correct).length;
  const rescued = history.filter((h) => h.grade.correct && h.grade.attempt === 2).length;
  const accuracy = history.length ? Math.round((correct / history.length) * 100) : 0;
  const missed = history.filter((h) => !h.grade.correct);

  const byTrack = new Map<string, { correct: number; total: number; color: string }>();
  for (const entry of history) {
    const bucket = byTrack.get(entry.item.trackName) ?? {
      correct: 0,
      total: 0,
      color: entry.item.trackColor,
    };
    bucket.total++;
    if (entry.grade.correct) bucket.correct++;
    byTrack.set(entry.item.trackName, bucket);
  }

  return (
    <div className="flex flex-col gap-5 animate-rise">
      <Card raised padding="lg" className="text-center">
        <div className="text-3xl mb-3" aria-hidden>
          {accuracy >= 80 ? "◉" : accuracy >= 50 ? "◎" : "○"}
        </div>
        <h1 className="text-2xl font-semibold" style={{ color: "var(--text)" }}>
          Session complete
        </h1>
        <p className="text-[15px] mt-2" style={{ color: "var(--text-muted)" }}>
          {correct} of {history.length} correct · {accuracy}% · {formatDuration(seconds)}
          {rescued > 0 && (
            <span style={{ color: "var(--text-faint)" }}>
              {" "}
              · {rescued} on the second try
            </span>
          )}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Button onClick={onAgain}>Another session</Button>
          <LinkButton href="/app" variant="secondary">
            Back to Today
          </LinkButton>
        </div>
      </Card>

      {byTrack.size > 1 && (
        <Card>
          <h2 className="text-[15px] font-semibold mb-3.5" style={{ color: "var(--text)" }}>
            By track
          </h2>
          <div className="flex flex-col gap-2.5">
            {[...byTrack.entries()]
              .sort((a, b) => b[1].total - a[1].total)
              .map(([name, bucket]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[14px] w-28 sm:w-32 flex-none truncate" style={{ color: "var(--text-muted)" }}>
                    {name}
                  </span>
                  <ProgressBar value={(bucket.correct / bucket.total) * 100} color={bucket.color} height={5} />
                  <span
                    className="text-[13px] tabular-nums flex-none w-10 text-right"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {bucket.correct}/{bucket.total}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {missed.length > 0 && (
        <Card>
          <h2 className="text-[15px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            Worth another look
          </h2>
          <p className="text-[13.5px] mb-3.5" style={{ color: "var(--text-faint)" }}>
            These are scheduled to come back soon. Each links to its module brief.
          </p>
          <ul className="flex flex-col gap-2">
            {missed.map((entry) => (
              <li key={entry.item.id}>
                <Link
                  href={`/app/path/${entry.item.trackSlug}/${entry.item.moduleSlug}`}
                  className="rounded-lg border px-4 py-3 block hover:brightness-110 transition-all"
                  style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
                >
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <Badge color={entry.item.trackColor}>{entry.item.trackName}</Badge>
                    <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
                      {entry.item.moduleTitle}
                    </span>
                  </div>
                  <p className="text-[14px] leading-snug" style={{ color: "var(--text-muted)" }}>
                    {entry.item.prompt.replace(/`/g, "")}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
