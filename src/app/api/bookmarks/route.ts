import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { now } from "@/lib/utils";
import { toItem } from "@/lib/sessionBuilder";

const USER = "default-user";

export async function GET() {
  const marks = db
    .select()
    .from(schema.bookmarks)
    .where(eq(schema.bookmarks.userId, USER))
    .all();

  if (marks.length === 0) return NextResponse.json({ success: true, data: [] });

  const rows = db
    .select()
    .from(schema.items)
    .where(inArray(schema.items.id, marks.map((m) => m.itemId)))
    .all();

  const tracks = new Map(db.select().from(schema.tracks).all().map((t) => [t.id, t]));

  return NextResponse.json({
    success: true,
    data: rows.map((r) => ({
      ...toItem(r),
      trackName: tracks.get(r.trackId)?.name ?? "",
      trackColor: tracks.get(r.trackId)?.color ?? "#6366f1",
    })),
  });
}

export async function POST(request: Request) {
  const { itemId, note } = await request.json();
  if (!itemId) {
    return NextResponse.json({ success: false, error: "itemId required" }, { status: 400 });
  }

  const existing = db
    .select()
    .from(schema.bookmarks)
    .where(and(eq(schema.bookmarks.userId, USER), eq(schema.bookmarks.itemId, itemId)))
    .get();

  if (existing) {
    db.delete(schema.bookmarks)
      .where(and(eq(schema.bookmarks.userId, USER), eq(schema.bookmarks.itemId, itemId)))
      .run();
    return NextResponse.json({ success: true, data: { bookmarked: false } });
  }

  db.insert(schema.bookmarks)
    .values({ userId: USER, itemId, note: note ?? "", createdAt: now() })
    .run();

  return NextResponse.json({ success: true, data: { bookmarked: true } });
}
