import { LEVEL_META, LEVELS, type Level } from "@/types";

/** Four pips, filled up to the learner's current level in a track. */
export function LevelPips({ current, color }: { current: Level; color: string }) {
  return (
    <div
      className="flex items-center gap-1"
      role="img"
      aria-label={`Level ${current} of ${LEVELS.length}: ${LEVEL_META[current].name}`}
    >
      {LEVELS.map((level) => {
        const unlocked = level <= current;
        return (
          <span
            key={level}
            title={`${LEVEL_META[level].short} ${LEVEL_META[level].name}${unlocked ? "" : " — locked"}`}
            className="h-1.5 w-5 rounded-full transition-colors"
            style={{ background: unlocked ? color : "var(--bg-inset)" }}
          />
        );
      })}
    </div>
  );
}
