"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { RETRYABLE_KINDS } from "./Answers";
import { emptyResponse, grade as gradeLocally, isAnswered } from "@/lib/grader";
import type { CodePayload, DrillItem, Grade, OrderPayload, Response, SessionSummary } from "@/types";

// ─────────────────────────────────────────────────────────────
// The session loop shared by the drill runner and the mock
// interview: load a session, hold the current answer, grade it,
// record it, advance, and drive it all from the keyboard.
// ─────────────────────────────────────────────────────────────

export type HistoryEntry = { item: DrillItem; grade: Grade; seconds: number };

export type Unlocked = { level: number; name: string };

/** What POST /api/attempts sends back (the subset the UI uses). */
export type RecordResult = {
  grade: Grade;
  nextReview: string | null;
  unlocked: Unlocked | null;
};

export type SessionStatus =
  | "idle" // no query yet
  | "loading"
  | "error" // the request failed
  | "empty" // the request worked but nothing matched
  | "active" // answering or reading feedback
  | "done"; // every item answered

export type UseDrillSessionOptions = {
  /** `/api/session` query string. `null` means "don't load yet". */
  query: string | null;
  /** Sent with each attempt so the server can tell drill from interview. */
  mode: string;
  /** Offer a second attempt on retryable kinds after a first miss. */
  allowRetry: boolean;
  /**
   * Replace the local grade with the server's re-grade when it
   * arrives. Default true. The interview keeps its local grades, as
   * it always has, so its scorecard never shifts under the learner.
   */
  adoptServerGrade?: boolean;
  /** Called after the server accepts an attempt. */
  onRecorded?: (item: DrillItem, result: RecordResult) => void;
  /** Called once, from `next()`, when the last item is left behind. */
  onComplete?: (history: HistoryEntry[], seconds: number) => void;
};

type Core = {
  /** Which load this state belongs to; see `loadKey` below. */
  key: string;
  outcome: "ready" | "empty" | "error";
  error: string | null;
  session: SessionSummary | null;
  index: number;
  response: Response | null;
  grade: Grade | null;
  /** False during a retry: the learner missed once and gets one more go. */
  revealed: boolean;
  attempt: 1 | 2;
  history: HistoryEntry[];
  nextReview: string | null;
  unlocked: Unlocked | null;
  sessionSeconds: number;
};

function blank(key: string, outcome: Core["outcome"], error: string | null = null): Core {
  return {
    key,
    outcome,
    error,
    session: null,
    index: 0,
    response: null,
    grade: null,
    revealed: false,
    attempt: 1,
    history: [],
    nextReview: null,
    unlocked: null,
    sessionSeconds: 0,
  };
}

/**
 * The starting response for an item. Ordering items start shuffled and
 * code items start with the starter code. This reads Math.random, so it
 * is only ever called from event handlers and fetch callbacks — never
 * during render.
 */
function initialResponse(item: DrillItem): Response {
  if (item.kind === "order") {
    const steps = (item.payload as OrderPayload).steps;
    const ids = steps.map((s) => s.id);
    for (let i = ids.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ids[i], ids[j]] = [ids[j], ids[i]];
    }
    // Never hand out the answer: an unshuffled list gets its first two swapped.
    if (ids.length > 1 && ids.every((id, i) => id === steps[i].id)) {
      [ids[0], ids[1]] = [ids[1], ids[0]];
    }
    return { kind: "order", order: ids };
  }
  if (item.kind === "code") {
    return { kind: "code", code: (item.payload as CodePayload).starterCode };
  }
  return emptyResponse(item.kind);
}

/** Whether the current response can be checked. `short` needs a self-rating. */
export function canSubmitResponse(item: DrillItem, response: Response): boolean {
  if (item.kind === "short") return response.kind === "short" && response.selfRating !== null;
  return isAnswered(item, response);
}

/**
 * Whether a plain Enter keypress at `target` should drive the session.
 * Enter keeps its native meaning in multi-line editors (textarea,
 * CodeMirror's contenteditable), on links, and on ordinary buttons —
 * except answer buttons (marked `data-drill-choice`), where "pick, then
 * Enter to check" is the expected flow.
 */
