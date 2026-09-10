import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { moduleProgress, trackProgress, answeredToday, overdueCount } from "@/lib/progress";

/**
 * The roadmap. Without `track`, returns every track with its progress
 * plus the today-panel numbers. With `?track=<slug>`, returns that
 * track's modules and briefs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("track");

  try {
    if (slug) {
      const track = db
        .select()
        .from(schema.tracks)
        .where(eq(schema.tracks.slug, slug))
        .get();

      if (!track) {
        return NextResponse.json(
          { success: false, error: "Unknown track" },
          { status: 404 }
        );
      }

      const modules = db
        .select()
        .from(schema.modules)
        .where(eq(schema.modules.trackId, track.id))
        .all();

      const briefs = new Map(modules.map((m) => [m.id, m.brief]));
      const progress = moduleProgress(track.id).map((m) => ({
        ...m,
        brief: briefs.get(m.moduleId) ?? "",
      }));

      const summary = trackProgress().find((t) => t.trackId === track.id);

      return NextResponse.json({
        success: true,
        data: { track, modules: progress, progress: summary },
      });
    }

    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, "default-user"))
      .get();

    return NextResponse.json({
      success: true,
      data: {
        tracks: trackProgress(),
        today: {
          answered: answeredToday(),
          goal: user?.dailyGoal ?? 20,
          due: overdueCount(),
          streak: user?.streakCount ?? 0,
          targetRole: user?.targetRole ?? "",
        },
      },
    });
  } catch (error) {
    console.error("Path failed:", error);
    return NextResponse.json({ success: false, error: "Failed to load path" }, { status: 500 });
  }
}
