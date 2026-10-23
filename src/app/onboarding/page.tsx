import type { Metadata } from "next";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { currentUser } from "@/lib/auth";
import { DEFAULT_PREFERENCES } from "@/lib/types";

export const metadata: Metadata = { title: "Welcome" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await currentUser();
  return <OnboardingFlow initial={user?.preferences ?? DEFAULT_PREFERENCES} />;
}
