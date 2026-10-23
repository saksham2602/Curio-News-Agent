import type { SVGProps } from "react";

// Hand-drawn style doodles. Deliberately imperfect strokes, two-tone accents.
// Each accepts className for sizing. Stroke colour follows currentColor.

type P = SVGProps<SVGSVGElement> & { accent?: string };
const base = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function GlobeNewspaper({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <circle cx="19" cy="21" r="12" />
      <path d="M7.5 21h23M19 9c-4 4-4 20 0 24M19 9c4 4 4 20 0 24M9.5 14.5c5 2 14 2 19 0M9.5 27.5c5-2 14-2 19 0" />
      <path d="M26 30l13 1.5-1.5 12-13-1.5z" fill="#fff" />
      <path d="M28 33.5l8 .9M28 36.5l8 .9M28 39.5l5 .6" />
      <path d="M38 11l1.2 2.4 2.6.4-1.9 1.9.4 2.6L38 17l-2.3 1.3.4-2.6-1.9-1.9 2.6-.4z" fill={accent} stroke="none" />
      <path d="M8 36c.8-.6 1.6-.6 2.4 0" />
    </svg>
  );
}

export function CoffeeCup({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M11 20h22v9a9 9 0 0 1-9 9h-4a9 9 0 0 1-9-9z" fill={accent} fillOpacity="0.55" />
      <path d="M33 23h3.5a3.5 3.5 0 0 1 0 7H33" />
      <path d="M16 8c-1.5 2 1.5 3.5 0 6M21.5 7c-1.5 2 1.5 3.5 0 6M27 8c-1.5 2 1.5 3.5 0 6" />
      <circle cx="18" cy="27" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="26" cy="27" r="0.9" fill="currentColor" stroke="none" />
      <path d="M19.5 30.5c1.5 1.4 3.5 1.4 5 0" />
      <path d="M10 41h24" />
      <path d="M38 12l.7 1.4 1.5.2-1.1 1.1.2 1.5-1.3-.7-1.4.7.3-1.5-1.1-1.1 1.5-.2z" fill="#F7E7A8" stroke="none" />
    </svg>
  );
}

export function Magnifier({ accent = "#F7E7A8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <circle cx="20" cy="20" r="11" fill={accent} fillOpacity="0.5" />
      <circle cx="20" cy="20" r="11" />
      <path d="M28.5 28.5L39 39" strokeWidth="3" />
      <path d="M13.5 16.5c1.5-2.5 4-4 6.5-4.2" />
      <path d="M38 8l1 2 2.2.3-1.6 1.6.4 2.2-2-1-2 1 .4-2.2L34.8 10l2.2-.3z" fill="#F2B5A7" stroke="none" />
    </svg>
  );
}

export function Compass({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <circle cx="24" cy="25" r="15" />
      <circle cx="24" cy="25" r="11.5" strokeDasharray="1.5 3" />
      <path d="M24 13.5l4.5 10.5-4.5 12-4.5-12z" fill={accent} fillOpacity="0.7" />
      <path d="M24 13.5l4.5 10.5-4.5 12-4.5-12z" />
      <circle cx="24" cy="25" r="1.6" fill="currentColor" stroke="none" />
      <path d="M39 8l.8 1.7 1.8.3-1.3 1.3.3 1.8-1.6-.9-1.6.9.3-1.8-1.3-1.3 1.8-.3z" fill="#F7E7A8" stroke="none" />
    </svg>
  );
}

export function Planet({ accent = "#D9CCF2", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <circle cx="24" cy="24" r="10" fill={accent} fillOpacity="0.8" />
      <circle cx="24" cy="24" r="10" />
      <path d="M8 20c-3 6 6 12 20 12s24-6 14-14" />
      <path d="M12 28c2 3 7 5 13 5" strokeOpacity="0.5" />
      <path d="M10 10l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="#F2B5A7" stroke="none" />
      <path d="M39 36l.6 1.2 1.3.2-.9.9.2 1.3-1.2-.6-1.2.6.2-1.3-.9-.9 1.3-.2z" fill="#F7E7A8" stroke="none" />
    </svg>
  );
}

export function CalendarDoodle({ accent = "#F2B5A7", children, ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="9" y="11" width="30" height="28" rx="5" fill="#fff" />
      <path d="M9 19h30" />
      <rect x="9" y="11" width="30" height="8" rx="5" fill={accent} fillOpacity="0.7" />
      <rect x="9" y="11" width="30" height="28" rx="5" />
      <path d="M17 7v7M31 7v7" />
      <text x="24" y="33.5" textAnchor="middle" fontFamily="serif" fontSize="12" fill="currentColor" stroke="none">{children ?? "7"}</text>
      <path d="M41 9l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="#F7E7A8" stroke="none" />
    </svg>
  );
}

