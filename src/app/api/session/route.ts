import { NextResponse } from "next/server";
import { buildSession } from "@/lib/sessionBuilder";
import type { Level, SessionMode, SessionSpec } from "@/types";

const MODES: SessionMode[] = ["mixed", "track", "module", "level", "weak", "interview"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const mode = (searchParams.get("mode") ?? "mixed") as SessionMode;
  if (!MODES.includes(mode)) {
    return NextResponse.json({ success: false, error: "Unknown mode" }, { status: 400 });
  }

  const size = Number.parseInt(searchParams.get("size") ?? "12", 10);
  const levelParam = searchParams.get("level");

  const spec: SessionSpec = {
    mode,
    size: Number.isFinite(size) ? size : 12,
    trackId: searchParams.get("trackId") ?? undefined,
    moduleId: searchParams.get("moduleId") ?? undefined,
    level: levelParam ? (Number.parseInt(levelParam, 10) as Level) : undefined,
  };

  try {
    const session = await buildSession(spec);
    return NextResponse.json({ success: true, data: session });
  } catch (error) {
    console.error("Session build failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to build session" },
      { status: 500 }
    );
  }
}
