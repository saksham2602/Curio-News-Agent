import Link from "next/link";
import { Container, SectionHeader, AiLabel, SubjectTag } from "@/components/ui";
import { CalendarDoodle, Lightbulb } from "@/components/doodles";
import type { WeeklyDigestContent } from "@/lib/types";
import { fmtDate } from "@/lib/utils";

function cite(text: string, cites: { n: number; slug: string }[]) {
  const parts = text.split(/(\[\d+\])/g);
  return parts.map((p, i) => {
    const m = p.match(/^\[(\d+)\]$/);
    if (!m) return <span key={i}>{p}</span>;
    const c = cites.find((x) => x.n === Number(m[1]));
    return c ? (
      <Link key={i} href={`/story/${c.slug}`} className="font-semibold text-[#F3DE8E] hover:underline">
        [{m[1]}]
      </Link>
    ) : (
      <span key={i} className="font-semibold">{p}</span>
    );
  });
}

export function WeekView({ digest, startAt, endAt, weekKey, previous, kind }: { digest: WeeklyDigestContent; startAt: Date; endAt: Date; weekKey: string; previous: { weekKey: string }[]; kind: string }) {
  const allCites = [...digest.biggest.map((b, i) => ({ n: i + 1, slug: b.slug })), ...digest.themes.flatMap((t) => t.citations.map((c) => ({ n: c.n, slug: c.slug })))];
  const day = (d: Date) => fmtDate(d, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false });
  return (
    <Container className="pb-10 pt-8 sm:pt-12">
      <SectionHeader eyebrow="The week, decoded" title="What the week collectively revealed" description={`${day(startAt)} → ${day(endAt)} · ${weekKey}`} doodle={<CalendarDoodle className="h-12 w-12">7</CalendarDoodle>} size="lg" />
      <div className="mt-8 border-t border-line" />

      <section className="mt-8 rounded-[28px] bg-[#1F1E1C] p-6 text-[#F3EFE6] sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="display max-w-3xl text-balance text-[26px] font-medium leading-[1.15] sm:text-[36px]">{digest.title}</h2>
          <AiLabel kind={kind === "ai" ? "ai" : "extractive"} className="!border-[#3a3833] !bg-[#2a2926] !text-[#C9C3B8]" />
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {digest.themes.map((t) => (
            <div key={t.title} className="rounded-2xl bg-[#2A2926] p-5">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#E8968C]">Theme · evidence</p>
              <h3 className="display mt-1 text-[20px] font-medium leading-snug">{t.title}</h3>
              <p className="mt-2 text-[13.5px] leading-relaxed text-[#F3EFE6]/85">{cite(t.narrative, t.citations.map((c) => ({ n: c.n, slug: c.slug })))}</p>
              <ul className="mt-3 space-y-1 text-[12px] text-[#F3DE8E]">
                {t.citations.map((c) => (
                  <li key={c.n}>
                    <Link href={`/story/${c.slug}`} className="hover:underline">[{c.n}] {c.title} — {c.source}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="display text-[26px] font-medium">The 10 biggest developments</h2>
        <p className="mt-1 text-[13px] text-muted">Ranked by editorial significance. Each one links to its quick read and sources.</p>
        <ol className="mt-4 grid gap-3 md:grid-cols-2">
          {digest.biggest.map((b, i) => (
            <li key={b.storyId} className="card flex items-start gap-3 p-4">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-butter font-mono text-[12px] font-semibold">{i + 1}</span>
              <div className="min-w-0">
                <SubjectTag subject={b.subject} />
                <Link href={`/story/${b.slug}`} className="mt-1 block text-[15px] font-medium leading-snug hover:text-rust">{b.title}</Link>
                <p className="mt-1 text-[12px] text-muted">{b.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12 grid gap-4 md:grid-cols-2">
        <Panel title="Economic pulse" text={digest.economicPulse} cites={allCites} tone="bg-butter/50 dark:bg-butter/10" />
        <Panel title="Business moves that matter" text={digest.businessMoves} cites={allCites} tone="bg-sage/50 dark:bg-sage/10" />
        <Panel title="Marketing & consumer trends" text={digest.marketingTrends} cites={allCites} tone="bg-coral/35 dark:bg-coral/10" />
        <Panel title="Global power shifts" text={digest.powerShifts} cites={allCites} tone="bg-powder/60 dark:bg-powder/10" />
      </section>

      {digest.ideas.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-9 w-9" />
            <h2 className="display text-[26px] font-medium">Three ideas worth thinking about</h2>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {digest.ideas.map((idea, i) => (
              <div key={i} className="rounded-3xl bg-lavender/55 p-5 dark:bg-lavender/10">
                <p className="font-mono text-[12px] text-ink/60">0{i + 1}</p>
                <p className="mt-2 text-[15px] leading-relaxed">{idea}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="mt-12">
        <h2 className="display text-[26px] font-medium">Next week&rsquo;s watchlist</h2>
        <p className="mt-1 text-[13px] text-muted">Only events mentioned in this week&rsquo;s reporting — nothing is invented.</p>
        {digest.watchlist.length ? (
          <ul className="card mt-4 divide-y divide-line">
            {digest.watchlist.map((w, i) => (
              <li key={i} className="flex items-start gap-4 px-5 py-3.5">
                <span className="w-28 shrink-0 text-[12px] font-semibold uppercase tracking-wider text-rust">{w.when}</span>
                <div className="min-w-0">
                  {w.slug ? <Link href={`/story/${w.slug}`} className="text-[14px] font-medium hover:text-rust">{w.what}</Link> : <p className="text-[14px] font-medium">{w.what}</p>}
                  {w.source && <p className="text-[12px] text-muted">via {w.source}</p>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-[13px] text-muted">No dated upcoming events were mentioned in this week&rsquo;s stories.</p>
        )}
      </section>

      {previous.length > 0 && (
        <section className="mt-12">
          <h2 className="eyebrow">Previous editions</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            {previous.map((p) => (
              <Link key={p.weekKey} href={`/week/${p.weekKey}`} className="pill border border-line bg-card hover:border-ink/50">{p.weekKey}</Link>
            ))}
          </div>
        </section>
      )}
    </Container>
  );
}

function Panel({ title, text, cites, tone }: { title: string; text: string; cites: { n: number; slug: string }[]; tone: string }) {
  return (
    <div className={`rounded-3xl p-5 ${tone}`}>
      <h3 className="display text-[20px] font-medium">{title}</h3>
      <p className="mt-2 text-[14px] leading-relaxed">
        {text.split(/(\[\d+\])/g).map((p, i) => {
          const m = p.match(/^\[(\d+)\]$/);
          if (!m) return <span key={i}>{p}</span>;
          const c = cites.find((x) => x.n === Number(m[1]));
          return c ? <Link key={i} href={`/story/${c.slug}`} className="font-semibold text-rust hover:underline">[{m[1]}]</Link> : <span key={i}>{p}</span>;
        })}
      </p>
    </div>
  );
}
