import { runIngestion, pruneOld } from "./pipeline";
import { refreshIndicators } from "../econ/indicators";
import { ensureWeeklyDigest } from "../ai/digest";
import { db, getSetting } from "../db";

// In-process scheduler. Runs in `next dev` / `next start` (long-lived Node process).
// On serverless hosts set IN_PROCESS_SCHEDULER=false and call /api/cron/refresh from an external cron.

const g = globalThis as unknown as { __curiousScheduler?: boolean };

function minutes(name: string, fallback: number) {
  const v = Number(process.env[name]);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}

export function startScheduler() {
  if (g.__curiousScheduler) return;
  if ((process.env.IN_PROCESS_SCHEDULER ?? "true").toLowerCase() === "false") return;
  g.__curiousScheduler = true;

  const breaking = minutes("REFRESH_BREAKING_MINUTES", 15);
  const general = minutes("REFRESH_GENERAL_MINUTES", 30);
  const analysis = minutes("REFRESH_ANALYSIS_MINUTES", 360);
  const econ = minutes("REFRESH_ECON_MINUTES", 720);

  const safe = (label: string, fn: () => Promise<unknown>) => async () => {
    try {
      await fn();
    } catch (e) {
      console.error(`[scheduler] ${label} failed:`, e instanceof Error ? e.message : e);
    }
  };

  setInterval(safe("breaking", () => runIngestion({ cadence: "breaking" })), breaking * 60_000).unref();
  setInterval(safe("general", () => runIngestion({ cadence: "general" })), general * 60_000).unref();
  setInterval(safe("analysis", () => runIngestion({ cadence: "analysis" })), analysis * 60_000).unref();
  setInterval(safe("econ", () => refreshIndicators()), econ * 60_000).unref();
  setInterval(safe("digest", () => ensureWeeklyDigest()), 6 * 3_600_000).unref();
  setInterval(safe("prune", () => pruneOld()), 24 * 3_600_000).unref();

  // Boot: refresh if the data is empty or stale.
  void (async () => {
    try {
      const last = await getSetting("lastRefreshAt");
      const count = await db.story.count();
      const stale = !last || Date.now() - new Date(last).getTime() > general * 60_000;
      if (count === 0 || stale) {
        console.log("[scheduler] initial refresh starting…");
        await runIngestion({ cadence: "all" });
        console.log("[scheduler] initial refresh done");
      }
      const ind = await db.indicator.count();
      const lastEcon = await getSetting("lastEconRefreshAt");
      if (ind === 0 || !lastEcon || Date.now() - new Date(lastEcon).getTime() > econ * 60_000) {
        await refreshIndicators();
      }
      await ensureWeeklyDigest();
    } catch (e) {
      console.error("[scheduler] boot refresh failed:", e instanceof Error ? e.message : e);
    }
  })();

  console.log(`[scheduler] started (breaking ${breaking}m, general ${general}m, analysis ${analysis}m, econ ${econ}m)`);
}
