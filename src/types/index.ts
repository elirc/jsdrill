// ─────────────────────────────────────────────────────────────
// Reps — core domain types
// A "track" is a technology (React, .NET…). A "module" is a
// teachable unit inside a track at a given level. An "item" is a
// single drill: one of eight interactive question kinds.
// ─────────────────────────────────────────────────────────────

// ─── Levels ───
export const LEVELS = [1, 2, 3, 4] as const;
export type Level = (typeof LEVELS)[number];

export const LEVEL_META: Record<
  Level,
  { name: string; short: string; blurb: string }
> = {
  1: {
    name: "Fundamentals",
    short: "L1",
    blurb: "Language basics and the vocabulary you are expected to already have.",
  },
  2: {
    name: "Working Dev",
    short: "L2",
    blurb: "Day-to-day mechanics: async, state, HTTP, the framework's own rules.",
  },
  3: {
    name: "CRUD Builder",
    short: "L3",
    blurb: "Shipping a real app: data access, forms, auth, validation, errors.",
  },
  4: {
    name: "Production-Ready",
    short: "L4",
    blurb: "The mid-level bar: performance, security, testing, deploys, trade-offs.",
  },
};

// ─── Item kinds ───
export const ITEM_KINDS = [
  "mcq",
  "multi",
  "truefalse",
  "predict-output",
  "fill-blank",
  "order",
  "code",
  "short",
] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

export const ITEM_KIND_META: Record<
  ItemKind,
  { label: string; icon: string; blurb: string }
> = {
  mcq: { label: "Multiple choice", icon: "◉", blurb: "Pick the one right answer." },
  multi: { label: "Select all", icon: "☑", blurb: "Pick every answer that applies." },
  truefalse: { label: "True / false", icon: "⊤", blurb: "Snap judgement on a claim." },
  "predict-output": { label: "Predict output", icon: "▶", blurb: "Read the code, call the result." },
  "fill-blank": { label: "Fill the blank", icon: "▭", blurb: "Complete the snippet from memory." },
  order: { label: "Put in order", icon: "⇅", blurb: "Sequence the steps correctly." },
  code: { label: "Write code", icon: "{ }", blurb: "Implement it and pass the tests." },
  short: { label: "Explain it", icon: "✎", blurb: "Say it out loud, then self-grade." },
};

// ─── Languages (for syntax highlighting + labelling) ───
export type CodeLang =
  | "javascript"
  | "typescript"
  | "jsx"
  | "tsx"
  | "csharp"
  | "sql"
  | "bash"
  | "json"
  | "html"
  | "css"
  | "text";

// ─── Payloads, one per kind ───
export type Choice = {
  id: string;
  text: string;
  /** Rendered as a code block instead of prose when true. */
  code?: boolean;
  correct?: boolean;
  /** Shown after answering — why this option is right or wrong. */
  explain?: string;
};

export type McqPayload = { choices: Choice[] };
export type MultiPayload = { choices: Choice[] };
export type TrueFalsePayload = { answer: boolean };
export type PredictOutputPayload = { choices: Choice[] };

export type Blank = {
  id: string;
  /** Accepted answers; compared case-insensitively with whitespace collapsed. */
  accept: string[];
  hint?: string;
  width?: number;
};
/** `template` embeds blanks as {{blankId}}. */
export type FillBlankPayload = { template: string; blanks: Blank[] };

export type OrderStep = { id: string; text: string };
/** Authored in the correct order; shuffled at render time. */
export type OrderPayload = { steps: OrderStep[] };

export type TestCase = {
  input: unknown[];
  expected: unknown;
  description: string;
  isEdgeCase: boolean;
};
export type CodePayload = {
  starterCode: string;
  solutionCode: string;
  tests: TestCase[];
  /**
   * Optional wrapper for higher-order exercises, where calling the
   * learner's function directly does not produce a comparable value
   * (a factory returning a closure, say). A function expression that
   * receives the test input and may call whatever the learner defined.
   */
  harness?: string;
};

export type ShortPayload = {
  modelAnswer: string;
  /** The points an interviewer is listening for. Used for self-grading. */
  keyPoints: string[];
};

export type ItemPayload =
  | McqPayload
  | MultiPayload
  | TrueFalsePayload
  | PredictOutputPayload
  | FillBlankPayload
  | OrderPayload
  | CodePayload
  | ShortPayload;

// ─── Item ───
export type Item = {
  id: string;
  kind: ItemKind;
  trackId: string;
  moduleId: string;
  level: Level;
  /** The question itself. Supports light markdown (backticks, **bold**, lists). */
  prompt: string;
  /** Optional snippet shown above the answer UI. */
  code?: string;
  lang?: CodeLang;
  payload: ItemPayload;
  /** Always shown after answering. This is where the learning happens. */
  explanation: string;
  /** One line on why an interviewer asks this. */
  interviewTip?: string;
  conceptIds: string[];
  estSeconds: number;
  difficulty: 1 | 2 | 3;
};

export type ConceptRef = { id: string; name: string; slug: string };

