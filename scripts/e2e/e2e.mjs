// End-to-end check: build a session, answer every kind correctly and
// incorrectly, and confirm grading + FSRS scheduling behave.
//
// Needs a running server (see README.md) and mutates the local reps.db.
const BASE = process.env.REPS_URL ?? "http://localhost:3111";

const get = async (p) => (await fetch(BASE + p)).json();
const post = async (p, body) =>
  (
    await fetch(BASE + p, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  ).json();

/** Build a deliberately correct or incorrect response for any item kind. */
function answer(item, correct) {
  const p = item.payload;
  switch (item.kind) {
    case "mcq":
    case "predict-output": {
      const right = p.choices.find((c) => c.correct);
      const wrong = p.choices.find((c) => !c.correct);
      return { kind: item.kind, choiceId: (correct ? right : wrong).id };
    }
    case "multi": {
      const rights = p.choices.filter((c) => c.correct).map((c) => c.id);
      if (correct) return { kind: "multi", choiceIds: rights };
      const wrong = p.choices.find((c) => !c.correct);
      return { kind: "multi", choiceIds: wrong ? [wrong.id] : [] };
    }
    case "truefalse":
      return { kind: "truefalse", value: correct ? p.answer : !p.answer };
    case "fill-blank": {
      const values = {};
      for (const b of p.blanks) values[b.id] = correct ? b.accept[0] : "zzz-wrong";
      return { kind: "fill-blank", values };
    }
    case "order": {
      const ids = p.steps.map((s) => s.id);
      return { kind: "order", order: correct ? ids : [...ids].reverse() };
    }
    case "code":
      return { kind: "code", code: correct ? p.solutionCode : "function nope() { return null; }" };
    case "short":
      return { kind: "short", text: "notes", selfRating: correct ? 4 : 1 };
  }
}

const results = { pass: 0, fail: 0 };
function check(label, cond, detail = "") {
  if (cond) {
    results.pass++;
    console.log("  ok   " + label);
  } else {
    results.fail++;
    console.log("  FAIL " + label + (detail ? " — " + detail : ""));
  }
}

// ─── 1. Grade every kind, both ways ───
console.log("\n== grading every item kind ==");
const session = await get("/api/session?mode=mixed&size=40");
const byKind = new Map();
for (const item of session.data.items) {
  if (!byKind.has(item.kind)) byKind.set(item.kind, item);
}

// Pull more until every kind is represented.
for (let i = 0; i < 8 && byKind.size < 8; i++) {
  const more = await get("/api/session?mode=mixed&size=40");
  for (const item of more.data.items) if (!byKind.has(item.kind)) byKind.set(item.kind, item);
}

for (const [kind, item] of byKind) {
  const right = await post("/api/attempts", {
    itemId: item.id,
    response: answer(item, true),
    timeSpent: 20,
    mode: "mixed",
  });
  check(
    `${kind}: correct answer grades correct`,
    right.success && right.data.grade.correct === true,
    JSON.stringify(right).slice(0, 160)
  );
  check(
    `${kind}: returns a next-review interval`,
    Boolean(right.data?.nextReview),
    JSON.stringify(right.data?.nextReview)
  );
}

console.log("\n== wrong answers are graded wrong ==");
for (const [kind, item] of byKind) {
  if (kind === "short") continue; // self-graded; a 1 means "blanked", not wrong data
  const wrong = await post("/api/attempts", {
    itemId: item.id,
    response: answer(item, false),
    timeSpent: 20,
    mode: "mixed",
  });
  check(
    `${kind}: wrong answer grades incorrect`,
    wrong.success && wrong.data.grade.correct === false,
    JSON.stringify(wrong.data?.grade).slice(0, 120)
  );
}

// ─── 2. Scheduling: a wrong answer should come back sooner ───
console.log("\n== spaced repetition ==");
const mcqItem = byKind.get("mcq");
const again = await post("/api/attempts", {
  itemId: mcqItem.id,
  response: answer(mcqItem, false),
  timeSpent: 10,
  mode: "mixed",
});
const good = await post("/api/attempts", {
  itemId: mcqItem.id,
  response: answer(mcqItem, true),
  timeSpent: 10,
  mode: "mixed",
});
check("wrong answer yields rating 1 (Again)", again.data.rating === 1, String(again.data.rating));
check("correct answer yields rating >= 3", good.data.rating >= 3, String(good.data.rating));
check("due dates differ after a lapse vs a success", again.data.dueAt !== good.data.dueAt);

// ─── 3. Dashboard reflects the attempts ───
console.log("\n== dashboard ==");
const dash = await get("/api/dashboard");
check("dashboard returns data", dash.success);
check("counts attempts", dash.data.stats.totalAttempts > 0, String(dash.data.stats.totalAttempts));
check("counts seen items", dash.data.stats.itemsSeen > 0, String(dash.data.stats.itemsSeen));
check("streak is at least 1", dash.data.stats.streak >= 1, String(dash.data.stats.streak));
check("activity spans 120 days", dash.data.activity.length === 120);
check("forecast spans 14 days", dash.data.forecast.length === 14);
check("concept strengths present", dash.data.conceptStrengths.length > 0);
check("track progress shows movement", dash.data.trackProgress.some((t) => t.seenItems > 0));

// ─── 4. Modes ───
console.log("\n== modes ==");
for (const mode of ["mixed", "weak", "interview"]) {
  const s = await get(`/api/session?mode=${mode}&size=8`);
  check(`${mode} session returns items`, s.success && s.data.items.length > 0, JSON.stringify(s).slice(0, 120));
}

const track = dash.data.trackProgress[0];
const tracked = await get(`/api/session?mode=track&trackId=${track.trackId}&size=6`);
check(
  "track mode returns only that track",
  tracked.data.items.length > 0 && tracked.data.items.every((i) => i.trackId === track.trackId)
);

// ─── 5. Path + concepts endpoints ───
console.log("\n== path & concepts ==");
const path = await get("/api/path?track=react");
check("track detail loads", path.success && path.data.modules.length > 0);
check("modules carry key ideas", path.data.modules.every((m) => m.keyIdeas.length >= 3));

const concepts = await get("/api/items");
check("concept library loads", concepts.success && concepts.data.length > 0);

// ─── 6. Server re-grades rather than trusting the client ───
console.log("\n== server-side grading is authoritative ==");
const tfItem = byKind.get("truefalse");
const spoofed = await post("/api/attempts", {
  itemId: tfItem.id,
  // A wrong answer; the client cannot claim it was right.
  response: { kind: "truefalse", value: !tfItem.payload.answer },
  timeSpent: 5,
  mode: "mixed",
});
check("server rejects a wrong answer regardless of client", spoofed.data.grade.correct === false);

console.log(`\n${results.pass} passed, ${results.fail} failed`);
process.exit(results.fail === 0 ? 0 : 1);
