import { buildSession } from "@/lib/sessionBuilder";
import { fail, ok, serverError } from "@/lib/api";
import { LEVELS, type Level, type SessionMode, type SessionSpec } from "@/types";

const MODES: SessionMode[] = ["mixed", "track", "module", "level", "weak", "interview"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = (searchParams.get("mode") ?? "mixed") as SessionMode;
  if (!MODES.includes(mode)) return fail("Unknown mode", 400);

  // buildSession clamps to 1..40; this only rejects non-numbers.
  const size = Number.parseInt(searchParams.get("size") ?? "12", 10);
  // An unparseable or out-of-range level is ignored rather than passed
  // through as NaN (which used to turn a level session into "everything").
  const levelParam = Number.parseInt(searchParams.get("level") ?? "", 10);
  const level = LEVELS.includes(levelParam as Level) ? (levelParam as Level) : undefined;

  const spec: SessionSpec = {
    mode,
    size: Number.isFinite(size) ? size : 12,
    trackId: searchParams.get("trackId") || undefined,
    moduleId: searchParams.get("moduleId") || undefined,
    level,
  };

  try {
    return ok(await buildSession(spec));
  } catch (error) {
    return serverError("Failed to build session", error);
  }
}
