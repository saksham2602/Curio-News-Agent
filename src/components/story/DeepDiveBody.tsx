import Link from "next/link";
import { ArrowDown, ExternalLink } from "lucide-react";
import { AiLabel, Callout } from "@/components/ui";
import { PerspectiveForm } from "./PerspectiveForm";
import { RegenerateDeepDive } from "./RegenerateDeepDive";
import { getOrGenerateDeepDive } from "@/lib/ai/deepdive";
import { isAiConfigured } from "@/lib/ai/client";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";

const SECTIONS = [
  ["development", "1 · The development"],
  ["background", "2 · The background"],
  ["fundamentals", "3 · Fundamentals"],
  ["connections", "4 · Connecting the dots"],
  ["stakeholders", "5 · Stakeholder impact"],
  ["perspectives", "6 · Multiple perspectives"],
  ["next", "7 · What happens next"],
  ["think", "8 · Build your perspective"],
  ["reading", "9 · Further reading"],
] as const;

const DIR: Record<string, string> = { positive: "bg-sage/60 dark:bg-sage/15", negative: "bg-coral/50 dark:bg-coral/15", mixed: "bg-butter/60 dark:bg-butter/15", uncertain: "bg-powder/60 dark:bg-powder/15" };
const REL: Record<string, string> = { causal: "bg-coral/60 text-[#7A2E24]", correlated: "bg-butter text-[#6B5200]", plausible: "bg-powder text-[#2A4D66]", speculative: "bg-line text-muted" };

