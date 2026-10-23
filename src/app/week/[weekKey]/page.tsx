import { notFound } from "next/navigation";
import { WeekView } from "@/components/week/WeekView";
import { db } from "@/lib/db";
import type { WeeklyDigestContent } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function WeekEditionPage({ params }: { params: Promise<{ weekKey: string }> }) {
  const { weekKey } = await params;
  const digest = await db.weeklyDigest.findUnique({ where: { weekKey } });
  if (!digest) notFound();
  const previous = await db.weeklyDigest.findMany({ where: { weekKey: { not: weekKey } }, orderBy: { endAt: "desc" }, take: 12, select: { weekKey: true } });
  return <WeekView digest={JSON.parse(digest.contentJson) as WeeklyDigestContent} startAt={digest.startAt} endAt={digest.endAt} weekKey={digest.weekKey} previous={previous} kind={digest.kind} />;
}
