import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { DEFAULT_PREFERENCES, type Preferences } from "./types";
import { safeJson } from "./utils";

export const SESSION_COOKIE = "cb_session";
export const GUEST_COOKIE = "cb_guest";

function secret() {
  const s = process.env.AUTH_SECRET || "dev-only-insecure-secret";
  return new TextEncoder().encode(s);
}

export async function createSessionToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("30d").sign(secret());
}

export async function readSessionUserId(): Promise<string | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export async function guestId(): Promise<string | null> {
  const jar = await cookies();
  const id = jar.get(GUEST_COOKIE)?.value;
  return id && /^[a-zA-Z0-9_-]{8,64}$/.test(id) ? id : null;
}

export interface CurrentUser {
  id: string;
  email: string | null;
  name: string | null;
  isGuest: boolean;
  onboarded: boolean;
  preferences: Preferences;
}

function toCurrent(u: { id: string; email: string | null; name: string | null; isGuest: boolean; onboarded: boolean; preferences: string }): CurrentUser {
  const prefs = { ...DEFAULT_PREFERENCES, ...safeJson<Partial<Preferences>>(u.preferences, {}) };
  return { id: u.id, email: u.email, name: u.name, isGuest: u.isGuest, onboarded: u.onboarded, preferences: prefs };
}

// Signed-in user if present, otherwise the guest user for this browser (created lazily).
// Returns null only when no guest cookie exists yet (first request before middleware ran).
export async function currentUser(): Promise<CurrentUser | null> {
  const sessionId = await readSessionUserId();
  if (sessionId) {
    const u = await db.user.findUnique({ where: { id: sessionId } });
    if (u) {
      if (Date.now() - u.lastSeenAt.getTime() > 3_600_000) await db.user.update({ where: { id: u.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
      return toCurrent(u);
    }
  }
  const gid = await guestId();
  if (!gid) return null;
  let u = await db.user.findUnique({ where: { id: gid } });
  if (!u) {
    // Several server components may create the same new guest concurrently; tolerate the race.
    try {
      u = await db.user.create({ data: { id: gid, isGuest: true } });
    } catch (e) {
      if ((e as { code?: string }).code !== "P2002") throw e;
      u = await db.user.findUnique({ where: { id: gid } });
      if (!u) return null;
    }
  }
  return toCurrent(u);
}

export async function requireUser(): Promise<CurrentUser> {
  const u = await currentUser();
  if (!u) throw new Error("No session. Reload the page.");
  return u;
}

export async function signUp(email: string, password: string, name: string | null, guest: string | null) {
  const normalized = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalized } });
  if (existing) throw new Error("An account with that email already exists. Try signing in.");
  const passwordHash = await bcrypt.hash(password, 10);
  // Upgrade the guest record in place so bookmarks, history and notes carry over.
  if (guest) {
    const g = await db.user.findUnique({ where: { id: guest } });
    if (g && g.isGuest) {
      return db.user.update({ where: { id: guest }, data: { email: normalized, passwordHash, name, isGuest: false } });
    }
  }
  return db.user.create({ data: { email: normalized, passwordHash, name, isGuest: false } });
}

export async function signIn(email: string, password: string) {
  const u = await db.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!u || !u.passwordHash) throw new Error("No account found with that email.");
  const ok = await bcrypt.compare(password, u.passwordHash);
  if (!ok) throw new Error("Incorrect password.");
  return u;
}

// Merge a guest's data into an existing account on sign-in.
export async function mergeGuestInto(guest: string | null, userId: string) {
  if (!guest || guest === userId) return;
  const g = await db.user.findUnique({ where: { id: guest } });
  if (!g || !g.isGuest) return;
  const bms = await db.bookmark.findMany({ where: { userId: guest } });
  for (const b of bms) {
    await db.bookmark.upsert({ where: { userId_storyId: { userId, storyId: b.storyId } }, update: {}, create: { userId, storyId: b.storyId, collection: b.collection, note: b.note } });
  }
  const evs = await db.readingEvent.findMany({ where: { userId: guest } });
  for (const e of evs) {
    await db.readingEvent.upsert({ where: { userId_storyId_mode: { userId, storyId: e.storyId, mode: e.mode } }, update: { progress: e.progress, completed: e.completed }, create: { userId, storyId: e.storyId, mode: e.mode, progress: e.progress, completed: e.completed } });
  }
  await db.reflection.updateMany({ where: { userId: guest }, data: { userId } });
  await db.curioMessage.updateMany({ where: { userId: guest }, data: { userId } });
  await db.highlight.updateMany({ where: { userId: guest }, data: { userId } });
  await db.user.delete({ where: { id: guest } }).catch(() => {});
}
