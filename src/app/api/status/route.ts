import { NextResponse } from "next/server";
import { db, getSetting } from "@/lib/db";
import { isAiConfigured, aiModelLabel } from "@/lib/ai/client";

export const dynamic = "force-dynamic";

export async function GET() {
  const [stories, articles, sources, indicators, lastRefreshAt, lastEcon, jobs] = await Promise.all([
    db.story.count(),
    db.article.count(),
    db.source.count({ where: { lastStatus: "ok" } }),
    db.indicator.count({ where: { latestValue: { not: null } } }),
    getSetting("lastRefreshAt"),
    getSetting("lastEconRefreshAt"),
    db.jobRun.findMany({ orderBy: { startedAt: "desc" }, take: 5, select: { name: true, status: true, startedAt: true, finishedAt: true } }),
  ]);
  return NextResponse.json({ ok: true, stories, articles, healthySources: sources, indicators, lastRefreshAt, lastEconRefreshAt: lastEcon, ai: { configured: isAiConfigured(), model: isAiConfigured() ? aiModelLabel() : null }, fred: Boolean(process.env.FRED_API_KEY), recentJobs: jobs });
}
