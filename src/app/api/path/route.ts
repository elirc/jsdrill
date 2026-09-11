import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq } from "drizzle-orm";
import { moduleProgress, trackProgress, answeredToday, overdueCount } from "@/lib/progress";
import { parseIdeas, toItem } from "@/lib/sessionBuilder";
import { isMastered } from "@/lib/fsrs";

/**
 * The roadmap. Without `track`, returns every track with its progress
 * plus the today-panel numbers. With `?track=<slug>`, returns that
 * track's modules and briefs.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("track");
  const moduleSlug = searchParams.get("module");

  try {
    if (moduleSlug) {
      const detail = moduleDetail(moduleSlug);
      return NextResponse.json(detail, { status: detail.success ? 200 : 404 });
    }

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

      const progress = moduleProgress(track.id);

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

/**
 * One module: its brief, key ideas, progress, neighbours for
 * prev/next navigation, and every item with the learner's status.
 */
function moduleDetail(moduleSlug: string) {
  const mod = db
    .select()
    .from(schema.modules)
    .where(eq(schema.modules.slug, moduleSlug))
    .get();
  if (!mod) return { success: false as const, error: "Unknown module" };

  const track = db.select().from(schema.tracks).where(eq(schema.tracks.id, mod.trackId)).get();
  if (!track) return { success: false as const, error: "Unknown track" };

  const siblings = moduleProgress(track.id);
  const index = siblings.findIndex((m) => m.moduleId === mod.id);
  const progress = siblings[index];

  const items = db.select().from(schema.items).where(eq(schema.items.moduleId, mod.id)).all();
  const cards = new Map(
    db
      .select()
      .from(schema.userCards)
      .where(eq(schema.userCards.userId, "default-user"))
      .all()
      .map((c) => [c.itemId, c])
  );

  const nowIso = new Date().toISOString();
  const itemStatus = items
    .sort((a, b) => a.difficulty - b.difficulty)
    .map((row) => {
      const card = cards.get(row.id);
      const base = toItem(row);
      let status: "unseen" | "due" | "learning" | "mastered" = "unseen";
      if (card && card.reps > 0) {
        if (isMastered(card)) status = "mastered";
        else if (card.due <= nowIso) status = "due";
        else status = "learning";
      }
      return {
        id: base.id,
        kind: base.kind,
        prompt: base.prompt,
        difficulty: base.difficulty,
        estSeconds: base.estSeconds,
        status,
        accuracy:
          card && card.totalCount > 0
            ? Math.round((card.correctCount / card.totalCount) * 100)
            : null,
      };
    });

  return {
    success: true as const,
    data: {
      track,
      module: {
        id: mod.id,
        slug: mod.slug,
        title: mod.title,
        level: mod.level,
        summary: mod.summary,
        brief: mod.brief,
        keyIdeas: parseIdeas(mod.keyIdeas),
      },
      progress,
      items: itemStatus,
      prev: index > 0 ? siblings[index - 1] : null,
      next: index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null,
    },
  };
}
