import { NextResponse } from "next/server";
import { trackProgress } from "@/lib/progress";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: trackProgress() });
  } catch (error) {
    console.error("Tracks failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load tracks" },
      { status: 500 }
    );
  }
}
