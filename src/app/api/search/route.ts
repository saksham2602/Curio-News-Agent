import { NextResponse } from "next/server";
import { searchStories } from "@/lib/search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = (u.searchParams.get("q") ?? "").slice(0, 200);
  const limit = Math.min(20, Number(u.searchParams.get("limit")) || 8);
  if (!q.trim()) return NextResponse.json({ hits: [] });
  const hits = await searchStories({ q, limit, days: Number(u.searchParams.get("days")) || undefined });
  return NextResponse.json({ hits: hits.map((h) => ({ slug: h.slug, title: h.title, subject: h.subject, tier: h.tier, sourceName: h.sourceName, latestPublishedAt: h.latestPublishedAt })) });
}
