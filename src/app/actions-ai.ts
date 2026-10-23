"use server";

import { revalidatePath } from "next/cache";
import { ensureAiQuickRead } from "@/lib/ai/quickread";
import { getOrGenerateDeepDive } from "@/lib/ai/deepdive";
import { describeAiError } from "@/lib/ai/client";
import { db } from "@/lib/db";

export async function generateQuickReadAction(storyId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const qr = await ensureAiQuickRead(storyId);
    if (!qr) return { ok: false, error: "AI is not configured (add NVIDIA_API_KEY or ANTHROPIC_API_KEY)." };
    const s = await db.story.findUnique({ where: { id: storyId }, select: { slug: true } });
    if (s) revalidatePath(`/story/${s.slug}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeAiError(e) };
  }
}

export async function regenerateDeepDiveAction(storyId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const r = await getOrGenerateDeepDive(storyId, true);
    const s = await db.story.findUnique({ where: { id: storyId }, select: { slug: true } });
    if (s) revalidatePath(`/story/${s.slug}/deep`);
    return r.error ? { ok: false, error: r.error } : { ok: true };
  } catch (e) {
    return { ok: false, error: describeAiError(e) };
  }
}
