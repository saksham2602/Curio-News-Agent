import type { Metadata, Viewport } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import "./globals.css";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { CurioFab } from "@/components/curio/CurioFab";
import { currentUser } from "@/lib/auth";
import { ThemeScript } from "@/components/layout/ThemeScript";
import { isAiConfigured } from "@/lib/ai/client";

const serif = Fraunces({ subsets: ["latin"], variable: "--font-serif", axes: ["opsz", "SOFT", "WONK"], display: "swap" });
const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans", weight: ["400", "500", "600", "700"], display: "swap" });

export const metadata: Metadata = {
  title: { default: "The Curious Brief", template: "%s · The Curious Brief" },
  description: "A beautiful little window to the world: the news that matters, explained, connected and made yours.",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF7F0" },
    { media: "(prefers-color-scheme: dark)", color: "#1C1B19" },
  ],
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  const prefs = user?.preferences;
  return (
    <html lang="en" suppressHydrationWarning className={`${serif.variable} ${sans.variable}`}>
      <head>
        <ThemeScript theme={prefs?.theme ?? "system"} fontScale={prefs?.fontScale ?? 1} />
      </head>
      <body data-reading={prefs?.readingMode ?? "comfortable"} className={prefs?.focusMode ? "focus-mode" : ""}>
        <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-ink focus:px-4 focus:py-2 focus:text-paper">
          Skip to content
        </a>
        <Nav user={user ? { name: user.name, email: user.email, isGuest: user.isGuest } : null} />
        <main id="main" className="min-h-[70vh]">{children}</main>
        <Footer />
        <CurioFab aiConfigured={isAiConfigured()} />
      </body>
    </html>
  );
}
