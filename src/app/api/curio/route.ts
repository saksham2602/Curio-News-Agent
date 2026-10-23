import { NextResponse } from "next/server";
import { z } from "zod";
import { currentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { askCurio } from "@/lib/ai/curio";
import { describeAiError } from "@/lib/ai/client";

const Body = z.object({ question: z.string().min(1).max(2000), storyId: z.string().nullable().optional(), sessionId: z.string().min(1).max(80) });

// Simple per-user rate limit (in-memory; fine for a single-process deployment).
const buckets = new Map<string, number[]>();
function limited(userId: string, max = 20, windowMs = 10 * 60_000) {
  const now = Date.now();
  const arr = (buckets.get(userId) ?? []).filter((t) => now - t < windowMs);
  if (arr.length >= max) return true;
  arr.push(now);
  buckets.set(userId, arr);
  return false;
}

export async function GET(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ messages: [] });
  const session = new URL(req.url).searchParams.get("session") ?? "";
  const rows = await db.curioMessage.findMany({ where: { userId: user.id, sessionId: session }, orderBy: { createdAt: "asc" }, take: 40 });
  return NextResponse.json({ messages: rows.map((r) => ({ role: r.role, content: r.content, citations: r.citations ? JSON.parse(r.citations) : undefined })) });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false }, { status: 401 });
  const session = new URL(req.url).searchParams.get("session") ?? "";
  await db.curioMessage.deleteMany({ where: { userId: user.id, sessionId: session } });
  return NextResponse.json({ ok: true });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "No session. Reload the page." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Please ask a question (up to 2000 characters)." }, { status: 400 });
  if (limited(user.id)) return NextResponse.json({ error: "You're asking quickly — give Curio a minute and try again." }, { status: 429 });
  const { question, storyId, sessionId } = parsed.data;
  try {
    const result = await askCurio({ userId: user.id, sessionId, question, storyId: storyId ?? null });
    await db.curioMessage.createMany({
      data: [
        { userId: user.id, sessionId, role: "user", content: question, storyId: storyId ?? null },
        { userId: user.id, sessionId, role: "assistant", content: result.answer, storyId: storyId ?? null, citations: JSON.stringify(result.citations) },
      ],
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: describeAiError(e) }, { status: 502 });
  }
}
