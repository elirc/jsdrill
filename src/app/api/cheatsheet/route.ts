import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";
import { moduleProgress } from "@/lib/progress";

/**
 * Every module's key ideas grouped by track, with mastery — the
 * night-before review, with the shaky sections visible at a glance.
 */
export async function GET() {
  try {
    const tracks = db.select().from(schema.tracks).orderBy(asc(schema.tracks.sortOrder)).all();

    const data = tracks.map((track) => ({
      track,
      modules: moduleProgress(track.id),
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Cheat sheet failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load cheat sheet" },
      { status: 500 }
    );
  }
}
