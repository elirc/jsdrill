"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { useApi } from "@/components/useApi";
import { Badge, Card, ErrorState, Inline, Markdown, Spinner } from "@/components/ui";
import type { Concept, ConceptStrength } from "@/types";

type ConceptRow = Concept & { strength: ConceptStrength };

const STRENGTH: Record<
  ConceptStrength["strength"],
  { label: string; color: string; tone: "neutral" | "good" | "warn" | "bad" }
> = {
  none: { label: "Not started", color: "var(--text-faint)", tone: "neutral" },
  shaky: { label: "Shaky", color: "var(--bad)", tone: "bad" },
  learning: { label: "Learning", color: "var(--warn)", tone: "warn" },
  strong: { label: "Strong", color: "var(--good)", tone: "good" },
};

export default function ConceptsPage() {
  return (
    <Suspense fallback={<Spinner />}>
      <Concepts />
    </Suspense>
  );
}

function Concepts() {
  const params = useSearchParams();
  const selected = params.get("c");

  const { data: concepts, error, retry } = useApi<ConceptRow[]>("/api/items");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | ConceptStrength["strength"]>("all");

  const filtered = useMemo(() => {
    if (!concepts) return [];
    const q = query.trim().toLowerCase();
    return concepts.filter((c) => {
      if (filter !== "all" && c.strength.strength !== filter) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.explanation.toLowerCase().includes(q)
      );
    });
  }, [concepts, query, filter]);

  if (error) {
    return <ErrorState as="h1" title="Couldn’t load the concept library" message={error.message} onRetry={retry} />;
  }
  if (!concepts) return <Spinner label="Loading concepts…" />;

  const active = concepts.find((c) => c.slug === selected);

  return (
    <div className="flex flex-col gap-5">
      <header>
        <h1 className="text-xl font-semibold tracking-tight" style={{ color: "var(--text)" }}>
          Concept library
        </h1>
        <p className="text-[13.5px] mt-1.5 max-w-2xl" style={{ color: "var(--text-muted)" }}>
          The ideas that cut across tracks. Closures show up in JavaScript and in React hooks; N+1
          shows up in EF Core and in SQL. Your strength here is scored by idea rather than by
          technology.
        </p>
      </header>

      {/* ─── Controls ─── */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search concepts…"
          aria-label="Search concepts"
          className="flex-1 rounded-lg border px-3.5 py-2 text-[13.5px] outline-none"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            color: "var(--text)",
          }}
        />

        <div
          role="group"
          aria-label="Filter by strength"
          className="flex gap-1 p-1 rounded-lg overflow-x-auto"
          style={{ background: "var(--bg-inset)" }}
        >
          {(["all", "shaky", "learning", "strong", "none"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={filter === key}
              onClick={() => setFilter(key)}
              className="px-2.5 py-1.5 rounded-md text-[12px] font-medium capitalize transition-all whitespace-nowrap flex-1 sm:flex-none"
              style={{
                background: filter === key ? "var(--surface)" : "transparent",
                color:
                  filter === key
                    ? key === "all"
                      ? "var(--text)"
                      : STRENGTH[key].color
                    : "var(--text-faint)",
              }}
            >
              {key === "none" ? "New" : key}
            </button>
          ))}
        </div>
      </div>

      {/* ─── Detail ─── */}
      {active && (
        <Card raised padding="lg" className="animate-rise">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-[17px] font-semibold" style={{ color: "var(--text)" }}>
                  {active.name}
                </h2>
                <Badge tone={STRENGTH[active.strength.strength].tone}>
                  {STRENGTH[active.strength.strength].label}
                </Badge>
              </div>
              <p className="text-[13px] mt-1" style={{ color: "var(--text-muted)" }}>
                {active.description}
              </p>
            </div>
            <Link
              href="/app/concepts"
              scroll={false}
              aria-label={`Close ${active.name}`}
              className="text-[12px] flex-none hover:underline"
              style={{ color: "var(--text-faint)" }}
            >
              Close
            </Link>
          </div>

          {active.explanation && (
            <div className="mt-4">
              <Markdown>{active.explanation}</Markdown>
            </div>
          )}

          <div
            className="mt-5 pt-4 border-t flex flex-wrap gap-x-6 gap-y-2 text-[12.5px]"
            style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
          >
            <span>
              <strong style={{ color: "var(--text)" }}>{active.strength.seenItems}</strong> of{" "}
              {active.strength.totalItems} items seen
            </span>
            {active.strength.seenItems > 0 && (
              <>
                <span>
                  <strong style={{ color: "var(--text)" }}>{active.strength.accuracy}%</strong> accuracy
                </span>
                <span>
                  Retention{" "}
                  <strong style={{ color: "var(--text)" }}>
                    {active.strength.averageStability}d
                  </strong>
                </span>
              </>
            )}
          </div>
        </Card>
      )}

      {/* ─── Grid ─── */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {filtered.map((concept) => {
          const meta = STRENGTH[concept.strength.strength];
          const isActive = concept.slug === selected;
          return (
            <li key={concept.id}>
              <Link
                href={isActive ? "/app/concepts" : `/app/concepts?c=${concept.slug}`}
                aria-current={isActive ? "true" : undefined}
                className="block h-full text-left rounded-xl"
              >
                <Card
                  className="h-full transition-all duration-150 hover:-translate-y-0.5"
                  style={{
                    cursor: "pointer",
                    borderColor: isActive ? "var(--accent)" : undefined,
                  }}
                >
                  <div className="flex items-start gap-2">
                    <span
                      aria-hidden
                      title={meta.label}
                      className="h-1.5 w-1.5 rounded-full flex-none mt-[7px]"
                      style={{ background: meta.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <h2 className="text-[13.5px] font-medium" style={{ color: "var(--text)" }}>
                        {concept.name}
                      </h2>
                      <p
                        className="text-[12px] mt-1 leading-relaxed line-clamp-2"
                        style={{ color: "var(--text-muted)" }}
                      >
                        <Inline>{concept.description}</Inline>
                      </p>
                      <div
                        className="text-[11px] mt-2 tabular-nums"
                        style={{ color: "var(--text-faint)" }}
                      >
                        <span style={{ color: meta.color }}>{meta.label}</span> ·{" "}
                        {concept.strength.seenItems}/{concept.strength.totalItems} items
                        {concept.strength.seenItems > 0 && ` · ${concept.strength.accuracy}%`}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {filtered.length === 0 && (
        <p className="text-center text-[13px] py-8" style={{ color: "var(--text-faint)" }}>
          No concepts match that filter.
        </p>
      )}
    </div>
  );
}
