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
    <header className="border-b border-onstride-green/10 bg-onstride-cream">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex flex-col leading-none">
          <span className="text-[0.65rem] tracking-[0.3em] text-onstride-gold uppercase">
            OnStride
          </span>
          <span className="text-lg font-semibold">The Turnout Planner</span>
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
                  "transition-colors hover:text-onstride-green",
                  active
                    ? "font-semibold text-onstride-green"
                    : "text-onstride-green/60"
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
