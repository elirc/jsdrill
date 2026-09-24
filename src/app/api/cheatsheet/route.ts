import { db, schema } from "@/lib/db";
import { asc } from "drizzle-orm";
import { loadProgressContext, moduleProgress } from "@/lib/progress";
import { DEFAULT_USER_ID } from "@/lib/user";
import { ok, serverError } from "@/lib/api";

/**
 * Every module's key ideas grouped by track, with mastery — the
 * night-before review, with the shaky sections visible at a glance.
 */
export async function GET() {
  try {
    const tracks = db.select().from(schema.tracks).orderBy(asc(schema.tracks.sortOrder)).all();
    // Load the learner's cards once, not once per track.
    const { cards } = loadProgressContext(DEFAULT_USER_ID);

    const data = tracks
      .map((track) => ({
        track,
        modules: moduleProgress(track.id, DEFAULT_USER_ID, cards),
      }))
      // A track removed from content has no published modules left.
      .filter((t) => t.modules.length > 0);

    return ok(data);
  } catch (error) {
    return serverError("Failed to load cheat sheet", error);
  }
}
