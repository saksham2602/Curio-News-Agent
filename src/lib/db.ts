import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function getSetting(key: string): Promise<string | null> {
  const row = await db.setting.findUnique({ where: { key } });
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  await db.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
}

// Postgres `contains` is case-sensitive; SQLite's is not. Spread this into string filters.
export const IS_POSTGRES = /^postgres(ql)?:/i.test(process.env.DATABASE_URL ?? "");
export const ci: Record<string, unknown> = IS_POSTGRES ? { mode: "insensitive" } : {};