function enterBelongsToSession(e: KeyboardEvent): boolean {
  if (e.metaKey || e.ctrlKey) return true;
  const el = e.target as HTMLElement | null;
  if (!el || !el.tagName) return true;
  if (el.isContentEditable) return false;
  switch (el.tagName) {
    case "TEXTAREA":
    case "SELECT":
    case "A":
    case "SUMMARY":
      return false;
    case "INPUT":
      return (el as HTMLInputElement).type === "text";
    case "BUTTON":
      return el.hasAttribute("data-drill-choice");
    default:
      return true;
  }
}

export function useDrillSession({
  query,
  mode,
  allowRetry,
  adoptServerGrade = true,
  onRecorded,
  onComplete,
}: UseDrillSessionOptions) {
  const [nonce, setNonce] = useState(0);
  const [core, setCore] = useState<Core>(() => blank("", "ready"));

  /** Identifies one load. `restart()` bumps the nonce to reload the same query. */
  const loadKey = query ? `${query}#${nonce}` : "";

  // Clock and bookkeeping. Seeded from callbacks — reading the clock
  // during render is impure.
  const questionStart = useRef(0);
  const sessionStart = useRef(0);
  /** The first-attempt response, kept so "show me" records what was actually tried. */
  const firstResponse = useRef<Response | null>(null);
  /** Items already sent to the server this load; guards against double-recording. */
  const recorded = useRef(new Set<string>());

  // ─── Load ───
  useEffect(() => {
    if (!query) return;
    const controller = new AbortController();

    fetch(`/api/session?${query}`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!json?.success) {
          setCore(blank(loadKey, "error", json?.error ?? `The server answered ${res.status}.`));
          return;
        }
        const data = json.data as SessionSummary;
        if (data.items.length === 0) {
          setCore(blank(loadKey, "empty"));
          return;
        }
        recorded.current = new Set();
        firstResponse.current = null;
        questionStart.current = Date.now();
        sessionStart.current = Date.now();
        setCore({
          ...blank(loadKey, "ready"),
          session: data,
          response: initialResponse(data.items[0]),
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setCore(blank(loadKey, "error", "Couldn’t reach the server."));
      });

    return () => controller.abort();
  }, [query, loadKey]);

  // ─── Derived state (pure) ───
  const current = core.key === loadKey ? core : null;
  const session = current?.session ?? null;
  const item = session?.items[core.index] ?? null;
  const response = current?.response ?? null;

  let status: SessionStatus;
  if (!query) status = "idle";
  else if (!current) status = "loading";
  else if (current.outcome !== "ready") status = current.outcome;
  else if (session && core.index >= session.items.length) status = "done";
  else status = "active";

  const canSubmit = !!item && !!response && canSubmitResponse(item, response);

  // ─── Record an attempt with the server, which re-grades ───
  const record = useCallback(
    async (target: DrillItem, submitted: Response, local: Grade, attemptNumber: 1 | 2) => {
      if (recorded.current.has(target.id)) return;
      recorded.current.add(target.id);

      const key = loadKey;
      const seconds = Math.round((Date.now() - questionStart.current) / 1000);
      setCore((c) =>
        c.key === key ? { ...c, history: [...c.history, { item: target, grade: local, seconds }] } : c
      );

      try {
        const res = await fetch("/api/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            itemId: target.id,
            response: submitted,
            timeSpent: seconds,
            mode,
            attempt: attemptNumber,
          }),
        });
        const json = await res.json();
        if (!json?.success) return;

        const result: RecordResult = {
          grade: json.data.grade,
          nextReview: json.data.nextReview ?? null,
          unlocked: json.data.unlocked ?? null,
        };

        setCore((c) => {
          // A restart or a new query since — this answer belongs to a dead session.
          if (c.key !== key) return c;
          const history = adoptServerGrade
            ? c.history.map((h) => (h.item.id === target.id ? { ...h, grade: result.grade } : h))
            : c.history;
          // The learner may already have moved on; only decorate the
          // card the answer belongs to.
          const stillShowing = c.session?.items[c.index]?.id === target.id;
          if (!stillShowing) return { ...c, history };
          return {
            ...c,
            history,
            grade: adoptServerGrade ? result.grade : c.grade,
            nextReview: result.nextReview,
            unlocked: result.unlocked,
          };
        });
        onRecorded?.(target, result);
      } catch {
        // Offline or the API is down — the local grade stands so the
        // learner isn't blocked; it just isn't scheduled.
      }
    },
    [loadKey, mode, adoptServerGrade, onRecorded]
  );

  // ─── Submit ───
  const submit = useCallback(() => {
    if (!item || !response || !current || current.revealed) return;
    if (!canSubmitResponse(item, response)) return;

    const local = gradeLocally(item, response);

    // First miss on a retryable kind: mark the wrong pick, clear the
    // selection and let them try once more before revealing.
    if (
      allowRetry &&
      current.attempt === 1 &&
      !local.correct &&
      !local.selfGraded &&
      RETRYABLE_KINDS.has(item.kind)
    ) {
      firstResponse.current = response;
      setCore((c) => ({
        ...c,
        grade: local,
        attempt: 2,
        response:
          response.kind === "mcq" || response.kind === "predict-output"
            ? { kind: response.kind, choiceId: null }
            : c.response,
      }));
      return;
    }

    const attempt = current.attempt;
    const final: Grade = attempt === 2 ? { ...local, attempt: 2 } : local;
    if (final.attempt === 2 && final.correct) final.score = Math.min(final.score, 0.5);

    setCore((c) => ({ ...c, grade: final, revealed: true }));
    void record(item, response, final, attempt);
  }, [item, response, current, allowRetry, record]);

  // ─── "Show me" during a retry: give up on the second go, record the first miss ───
  const giveUp = useCallback(() => {
    if (!item || !current || !current.grade || current.revealed) return;
    const original = firstResponse.current ?? response;
    if (!original) return;
    const grade = current.grade;
    setCore((c) => ({ ...c, revealed: true }));
    void record(item, original, grade, 1);
  }, [item, current, response, record]);

  // ─── Advance ───
  const next = useCallback(() => {
    if (!session || !current || !current.revealed) return;
    const target = current.index + 1;
    firstResponse.current = null;
    questionStart.current = Date.now();

    const reset = { grade: null, revealed: false, attempt: 1 as const, nextReview: null, unlocked: null };

    if (target >= session.items.length) {
      const seconds = Math.round((Date.now() - sessionStart.current) / 1000);
      setCore((c) => ({ ...c, ...reset, index: target, response: null, sessionSeconds: seconds }));
      onComplete?.(current.history, seconds);
      return;
    }

    setCore((c) => ({ ...c, ...reset, index: target, response: initialResponse(session.items[target]) }));
  }, [session, current, onComplete]);

  const setResponse = useCallback((r: Response) => {
    setCore((c) => (c.revealed ? c : { ...c, response: r }));
  }, []);

  /** Reload the same query as a fresh session. */
  const restart = useCallback(() => setNonce((n) => n + 1), []);

  /** Seconds since the session loaded. Read it from callbacks, not render. */
  const getElapsed = useCallback(
    () => Math.round((Date.now() - sessionStart.current) / 1000),
    []
  );

  // ─── Keyboard: Enter checks, then advances ───
  // An effect event always sees the latest submit/next, so the listener
  // is attached once per active session instead of on every keystroke.
  const onKeyDown = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== "Enter" || e.repeat || e.altKey || e.shiftKey || e.isComposing) return;
    if (!enterBelongsToSession(e)) return;
    e.preventDefault();
    if (current?.revealed) next();
    else submit();
  });

  const active = status === "active";
  useEffect(() => {
    if (!active) return;
    const listener = (e: KeyboardEvent) => onKeyDown(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [active]);

  return {
    status,
    error: current?.error ?? null,
    session,
    index: core.index,
    total: session?.items.length ?? 0,
    item,
    isLast: !!session && core.index === session.items.length - 1,
    response,
    setResponse,
    grade: current?.grade ?? null,
    revealed: current?.revealed ?? false,
    /** A first miss is marked and a second attempt is open. */
    retrying: !!current?.grade && !current.revealed,
    canSubmit,
    history: current?.history ?? [],
    nextReview: current?.nextReview ?? null,
    unlocked: current?.unlocked ?? null,
    sessionSeconds: current?.sessionSeconds ?? 0,
    submit,
    giveUp,
    next,
    restart,
    getElapsed,
  };
}
