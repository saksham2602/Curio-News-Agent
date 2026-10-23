import type { Metadata } from "next";
import { Container, EmptyState } from "@/components/ui";
import { CalendarDoodle } from "@/components/doodles";
import { WeekView } from "@/components/week/WeekView";
import { ensureWeeklyDigest } from "@/lib/ai/digest";
import { db } from "@/lib/db";
import type { WeeklyDigestContent } from "@/lib/types";

export const metadata: Metadata = { title: "The Week, Decoded" };
export const dynamic = "force-dynamic";

export default async function WeekPage() {
  const digest = await ensureWeeklyDigest(false, true);
  if (!digest) {
    return (
      <Container className="pt-16">
        <EmptyState doodle={<CalendarDoodle className="h-14 w-14">7</CalendarDoodle>} title="The week is being written" description="The first weekly synthesis is generated in the background after the news is ingested. Check back in a couple of minutes." />
      </Container>
    );
  }
  const previous = await db.weeklyDigest.findMany({ where: { weekKey: { not: digest.weekKey } }, orderBy: { endAt: "desc" }, take: 12, select: { weekKey: true } });
  return <WeekView digest={JSON.parse(digest.contentJson) as WeeklyDigestContent} startAt={digest.startAt} endAt={digest.endAt} weekKey={digest.weekKey} previous={previous} kind={digest.kind} />;
}