export function ChartFrame({ accent = "#F7E7A8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="7" y="9" width="34" height="30" rx="4" fill={accent} fillOpacity="0.55" />
      <rect x="7" y="9" width="34" height="30" rx="4" />
      <path d="M13 30l7-7 5 4 6-8 5 3" />
      <path d="M33 19h3v3" />
    </svg>
  );
}

export function PaperPlane({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M8 23L40 10 31 40l-9-10z" fill="#fff" />
      <path d="M8 23L40 10 31 40l-9-10z" />
      <path d="M22 30l18-20" />
      <path d="M22 30l-1.5 8 5-6" />
      <path d="M12 12l.6 1.2 1.3.2-.9.9.2 1.3-1.2-.6-1.2.6.2-1.3-.9-.9 1.3-.2z" fill={accent} stroke="none" />
    </svg>
  );
}

export function Notebook({ accent = "#D5E7F2", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="11" y="8" width="26" height="32" rx="3" fill={accent} fillOpacity="0.9" />
      <rect x="11" y="8" width="26" height="32" rx="3" />
      <path d="M11 15h-3M11 21h-3M11 27h-3M11 33h-3" />
      <path d="M17 17h14M17 22h14M17 27h9" />
      <path d="M31 30l6-6 2.5 2.5-6 6-3.5 1z" fill="#F7E7A8" />
      <path d="M31 30l6-6 2.5 2.5-6 6-3.5 1z" />
    </svg>
  );
}

export function Nodes({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M14 32L24 16l10 16M14 32h20" strokeDasharray="2 3" />
      <circle cx="24" cy="16" r="4.5" fill="#F7E7A8" />
      <circle cx="24" cy="16" r="4.5" />
      <circle cx="14" cy="32" r="4" fill={accent} />
      <circle cx="14" cy="32" r="4" />
      <circle cx="34" cy="32" r="4" fill="#D5E7F2" />
      <circle cx="34" cy="32" r="4" />
      <path d="M38 8l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="#F7E7A8" stroke="none" />
    </svg>
  );
}

export function Moon(p: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M30 8a16 16 0 1 0 10 28A13 13 0 0 1 30 8z" fill="#F7E7A8" />
      <path d="M30 8a16 16 0 1 0 10 28A13 13 0 0 1 30 8z" />
      <circle cx="22" cy="18" r="1.6" fill="#F2B5A7" stroke="none" />
      <circle cx="18" cy="28" r="2.2" fill="#F2B5A7" stroke="none" />
      <circle cx="27" cy="31" r="1.3" fill="#F2B5A7" stroke="none" />
    </svg>
  );
}

export function Sun(p: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <circle cx="24" cy="24" r="9" fill="#F7E7A8" />
      <circle cx="24" cy="24" r="9" />
      <path d="M24 6v5M24 37v5M6 24h5M37 24h5M11 11l3.5 3.5M33.5 33.5L37 37M37 11l-3.5 3.5M14.5 33.5L11 37" />
    </svg>
  );
}

export function Lightbulb({ accent = "#F7E7A8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M24 8a11 11 0 0 0-6 20.2V32h12v-3.8A11 11 0 0 0 24 8z" fill={accent} />
      <path d="M24 8a11 11 0 0 0-6 20.2V32h12v-3.8A11 11 0 0 0 24 8z" />
      <path d="M19 36h10M21 40h6" />
      <path d="M8 10l.7 1.5 1.6.2-1.2 1.1.3 1.6-1.4-.8-1.4.8.3-1.6-1.2-1.1 1.6-.2z" fill="#F2B5A7" stroke="none" />
      <path d="M40 16l.5 1 1.1.2-.8.8.2 1.1-1-.5-1 .5.2-1.1-.8-.8 1.1-.2z" fill="#D9CCF2" stroke="none" />
    </svg>
  );
}

export function Books({ accent = "#C8DCC8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="10" y="28" width="28" height="8" rx="2" fill={accent} />
      <rect x="10" y="28" width="28" height="8" rx="2" />
      <rect x="13" y="20" width="24" height="8" rx="2" fill="#F2B5A7" />
      <rect x="13" y="20" width="24" height="8" rx="2" />
      <rect x="11" y="12" width="22" height="8" rx="2" fill="#D5E7F2" />
      <rect x="11" y="12" width="22" height="8" rx="2" />
      <path d="M26 8c0-3 3-4 4-2" />
    </svg>
  );
}

