"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, Inline, Spinner } from "@/components/ui";
import { LEVEL_META, type ModuleProgress, type Track } from "@/types";
import { masteryLabel, tint } from "@/lib/utils";

type Section = { track: Track; modules: ModuleProgress[] };

/**
 * The night-before page: every module's key ideas on one scrollable
 * sheet, with a track filter and the option to hide what's already
 * strong so the eye lands on what still needs work.
 */
export default function CheatSheetPage() {
  const [sections, setSections] = useState<Section[] | null>(null);
  const [trackFilter, setTrackFilter] = useState<string>("all");
  const [onlyShaky, setOnlyShaky] = useState(false);

  useEffect(() => {
    fetch("/api/cheatsheet")
      .then((r) => r.json())
      .then((json) => json.success && setSections(json.data))
      .catch(console.error);
  }, []);

  const visible = useMemo(() => {
    if (!sections) return [];
    return sections
      .filter((s) => trackFilter === "all" || s.track.slug === trackFilter)
      .map((s) => ({
        ...s,
        modules: s.modules.filter((m) => !onlyShaky || m.mastery < 60),
      }))
      .filter((s) => s.modules.length > 0);
  }, [sections, trackFilter, onlyShaky]);

  if (!sections) return <Spinner label="Assembling the sheet…" />;

  const ideaCount = visible.reduce(
    (n, s) => n + s.modules.reduce((m, mod) => m + mod.keyIdeas.length, 0),
    0
  );

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
            Cheat sheet
          </h1>
          <p className="text-[15px] mt-1.5 max-w-2xl leading-relaxed" style={{ color: "var(--text-muted)" }}>
            The key ideas from every module, on one page. Read it the night before; drill
            whatever still feels shaky.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-1 p-1 rounded-lg" style={{ background: "var(--bg-inset)" }}>
            <FilterChip active={trackFilter === "all"} onClick={() => setTrackFilter("all")}>
              All tracks
            </FilterChip>
            {sections.map((s) => (
              <FilterChip
                key={s.track.slug}
                active={trackFilter === s.track.slug}
                color={s.track.color}
                onClick={() => setTrackFilter(s.track.slug)}
              >
                {s.track.name}
              </FilterChip>
            ))}
          </div>

          <label className="ml-auto flex items-center gap-2 cursor-pointer text-[13.5px]" style={{ color: "var(--text-muted)" }}>
            <input
              type="checkbox"
              checked={onlyShaky}
              onChange={(e) => setOnlyShaky(e.target.checked)}
              style={{ accentColor: "var(--accent)" }}
            />
            Only what&apos;s not yet solid
          </label>
        </div>

        <p className="text-[12.5px]" style={{ color: "var(--text-faint)" }}>
          {ideaCount} ideas across {visible.reduce((n, s) => n + s.modules.length, 0)} modules
        </p>
      </header>

      {visible.length === 0 && (
        <Card padding="lg" className="text-center">
          <p className="text-[15px]" style={{ color: "var(--text-muted)" }}>
            Everything here is solid. Nice.
          </p>
        </Card>
      )}

      {visible.map(({ track, modules }) => (
        <section key={track.slug} className="flex flex-col gap-3">
          <div className="flex items-center gap-3 sticky top-14 py-2 z-10" style={{ background: "var(--bg)" }}>
            <span
              className="h-8 w-8 rounded-lg flex items-center justify-center text-[12px] font-bold flex-none"
              style={{ background: tint(track.color, 0.16), color: track.color }}
            >
              {track.icon}
            </span>
            <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
              {track.name}
            </h2>
          </div>

          {modules.map((mod) => (
            <Card key={mod.moduleId} accent={mod.mastery < 30 ? undefined : track.color}>
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/app/path/${track.slug}/${mod.moduleSlug}`}
                      className="text-[16px] font-semibold hover:underline"
                      style={{ color: "var(--text)" }}
                    >
                      {mod.title}
                    </Link>
                    <Badge>{LEVEL_META[mod.level].short}</Badge>
                  </div>
                </div>
                <div className="flex-none text-right">
                  <div
                    className="text-[14px] font-semibold tabular-nums"
                    style={{
                      color:
                        mod.mastery >= 60
                          ? "var(--good)"
                          : mod.mastery > 0
                            ? "var(--warn)"
                            : "var(--text-faint)",
                    }}
                  >
                    {mod.seenItems === 0 ? "New" : `${mod.mastery}%`}
                  </div>
                  <div className="text-[11.5px]" style={{ color: "var(--text-faint)" }}>
                    {mod.seenItems === 0 ? "not started" : masteryLabel(mod.mastery)}
                  </div>
                </div>
              </div>

              <ul className="flex flex-col gap-2">
                {mod.keyIdeas.map((idea, i) => (
                  <li
                    key={i}
                    className="flex gap-3 text-[15px] leading-[1.65]"
                    style={{ color: "var(--text)" }}
                  >
                    <span className="flex-none mt-[3px]" style={{ color: track.color }}>
                      ▪
                    </span>
                    <span className="prose-inline">
                      <Inline>{idea}</Inline>
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-3 border-t flex items-center gap-4 text-[12.5px]" style={{ borderColor: "var(--border)" }}>
                <Link
                  href={`/app/drill?mode=module&moduleId=${mod.moduleId}&size=${Math.min(mod.totalItems, 12)}`}
                  className="font-medium hover:underline"
                  style={{ color: "var(--accent)" }}
                >
                  Drill this module →
                </Link>
                <Link
                  href={`/app/path/${track.slug}/${mod.moduleSlug}`}
                  className="hover:underline"
                  style={{ color: "var(--text-faint)" }}
                >
                  Read the full brief
                </Link>
              </div>
            </Card>
          ))}
        </section>
      ))}
    </div>
  );
}

function FilterChip({
  active,
  color,
  onClick,
  children,
}: {
  active: boolean;
  color?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1.5 rounded-md text-[12.5px] font-medium transition-all whitespace-nowrap"
      style={{
        background: active ? "var(--surface)" : "transparent",
        color: active ? (color ?? "var(--text)") : "var(--text-faint)",
      }}
    >
      {children}
    </button>
  );
}
