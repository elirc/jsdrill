"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DrillCard } from "@/components/drill/DrillCard";
import { Badge, Button, Card, ProgressBar, Spinner, Stat } from "@/components/ui";
import { emptyResponse, grade as gradeLocally, isAnswered } from "@/lib/grader";
import { formatDuration, formatTime } from "@/lib/utils";
import type { DrillItem, Grade, InterviewScore, Response, SessionSummary } from "@/types";

type Phase = "setup" | "running" | "scored";
type Answered = { item: DrillItem; grade: Grade };

const LENGTHS = [
  { size: 10, label: "Screen", detail: "10 questions" },
  { size: 15, label: "Standard", detail: "15 questions" },
  { size: 25, label: "Full loop", detail: "25 questions" },
];

export default function InterviewPage() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [size, setSize] = useState(15);
  const [timed, setTimed] = useState(true);
  const [session, setSession] = useState<SessionSummary | null>(null);
  const [index, setIndex] = useState(0);
  const [response, setResponse] = useState<Response | null>(null);
  const [grade, setGrade] = useState<Grade | null>(null);
  const [answers, setAnswers] = useState<Answered[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [score, setScore] = useState<InterviewScore | null>(null);
  const [history, setHistory] = useState<{ score: InterviewScore; createdAt: string }[]>([]);

  // Seeded when a run starts — reading the clock during render is impure.
  const startedAt = useRef(0);
  const questionStart = useRef(0);

  useEffect(() => {
    fetch("/api/interview")
      .then((r) => r.json())
      .then((json) => json.success && setHistory(json.data))
      .catch(() => {});
  }, [phase]);

  // Session clock.
  useEffect(() => {
    if (phase !== "running") return;
    const id = setInterval(() => {
      setElapsed(Math.round((Date.now() - startedAt.current) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [phase]);

  async function start() {
    setPhase("running");
    setSession(null);
    const res = await fetch(`/api/session?mode=interview&size=${size}`);
    const json = await res.json();
    if (json.success && json.data.items.length > 0) {
      setSession(json.data);
      setResponse(emptyResponse(json.data.items[0].kind));
      setIndex(0);
      setAnswers([]);
      setGrade(null);
      setElapsed(0);
      startedAt.current = Date.now();
      questionStart.current = Date.now();
    } else {
      setPhase("setup");
    }
  }

  const finish = useCallback(
    async (final: Answered[]) => {
      const seconds = Math.round((Date.now() - startedAt.current) / 1000);
      const correct = final.filter((a) => a.grade.correct).length;
      const accuracy = final.length ? Math.round((correct / final.length) * 100) : 0;

      const trackMap = new Map<string, { trackColor: string; correct: number; total: number }>();
      for (const answer of final) {
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
          final
            .filter((a) => !a.grade.correct)
            .flatMap((a) => a.item.concepts.map((c) => c.name))
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

      const result: InterviewScore = {
        total: final.length,
        correct,
        accuracy,
        seconds,
        byTrack,
        verdict,
        weakSpots,
      };

      setScore(result);
      setPhase("scored");

      await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result),
      }).catch(() => {});
    },
    []
  );

  const item = session?.items[index];

  const submit = useCallback(async () => {
    if (!item || !response || grade) return;
    if (!isAnswered(item, response)) return;

    const seconds = Math.round((Date.now() - questionStart.current) / 1000);
    const local = gradeLocally(item, response);
    setGrade(local);
    setAnswers((a) => [...a, { item, grade: local }]);

    fetch("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId: item.id, response, timeSpent: seconds, mode: "interview" }),
    }).catch(() => {});
  }, [item, response, grade]);

  const next = useCallback(() => {
    if (!session) return;
    const target = index + 1;
    if (target >= session.items.length) {
      finish(answers);
      return;
    }
    setIndex(target);
    setGrade(null);
    setResponse(emptyResponse(session.items[target].kind));
    questionStart.current = Date.now();
  }, [index, session, answers, finish]);

  useEffect(() => {
    if (phase !== "running") return;
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
  }, [phase, grade, next, submit]);

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
              <div className="text-[12px] mb-2" style={{ color: "var(--text-faint)" }}>
                Length
              </div>
              <div className="flex gap-1.5 p-1 rounded-lg w-fit" style={{ background: "var(--bg-inset)" }}>
                {LENGTHS.map((option) => (
                  <button
                    key={option.size}
                    type="button"
                    onClick={() => setSize(option.size)}
                    className="px-3.5 py-2 rounded-md text-[12.5px] font-medium transition-all"
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
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer w-fit">
              <input
                type="checkbox"
                checked={timed}
                onChange={(e) => setTimed(e.target.checked)}
                className="h-4 w-4 rounded accent-current"
                style={{ accentColor: "var(--accent)" }}
              />
              <span className="text-[13px]" style={{ color: "var(--text-muted)" }}>
                Show the clock — adds pressure, closer to the real thing
              </span>
            </label>
          </div>

          <Button size="lg" className="mt-6" onClick={start}>
            Begin interview →
          </Button>
        </Card>

        {history.length > 0 && (
          <Card>
            <h2 className="text-[14px] font-semibold mb-3.5" style={{ color: "var(--text)" }}>
              Previous runs
            </h2>
            <div className="flex flex-col gap-2">
              {history.map((run, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border px-3.5 py-2.5"
                  style={{ background: "var(--bg-inset)", borderColor: "var(--border)" }}
                >
                  <span
                    className="text-[15px] font-semibold tabular-nums flex-none w-12"
                    style={{
                      color:
                        run.score.accuracy >= 75
                          ? "var(--good)"
                          : run.score.accuracy >= 50
                            ? "var(--warn)"
                            : "var(--bad)",
                    }}
                  >
                    {run.score.accuracy}%
                  </span>
                  <span className="text-[12.5px] flex-1" style={{ color: "var(--text-muted)" }}>
                    {run.score.correct}/{run.score.total} · {formatDuration(run.score.seconds)}
                  </span>
                  <span className="text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                    {new Date(run.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  // ─── Scored ───

  if (phase === "scored" && score) {
    return <Scorecard score={score} onRestart={() => setPhase("setup")} />;
  }

  // ─── Running ───

  if (!session || !item || !response) return <Spinner label="Assembling your interview…" />;

  const canSubmit =
    item.kind === "short"
      ? response.kind === "short" && response.selfRating !== null
      : isAnswered(item, response);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center justify-between mb-2 text-[12px]">
          <div className="flex items-center gap-2">
            <Badge tone="accent">Interview</Badge>
            <span style={{ color: "var(--text-muted)" }}>
              Question {index + 1} of {session.items.length}
            </span>
          </div>
          {timed && (
            <span className="tabular-nums font-mono" style={{ color: "var(--text-muted)" }}>
              {formatTime(elapsed)}
            </span>
          )}
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
        revealed={grade !== null}
        showPrimer={false}
        bookmarked={false}
        onBookmark={() => {}}
      />

      <div
        className="sticky bottom-0 -mx-4 px-4 py-3 border-t backdrop-blur-xl flex items-center justify-end gap-3"
        style={{
          borderColor: "var(--border)",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
        }}
      >
        {!grade ? (
          <Button onClick={submit} disabled={!canSubmit}>
            {item.kind === "short" ? "Log & continue" : "Answer"}
          </Button>
        ) : (
          <Button onClick={next} variant={index === session.items.length - 1 ? "success" : "primary"}>
            {index === session.items.length - 1 ? "See scorecard" : "Next"} →
          </Button>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────

function Scorecard({ score, onRestart }: { score: InterviewScore; onRestart: () => void }) {
  const color =
    score.accuracy >= 75 ? "var(--good)" : score.accuracy >= 50 ? "var(--warn)" : "var(--bad)";

  return (
    <div className="flex flex-col gap-5 animate-rise">
      <Card raised padding="lg" className="text-center">
        <div className="text-[11px] uppercase tracking-wider" style={{ color: "var(--text-faint)" }}>
          Scorecard
        </div>
        <div className="text-5xl font-semibold mt-2 tabular-nums" style={{ color }}>
          {score.accuracy}%
        </div>
        <div className="text-[14px] mt-1.5" style={{ color: "var(--text-muted)" }}>
          {score.correct} of {score.total} correct · {formatDuration(score.seconds)} ·{" "}
          {Math.round(score.seconds / Math.max(1, score.total))}s per question
        </div>
        <p
          className="text-[14px] mt-5 max-w-lg mx-auto leading-relaxed"
          style={{ color: "var(--text)" }}
        >
          {score.verdict}
        </p>

        <div className="flex items-center justify-center gap-3 mt-6">
          <Button onClick={onRestart}>Run another</Button>
          <Link href="/app/dashboard">
            <Button variant="secondary">See full progress</Button>
          </Link>
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
              Nothing missed — a clean run.
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

          <Link href="/app/drill?mode=weak&size=12" className="block mt-5">
            <Button size="sm" variant="secondary" className="w-full">
              Drill these weak spots
            </Button>
          </Link>
        </Card>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label="Questions" value={score.total} />
        <Stat label="Correct" value={score.correct} color="var(--good)" />
        <Stat label="Pace" value={`${Math.round(score.seconds / Math.max(1, score.total))}s`} sub="per question" />
      </div>
    </div>
  );
}
