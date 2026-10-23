// Manual pipeline run: `npm run ingest` (all), `npm run ingest -- breaking`, `npm run ingest -- econ`, `npm run ingest -- digest`
import fs from "node:fs";
import path from "node:path";

// Minimal .env loader so the script works without extra dependencies.
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

async function main() {
  const mode = process.argv[2] ?? "all";
  const { runIngestion, pruneOld } = await import("../src/lib/ingest/pipeline");
  const { refreshIndicators } = await import("../src/lib/econ/indicators");
  const { ensureWeeklyDigest } = await import("../src/lib/ai/digest");
  const { db } = await import("../src/lib/db");

  if (mode === "econ") {
    console.log(JSON.stringify(await refreshIndicators(), null, 2));
  } else if (mode === "digest") {
    const d = await ensureWeeklyDigest(true);
    console.log(d?.weekKey, d?.kind);
  } else if (mode === "prune") {
    console.log("pruned", await pruneOld());
  } else {
    const cadence = (["breaking", "general", "analysis", "all"].includes(mode) ? mode : "all") as "breaking" | "general" | "analysis" | "all";
    const summary = await runIngestion({ cadence });
    console.log(JSON.stringify(summary, null, 2));
    console.log("stories:", await db.story.count(), "articles:", await db.article.count());
  }
  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
