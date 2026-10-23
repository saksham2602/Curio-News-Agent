import { cn } from "@/lib/utils";

// Dependency-free SVG sparkline (renders on the server).
export function Sparkline({ series, className, stroke = "#9A3F3F", fill = "#F2B5A7" }: { series: { period: string; value: number }[]; className?: string; stroke?: string; fill?: string }) {
  const pts = series.slice(-30);
  if (pts.length < 2) return <div className={cn("rounded-lg bg-line/40", className)} />;
  const w = 200;
  const h = 48;
  const min = Math.min(...pts.map((p) => p.value));
  const max = Math.max(...pts.map((p) => p.value));
  const range = max - min || 1;
  const coords = pts.map((p, i) => [(i / (pts.length - 1)) * w, h - 4 - ((p.value - min) / range) * (h - 8)] as const);
  const d = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w},${h} L0,${h} Z`;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden>
      <path d={area} fill={fill} fillOpacity="0.35" />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
