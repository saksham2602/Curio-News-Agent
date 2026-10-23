import { NextResponse } from "next/server";
import { runIngestion } from "@/lib/ingest/pipeline";
import { refreshIndicators } from "@/lib/econ/indicators";
import { ensureWeeklyDigest } from "@/lib/ai/digest";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

// External trigger for serverless hosts (Vercel Cron, GitHub Actions, cron-job.org…):
//   GET /api/cron/refresh?key=CRON_SECRET&job=news|econ|digest|all&cadence=breaking|general|analysis|all
function authorised(req: Request) {
  const secret = process.env.CRON_SECRET;
  const url = new URL(req.url);
  const key = url.searchParams.get("key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!secret) return process.env.NODE_ENV !== "production"; // open locally, closed in production unless configured
  return key === secret;
}

async function handle(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const url = new URL(req.url);
  const job = url.searchParams.get("job") ?? "news";
  const cadence = (url.searchParams.get("cadence") ?? "all") as "breaking" | "general" | "analysis" | "all";
  const out: Record<string, unknown> = {};
  if (job === "news" || job === "all") out.news = await runIngestion({ cadence });
  if (job === "econ" || job === "all") out.econ = await refreshIndicators();
  if (job === "digest" || job === "all") out.digest = (await ensureWeeklyDigest(job === "digest"))?.weekKey ?? null;
  return NextResponse.json({ ok: true, at: new Date().toISOString(), ...out });
}

export const GET = handle;
export const POST = handle;
