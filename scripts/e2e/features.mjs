// Covers the learning-flow features: key ideas surfaced for first-time
// modules, the module and cheat-sheet endpoints, and second-attempt
// partial credit enforced on the server.
//
// Needs a running server (see README.md) and mutates the local reps.db.
const BASE = process.env.REPS_URL ?? "http://localhost:3111";
const get = async (p) => (await fetch(BASE + p)).json();
const post = async (p, b) =>
  (
    await fetch(BASE + p, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(b),
    })
  ).json();

let pass = 0,
  fail = 0;
const check = (label, ok, extra = "") => {
  if (ok) {
    pass++;
    console.log("  ok   " + label);
  } else {
    fail++;
    console.log("  FAIL " + label + (extra ? " — " + extra : ""));
  }
};

console.log("== primers ==");
const s = await get("/api/session?mode=mixed&size=12");
const first = s.data.items[0];
check("items carry moduleSlug", s.data.items.every((i) => typeof i.moduleSlug === "string" && i.moduleSlug));
check("items carry moduleSummary", s.data.items.every((i) => typeof i.moduleSummary === "string"));
// A mixed session on a well-drilled database may contain no first-time
// module at all, so find one explicitly and drill it in module mode.
const sheet = await get("/api/cheatsheet");
const untouched = sheet.data.flatMap((t) => t.modules).find((m) => m.seenItems === 0);
if (untouched) {
  const fresh = await get(`/api/session?mode=module&moduleId=${untouched.moduleId}&size=5`);
  check(
    "first-time module items carry key ideas",
    fresh.data.items.length > 0 &&
      fresh.data.items.every((i) => Array.isArray(i.moduleKeyIdeas) && i.moduleKeyIdeas.length >= 3),
    `module ${untouched.moduleId}: ${fresh.data.items.filter((i) => Array.isArray(i.moduleKeyIdeas)).length}/${fresh.data.items.length}`
  );
} else {
  console.log("  (every module already touched — primer assertion skipped; use a fresh db to exercise it)");
}

console.log("\n== module endpoint ==");
const mod = await get(`/api/path?module=${first.moduleSlug}`);
check("module detail loads", mod.success, JSON.stringify(mod).slice(0, 100));
check("has brief and 3+ key ideas", mod.data.module.brief.length > 200 && mod.data.module.keyIdeas.length >= 3);
check(
  "lists its items with status",
  mod.data.items.length > 0 &&
    mod.data.items.every((i) => ["unseen", "due", "learning", "mastered"].includes(i.status))
);
check("has progress", typeof mod.data.progress?.mastery === "number");
const missing = await fetch(BASE + "/api/path?module=nope-nope");
check("unknown module is a 404", missing.status === 404);

console.log("\n== cheat sheet ==");
const cs = await get("/api/cheatsheet");
check("cheat sheet loads 10 tracks", cs.success && cs.data.length === 10);
const totalIdeas = cs.data.reduce((n, t) => n + t.modules.reduce((m, x) => m + x.keyIdeas.length, 0), 0);
check(
  "every module has key ideas",
  cs.data.every((t) => t.modules.every((m) => m.keyIdeas.length >= 3)),
  String(totalIdeas)
);
console.log("  (" + totalIdeas + " ideas total)");

console.log("\n== second attempt ==");
const mcq = s.data.items.find((i) => i.kind === "mcq" && i.reps === 0) ?? s.data.items.find((i) => i.kind === "mcq");
const right = mcq.payload.choices.find((c) => c.correct).id;
const a2 = await post("/api/attempts", {
  itemId: mcq.id,
  response: { kind: "mcq", choiceId: right },
  timeSpent: 10,
  mode: "mixed",
  attempt: 2,
});
check("second-try correct is marked correct", a2.data.grade.correct === true);
check("…but scores 0.5", a2.data.grade.score === 0.5, String(a2.data.grade.score));
check("…and carries attempt: 2", a2.data.grade.attempt === 2);
check("…and is scheduled Hard (rating 2)", a2.data.rating === 2, String(a2.data.rating));

const mcq2 = s.data.items.find((i) => i.kind === "mcq" && i.id !== mcq.id);
const right2 = mcq2.payload.choices.find((c) => c.correct).id;
const a1 = await post("/api/attempts", {
  itemId: mcq2.id,
  response: { kind: "mcq", choiceId: right2 },
  timeSpent: 10,
  mode: "mixed",
  attempt: 1,
});
check("first-try correct scores 1", a1.data.grade.score === 1 && a1.data.grade.attempt !== 2);

const wrong2 = mcq2.payload.choices.find((c) => !c.correct).id;
const aw = await post("/api/attempts", {
  itemId: mcq2.id,
  response: { kind: "mcq", choiceId: wrong2 },
  timeSpent: 10,
  mode: "mixed",
  attempt: 2,
});
check("second-try wrong is still wrong, rating Again", aw.data.grade.correct === false && aw.data.rating === 1);

console.log("\n== primer disappears after touching a module ==");
const again = await get(`/api/session?mode=module&moduleId=${mcq.moduleId}&size=10`);
check("touched module no longer sends key ideas", again.data.items.every((i) => i.moduleKeyIdeas === null));

console.log("\n== pages ==");
for (const p of ["/app/cheatsheet", `/app/path/${first.trackSlug}/${first.moduleSlug}`, `/app/path/${first.trackSlug}`]) {
  const r = await fetch(BASE + p);
  check(`${p} → ${r.status}`, r.status === 200);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
