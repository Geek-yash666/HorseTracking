"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  ClipboardList,
  KanbanSquare,
  Map,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLockup } from "@/components/icons";
import { SidebarWidgets } from "@/components/sidebar-widgets";

const NAV_ITEMS = [
  { href: "/board", label: "Board", icon: KanbanSquare },
  { href: "/map", label: "Map", icon: Map },
  { href: "/barn", label: "Barn", icon: ClipboardList },
] as const;

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
              active
                ? "bg-white/8 font-medium text-onstride-cream"
                : "text-onstride-cream/60 hover:bg-white/5 hover:text-onstride-cream"
            )}
          >
            <span
              className={cn(
                "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-onstride-gold transition-opacity",
                active ? "opacity-100" : "opacity-0"
              )}
            />
            <Icon className="size-4 shrink-0 text-onstride-gold/80" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * The application chrome: a deep-green branded sidebar on desktop with
 * live weather + schedule calendar widgets, a slide-down sheet behind a
 * hamburger bar on mobile. Server passes the date string in so there's
 * no hydration mismatch.
 */
export function AppShell({
  children,
  todayLabel,
  todayISO,
}: {
  children: React.ReactNode;
  todayLabel: string;
  todayISO: string;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-dvh lg:flex">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-white/10 bg-gradient-to-b from-[#0c1c15] via-[#10241c] to-[#152f24] lg:flex">
        <div className="flex items-center px-5 pb-6 pt-7">
          <Link href="/board" className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-onstride-gold/60">
            <BrandLockup />
          </Link>
        </div>
        <div className="mx-5 h-px bg-gradient-to-r from-transparent via-onstride-gold/30 to-transparent" />
        <div className="flex-1 overflow-y-auto px-3 py-6">
          <NavLinks />
        </div>
        <div className="border-t border-white/10 pt-3">
          <p className="px-4 pb-1 text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-onstride-cream/40">
            {todayLabel}
          </p>
          <SidebarWidgets todayISO={todayISO} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#10241c] px-4 lg:hidden">
        <Link href="/board">
          <BrandLockup compact />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          className="flex size-10 items-center justify-center rounded-lg border border-white/15 text-onstride-cream/90 transition-colors hover:bg-white/10"
        >
          {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </header>

      {mobileOpen && (
        <div className="fixed inset-x-0 top-14 z-30 max-h-[calc(100dvh-3.5rem)] overflow-y-auto border-b border-white/10 bg-[#10241c] px-4 pb-6 pt-4 shadow-xl lg:hidden">
          <NavLinks onNavigate={() => setMobileOpen(false)} />
          <div className="mt-4 border-t border-white/10 pt-4">
            <SidebarWidgets todayISO={todayISO} />
          </div>
        </div>
      )}

      {/* Content column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
          {children}
        </main>
        <footer className="border-t border-onstride-green/10 px-4 py-4 text-center text-xs text-onstride-green/45 sm:px-6 lg:px-10">
          OnStride · The Turnout Planner — run the day, not the whiteboard.
        </footer>
      </div>
    </div>
  );
}
