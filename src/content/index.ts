import type { AuthoredTrack } from "./builder";
import { CONCEPT_BY_SLUG, CONCEPTS, type ConceptDef } from "./concepts";

import javascript from "./tracks/javascript";
import typescript from "./tracks/typescript";
import react from "./tracks/react";
import node from "./tracks/node";
import csharp from "./tracks/csharp";
import dotnet from "./tracks/dotnet";
import sql from "./tracks/sql";
import web from "./tracks/web";
import testing from "./tracks/testing";
import devops from "./tracks/devops";

/**
 * Track order defines the roadmap reading order: language first,
 * then the frameworks built on it, then the cross-cutting skills.
 */
export const TRACKS: AuthoredTrack[] = [
  javascript,
  typescript,
  react,
  node,
  csharp,
  dotnet,
  sql,
  web,
  testing,
  devops,
];

/** Every concept slug referenced by an item, with a definition guaranteed. */
export function resolveConcepts(): ConceptDef[] {
  const used = new Set<string>();
  for (const track of TRACKS) {
    for (const mod of track.modules) {
      for (const item of mod.items) {
        for (const slug of item.conceptIds) used.add(slug);
      }
    }
  }

  const resolved: ConceptDef[] = [];
  for (const slug of used) {
    const known = CONCEPT_BY_SLUG.get(slug);
    resolved.push(
      known ?? {
        slug,
        name: titleCase(slug),
        description: "",
        explanation: "",
      }
    );
  }

  // Keep registry order stable, then any ad-hoc slugs alphabetically.
  const registryOrder = new Map(CONCEPTS.map((c, i) => [c.slug, i]));
  return resolved.sort((a, b) => {
    const ai = registryOrder.get(a.slug) ?? Number.MAX_SAFE_INTEGER;
    const bi = registryOrder.get(b.slug) ?? Number.MAX_SAFE_INTEGER;
    return ai !== bi ? ai - bi : a.slug.localeCompare(b.slug);
  });
}

export function contentStats() {
  let modules = 0;
  let items = 0;
  const byKind: Record<string, number> = {};
  const byLevel: Record<number, number> = {};

  for (const track of TRACKS) {
    modules += track.modules.length;
    for (const mod of track.modules) {
      items += mod.items.length;
      byLevel[mod.level] = (byLevel[mod.level] ?? 0) + mod.items.length;
      for (const item of mod.items) {
        byKind[item.kind] = (byKind[item.kind] ?? 0) + 1;
      }
    }
  }

  return { tracks: TRACKS.length, modules, items, byKind, byLevel };
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
