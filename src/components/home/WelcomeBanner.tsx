import { Sparkles } from "@/components/doodles";

export function WelcomeBanner() {
  return (
    <div className="mb-5 flex items-center gap-3 rounded-2xl bg-lavender/60 px-4 py-3 text-[14px] animate-fadeUp dark:bg-lavender/15">
      <Sparkles className="h-5 w-5 text-[#6B55A8]" />
      <span>
        <strong>Your world is ready to explore.</strong> This page is now tuned to your interests and reading time. Change it any time in Settings.
      </span>
    </div>
  );
}
