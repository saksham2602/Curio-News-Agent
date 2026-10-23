import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";

const Body = z.object({ storyId: z.string().min(1), mode: z.enum(["quick", "deep"]), progress: z.number().min(0).max(1), completed: z.boolean() });

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "bad request" }, { status: 400 });
  const { storyId, mode, progress, completed } = parsed.data;
  const exists = await db.story.findUnique({ where: { id: storyId }, select: { id: true } });
  if (!exists) return NextResponse.json({ ok: false, error: "unknown story" }, { status: 404 });
  const existing = await db.readingEvent.findUnique({ where: { userId_storyId_mode: { userId: user.id, storyId, mode } } });
  const nextProgress = Math.max(existing?.progress ?? 0, progress);
  const nextCompleted = (existing?.completed ?? false) || completed;
  await db.readingEvent.upsert({
    where: { userId_storyId_mode: { userId: user.id, storyId, mode } },
    update: { progress: nextProgress, completed: nextCompleted },
    create: { userId: user.id, storyId, mode, progress: nextProgress, completed: nextCompleted },
  });
  return NextResponse.json({ ok: true });
}