export async function DeepDiveBody({ storyId, slug, userId }: { storyId: string; slug: string; userId: string | null }) {
  const { deepDive: dd, error } = await getOrGenerateDeepDive(storyId);
  const existing = userId ? await db.reflection.findFirst({ where: { userId, storyId }, orderBy: { updatedAt: "desc" }, select: { id: true, title: true } }) : null;

  return (
    <div className="mt-6 grid gap-6 lg:grid-cols-[200px_1fr]">
      <aside className="hidden lg:block">
        <nav className="sticky top-24 space-y-1 text-[12.5px]" aria-label="Sections">
          {SECTIONS.map(([id, label]) => (
            <a key={id} href={`#${id}`} className="block rounded-lg px-2.5 py-1.5 text-ink/70 hover:bg-line/60 hover:text-ink">
              {label}
            </a>
          ))}
        </nav>
      </aside>

      <div className="card reading min-w-0 p-5 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <AiLabel kind={dd.kind} />
          {isAiConfigured() && <RegenerateDeepDive storyId={storyId} />}
        </div>
        {dd.kind === "unavailable" && (
          <Callout tone="butter" className="mt-4">
            <strong>AI analysis unavailable.</strong> {error ?? dd.evidenceNote} The confirmed facts, sources and related stories below are still real and source-linked.
          </Callout>
        )}

        {/* 1 */}
        <section id="development" className="mt-6 scroll-mt-24">
          <h2 className="display text-[24px] font-medium">The development</h2>
          <ul className="mt-3 space-y-2">
            {dd.development.facts.map((f, i) => (
              <li key={i} className="flex gap-3">
                <span className="mt-[9px] h-1.5 w-1.5 shrink-0 rounded-full bg-rust" />
                <p className="leading-relaxed">{f}</p>
              </li>
            ))}
          </ul>
          {(dd.development.people.length > 0 || dd.development.organisations.length > 0 || dd.development.figures.length > 0) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {dd.development.people.length > 0 && <FactList title="Key people" items={dd.development.people} />}
              {dd.development.organisations.length > 0 && <FactList title="Organisations" items={dd.development.organisations} />}
              {dd.development.figures.length > 0 && <FactList title="Supporting figures" items={dd.development.figures} />}
            </div>
          )}
          <Callout tone="powder" className="mt-4">
            <strong>Confirmed vs analysis:</strong> {dd.development.confirmedVsAnalysis}
          </Callout>
        </section>

        {/* 2 */}
        {dd.background.narrative && (
          <section id="background" className="mt-10 scroll-mt-24">
            <h2 className="display text-[24px] font-medium">The background</h2>
            <p className="mt-3 whitespace-pre-line leading-relaxed text-ink/90">{dd.background.narrative}</p>
            {dd.background.timeline.length > 0 && (
              <ol className="timeline relative mt-5 space-y-4 pl-6">
                {dd.background.timeline.map((t, i) => (
                  <li key={i} className="relative">
                    <span className="absolute -left-6 top-1.5 h-[15px] w-[15px] rounded-full border-2 border-paper bg-butter ring-1 ring-line" />
                    <p className="text-[12px] font-semibold uppercase tracking-wider text-rust">{t.date}</p>
                    <p className="font-medium">{t.label}</p>
                    {t.detail && <p className="text-[14px] text-muted">{t.detail}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        )}

        {/* 3 */}
        {dd.fundamentals.length > 0 && (
          <section id="fundamentals" className="mt-10 scroll-mt-24">
            <h2 className="display text-[24px] font-medium">Understanding the fundamentals</h2>
            <p className="mt-1 text-[13px] text-muted">Explain like I&rsquo;m new — the concepts you need, without the jargon.</p>
            <div className="mt-4 space-y-3">
              {dd.fundamentals.map((f) => (
                <details key={f.concept} className="group rounded-2xl border border-line bg-paper/60 p-4 open:bg-butter/30 dark:open:bg-butter/10" open={dd.fundamentals.length <= 3}>
                  <summary className="cursor-pointer list-none font-semibold">
                    <span className="mr-2 text-rust group-open:hidden">+</span>
                    <span className="mr-2 hidden text-rust group-open:inline">−</span>
                    {f.concept}
                  </summary>
                  <p className="mt-2 leading-relaxed text-ink/90">{f.explanation}</p>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* 4 */}
        {dd.connections.length > 0 && (
          <section id="connections" className="mt-10 scroll-mt-24">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <h2 className="display text-[24px] font-medium">Connecting the dots 🕸️</h2>
              <Link href={`/connect/${slug}`} className="text-[13px] font-semibold text-rust hover:underline">
                Open the interactive map →
              </Link>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {dd.connections.map((c, i) => (
                <div key={i} className="rounded-2xl border border-line p-4">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">{c.kind}</span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", REL[c.relation])}>{c.relation}</span>
                  </div>
                  <p className="mt-1.5 font-semibold">{c.label}</p>
                  <p className="mt-1 text-[14px] leading-relaxed text-ink/85">{c.explanation}</p>
                  {c.chain && c.chain.length > 1 && (
                    <ol className="mt-3 space-y-1 text-[13px]">
                      {c.chain.map((step, j) => (
                        <li key={j} className="flex flex-col">
                          <span className="rounded-lg bg-paper px-2.5 py-1">{step}</span>
                          {j < c.chain!.length - 1 && <ArrowDown className="my-0.5 ml-2 h-3.5 w-3.5 text-rust" />}
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 5 */}
        {dd.stakeholders.length > 0 && (
          <section id="stakeholders" className="mt-10 scroll-mt-24">
            <h2 className="display text-[24px] font-medium">Stakeholder impact</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {dd.stakeholders.map((s, i) => (
                <div key={i} className={cn("rounded-2xl p-4", DIR[s.direction])}>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-ink/60">{s.direction}</p>
                  <p className="mt-0.5 font-semibold">{s.group}</p>
                  <p className="mt-1 text-[13.5px] leading-relaxed">{s.impact}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 6 */}
        {dd.perspectives.length > 0 && (
          <section id="perspectives" className="mt-10 scroll-mt-24">
            <h2 className="display text-[24px] font-medium">Multiple perspectives</h2>
            <p className="mt-1 text-[13px] text-muted">Credible competing interpretations — weighted by evidence, not artificially balanced.</p>
            <div className="mt-4 grid gap-3 lg:grid-cols-3">
              {dd.perspectives.map((p, i) => (
                <div key={i} className="rounded-2xl border border-line p-4">
                  <p className="display text-[18px] font-medium">{p.title}</p>
                  <p className="mt-2 text-[14px] leading-relaxed">{p.view}</p>
                  <p className="mt-2 text-[12.5px] text-muted">
                    <span className="font-semibold">Evidence:</span> {p.evidence}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 7 */}
        {dd.whatNext.nearTerm && (
          <section id="next" className="mt-10 scroll-mt-24">
            <h2 className="display text-[24px] font-medium">What happens next?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Horizon label="Near term" text={dd.whatNext.nearTerm} />
              <Horizon label="Medium term" text={dd.whatNext.mediumTerm} />
              <Horizon label="Long term" text={dd.whatNext.longTerm} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <FactList title="Key uncertainties" items={dd.whatNext.uncertainties} />
              <FactList title="Indicators to monitor" items={dd.whatNext.indicators} />
            </div>
            {dd.whatNext.scenarios.length > 0 && (
              <>
                <p className="mt-6 text-[12px] font-semibold uppercase tracking-wider text-muted">Scenarios — possibilities, not predictions</p>
                <div className="mt-2 grid gap-3 sm:grid-cols-3">
                  {dd.whatNext.scenarios.map((s) => (
                    <div key={s.name} className={cn("rounded-2xl p-4", s.name === "Optimistic" ? "bg-sage/60 dark:bg-sage/15" : s.name === "Downside" ? "bg-coral/45 dark:bg-coral/15" : "bg-butter/60 dark:bg-butter/15")}>
                      <p className="display text-[18px] font-medium">Scenario: {s.name}</p>
                      <p className="mt-1.5 text-[13.5px] leading-relaxed">{s.description}</p>
                      {s.indicators.length > 0 && <p className="mt-2 text-[12px] text-ink/70">Watch: {s.indicators.join(" · ")}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </section>
        )}

        {/* 8 */}
        <section id="think" className="mt-10 scroll-mt-24 rounded-3xl bg-lavender/50 p-5 dark:bg-lavender/15 sm:p-6">
          <h2 className="display text-[24px] font-medium">Now, what do you think?</h2>
          <p className="mt-1 text-[13px] text-ink/70">A private thinking space. Your notes are yours; the optional AI review only asks questions, it never replaces your view.</p>
          <PerspectiveForm storyId={storyId} questions={dd.questions} existing={existing} />
        </section>

        {/* 9 */}
        <section id="reading" className="mt-10 scroll-mt-24">
          <h2 className="display text-[24px] font-medium">Further reading</h2>
          <ul className="mt-3 space-y-2.5">
            {dd.furtherReading.map((f, i) => (
              <li key={i} className="flex items-start gap-2 text-[14px]">
                <span className="mt-0.5 rounded-full bg-line px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-muted">{f.kind}</span>
                {f.url.startsWith("/") ? (
                  <Link href={f.url} className="font-medium hover:text-rust">{f.title}</Link>
                ) : (
                  <a href={f.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium hover:text-rust">
                    {f.title} <ExternalLink className="h-3 w-3 text-muted" />
                  </a>
                )}
              </li>
            ))}
          </ul>
          <Callout tone="butter" className="mt-5">
            <strong>Evidence note:</strong> {dd.evidenceNote}
          </Callout>
        </section>
      </div>
    </div>
  );
}

function FactList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{title}</p>
      <ul className="mt-1.5 space-y-1 text-[13.5px]">
        {items.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
    </div>
  );
}

function Horizon({ label, text }: { label: string; text: string }) {
  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-rust">{label}</p>
      <p className="mt-1 text-[13.5px] leading-relaxed">{text}</p>
    </div>
  );
}
