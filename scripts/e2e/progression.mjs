// Verifies the roadmap actually progresses: answering a track's
// level-1 items correctly, repeatedly, should unlock level 2 and start
// surfacing level-2 material in that track's sessions.
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

function answer(item) {
  const p = item.payload;
  switch (item.kind) {
    case "mcq":
    case "predict-output":
      return { kind: item.kind, choiceId: p.choices.find((c) => c.correct).id };
    case "multi":
      return { kind: "multi", choiceIds: p.choices.filter((c) => c.correct).map((c) => c.id) };
    case "truefalse":
      return { kind: "truefalse", value: p.answer };
    case "fill-blank": {
      const values = {};
      for (const b of p.blanks) values[b.id] = b.accept[0];
      return { kind: "fill-blank", values };
    }
    case "order":
      return { kind: "order", order: p.steps.map((s) => s.id) };
    case "code":
      return { kind: "code", code: p.solutionCode };
    case "short":
      return { kind: "short", text: "", selfRating: 4 };
  }
}

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

// Pick a track that is still at level 1 so the test is meaningful on a
// database that has been drilled before.
const tracksBefore = (await get("/api/path")).data.tracks;
const before = tracksBefore.find((t) => t.currentLevel === 1) ?? tracksBefore[0];
console.log(`start: ${before.trackName} at level ${before.currentLevel}, mastery ${before.mastery}%`);

let unlockedAt = null;
for (let round = 1; round <= 14 && !unlockedAt; round++) {
  const s = await get(`/api/session?mode=track&trackId=${before.trackId}&size=20`);
  if (!s.data.items.length) break;

  for (const item of s.data.items) {
    const res = await post("/api/attempts", {
      itemId: item.id,
      response: answer(item),
      timeSpent: 12,
      mode: "track",
    });
    if (res.data?.unlocked) {
      unlockedAt = { round, ...res.data.unlocked };
      break;
    }
  }
}

const after = (await get("/api/path")).data.tracks.find((t) => t.trackId === before.trackId);
console.log(
  `end:   ${after.trackName} at level ${after.currentLevel}, mastery ${after.mastery}%, ` +
    `${after.seenItems}/${after.totalItems} seen`
);

console.log("");
if (before.currentLevel === 1) {
  check("next level unlocked after sustained correct answers", after.currentLevel >= 2, `still level ${after.currentLevel}`);
  check("the unlock was reported to the client", unlockedAt !== null, JSON.stringify(unlockedAt));
} else {
  console.log("  (every track already past level 1 — unlock assertions skipped)");
}
check("mastery did not decrease", after.mastery >= before.mastery, `${before.mastery} -> ${after.mastery}`);
check("coverage did not decrease", after.seenItems >= before.seenItems);

const nowSession = await get(`/api/session?mode=track&trackId=${before.trackId}&size=25`);
const levels = new Set(nowSession.data.items.map((i) => i.level));
check(
  "higher-level items now appear in track sessions",
  [...levels].some((l) => l >= Math.min(2, after.currentLevel)),
  "levels seen: " + [...levels].join(",")
);

const dash = (await get("/api/dashboard")).data;
check("review forecast has entries", dash.forecast.some((f) => f.count > 0));
check("some items count as seen", dash.stats.itemsSeen > 10, String(dash.stats.itemsSeen));
check("accuracy is high after all-correct answers", dash.stats.accuracy > 60, String(dash.stats.accuracy));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
