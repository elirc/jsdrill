import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, inArray } from "drizzle-orm";
import { toItem } from "@/lib/sessionBuilder";
import type { ConceptStrength } from "@/types";
import { conceptStrengths } from "@/lib/progress";

/** Concept library: every concept with its strength and linked items. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const conceptSlug = searchParams.get("concept");

  try {
    if (!conceptSlug) {
      const concepts = db.select().from(schema.concepts).all();
      const strengths = new Map<string, ConceptStrength>(
        conceptStrengths().map((s) => [s.conceptId, s])
      );

      const data = concepts
        .map((c) => ({
          ...c,
          strength: strengths.get(c.id),
        }))
        .filter((c) => c.strength);

      return NextResponse.json({ success: true, data });
    }

    const concept = db
      .select()
      .from(schema.concepts)
      .where(eq(schema.concepts.slug, conceptSlug))
      .get();

    if (!concept) {
      return NextResponse.json({ success: false, error: "Unknown concept" }, { status: 404 });
    }

    const itemIds = db
      .select({ itemId: schema.itemConcepts.itemId })
      .from(schema.itemConcepts)
      .where(eq(schema.itemConcepts.conceptId, concept.id))
      .all()
      .map((r) => r.itemId);

    const rows = itemIds.length
      ? db.select().from(schema.items).where(inArray(schema.items.id, itemIds)).all()
      : [];

    const tracks = new Map(db.select().from(schema.tracks).all().map((t) => [t.id, t]));

    return NextResponse.json({
      success: true,
      data: {
        concept,
        items: rows.map((r) => ({
          ...toItem(r),
          trackName: tracks.get(r.trackId)?.name ?? "",
          trackColor: tracks.get(r.trackId)?.color ?? "#6366f1",
        })),
      },
    });
  } catch (error) {
    console.error("Items failed:", error);
    return NextResponse.json({ success: false, error: "Failed to load items" }, { status: 500 });
  }
}
