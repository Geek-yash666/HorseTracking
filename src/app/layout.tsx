import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getLocalDateString } from "@/lib/schedule";

// Stand-in for OnStride's Denton typeface (noted in the README): Playfair
// Display carries the brand voice — headings, wordmark, big numbers — while
// Inter keeps dense operational data (the board) legible at a glance.
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "The Turnout Planner · OnStride",
  description: "Run the day's turnout from a live board — OnStride.",
};

// Every page here reads live barn data straight from the database. None of
// it should ever be served from a stale static build — this barn's board
// has to reflect whatever is true right now, not whatever was true at
// deploy time. Applying it at the root layout so every route inherits it,
// rather than repeating it per page and risking a page that forgets it.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const now = new Date();
  const todayLabel = now.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
  const todayISO = getLocalDateString(now);

  return (
    <html lang="en" className="h-full antialiased font-sans">
      <body
        className={`${playfair.variable} ${inter.variable} flex min-h-dvh flex-col`}
      >
        <AppShell todayLabel={todayLabel} todayISO={todayISO}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
