/**
 * Curriculum integrity check.
 *
 * Content is hand-authored, so this catches the mistakes types cannot:
 * a `code` exercise whose own reference solution fails, a fill-blank
 * whose accepted answer would be marked wrong, an explanation that was
 * left empty, a concept slug with no definition.
 *
 *   npm run content:check
 */
import { TRACKS } from "../src/content";
import { CONCEPT_BY_SLUG } from "../src/content/concepts";
import { grade } from "../src/lib/grader";
import type {
  CodePayload,
  FillBlankPayload,
  Item,
  McqPayload,
  MultiPayload,
  OrderPayload,
  PredictOutputPayload,
  ShortPayload,
  TrueFalsePayload,
} from "../src/types";

const problems: string[] = [];
const warnings: string[] = [];

/** Names the first value JSON would drop, or null if everything survives. */
function findUnserialisable(value: unknown, depth = 0): string | null {
  if (depth > 8) return null;

  if (typeof value === "function") return "a function";
  if (typeof value === "symbol") return "a symbol";
  if (typeof value === "bigint") return "a bigint";
  if (value instanceof Map) return "a Map";
  if (value instanceof Set) return "a Set";
  if (value instanceof Date) return "a Date";

  if (Array.isArray(value)) {
    for (const entry of value) {
      // `undefined` inside an array serialises to null.
      if (entry === undefined) return "an undefined array element";
      const found = findUnserialisable(entry, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (value !== null && typeof value === "object") {
    for (const entry of Object.values(value)) {
      const found = findUnserialisable(entry, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function fail(id: string, message: string) {
  problems.push(`${id}: ${message}`);
}
function warn(id: string, message: string) {
  warnings.push(`${id}: ${message}`);
}

/**
 * The markdown renderer supports single-backtick inline code only.
 * Doubled or unbalanced backticks render as garbled prose, which is
 * invisible in the source but obvious to a learner.
 */
function checkProse(id: string, label: string, text: string) {
  // Fenced blocks legitimately contain backticks.
  const prose = text.replace(/```[\s\S]*?```/g, "");

  if (prose.includes("``")) {
    fail(id, `${label} uses doubled backticks, which the renderer does not support`);
  }
  const ticks = (prose.match(/`/g) ?? []).length;
  if (ticks % 2 !== 0) {
    fail(id, `${label} has ${ticks} backticks — one is unclosed`);
  }
  // A code span containing a backtick cannot be expressed this way.
  for (const span of prose.matchAll(/`([^`\n]*)`/g)) {
    if (span[1].includes("`")) fail(id, `${label} nests backticks inside a code span`);
  }
}

let itemCount = 0;
const allIds = new Set<string>();
const usedConcepts = new Set<string>();

for (const track of TRACKS) {
  if (track.modules.length === 0) fail(track.slug, "track has no modules");

  const levels = new Set(track.modules.map((m) => m.level));
  if (!levels.has(1)) warn(track.slug, "no level-1 module — nowhere for a beginner to start");

  for (const mod of track.modules) {
    if (mod.brief.trim().length < 200) {
      fail(`${track.slug}/${mod.slug}`, "brief is too short to teach anything");
    }
    checkProse(`${track.slug}/${mod.slug}`, "brief", mod.brief);
    if (mod.keyIdeas.length < 3 || mod.keyIdeas.length > 7) {
      fail(`${track.slug}/${mod.slug}`, `${mod.keyIdeas.length} key ideas — aim for 4 to 6`);
    }
    mod.keyIdeas.forEach((idea, i) => {
      checkProse(`${track.slug}/${mod.slug}`, `key idea ${i + 1}`, idea);
      if (idea.length > 160) warn(`${track.slug}/${mod.slug}`, `key idea ${i + 1} is long — keep them scannable`);
    });
    if (mod.items.length < 3) {
      warn(`${track.slug}/${mod.slug}`, `only ${mod.items.length} item(s)`);
    }

    for (const authored of mod.items) {
      itemCount++;
      const id = authored.id;

      if (allIds.has(id)) fail(id, "duplicate item id");
      allIds.add(id);

      if (authored.explanation.trim().length < 40) {
        fail(id, "explanation is too short — every item must teach");
      }
      if (!authored.prompt.trim()) fail(id, "empty prompt");

      checkProse(id, "prompt", authored.prompt);
      checkProse(id, "explanation", authored.explanation);
      if (authored.interviewTip) checkProse(id, "interview tip", authored.interviewTip);

      const choiceBearing = authored.payload as { choices?: { text: string; explain?: string; code?: boolean }[] };
      choiceBearing.choices?.forEach((c, i) => {
        // Choices flagged `code` are rendered verbatim, not as markdown.
        if (!c.code) checkProse(id, `choice ${i + 1}`, c.text);
        if (c.explain) checkProse(id, `choice ${i + 1} feedback`, c.explain);
      });

      for (const slug of authored.conceptIds) {
        usedConcepts.add(slug);
        if (!CONCEPT_BY_SLUG.has(slug)) {
          warn(id, `concept "${slug}" has no registry entry`);
        }
      }
      if (authored.conceptIds.length === 0) {
        warn(id, "no concepts tagged — it won't appear in the concept library");
      }

      // The grader operates on `Item`, so build the runtime shape.
      const item: Item = {
        id,
        kind: authored.kind,
        trackId: track.slug,
        moduleId: mod.slug,
        level: mod.level,
        prompt: authored.prompt,
        code: authored.code,
        lang: authored.lang,
        payload: authored.payload,
        explanation: authored.explanation,
        interviewTip: authored.interviewTip,
        conceptIds: authored.conceptIds,
        estSeconds: authored.estSeconds,
        difficulty: authored.difficulty,
      };

      switch (authored.kind) {
        // ─── The correct choice must actually grade as correct ───
        case "mcq":
        case "predict-output": {
          const choices = (authored.payload as McqPayload | PredictOutputPayload).choices;
          const rights = choices.filter((c) => c.correct);
          if (rights.length !== 1) fail(id, `${rights.length} correct choices, expected exactly 1`);
          if (choices.length < 3) warn(id, `only ${choices.length} choices`);
          if (authored.kind === "predict-output" && !authored.code) {
            fail(id, "predict-output has no code to read");
          }

          const verdict = grade(item, { kind: authored.kind, choiceId: rights[0]?.id ?? "" });
          if (!verdict.correct) fail(id, "the correct choice does not grade as correct");

          const wrong = choices.find((c) => !c.correct);
          if (wrong) {
            const bad = grade(item, { kind: authored.kind, choiceId: wrong.id });
            if (bad.correct) fail(id, "a wrong choice grades as correct");
          }
          break;
        }

        case "multi": {
          const choices = (authored.payload as MultiPayload).choices;
          const rights = choices.filter((c) => c.correct);
          if (rights.length === 0) fail(id, "no correct choices");
          if (rights.length === choices.length) {
            fail(id, "every choice is correct — there is nothing to discriminate");
          }

          const verdict = grade(item, { kind: "multi", choiceIds: rights.map((c) => c.id) });
          if (!verdict.correct) fail(id, "selecting all correct choices does not grade correct");

          const partial = grade(item, { kind: "multi", choiceIds: [rights[0].id] });
          if (rights.length > 1 && partial.correct) {
            fail(id, "a partial selection grades as fully correct");
          }
          break;
        }

        case "truefalse": {
          const answer = (authored.payload as TrueFalsePayload).answer;
          if (!grade(item, { kind: "truefalse", value: answer }).correct) {
            fail(id, "the stated answer does not grade as correct");
          }
          if (grade(item, { kind: "truefalse", value: !answer }).correct) {
            fail(id, "the opposite answer also grades as correct");
          }
          break;
        }

        // ─── Every accepted answer must pass, not just the first ───
        case "fill-blank": {
          const payload = authored.payload as FillBlankPayload;
          if (payload.blanks.length === 0) fail(id, "no blanks");

          for (const blank of payload.blanks) {
            if (blank.accept.length === 0) fail(id, `blank ${blank.id} accepts nothing`);
            for (const accepted of blank.accept) {
              const values: Record<string, string> = {};
              for (const b of payload.blanks) {
                values[b.id] = b.id === blank.id ? accepted : b.accept[0];
              }
              if (!grade(item, { kind: "fill-blank", values }).correct) {
                fail(id, `accepted answer "${accepted}" for blank ${blank.id} grades as wrong`);
              }
            }
          }

          const wrong: Record<string, string> = {};
          for (const b of payload.blanks) wrong[b.id] = " not-an-answer";
          if (grade(item, { kind: "fill-blank", values: wrong }).correct) {
            fail(id, "nonsense input grades as correct");
          }
          break;
        }

        case "order": {
          const steps = (authored.payload as OrderPayload).steps;
          if (steps.length < 3) fail(id, "fewer than 3 steps");
          const ids = steps.map((s) => s.id);
          if (!grade(item, { kind: "order", order: ids }).correct) {
            fail(id, "the authored order does not grade as correct");
          }
          if (grade(item, { kind: "order", order: [...ids].reverse() }).correct) {
            fail(id, "the reversed order also grades as correct");
          }
          break;
        }

        // ─── The reference solution must pass its own tests ───
        case "code": {
          const payload = authored.payload as CodePayload;

          // Tests are stored as JSON, so an input JSON cannot carry —
          // a function, a Map, a Symbol — silently becomes null by the
          // time the item reaches the learner. Comparing serialised
          // forms would not catch it (both sides lose it equally), so
          // walk the original values instead.
          const unserialisable = findUnserialisable(payload.tests);
          if (unserialisable) {
            fail(id, `test data contains ${unserialisable}, which JSON cannot store — use a harness instead`);
          }

          const verdict = grade(item, { kind: "code", code: payload.solutionCode });
          if (!verdict.correct) {
            const failed = verdict.tests?.filter((t) => !t.passed) ?? [];
            fail(
              id,
              `reference solution fails ${failed.length}/${payload.tests.length} test(s): ` +
                failed
                  .map((t) => t.error ?? `"${t.testCase.description}" got ${JSON.stringify(t.result)}`)
                  .join("; ")
            );
          }

          const starterVerdict = grade(item, { kind: "code", code: payload.starterCode });
          if (starterVerdict.correct) {
            fail(id, "the starter code already passes — there is nothing to solve");
          }

          if (!payload.tests.some((t) => t.isEdgeCase)) {
            warn(id, "no edge-case tests");
          }
          break;
        }

        case "short": {
          const payload = authored.payload as ShortPayload;
          if (payload.modelAnswer.trim().length < 100) {
            fail(id, "model answer is too short to be useful");
          }
          if (payload.keyPoints.length < 2) fail(id, "fewer than 2 key points");
          break;
        }
      }
    }
  }
}

// ─── Concepts defined but never used ───
for (const slug of CONCEPT_BY_SLUG.keys()) {
  if (!usedConcepts.has(slug)) warn("concepts", `"${slug}" is defined but no item uses it`);
}

// ─── Report ───
console.log("");
console.log(`  Checked ${itemCount} items across ${TRACKS.length} tracks`);

if (warnings.length > 0) {
  console.log(`\n  ${warnings.length} warning(s):`);
  for (const w of warnings) console.log(`    · ${w}`);
}

if (problems.length > 0) {
  console.log(`\n  ${problems.length} problem(s):`);
  for (const p of problems) console.log(`    ✕ ${p}`);
  console.log("");
  process.exit(1);
}

console.log("\n  No problems found.\n");
