import type { Metadata } from "next";
import { Container, SectionHeader } from "@/components/ui";
import { Pencil } from "@/components/doodles";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { currentUser } from "@/lib/auth";
import { isAiConfigured, aiModelLabel } from "@/lib/ai/client";
import { getSetting } from "@/lib/db";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await currentUser();
  if (!user) return null;
  const last = await getSetting("lastRefreshAt");
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow="Settings" title="Make it yours" description="Interests, reading time, detail level, appearance, notifications and account. Personalisation shapes order and emphasis — it never hides important stories." doodle={<Pencil className="h-12 w-12" />} size="lg" />
      <div className="mt-8 border-t border-line" />
      <div className="mt-8">
        <SettingsForm user={{ name: user.name, email: user.email, isGuest: user.isGuest }} prefs={user.preferences} system={{ ai: isAiConfigured(), model: aiModelLabel(), fred: Boolean(process.env.FRED_API_KEY), lastRefresh: last, schedule: { breaking: process.env.REFRESH_BREAKING_MINUTES ?? "15", general: process.env.REFRESH_GENERAL_MINUTES ?? "30", analysis: process.env.REFRESH_ANALYSIS_MINUTES ?? "360", econ: process.env.REFRESH_ECON_MINUTES ?? "720" } }} />
      </div>
    </Container>
  );
}