/** An item joined with the display data the drill UI needs. */
export type DrillItem = Item & {
  trackName: string;
  trackSlug: string;
  trackColor: string;
  moduleTitle: string;
  moduleSlug: string;
  moduleSummary: string;
  /** Set when the learner has never answered anything from this module. */
  moduleKeyIdeas: string[] | null;
  concepts: ConceptRef[];
  isReview: boolean;
  /** Times this user has seen it. */
  reps: number;
};

// ─── Tracks / modules / concepts ───
export type Track = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  /** Hex accent used for rings, bars and charts. */
  color: string;
  sortOrder: number;
};

export type Module = {
  id: string;
  trackId: string;
  slug: string;
  title: string;
  level: Level;
  summary: string;
  /** Markdown-ish teaching brief: read this before drilling. */
  brief: string;
  /** The 4-6 things to remember. Shown before first drilling, and on the cheat sheet. */
  keyIdeas: string[];
  sortOrder: number;
};

export type Concept = {
  id: string;
  slug: string;
  name: string;
  description: string;
  /** Longer note surfaced in the concept library. */
  explanation: string;
};

// ─── Responses (what the learner submitted) ───
/** Self-grade for explain-it items, mapped onto FSRS ratings. */
export type SelfRating = 1 | 2 | 3 | 4; // Blanked | Shaky | Solid | Nailed it

export type Response =
  | { kind: "mcq"; choiceId: string | null }
  | { kind: "predict-output"; choiceId: string | null }
  | { kind: "multi"; choiceIds: string[] }
  | { kind: "truefalse"; value: boolean | null }
  | { kind: "fill-blank"; values: Record<string, string> }
  | { kind: "order"; order: string[] }
  | { kind: "code"; code: string }
  | { kind: "short"; text: string; selfRating: SelfRating | null };

// ─── Grading ───
export type BlankVerdict = { id: string; given: string; correct: boolean; accept: string[] };
export type ChoiceVerdict = { id: string; chosen: boolean; correct: boolean };
export type TestVerdict = {
  passed: boolean;
  result?: unknown;
  expected?: unknown;
  error?: string;
  testCase: TestCase;
};

export type Grade = {
  correct: boolean;
  /** 0..1 — partial credit for multi-select, blanks, ordering and tests. */
  score: number;
  choices?: ChoiceVerdict[];
  blanks?: BlankVerdict[];
  order?: { id: string; text: string; correctIndex: number; givenIndex: number }[];
  tests?: TestVerdict[];
  errorType?: string | null;
  /** Set for `short` — grading is the learner's own call. */
  selfGraded?: boolean;
  /** 2 when the answer was reached on a second attempt (partial credit). */
  attempt?: 1 | 2;
};

// ─── Sessions ───
export type SessionMode = "mixed" | "track" | "module" | "level" | "weak" | "interview";

export type SessionSpec = {
  mode: SessionMode;
  size: number;
  trackId?: string;
  moduleId?: string;
  level?: Level;
};

export type SessionSummary = {
  items: DrillItem[];
  spec: SessionSpec;
  newCount: number;
  reviewCount: number;
};

export type DrillPhase = "answering" | "feedback";

// ─── Progress / analytics ───
export type TrackProgress = {
  trackId: string;
  trackName: string;
  trackSlug: string;
  trackIcon: string;
  trackColor: string;
  currentLevel: Level;
  totalItems: number;
  seenItems: number;
  masteredItems: number;
  dueItems: number;
  /** 0..100, blends coverage with retention. */
  mastery: number;
  accuracy: number;
};

export type ModuleProgress = {
  moduleId: string;
  moduleSlug: string;
  title: string;
  summary: string;
  keyIdeas: string[];
  level: Level;
  trackId: string;
  totalItems: number;
  seenItems: number;
  masteredItems: number;
  dueItems: number;
  mastery: number;
  /** Locked until the previous level in this track is mostly mastered. */
  locked: boolean;
};

export type ConceptStrength = {
  conceptId: string;
  conceptName: string;
  conceptSlug: string;
  totalItems: number;
  seenItems: number;
  accuracy: number;
  averageStability: number;
  strength: "none" | "shaky" | "learning" | "strong";
};

export type DayActivity = { date: string; count: number; correct: number };

export type DashboardData = {
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    accuracy: number;
    itemsSeen: number;
    itemsMastered: number;
    totalItems: number;
    dueNow: number;
    streak: number;
    minutesDrilled: number;
  };
  trackProgress: TrackProgress[];
  activity: DayActivity[];
  conceptStrengths: ConceptStrength[];
  weakest: ConceptStrength[];
  forecast: { date: string; count: number }[];
  recentMisses: {
    itemId: string;
    prompt: string;
    trackName: string;
    trackColor: string;
    at: string;
  }[];
};

// ─── Interview mode ───
export type InterviewScore = {
  total: number;
  correct: number;
  accuracy: number;
  seconds: number;
  byTrack: { trackName: string; trackColor: string; correct: number; total: number }[];
  verdict: string;
  weakSpots: string[];
};

// ─── API envelope ───
export type ApiResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};
