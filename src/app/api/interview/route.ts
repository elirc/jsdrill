import { NextResponse } from "next/server";
import { db, schema } from "@/lib/db";
import { eq, desc } from "drizzle-orm";
import { generateId, now } from "@/lib/utils";
import type { InterviewScore } from "@/types";

const USER = "default-user";

export async function GET() {
  const runs = db
    .select()
    .from(schema.interviewRuns)
    .where(eq(schema.interviewRuns.userId, USER))
    .orderBy(desc(schema.interviewRuns.createdAt))
    .limit(10)
    .all();

  return NextResponse.json({
    success: true,
    data: runs.map((r) => ({ ...r, score: JSON.parse(r.score) as InterviewScore })),
  });
}

export async function POST(request: Request) {
  const score = (await request.json()) as InterviewScore;

  db.insert(schema.interviewRuns)
    .values({
      id: generateId(),
      userId: USER,
      score: JSON.stringify(score),
      total: score.total ?? 0,
      correct: score.correct ?? 0,
      seconds: score.seconds ?? 0,
      createdAt: now(),
    })
    .run();

  return NextResponse.json({ success: true });
}
