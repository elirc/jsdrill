// ─────────────────────────────────────────────────────────────
// Authoring DSL for the curriculum.
//
// Content lives in `src/content/tracks/*.ts` as plain data. These
// helpers keep each item to a few readable lines and produce the
// shapes the seeder writes to SQLite.
// ─────────────────────────────────────────────────────────────
import type {
  CodeLang,
  Choice,
  ItemKind,
  ItemPayload,
  Level,
  TestCase,
} from "@/types";

// ─── Authored shapes ───

export type AuthoredItem = {
  id: string;
  kind: ItemKind;
  prompt: string;
  code?: string;
  lang?: CodeLang;
  payload: ItemPayload;
  explanation: string;
  interviewTip?: string;
  conceptIds: string[];
  estSeconds: number;
  difficulty: 1 | 2 | 3;
};

export type AuthoredModule = {
  slug: string;
  title: string;
  level: Level;
  summary: string;
  brief: string;
  keyIdeas: string[];
  items: AuthoredItem[];
};

export type AuthoredTrack = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  modules: AuthoredModule[];
};

// ─── Shared option bag ───

type Common = {
  /** The question. */
  q: string;
  /** Optional snippet rendered above the answer UI. */
  code?: string;
  lang?: CodeLang;
  /** The teaching explanation, always shown after answering. */
  why: string;
  /** Why an interviewer asks this. */
  tip?: string;
  /** Concept slugs. */
  c?: string[];
  /** Seconds this should take. Defaults per kind. */
  secs?: number;
  /** 1 = recall, 2 = applied, 3 = trap / senior-flavoured. */
  d?: 1 | 2 | 3;
};

type AuthoredChoice = {
  /** Choice text. Backticks render as inline code. */
  t: string;
  /** Mark as a correct answer. */
  ok?: true;
  /** Rendered as a code block. */
  code?: true;
  /** Per-option feedback shown after answering. */
  why?: string;
};

function base(id: string, kind: ItemKind, o: Common, defaultSecs: number) {
  return {
    id,
    kind,
    prompt: o.q,
    code: o.code,
    lang: o.lang,
    explanation: o.why,
    interviewTip: o.tip,
    conceptIds: o.c ?? [],
    estSeconds: o.secs ?? defaultSecs,
    difficulty: o.d ?? 1,
  };
}

function toChoices(list: AuthoredChoice[], idPrefix = "c"): Choice[] {
  return list.map((c, i) => ({
    id: `${idPrefix}${i + 1}`,
    text: c.t,
    code: c.code,
    correct: c.ok === true,
    explain: c.why,
  }));
}

// ─── Item constructors ───

/** Single correct answer. */
export function mcq(
  id: string,
  o: Common & { choices: AuthoredChoice[] }
): AuthoredItem {
  const choices = toChoices(o.choices);
  assert(
    choices.filter((c) => c.correct).length === 1,
    `mcq "${id}" must have exactly one correct choice`
  );
  return { ...base(id, "mcq", o, 40), payload: { choices } };
}

/** One or more correct answers; partially credited. */
export function multi(
  id: string,
  o: Common & { choices: AuthoredChoice[] }
): AuthoredItem {
  const choices = toChoices(o.choices);
  assert(
    choices.some((c) => c.correct),
    `multi "${id}" needs at least one correct choice`
  );
  return { ...base(id, "multi", o, 55), payload: { choices } };
}

/** True or false, with the explanation carrying the nuance. */
export function tf(
  id: string,
  o: Common & { answer: boolean }
): AuthoredItem {
  return { ...base(id, "truefalse", o, 25), payload: { answer: o.answer } };
}

/** "What does this print?" — code is required. */
export function out(
  id: string,
  o: Common & { code: string; choices: AuthoredChoice[] }
): AuthoredItem {
  const choices = toChoices(o.choices);
  assert(
    choices.filter((c) => c.correct).length === 1,
    `predict-output "${id}" must have exactly one correct choice`
  );
  return {
    ...base(id, "predict-output", { lang: "javascript", ...o }, 50),
    payload: { choices },
  };
}

/**
 * Cloze deletion over a snippet. Write the template with `{{1}}`,
 * `{{2}}` … and pass the accepted answers in the same order.
 */
export function blank(
  id: string,
  o: Common & {
    template: string;
    answers: (string | string[])[];
    hints?: string[];
  }
): AuthoredItem {
  const blanks = o.answers.map((a, i) => ({
    id: String(i + 1),
    accept: Array.isArray(a) ? a : [a],
    hint: o.hints?.[i],
    width: Math.max(...(Array.isArray(a) ? a : [a]).map((s) => s.length)) + 2,
  }));
  for (const b of blanks) {
    assert(
      o.template.includes(`{{${b.id}}}`),
      `fill-blank "${id}" template is missing {{${b.id}}}`
    );
  }
  return {
    ...base(id, "fill-blank", o, 60),
    payload: { template: o.template, blanks },
  };
}

/** Drag the steps into order. Author them already in the right order. */
export function order(
  id: string,
  o: Common & { steps: string[] }
): AuthoredItem {
  assert(o.steps.length >= 3, `order "${id}" needs at least 3 steps`);
  return {
    ...base(id, "order", o, 60),
    payload: { steps: o.steps.map((t, i) => ({ id: `s${i + 1}`, text: t })) },
  };
}

/** Write a function and pass the tests. JavaScript only — it runs in the browser. */
export function code(
  id: string,
  o: Common & {
    starter: string;
    solution: string;
    tests: TestCase[];
    /** For higher-order exercises — see `CodePayload.harness`. */
    harness?: string;
  }
): AuthoredItem {
  assert(o.tests.length > 0, `code "${id}" needs tests`);
  return {
    ...base(id, "code", { lang: "javascript", ...o }, 240),
    payload: {
      starterCode: o.starter,
      solutionCode: o.solution,
      tests: o.tests,
      harness: o.harness,
    },
  };
}

/** Say the answer out loud, then compare against the model and self-grade. */
export function short(
  id: string,
  o: Common & { model: string; points: string[] }
): AuthoredItem {
  assert(o.points.length > 0, `short "${id}" needs key points`);
  return {
    ...base(id, "short", o, 90),
    payload: { modelAnswer: o.model, keyPoints: o.points },
  };
}

// ─── Module / track constructors ───

export function mod(
  slug: string,
  o: {
    title: string;
    level: Level;
    summary: string;
    brief: string;
    /** The 4-6 things worth remembering. Terse; light markdown allowed. */
    keyIdeas: string[];
    items: AuthoredItem[];
  }
): AuthoredModule {
  assert(o.items.length > 0, `module "${slug}" has no items`);
  assert(o.keyIdeas.length >= 3, `module "${slug}" needs at least 3 key ideas`);
  return { slug, ...o };
}

export function defineTrack(t: AuthoredTrack): AuthoredTrack {
  const seen = new Set<string>();
  for (const m of t.modules) {
    for (const i of m.items) {
      assert(!seen.has(i.id), `duplicate item id "${i.id}" in track ${t.slug}`);
      seen.add(i.id);
    }
  }
  return t;
}

// ─── Test-case shorthand ───
export function t(
  input: unknown[],
  expected: unknown,
  description: string,
  isEdgeCase = false
): TestCase {
  return { input, expected, description, isEdgeCase };
}

function assert(cond: boolean, msg: string): asserts cond {
  if (!cond) throw new Error(`[content] ${msg}`);
}
