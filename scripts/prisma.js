#!/usr/bin/env node
// Runs the Prisma CLI with the schema that matches DATABASE_URL:
//   postgres://…  → prisma/schema.postgres.prisma   (Supabase, Neon, Render Postgres…)
//   file:…        → prisma/schema.prisma            (SQLite, local / Railway volume)
// Usage: node scripts/prisma.js <prisma args…>   e.g. generate | db push --skip-generate
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

// Load .env if present (Prisma does this itself, but we need DATABASE_URL to choose the schema).
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^"(.*)"$/, "$1");
  }
}
const url = process.env.DATABASE_URL || "file:./dev.db";
const isPostgres = /^postgres(ql)?:/i.test(url);
const schema = isPostgres ? "prisma/schema.postgres.prisma" : "prisma/schema.prisma";
const cliArgs = process.argv.slice(2);

// Schema changes (db push / migrate) must not go through a transaction-mode pooler
// (Supabase port 6543, `?pgbouncer=true`): Prisma hangs there. Use DIRECT_URL if given,
// otherwise rewrite the pooled URL to the session pooler (port 5432) for this command only.
if (isPostgres && /^(db|migrate)$/.test(cliArgs[0] ?? "")) {
  const direct = process.env.DIRECT_URL || url.replace(/:6543\//, ":5432/").replace(/[?&]pgbouncer=true/i, "").replace(/\?$/, "");
  if (direct !== url) console.log("[prisma] using direct (session) connection for schema changes");
  process.env.DATABASE_URL = direct;
}
const args = [...cliArgs, `--schema=${schema}`];
console.log(`[prisma] ${args.join(" ")}`);
const r = spawnSync(process.platform === "win32" ? "npx.cmd" : "npx", ["prisma", ...args], { stdio: "inherit", shell: process.platform === "win32" });
process.exit(r.status ?? 1);
