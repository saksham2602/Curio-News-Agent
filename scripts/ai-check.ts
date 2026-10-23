// Verifies the configured AI provider end to end: `npx tsx scripts/ai-check.ts`
import fs from "node:fs";
import path from "node:path";

const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}

async function main() {
  const z = await import("zod/v4");
  const { provider, aiModelLabel, generateStructured, describeAiError } = await import("../src/lib/ai/client");
  console.log("Provider:", provider(), "·", aiModelLabel());
  if (!provider()) {
    console.log("No key configured. Add NVIDIA_API_KEY or ANTHROPIC_API_KEY to .env");
    process.exit(1);
  }
  const started = Date.now();
  try {
    const out = await generateStructured({
      schema: z.object({ headline: z.string(), points: z.array(z.string()).min(3).max(3), confidence: z.enum(["low", "medium", "high"]) }),
      user: "SOURCE: The Reserve Bank of India said on 21 October 2026 it will conduct an overnight variable rate repo auction of ₹50,000 crore on 22 October 2026 after reviewing liquidity conditions.\n\nWrite a headline, three points and your confidence that the source supports them.",
      maxTokens: 600,
    });
    console.log("OK in", Date.now() - started, "ms");
    console.log(JSON.stringify(out, null, 2));
  } catch (e) {
    console.error("FAILED:", describeAiError(e));
    process.exit(1);
  }
  if (process.argv.includes("--full")) {
    const { db } = await import("../src/lib/db");
    const { ensureAiQuickRead } = await import("../src/lib/ai/quickread");
    const { getOrGenerateDeepDive } = await import("../src/lib/ai/deepdive");
    const story = await db.story.findFirst({ where: { sourceCount: { gte: 2 } }, orderBy: { score: "desc" } });
    if (story) {
      console.log("\nQuick read for:", story.title);
      const t1 = Date.now();
      console.log(JSON.stringify(await ensureAiQuickRead(story.id), null, 2).slice(0, 1500), "…", Date.now() - t1, "ms");
      console.log("\nDeep dive for:", story.title);
      const t2 = Date.now();
      const dd = await getOrGenerateDeepDive(story.id, true);
      console.log(dd.error ? `DEEP DIVE ERROR: ${dd.error}` : `OK (${dd.deepDive.kind}) sections: facts=${dd.deepDive.development.facts.length} connections=${dd.deepDive.connections.length} perspectives=${dd.deepDive.perspectives.length} scenarios=${dd.deepDive.whatNext.scenarios.length}`, Date.now() - t2, "ms");
      console.log("→ open http://localhost:3000/story/" + story.slug);
    }
    await db.$disconnect();
  }
}
main();
