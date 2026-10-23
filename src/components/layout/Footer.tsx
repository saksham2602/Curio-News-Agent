import Link from "next/link";
import { PaperPlane } from "@/components/doodles";

export function Footer() {
  return (
    <footer className="mt-20 border-t border-line">
      <div className="mx-auto grid max-w-[1240px] gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <div className="flex items-center gap-2">
            <PaperPlane className="h-8 w-8" />
            <span className="display text-lg">The Curious Brief</span>
          </div>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Knowing the headlines → understanding the story → connecting the dots → developing your own perspective. Summaries are original and link to the publisher; AI-generated explanations are labelled and show their sources.
          </p>
        </div>
        <FooterCol title="Read" links={[["/", "Today"], ["/brief", "Daily Brief"], ["/news", "All News"], ["/bubble", "Beyond My Bubble"], ["/week", "The Week, Decoded"]]} />
        <FooterCol title="Understand" links={[["/connect", "Connect the Dots"], ["/pulse", "Economic Pulse"], ["/curio", "Ask Curio"], ["/explore", "Search & Explore"]]} />
        <FooterCol title="Yours" links={[["/library", "My Little Library"], ["/perspectives", "My Perspectives"], ["/settings", "Settings"], ["/sources", "Source Health"]]} />
      </div>
      <div className="border-t border-line/60 py-4 text-center text-xs text-muted">Built for curious minds. Headlines and summaries belong to their publishers.</div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="eyebrow mb-3">{title}</p>
      <ul className="space-y-2 text-sm">
        {links.map(([href, label]) => (
          <li key={href}>
            <Link href={href} className="text-ink/80 hover:text-rust">
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
