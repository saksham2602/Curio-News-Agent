import type { Metadata } from "next";
import { Container, SectionHeader } from "@/components/ui";
import { Sparkles, Lightbulb } from "@/components/doodles";
import { CurioChat } from "@/components/curio/CurioChat";
import { CurioPrefill } from "@/components/curio/CurioPrefill";
import { isAiConfigured, aiModelLabel } from "@/lib/ai/client";

export const metadata: Metadata = { title: "Ask Curio" };
export const dynamic = "force-dynamic";

export default async function CurioPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const ai = isAiConfigured();
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow={<>Ask Curio ✨</>} title="Your research companion" description="Curio answers from the stories and official data on this platform, cites its sources, separates fact from interpretation, and tells you when the evidence is thin." doodle={<Lightbulb className="h-12 w-12" />} size="lg" />
      <div className="mt-8 border-t border-line" />
      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex h-[70vh] min-h-[480px] flex-col">
          <CurioChat storyId={null} storyTitle={null} aiConfigured={ai} />
          {q && <CurioPrefill question={q} />}
        </div>
        <aside className="space-y-4 text-[13px]">
          <div className="card p-4">
            <p className="flex items-center gap-1.5 font-semibold"><Sparkles className="h-4 w-4 text-[#6B55A8]" /> How Curio works</p>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li>• Retrieves matching stories and official indicators first (source-grounded).</li>
              <li>• Cites them inline as [1], [2]; click to open.</li>
              <li>• Says plainly when something isn&rsquo;t established by the sources.</li>
              <li>• Never invents statistics or quotes.</li>
            </ul>
          </div>
          <div className="card p-4">
            <p className="font-semibold">Status</p>
            <p className="mt-1 text-muted">{ai ? `Connected · ${aiModelLabel()}` : "Not configured: add NVIDIA_API_KEY or ANTHROPIC_API_KEY to .env"}</p>
          </div>
          <div className="card p-4">
            <p className="font-semibold">Try asking</p>
            <ul className="mt-2 space-y-1.5 text-muted">
              <li>“How does this relate to inflation?”</li>
              <li>“Which companies could be affected?”</li>
              <li>“Give me a historical example.”</li>
              <li>“Explain the business model behind this.”</li>
            </ul>
          </div>
        </aside>
      </div>
    </Container>
  );
}
