/**
 * Curriculum shape at a glance: items per track and module, the kind
 * mix, and which levels each track covers — the numbers you want when
 * deciding what to write next.
 *
 *   npm run content:stats
 */
import { TRACKS, contentStats } from "../src/content";
import { LEVELS } from "../src/types";

const stats = contentStats();

function kindMix(kinds: Record<string, number>): string {
  return Object.entries(kinds)
    .sort((a, b) => b[1] - a[1])
    .map(([kind, n]) => `${kind} ${n}`)
    .join(", ");
}

console.log("");
console.log(`  ${stats.tracks} tracks · ${stats.modules} modules · ${stats.items} items`);
console.log(`  kinds   ${kindMix(stats.byKind)}`);
console.log(`  levels  ${LEVELS.map((l) => `L${l} ${stats.byLevel[l] ?? 0}`).join("  ")}`);

for (const track of TRACKS) {
  const total = track.modules.reduce((n, m) => n + m.items.length, 0);
  const covered = new Set(track.modules.map((m) => m.level));
  const gaps = LEVELS.filter((l) => !covered.has(l));

  console.log("");
  console.log(
    `  ${track.slug} (${total})` + (gaps.length ? `  — no ${gaps.map((l) => `L${l}`).join("/")}` : "")
  );
  for (const m of track.modules) {
    const kinds: Record<string, number> = {};
    for (const item of m.items) kinds[item.kind] = (kinds[item.kind] ?? 0) + 1;
    console.log(
      `    ${m.slug.padEnd(18)} L${m.level}  ${String(m.items.length).padStart(2)}  ${kindMix(kinds)}`
    );
  }
}
console.log("");
