import { NextResponse } from "next/server";
import { dashboard } from "@/lib/progress";

export async function GET() {
  try {
    return NextResponse.json({ success: true, data: dashboard() });
  } catch (error) {
    console.error("Dashboard failed:", error);
    return NextResponse.json(
      { success: false, error: "Failed to load dashboard" },
      { status: 500 }
    );
  }
}
