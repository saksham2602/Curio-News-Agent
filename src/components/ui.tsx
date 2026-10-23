import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SUBJECT_MAP, TIERS } from "@/lib/taxonomy";
import type { Subject, Tier } from "@/lib/types";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-[1240px] px-4 sm:px-6", className)}>{children}</div>;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  doodle,
  action,
  className,
  size = "md",
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  doodle?: ReactNode;
  action?: { href: string; label: string };
  className?: string;
  size?: "md" | "lg";
}) {
  return (
    <div className={cn("flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="flex items-start gap-3">
        {doodle && <div className="mt-1 hidden h-12 w-12 shrink-0 sm:block">{doodle}</div>}
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 className={cn("display mt-1 text-balance font-medium", size === "lg" ? "text-[34px] leading-[1.05] sm:text-[44px]" : "text-[26px] leading-tight sm:text-[32px]")}>{title}</h2>
          {description && <p className="mt-2 max-w-xl text-pretty text-[14px] leading-relaxed text-muted sm:text-[15px]">{description}</p>}
        </div>
      </div>
      {action && (
        <Link href={action.href} className="inline-flex shrink-0 items-center gap-1 text-[14px] font-semibold text-rust hover:underline">
          {action.label} <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  );
}

export function SubjectTag({ subject, className }: { subject: string; className?: string }) {
  const meta = SUBJECT_MAP[subject as Subject];
  if (!meta) return null;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/70", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", meta.dot)} />
      {meta.label}
    </span>
  );
}

export function TierBadge({ tier, className }: { tier: string; className?: string }) {
  const t = TIERS[tier as Tier];
  if (!t) return null;
  return <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold", t.className, className)}>{t.label}</span>;
}

export function PrimaryButton({ href, children, className, onClick, type = "button", disabled }: { href?: string; children: ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = cn("inline-flex items-center justify-center gap-1.5 rounded-full bg-ink px-4 py-2 text-[13px] font-semibold text-paper transition hover:bg-ink/85 disabled:opacity-50", className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} className={cls} disabled={disabled}>{children}</button>;
}

export function SecondaryButton({ href, children, className, onClick, type = "button", disabled }: { href?: string; children: ReactNode; className?: string; onClick?: () => void; type?: "button" | "submit"; disabled?: boolean }) {
  const cls = cn("inline-flex items-center justify-center gap-1.5 rounded-full border border-ink/25 bg-card px-4 py-2 text-[13px] font-semibold text-ink transition hover:border-ink/60 hover:bg-line/40 disabled:opacity-50", className);
  if (href) return <Link href={href} className={cls}>{children}</Link>;
  return <button type={type} onClick={onClick} className={cls} disabled={disabled}>{children}</button>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({ doodle, title, description, action }: { doodle: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="rounded-3xl border border-dashed border-line bg-card/50 px-6 py-12 text-center">
      <div className="mx-auto mb-3 h-14 w-14">{doodle}</div>
      <h3 className="display text-xl">{title}</h3>
      {description && <p className="mx-auto mt-2 max-w-md text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Callout({ children, tone = "coral", className }: { children: ReactNode; tone?: "coral" | "sage" | "butter" | "powder" | "lavender"; className?: string }) {
  const tones = { coral: "bg-coral/35 dark:bg-coral/15", sage: "bg-sage/50 dark:bg-sage/15", butter: "bg-butter/55 dark:bg-butter/15", powder: "bg-powder/60 dark:bg-powder/15", lavender: "bg-lavender/55 dark:bg-lavender/15" };
  return <div className={cn("rounded-2xl px-4 py-3 text-[13px] leading-relaxed", tones[tone], className)}>{children}</div>;
}

export function AiLabel({ kind, className }: { kind: "ai" | "extractive" | "unavailable"; className?: string }) {
  const text = kind === "ai" ? "AI-generated explanation based on the sources below" : kind === "extractive" ? "Source-grounded summary (AI enrichment not configured)" : "AI analysis unavailable";
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-2.5 py-1 text-[11px] font-medium text-muted", className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", kind === "ai" ? "bg-[#B9A8E8]" : "bg-[#BDBDBD]")} />
      {text}
    </span>
  );
}
