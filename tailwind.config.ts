import type { Config } from "tailwindcss";

export default {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ivory: "#FAF7F0",
        charcoal: "#252525",
        ink: "rgb(var(--ink) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        card: "rgb(var(--card) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        rust: "rgb(var(--rust) / <alpha-value>)",
        lavender: "#D9CCF2",
        butter: "#F7E7A8",
        coral: "#F2B5A7",
        sage: "#C8DCC8",
        powder: "#D5E7F2",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      borderRadius: { "2xl": "1.25rem", "3xl": "1.75rem", "4xl": "2.25rem" },
      boxShadow: {
        card: "0 1px 2px rgba(37,37,37,0.04), 0 8px 24px -12px rgba(37,37,37,0.12)",
        lift: "0 2px 4px rgba(37,37,37,0.05), 0 18px 40px -16px rgba(37,37,37,0.22)",
        pop: "0 10px 30px -10px rgba(37,37,37,0.35)",
      },
      keyframes: {
        shimmer: { "0%": { backgroundPosition: "-200% 0" }, "100%": { backgroundPosition: "200% 0" } },
        fadeUp: { "0%": { opacity: "0", transform: "translateY(6px)" }, "100%": { opacity: "1", transform: "translateY(0)" } },
        pop: { "0%": { transform: "scale(1)" }, "40%": { transform: "scale(1.25)" }, "100%": { transform: "scale(1)" } },
      },
      animation: {
        shimmer: "shimmer 1.8s linear infinite",
        fadeUp: "fadeUp .35s ease-out both",
        pop: "pop .35s ease-out",
      },
    },
  },
  plugins: [],
} satisfies Config;
