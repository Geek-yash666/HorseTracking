"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { href: "/board", label: "Today's Board" },
  { href: "/horses", label: "Horses" },
  { href: "/spaces", label: "Spaces" },
  { href: "/groups", label: "Groups" },
  { href: "/rules", label: "Schedule" },
  { href: "/compatibility", label: "Compatibility" },
];

export function SiteNav() {
  const pathname = usePathname();

  return (
    <header className="border-b border-slate-200/90 bg-white shadow-xs">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="flex flex-col leading-none">
            <span className="text-[0.65rem] tracking-[0.3em] text-[#53647e] uppercase font-bold">
              Barnwright
            </span>
            <span className="text-base font-bold font-display tracking-tight text-[#0a0f1d]">The Turnout Planner</span>
          </div>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "transition-colors hover:text-barnwright-green",
                  active
                    ? "font-semibold text-barnwright-green"
                    : "text-barnwright-green/60"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
