"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DrillCard } from "@/components/drill/DrillCard";
import { Badge, Button, Card, EmptyState, ProgressBar, Spinner } from "@/components/ui";
import { emptyResponse, grade as gradeLocally, isAnswered } from "@/lib/grader";
import { formatDuration } from "@/lib/utils";
import type { DrillItem, Grade, Response, SessionSummary } from "@/types";

export default function DrillPage() {
  return (
    <Suspense fallback={<Spinner label="Building your session…" />}>
      <Drill />
    </Suspense>
  );
}

type Record = { item: DrillItem; grade: Grade; seconds: number };

function Drill() {
  const params = useSearchParams();
  const router = useRouter();

  const [session, setSession] = useState<SessionSummary | null>(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [history, setHistory] = useState<Record[]>([]);
  const [nextReview, setNextReview] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState<{ level: number; name: string } | null>(null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);

  // Seeded in the load effect — reading the clock during render is impure.
  const startedAt = useRef(0);
  const sessionStart = useRef(0);

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

  // ─── Load ───
  useEffect(() => {
    let alive = true;
    fetch(`/api/session?${query}`)
      .then((r) => r.json())
      .then((json) => {
        if (!alive) return;
        if (json.success && json.data.items.length > 0) {
          setSession(json.data);
          setResponse(emptyResponse(json.data.items[0].kind));
          startedAt.current = Date.now();
          sessionStart.current = Date.now();
        } else {
          setFailed(true);
        }
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [query]);

  const item = session?.items[index];
  const isLast = session ? index === session.items.length - 1 : false;
  const done = session ? index >= session.items.length : false;

  // ─── Submit ───
  const submit = useCallback(async () => {
    if (!item || !response || grade) return;
    if (!isAnswered(item, response)) return;

    const seconds = Math.round((Date.now() - startedAt.current) / 1000);

    // Grade locally for instant feedback; the server re-grades and
    // its verdict is what gets recorded.
    const local = gradeLocally(item, response);
    setGrade(local);
    setHistory((h) => [...h, { item, grade: local, seconds }]);

    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: item.id,
          response,
          timeSpent: seconds,
          mode: params.get("mode") ?? "mixed",
        }),
      });
      const json = await res.json();
      if (json.success) {
        setGrade(json.data.grade);
        setNextReview(json.data.nextReview);
        setUnlocked(json.data.unlocked);
        setHistory((h) =>
          h.map((r, i) => (i === h.length - 1 ? { ...r, grade: json.data.grade } : r))
        );
      }
    } catch {
      // Offline or the API is down — the local grade still stands so
      // the learner isn't blocked; it just isn't scheduled.
    }
  }, [item, response, grade, params]);

  // ─── Advance ───
  const next = useCallback(() => {
    if (!session) return;
    const target = index + 1;
    if (target >= session.items.length) {
      setSessionSeconds(Math.round((Date.now() - sessionStart.current) / 1000));
    }
    setIndex(target);
    setGrade(null);
    setNextReview(null);
    setUnlocked(null);
    startedAt.current = Date.now();
    setResponse(target < session.items.length ? emptyResponse(session.items[target].kind) : null);
  }, [index, session]);

  // ─── Keyboard ───
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      const typing = target && /^(INPUT|TEXTAREA)$/.test(target.tagName);

      if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !typing)) {
        e.preventDefault();
        if (grade) next();
        else submit();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [grade, next, submit]);

  async function toggleBookmark(itemId: string) {
    setBookmarks((set) => {
      const copy = new Set(set);
      if (copy.has(itemId)) copy.delete(itemId);
      else copy.add(itemId);
      return copy;
    });
    await fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    }).catch(() => {});
  }

  // ─── States ───

  if (failed) {
    return (
      <Card padding="lg">
        <EmptyState
          icon="◌"
          title="No items to drill"
          body="Nothing matched that filter. Try a mixed session, or seed the curriculum with `npm run db:seed`."
          action={
            <Link href="/app">
              <Button>Back to Today</Button>
            </Link>
          }
        />
      </Card>
    );
  }

  if (!session || !response) return <Spinner label="Building your session…" />;

  if (done) {
    return (
      <SessionSummaryView
        history={history}
        seconds={sessionSeconds}
        onAgain={() => router.push(`/app/drill?${query}&r=${Date.now()}`)}
      />
    );
  }

  if (!item) return <Spinner />;

  const answered = isAnswered(item, response);
  const canSubmit =
    item.kind === "short"
      ? response.kind === "short" && response.selfRating !== null
      : answered;

  return (
    <div className="flex flex-col gap-5">
      {/* ─── Progress ─── */}
      <div>
        <div className="flex items-center justify-between mb-2 text-[12px]">
          <span style={{ color: "var(--text-muted)" }}>
            {index + 1} of {session.items.length}
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
        <ProgressBar value={((index + (grade ? 1 : 0)) / session.items.length) * 100} height={4} />
      </div>

      <DrillCard
        key={item.id}
        item={item}
        response={response}
        onChange={setResponse}
        grade={grade}
        onSubmit={submit}
        bookmarked={bookmarks.has(item.id)}
        onBookmark={() => toggleBookmark(item.id)}
      />

      {/* ─── Actions ─── */}
      <div
        className="sticky bottom-0 -mx-4 px-4 py-3 border-t backdrop-blur-xl flex items-center gap-3"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        }}
      >
        {unlocked && (
          <Badge tone="good" className="animate-pop">
            ⬆ {unlocked.name} unlocked
          </Badge>
        )}
        {grade && nextReview && (
          <span className="text-[12px]" style={{ color: "var(--text-faint)" }}>
            Next review in {nextReview}
          </span>
        )}

        <div className="ml-auto flex items-center gap-2.5">
          <kbd
            className="hidden sm:inline-block text-[10.5px] px-1.5 py-0.5 rounded border"
            style={{ borderColor: "var(--border)", color: "var(--text-faint)" }}
          >
            ⏎
          </kbd>
          {!grade ? (
            <Button onClick={submit} disabled={!canSubmit}>
              {item.kind === "short" ? "Log & continue" : "Check answer"}
            </Button>
          ) : (
            <Button onClick={next} variant={isLast ? "success" : "primary"}>
              {isLast ? "Finish" : "Next"} →
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function SessionSummaryView({
  history,
  seconds,
  onAgain,
}: {
  history: Record[];
  seconds: number;
  onAgain: () => void;
}) {
  const correct = history.filter((h) => h.grade.correct).length;
  const accuracy = history.length ? Math.round((correct / history.length) * 100) : 0;
  const missed = history.filter((h) => !h.grade.correct);

  const byTrack = new Map<string, { correct: number; total: number; color: string }>();
  for (const record of history) {
    const entry = byTrack.get(record.item.trackName) ?? {
      correct: 0,
      total: 0,
      color: record.item.trackColor,
    };
    entry.total++;
    if (record.grade.correct) entry.correct++;
    byTrack.set(record.item.trackName, entry);
  }

  return (
    <div className="flex flex-col gap-5 animate-rise">
      <Card raised padding="lg" className="text-center">
        <div className="text-3xl mb-3">{accuracy >= 80 ? "◉" : accuracy >= 50 ? "◎" : "○"}</div>
        <h1 className="text-xl font-semibold" style={{ color: "var(--text)" }}>
          Session complete
        </h1>
        <p className="text-[14px] mt-1.5" style={{ color: "var(--text-muted)" }}>
          {correct} of {history.length} correct · {accuracy}% · {formatDuration(seconds)}
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={onAgain}>Another session</Button>
          <Link href="/app">
            <Button variant="secondary">Back to Today</Button>
          </Link>
        </div>
      </Card>

      {byTrack.size > 1 && (
        <Card>
          <h2 className="text-[14px] font-semibold mb-3.5" style={{ color: "var(--text)" }}>
            By track
          </h2>
          <div className="flex flex-col gap-2.5">
            {[...byTrack.entries()]
              .sort((a, b) => b[1].total - a[1].total)
              .map(([name, entry]) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-[13px] w-32 flex-none truncate" style={{ color: "var(--text-muted)" }}>
                    {name}
                  </span>
                  <ProgressBar
                    value={(entry.correct / entry.total) * 100}
                    color={entry.color}
                    height={5}
                  />
                  <span
                    className="text-[12px] tabular-nums flex-none w-10 text-right"
                    style={{ color: "var(--text-faint)" }}
                  >
                    {entry.correct}/{entry.total}
                  </span>
                </div>
              ))}
          </div>
        </Card>
      )}

      {missed.length > 0 && (
        <Card>
          <h2 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            Worth another look
          </h2>
          <p className="text-[12.5px] mb-3.5" style={{ color: "var(--text-faint)" }}>
            These are scheduled to come back soon.
          </p>
          <div className="flex flex-col gap-2">
            {missed.map((record, i) => (
              <div
                key={i}
                className="rounded-lg border px-3.5 py-2.5"
                style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={record.item.trackColor}>{record.item.trackName}</Badge>
                  <span className="text-[11px]" style={{ color: "var(--text-faint)" }}>
                    {record.item.moduleTitle}
                  </span>
                </div>
                <p className="text-[13px] leading-snug" style={{ color: "var(--text-muted)" }}>
                  {record.item.prompt.replace(/`/g, "")}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
