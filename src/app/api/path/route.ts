import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { and, eq } from "drizzle-orm";
import {
  answeredToday,
  currentStreak,
  loadProgressContext,
  moduleProgress,
  overdueCount,
  trackProgress,
} from "@/lib/progress";
import { parseIdeas, toItem } from "@/lib/sessionBuilder";
import { isMastered } from "@/lib/fsrs";
import { DEFAULT_USER_ID } from "@/lib/user";
import { fail, ok, serverError } from "@/lib/api";

/**
 * The roadmap. Without `track`, returns every track with its progress
 * plus the today-panel numbers. With `?track=<slug>`, returns that
 * track's modules and briefs. With `?module=<slug>`, one module's page.
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

      if (!track) return fail("Unknown track", 404);

      const ctx = loadProgressContext(DEFAULT_USER_ID);
      const progress = moduleProgress(track.id, DEFAULT_USER_ID, ctx.cards);
      const summary = trackProgress(DEFAULT_USER_ID, ctx).find((t) => t.trackId === track.id);

      return ok({ track, modules: progress, progress: summary });
    }

    const user = db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, DEFAULT_USER_ID))
      .get();

    return ok({
      tracks: trackProgress(),
      today: {
        answered: answeredToday(),
        goal: user?.dailyGoal ?? 20,
        due: overdueCount(),
        // Computed live: the stored `streakCount` is only refreshed when
        // an attempt is recorded, so after a missed day it would still
        // show yesterday's streak.
        streak: currentStreak(),
        targetRole: user?.targetRole ?? "",
      },
    });
  } catch (error) {
    return serverError("Failed to load path", error);
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

  const { cards } = loadProgressContext(DEFAULT_USER_ID);
  const siblings = moduleProgress(track.id, DEFAULT_USER_ID, cards);
  const index = siblings.findIndex((m) => m.moduleId === mod.id);
  // Removed from content: its row survives for history, but it has no
  // published items and is not part of the roadmap any more.
  if (index === -1) return { success: false as const, error: "Unknown module" };
  const progress = siblings[index];

  const items = db
    .select()
    .from(schema.items)
    .where(and(eq(schema.items.moduleId, mod.id), eq(schema.items.isPublished, true)))
    .all();

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
      next: index < siblings.length - 1 ? siblings[index + 1] : null,
    },
  };
}