export function Briefcase({ accent = "#F7E7A8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="8" y="15" width="32" height="22" rx="4" fill={accent} fillOpacity="0.6" />
      <rect x="8" y="15" width="32" height="22" rx="4" />
      <path d="M18 15v-4h12v4M8 24h32" />
      <rect x="21" y="22" width="6" height="4" rx="1" fill="#fff" />
    </svg>
  );
}

export function Megaphone({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M10 20v8h6l14 8V12l-14 8z" fill={accent} fillOpacity="0.7" />
      <path d="M10 20v8h6l14 8V12l-14 8z" />
      <path d="M34 19c2 2 2 8 0 10M38 15c4 4 4 14 0 18" />
      <path d="M14 28l2 8h4l-1.5-8" />
    </svg>
  );
}

export function Ticker({ accent = "#D9CCF2", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="8" y="10" width="32" height="28" rx="4" fill={accent} fillOpacity="0.6" />
      <rect x="8" y="10" width="32" height="28" rx="4" />
      <path d="M14 30V22M20 30V16M26 30v-9M32 30V19" strokeWidth="3" />
    </svg>
  );
}

export function People({ accent = "#ECE9E1", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <circle cx="18" cy="17" r="5" fill="#F2B5A7" />
      <circle cx="18" cy="17" r="5" />
      <circle cx="31" cy="19" r="4" fill="#D5E7F2" />
      <circle cx="31" cy="19" r="4" />
      <path d="M9 36c0-6 4-10 9-10s9 4 9 10" fill={accent} />
      <path d="M9 36c0-6 4-10 9-10s9 4 9 10M27 36c0-5 2-8 5-9 4 0 7 4 7 9" />
    </svg>
  );
}

export function Heart({ accent = "#F2B5A7", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M24 38s-13-8-13-18a7 7 0 0 1 13-3 7 7 0 0 1 13 3c0 10-13 18-13 18z" fill={accent} fillOpacity="0.8" />
      <path d="M24 38s-13-8-13-18a7 7 0 0 1 13-3 7 7 0 0 1 13 3c0 10-13 18-13 18z" />
      <path d="M14 24h6l2-4 3 8 2-4h7" stroke="#fff" />
    </svg>
  );
}

export function Leaf({ accent = "#C8DCC8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M12 36C12 18 24 10 38 10c0 16-8 26-26 26z" fill={accent} />
      <path d="M12 36C12 18 24 10 38 10c0 16-8 26-26 26z" />
      <path d="M12 36c6-8 12-14 20-20" />
    </svg>
  );
}

export function Chip({ accent = "#D5E7F2", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <rect x="13" y="13" width="22" height="22" rx="4" fill={accent} />
      <rect x="13" y="13" width="22" height="22" rx="4" />
      <rect x="19" y="19" width="10" height="10" rx="2" fill="#fff" />
      <path d="M19 13V8M24 13V8M29 13V8M19 40v-5M24 40v-5M29 40v-5M13 19H8M13 24H8M13 29H8M40 19h-5M40 24h-5M40 29h-5" />
    </svg>
  );
}

export function Pencil({ accent = "#F7E7A8", ...p }: P) {
  return (
    <svg viewBox="0 0 48 48" {...base} {...p}>
      <path d="M12 36l3-10 18-18 7 7-18 18z" fill={accent} />
      <path d="M12 36l3-10 18-18 7 7-18 18z" />
      <path d="M15 26l7 7M30 11l7 7" />
      <path d="M8 40c3-1 6-1 9 0" />
    </svg>
  );
}

export function Sparkles(p: P) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" {...p}>
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8z" />
      <path d="M19 15l.9 2.6 2.6.9-2.6.9L19 22l-.9-2.6-2.6-.9 2.6-.9z" opacity=".8" />
      <path d="M4 14l.7 1.8 1.8.7-1.8.7L4 19l-.7-1.8L1.5 16.5l1.8-.7z" opacity=".6" />
    </svg>
  );
}

export const SUBJECT_DOODLES = {
  chart: ChartFrame,
  briefcase: Briefcase,
  ticker: Ticker,
  megaphone: Megaphone,
  globe: GlobeNewspaper,
  notebook: Notebook,
  people: People,
  planet: Planet,
  heart: Heart,
  leaf: Leaf,
  chip: Chip,
} as const;
