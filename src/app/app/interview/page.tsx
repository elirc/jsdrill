"use client";

import { useCallback, useEffect, useState } from "react";
import { DrillCard } from "@/components/drill/DrillCard";
import { ActionBar, KeyHint } from "@/components/drill/SessionChrome";
import { useDrillSession, type HistoryEntry } from "@/components/drill/useDrillSession";
import { useApi } from "@/components/useApi";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  LinkButton,
  ProgressBar,
  Spinner,
  Stat,
} from "@/components/ui";
import { formatDuration, formatTime } from "@/lib/utils";
import type { InterviewScore } from "@/types";

type Phase = "setup" | "running" | "scored";
type PastRun = { score: InterviewScore; createdAt: string };

const LENGTHS = [
  { size: 10, label: "Screen", detail: "10 questions" },
  { size: 15, label: "Standard", detail: "15 questions" },
  { size: 25, label: "Full loop", detail: "25 questions" },
];

function scoreRun(answers: HistoryEntry[], seconds: number): InterviewScore {
  const correct = answers.filter((a) => a.grade.correct).length;
  const accuracy = answers.length ? Math.round((correct / answers.length) * 100) : 0;

  const trackMap = new Map<string, { trackColor: string; correct: number; total: number }>();
  for (const answer of answers) {
    const entry = trackMap.get(answer.item.trackName) ?? {
      trackColor: answer.item.trackColor,
      correct: 0,
      total: 0,
    };
    entry.total++;
    if (answer.grade.correct) entry.correct++;
    trackMap.set(answer.item.trackName, entry);
  }

  const byTrack = [...trackMap.entries()]
    .map(([trackName, entry]) => ({ trackName, ...entry }))
    .sort((a, b) => a.correct / a.total - b.correct / b.total);

  const weakSpots = [
    ...new Set(
      answers.filter((a) => !a.grade.correct).flatMap((a) => a.item.concepts.map((c) => c.name))
    ),
  ].slice(0, 8);

  const verdict =
    accuracy >= 85
      ? "Interview-ready. You'd handle a mid-level screen comfortably."
      : accuracy >= 70
        ? "Solid. Tighten the weak tracks below and you're there."
        : accuracy >= 50
          ? "Mixed. The fundamentals are landing; the applied questions need work."
          : "Early days. Work through the roadmap level by level rather than drilling at random.";

  return { total: answers.length, correct, accuracy, seconds, byTrack, verdict, weakSpots };
}

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(15);
  const [timed, setTimed] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState<InterviewScore | null>(null);
  const [saveFailed, setSaveFailed] = useState(false);

  // Past runs: loaded once, and again after a run is saved — not on
  // every phase change.
  const past = useApi<PastRun[]>("/api/interview");
  const reloadPast = past.retry;

  const saveRun = useCallback(
    (result: InterviewScore) => {
      setSaveFailed(false);
      fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      })
        .then((res) => {
          if (!res.ok) throw new Error(String(res.status));
          reloadPast();
        })
        .catch(() => setSaveFailed(true));
    },
    [reloadPast]
  );

  const onComplete = useCallback(
    (answers: HistoryEntry[], seconds: number) => {
      const result = scoreRun(answers, seconds);
      setScore(result);
      setPhase("scored");
      saveRun(result);
    },
    [saveRun]
  );

  const drill = useDrillSession({
    query: phase === "running" ? `mode=interview&size=${size}` : null,
    mode: "interview",
    allowRetry: false,
    adoptServerGrade: false,
    onComplete,
  });
  const { getElapsed, restart } = drill;

  // Session clock — only ticks when it's on screen.
  const clockRunning = phase === "running" && timed && drill.status === "active";
  useEffect(() => {
    if (!clockRunning) return;
    const id = setInterval(() => setElapsed(getElapsed()), 1000);
    return () => clearInterval(id);
  }, [clockRunning, getElapsed]);

  function begin() {
    setElapsed(0);
    setScore(null);
    restart(); // a fresh draw even when the length is unchanged
    setPhase("running");
  }

  // ─── Setup ───

  if (phase === "setup") {
    return (
      <div className="flex flex-col gap-6">
        <Card raised padding="lg">
          <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Mock interview
          </h1>
          <p className="text-[13.5px] mt-2 leading-relaxed max-w-2xl" style={{ color: "var(--text-muted)" }}>
            Rapid-fire questions drawn across every track, weighted to the levels you&apos;ve reached and
            capped at two per topic — so it probes breadth the way a real screen does. You get a
            scorecard at the end, and every answer still feeds your review schedule.
          </p>

          <div className="mt-6 flex flex-col gap-4">
            <div>
              <div className="text-[12px] mb-2" style={{ color: "var(--text-faint)" }} id="length-label">
                Length
              </div>
              <div
                role="group"
                aria-labelledby="length-label"
                className="grid grid-cols-3 sm:flex gap-1.5 p-1 rounded-lg sm:w-fit"
                style={{ background: "var(--bg-inset)" }}
              >
                {LENGTHS.map((option) => (
                  <button
                    key={option.size}
                    type="button"
                    aria-pressed={size === option.size}
                    onClick={() => setSize(option.size)}
                    className="px-3.5 py-2 rounded-md text-[12.5px] font-medium transition-all"
                    style={{
                      background: size === option.size ? "var(--surface)" : "transparent",
                      color: size === option.size ? "var(--text)" : "var(--text-faint)",
                    }}
                  >
                    {option.label}
                    <span className="block sm:inline sm:ml-1.5 text-[11px] opacity-60">{option.detail}</span>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
                className="h-4 w-4 rounded"
                style={{ accentColor: "var(--accent)" }}
              />
              <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                Show the clock — adds pressure, closer to the real thing
              </span>
            </label>
          </div>

          <Button size="lg" className="mt-6" onClick={begin}>
            Begin interview →
          </Button>
        </Card>

        <PastRuns past={past} />
      </div>
    );
  }

  // ─── Scored ───

  if (phase === "scored" && score) {
    return (
      <Scorecard
        score={score}
        onRestart={() => setPhase("setup")}
        onRetrySave={saveFailed ? () => saveRun(score) : undefined}
      />
    );
  }

  // ─── Running ───

  if (drill.status === "error" || drill.status === "empty") {
    return (
      <ErrorState
        as="h1"
        title={drill.status === "empty" ? "No questions to ask yet" : "Couldn’t assemble your interview"}
        message={
          drill.status === "empty"
            ? "The question bank looks empty. Seed it with `npm run db:seed`."
            : (drill.error ?? undefined)
        }
        onRetry={drill.status === "error" ? restart : undefined}
        extra={
          <Button variant="secondary" onClick={() => setPhase("setup")}>
            Back to setup
          </Button>
        }
      />
    );
  }

  const { session, item, response } = drill;
  if (drill.status !== "active" || !session || !item || !response) {
    return <Spinner label="Assembling your interview…" />;
  }

  return (
    <div className="flex flex-col gap-5">
      <h1 className="sr-only">Mock interview</h1>
      <div>
        <div className="flex items-center justify-between mb-2 text-[12px]">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Interview</Badge>
            <span style={{ color: "var(--text-muted)" }}>
              Question {drill.index + 1} of {drill.total}
            </span>
          </div>
          {timed && (
            <span
              className="tabular-nums font-mono"
              style={{ color: "var(--text-muted)" }}
              aria-label={`Elapsed ${formatTime(elapsed)}`}
            >
              {formatTime(elapsed)}
            </span>
          )}
        </div>
        <ProgressBar
          value={((drill.index + (drill.revealed ? 1 : 0)) / drill.total) * 100}
          height={4}
          label="Interview progress"
        />
      </div>

      <DrillCard
        key={item.id}
        item={item}
        response={response}
        onChange={drill.setResponse}
        grade={drill.grade}
        revealed={drill.revealed}
        showPrimer={false}
      />

      <ActionBar className="justify-end">
        <KeyHint item={item} revealed={drill.revealed} verb="answer" />
        {!drill.revealed ? (
          <Button onClick={drill.submit} disabled={!drill.canSubmit}>
            {item.kind === "short" ? "Log & continue" : "Answer"}
          </Button>
        ) : (
          <Button onClick={drill.next} variant={drill.isLast ? "success" : "primary"}>
            {drill.isLast ? "See scorecard" : "Next"} →
          </Button>
        )}
      </ActionBar>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

const dateFormat = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function PastRuns({ past }: { past: ReturnType<typeof useApi<PastRun[]>> }) {
  if (past.error) {
    return (
      <Card role="alert">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[13px] flex-1" style={{ color: "var(--text-muted)" }}>
            Couldn&apos;t load your previous runs.
          </p>
          <Button size="sm" variant="secondary" onClick={past.retry}>
            Try again
          </Button>
        </div>
      </Card>
    );
  }

  const runs = past.data ?? [];
  if (runs.length === 0) return null;

  return (
    <Card>
      <h2 className="text-[14px] font-semibold mb-3.5" style={{ color: "var(--text)" }}>
        Previous runs
      </h2>
      <ul className="flex flex-col gap-2">
        {runs.map((run, i) => (
          <li
            key={`${run.createdAt}-${i}`}
            className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5"
            style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
          >
            <span
              className="text-[15px] font-semibold tabular-nums flex-none w-12"
              style={{ color: accuracyColor(run.score.accuracy) }}
            >
              {run.score.accuracy}%
            </span>
            <span className="text-[12.5px] flex-1" style={{ color: "var(--text-muted)" }}>
              {run.score.correct}/{run.score.total} · {formatDuration(run.score.seconds)}
            </span>
            <time
              dateTime={run.createdAt}
              className="text-[11.5px]"
              style={{ color: "var(--text-faint)" }}
            >
              {dateFormat.format(new Date(run.createdAt))}
            </time>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function accuracyColor(accuracy: number) {
  return accuracy >= 75 ? "var(--good)" : accuracy >= 50 ? "var(--warn)" : "var(--bad)";
}

function Scorecard({
  score,
  onRestart,
  onRetrySave,
}: {
  score: InterviewScore;
  onRestart: () => void;
  /** Set when saving the run to history failed. */
  onRetrySave?: () => void;
}) {
  const color = accuracyColor(score.accuracy);
  const pace = Math.round(score.seconds / Math.max(1, score.total));

  return (
    <div className="flex flex-col gap-5 animate-rise">
      <Card raised padding="lg" className="text-center">
        <h1 className="text-[11px] uppercase tracking-wider font-normal" style={{ color: "var(--text-faint)" }}>
          Scorecard
        </h1>
        <div className="text-5xl font-semibold mt-2 tabular-nums" style={{ color }}>
          {score.accuracy}%
        </div>
        <div className="text-[14px] mt-1.5" style={{ color: "var(--text-muted)" }}>
          {score.correct} of {score.total} correct · {formatDuration(score.seconds)} · {pace}s per
          question
        </div>
        <p
          className="text-[14px] mt-5 max-w-lg mx-auto leading-relaxed"
          style={{ color: "var(--text)" }}
        >
          {score.verdict}
        </p>

        {onRetrySave && (
          <p role="alert" className="text-[13px] mt-4" style={{ color: "var(--warn)" }}>
            This run couldn&apos;t be saved to your history.{" "}
            <button type="button" onClick={onRetrySave} className="underline">
              Try again
            </button>
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
          <Button onClick={onRestart}>Run another</Button>
          <LinkButton href="/app/dashboard" variant="secondary">
            See full progress
          </LinkButton>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <h2 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            By track
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-faint)" }}>
            Weakest first — that&apos;s where to spend the next week.
          </p>
          <div className="flex flex-col gap-2.5">
            {score.byTrack.map((track) => (
              <div key={track.trackName} className="flex items-center gap-3">
                <span
                  className="text-[13px] w-28 flex-none truncate"
                  style={{ color: "var(--text)" }}
                >
                  {track.trackName}
                </span>
                <ProgressBar
                  value={(track.correct / track.total) * 100}
                  color={track.trackColor}
                  height={6}
                />
                <span
                  className="text-[12px] tabular-nums flex-none w-10 text-right"
                  style={{ color: "var(--text-faint)" }}
                >
                  {track.correct}/{track.total}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="text-[14px] font-semibold mb-1" style={{ color: "var(--text)" }}>
            Concepts to revisit
          </h2>
          <p className="text-[12px] mb-4" style={{ color: "var(--text-faint)" }}>
            Drawn from the questions you missed.
          </p>
          {score.weakSpots.length === 0 ? (
            <p className="text-[13px]" style={{ color: "var(--good)" }}>
              <span aria-hidden>✓ </span>Nothing missed — a clean run.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {score.weakSpots.map((name) => (
                <Badge key={name} tone="bad">
                  {name}
                </Badge>
              ))}
            </div>
          )}

          <LinkButton
            href="/app/drill?mode=weak&size=12"
            size="sm"
            variant="secondary"
            className="w-full mt-5"
          >
            Drill these weak spots
          </LinkButton>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Questions" value={score.total} />
        <Stat label="Correct" value={score.correct} color="var(--good)" />
        <Stat label="Pace" value={`${pace}s`} sub="per question" />
      </div>
    </div>
  );
}
