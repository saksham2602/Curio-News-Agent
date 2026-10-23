"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { createSessionToken, currentUser, guestId, mergeGuestInto, requireUser, signIn, signUp, SESSION_COOKIE } from "@/lib/auth";
import { DEFAULT_PREFERENCES, type Preferences } from "@/lib/types";
import { reviewPerspective } from "@/lib/ai/review";
import { describeAiError } from "@/lib/ai/client";
import { classifyLinksForStory } from "@/lib/ai/links";

// ───────── Bookmarks ─────────

export async function toggleBookmark(storyId: string, collection = "Saved"): Promise<{ bookmarked: boolean }> {
  const user = await requireUser();
  const existing = await db.bookmark.findUnique({ where: { userId_storyId: { userId: user.id, storyId } } });
  if (existing) {
    await db.bookmark.delete({ where: { id: existing.id } });
    revalidatePath("/library");
    return { bookmarked: false };
  }
  await db.bookmark.create({ data: { userId: user.id, storyId, collection } });
  revalidatePath("/library");
  return { bookmarked: true };
}

export async function updateBookmark(storyId: string, data: { collection?: string; note?: string }) {
  const user = await requireUser();
  await db.bookmark.update({ where: { userId_storyId: { userId: user.id, storyId } }, data });
  revalidatePath("/library");
}

export async function removeBookmark(storyId: string) {
  const user = await requireUser();
  await db.bookmark.deleteMany({ where: { userId: user.id, storyId } });
  revalidatePath("/library");
}

export async function addHighlight(storyId: string, text: string) {
  const user = await requireUser();
  const clean = text.trim().slice(0, 600);
  if (!clean) return;
  await db.highlight.create({ data: { userId: user.id, storyId, text: clean } });
  revalidatePath("/library");
}

export async function deleteHighlight(id: string) {
  const user = await requireUser();
  await db.highlight.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/library");
}

// ───────── Reading ─────────

export async function markRead(storyId: string, mode: "quick" | "deep" = "quick") {
  const user = await requireUser();
  await db.readingEvent.upsert({
    where: { userId_storyId_mode: { userId: user.id, storyId, mode } },
    update: { completed: true, progress: 1 },
    create: { userId: user.id, storyId, mode, completed: true, progress: 1 },
  });
  revalidatePath("/");
  revalidatePath("/brief");
}

export async function markUnread(storyId: string) {
  const user = await requireUser();
  await db.readingEvent.deleteMany({ where: { userId: user.id, storyId } });
  revalidatePath("/");
  revalidatePath("/brief");
}

// ───────── Preferences & onboarding ─────────

export async function savePreferences(partial: Partial<Preferences>) {
  const user = await requireUser();
  const next: Preferences = { ...DEFAULT_PREFERENCES, ...user.preferences, ...partial };
  await db.user.update({ where: { id: user.id }, data: { preferences: JSON.stringify(next) } });
  revalidatePath("/", "layout");
  return next;
}

export async function completeOnboarding(partial: Partial<Preferences>) {
  const user = await requireUser();
  const next: Preferences = { ...DEFAULT_PREFERENCES, ...user.preferences, ...partial };
  await db.user.update({ where: { id: user.id }, data: { preferences: JSON.stringify(next), onboarded: true } });
  revalidatePath("/", "layout");
  redirect("/?welcome=1");
}

export async function updateProfile(name: string) {
  const user = await requireUser();
  await db.user.update({ where: { id: user.id }, data: { name: name.trim().slice(0, 80) || null } });
  revalidatePath("/", "layout");
}

export async function deleteAccountData() {
  const user = await requireUser();
  await db.user.delete({ where: { id: user.id } });
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  jar.delete("cb_guest");
  redirect("/");
}

// ───────── Auth ─────────

export type AuthState = { error?: string } | undefined;

export async function signUpAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const name = String(formData.get("name") ?? "").trim() || null;
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Please enter a valid email address." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  try {
    const user = await signUp(email, password, name, await guestId());
    const token = await createSessionToken(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not create account." };
  }
  redirect("/onboarding");
}

export async function signInAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  try {
    const user = await signIn(email, password);
    await mergeGuestInto(await guestId(), user.id);
    const token = await createSessionToken(user.id);
    const jar = await cookies();
    jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30, secure: process.env.NODE_ENV === "production" });
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not sign in." };
  }
  redirect("/");
}

export async function signOutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/");
}

// ───────── Reflections ─────────

export interface ReflectionInput {
  title: string;
  storyId?: string | null;
  happened?: string;
  meaning?: string;
  evidence?: string;
  missing?: string;
  changeMind?: string;
  freeform?: string;
}

function cleanReflection(input: ReflectionInput) {
  const s = (v?: string) => (v ?? "").trim().slice(0, 6000);
  return { title: s(input.title).slice(0, 200) || "Untitled reflection", happened: s(input.happened), meaning: s(input.meaning), evidence: s(input.evidence), missing: s(input.missing), changeMind: s(input.changeMind), freeform: s(input.freeform) };
}

export async function createReflection(input: ReflectionInput) {
  const user = await requireUser();
  const r = await db.reflection.create({ data: { userId: user.id, storyId: input.storyId ?? null, ...cleanReflection(input) } });
  revalidatePath("/perspectives");
  return r.id;
}

export async function updateReflection(id: string, input: ReflectionInput) {
  const user = await requireUser();
  await db.reflection.updateMany({ where: { id, userId: user.id }, data: cleanReflection(input) });
  revalidatePath("/perspectives");
  revalidatePath(`/perspectives/${id}`);
}

export async function deleteReflection(id: string) {
  const user = await requireUser();
  await db.reflection.deleteMany({ where: { id, userId: user.id } });
  revalidatePath("/perspectives");
  redirect("/perspectives");
}

export async function requestPerspectiveReview(id: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const r = await db.reflection.findFirst({ where: { id, userId: user.id }, include: { story: { select: { title: true, summary: true } } } });
  if (!r) return { ok: false, error: "Reflection not found." };
  try {
    const review = await reviewPerspective({ storyTitle: r.story?.title, storySummary: r.story?.summary, ...r });
    await db.reflection.update({ where: { id }, data: { aiReview: JSON.stringify(review) } });
    revalidatePath(`/perspectives/${id}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: describeAiError(e) };
  }
}

// ───────── Connections ─────────

export async function classifyConnections(storyId: string): Promise<{ ok: boolean; error?: string; n?: number }> {
  try {
    const n = await classifyLinksForStory(storyId);
    revalidatePath(`/connect`);
    return { ok: true, n };
  } catch (e) {
    return { ok: false, error: describeAiError(e) };
  }
}

// ───────── Curio session ─────────

export async function clearCurioSession(sessionId: string) {
  const user = await currentUser();
  if (!user) return;
  await db.curioMessage.deleteMany({ where: { userId: user.id, sessionId } });
}
