"use client";

import { Container, EmptyState } from "@/components/ui";
import { PaperPlane } from "@/components/doodles";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Container className="pt-16">
      <EmptyState
        doodle={<PaperPlane className="h-14 w-14" />}
        title="Something went sideways"
        description={error.message?.includes("prisma") || error.message?.includes("database") ? "The database isn't reachable. Run `npm run db:push` and restart the server." : error.message || "An unexpected error occurred."}
        action={
          <button type="button" onClick={reset} className="rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper">
            Try again
          </button>
        }
      />
    </Container>
  );
}
