"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, Moon, Search, Sun, X } from "lucide-react";
import { GlobeNewspaper } from "@/components/doodles";
import { cn } from "@/lib/utils";

const PRIMARY = [
  { href: "/", label: "Today" },
  { href: "/brief", label: "Daily Brief" },
  { href: "/news", label: "All News" },
  { href: "/bubble", label: "Beyond My Bubble" },
  { href: "/connect", label: "Connect the Dots" },
  { href: "/pulse", label: "Economic Pulse" },
  { href: "/week", label: "The Week" },
];

const MORE = [
  { href: "/curio", label: "Ask Curio ✨" },
  { href: "/library", label: "My Little Library" },
  { href: "/perspectives", label: "My Perspectives" },
  { href: "/explore", label: "Search & Explore" },
  { href: "/settings", label: "Settings" },
  { href: "/sources", label: "Source Health" },
];

function useTheme() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem("cb-theme", next ? "dark" : "light");
    } catch {}
  };
  return { dark, toggle };
}

export function Nav({ user }: { user: { name: string | null; email: string | null; isGuest: boolean } | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const { dark, toggle } = useTheme();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMore(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const signedIn = user && !user.isGuest;

  return (
    <header className="sticky top-0 z-50 border-b border-line/80 bg-paper/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1240px] items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2" aria-label="The Curious Brief home">
          <GlobeNewspaper className="h-9 w-9 text-ink" />
          <span className="display text-[21px] font-medium leading-none">The Curious Brief</span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 xl:flex" aria-label="Primary">
          {PRIMARY.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn("pill text-[14px] text-ink/80 hover:bg-line/60 hover:text-ink", isActive(item.href) && "bg-butter text-ink")}
              aria-current={isActive(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
          <div ref={moreRef} className="relative">
            <button type="button" onClick={() => setMore((m) => !m)} className={cn("pill text-[14px] text-ink/80 hover:bg-line/60", MORE.some((m) => isActive(m.href)) && "bg-butter text-ink")} aria-expanded={more} aria-haspopup="menu">
              More <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {more && (
              <div role="menu" className="absolute left-0 top-full mt-2 w-48 rounded-2xl border border-line bg-card p-1.5 shadow-lift animate-fadeUp">
                {MORE.map((m) => (
                  <Link key={m.href} href={m.href} role="menuitem" onClick={() => setMore(false)} className={cn("block rounded-xl px-3 py-2 text-[14px] hover:bg-line/60", isActive(m.href) && "bg-butter")}>
                    {m.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link href="/explore" className="rounded-full p-2 hover:bg-line/60" aria-label="Search">
            <Search className="h-[18px] w-[18px]" />
          </Link>
          <button type="button" onClick={toggle} className="rounded-full p-2 hover:bg-line/60" aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}>
            {dark ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
          </button>
          {signedIn ? (
            <Link href="/settings" className="hidden rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper sm:inline-flex">
              {user!.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <Link href="/signin" className="hidden rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper hover:bg-ink/90 sm:inline-flex">
              Sign in
            </Link>
          )}
          <button type="button" onClick={() => setOpen(true)} className="rounded-full p-2 hover:bg-line/60 xl:hidden" aria-label="Open menu" aria-expanded={open}>
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-[60] xl:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="absolute inset-0 bg-ink/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[min(88vw,360px)] flex-col bg-paper shadow-pop animate-fadeUp">
            <div className="flex h-16 items-center justify-between border-b border-line px-4">
              <span className="display text-lg">Menu</span>
              <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 hover:bg-line/60" aria-label="Close menu">
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-3" aria-label="Mobile">
              {PRIMARY.map((item) => (
                <Link key={item.href} href={item.href} className={cn("block rounded-xl px-3 py-2.5 text-[15px]", isActive(item.href) ? "bg-butter font-semibold" : "hover:bg-line/60")}>
                  {item.label}
                </Link>
              ))}
              <div className="my-2 border-t border-line" />
              {MORE.map((item) => (
                <Link key={item.href} href={item.href} className={cn("block rounded-xl px-3 py-2.5 text-[15px]", isActive(item.href) ? "bg-butter font-semibold" : "hover:bg-line/60")}>
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="border-t border-line p-4">
              {signedIn ? (
                <p className="text-sm text-muted">Signed in as {user!.email}</p>
              ) : (
                <Link href="/signin" className="block rounded-full bg-ink py-2.5 text-center text-[14px] font-semibold text-paper">
                  Sign in
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
