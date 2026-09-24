import { db, schema } from "@/lib/db";
import { eq, and, inArray } from "drizzle-orm";
import { now } from "@/lib/utils";
import { toItem } from "@/lib/sessionBuilder";
import { DEFAULT_USER_ID } from "@/lib/user";
import { fail, isRecord, ok, parseJson, serverError, type Checked } from "@/lib/api";

const MAX_NOTE_CHARS = 2000;

export async function GET() {
  try {
    const marks = db
      .select()
      .from(schema.bookmarks)
      .where(eq(schema.bookmarks.userId, DEFAULT_USER_ID))
      .all();

    if (marks.length === 0) return ok([]);

    const rows = db
      .select()
      .from(schema.items)
      .where(inArray(schema.items.id, marks.map((m) => m.itemId)))
      .all();

    const tracks = new Map(db.select().from(schema.tracks).all().map((t) => [t.id, t]));

    return ok(
      rows.map((r) => ({
        ...toItem(r),
        trackName: tracks.get(r.trackId)?.name ?? "",
        trackColor: tracks.get(r.trackId)?.color ?? "#6366f1",
      }))
    );
  } catch (error) {
    return serverError("Failed to load bookmarks", error);
  }
}

function checkBody(body: unknown): Checked<{ itemId: string; note: string }> {
  if (!isRecord(body) || typeof body.itemId !== "string" || !body.itemId) {
    return { error: "itemId required" };
  }
  if (body.note !== undefined && body.note !== null && typeof body.note !== "string") {
    return { error: "note must be a string" };
  }
  const note = typeof body.note === "string" ? body.note.slice(0, MAX_NOTE_CHARS) : "";
  return { value: { itemId: body.itemId, note } };
}

/** Toggles a bookmark: adds it if absent, removes it if present. */
export async function POST(request: Request) {
  const parsed = await parseJson(request, checkBody);
  if (parsed.response) return parsed.response;
  const { itemId, note } = parsed.value;

  try {
    const where = and(
      eq(schema.bookmarks.userId, DEFAULT_USER_ID),
      eq(schema.bookmarks.itemId, itemId)
    );
    const existing = db.select().from(schema.bookmarks).where(where).get();

    if (existing) {
      db.delete(schema.bookmarks).where(where).run();
      return ok({ bookmarked: false });
    }

    // Check first: otherwise an unknown id surfaces as a foreign-key 500.
    const item = db
      .select({ id: schema.items.id })
      .from(schema.items)
      .where(eq(schema.items.id, itemId))
      .get();
    if (!item) return fail("Unknown item", 404);

    db.insert(schema.bookmarks)
      .values({ userId: DEFAULT_USER_ID, itemId, note, createdAt: now() })
      .run();

    return ok({ bookmarked: true });
  } catch (error) {
    return serverError("Failed to update bookmark", error);
  }
}
