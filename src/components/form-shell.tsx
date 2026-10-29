import Link from "next/link";
import { ArrowLeft } from "lucide-react";

/**
 * Shared chrome for every new/edit form: prominent left-aligned back button,
 * branded heading, and a single focused panel.
 */
export function FormShell({
  kicker,
  title,
  description,
  backHref,
  children,
}: {
  kicker?: string;
  title: string;
  description?: string;
  backHref: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div className="flex items-start gap-3.5 sm:gap-4">
        <Link
          href={backHref}
          aria-label="Back"
          className="group mt-1 flex h-10 sm:h-11 items-center gap-1.5 rounded-xl sm:rounded-2xl border border-barnwright-green/15 bg-card px-3 sm:px-3.5 text-xs sm:text-sm font-bold text-barnwright-green/80 shadow-xs transition-all hover:border-barnwright-gold hover:bg-barnwright-gold/10 hover:text-barnwright-gold-deep hover:shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          title="Back"
        >
          <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
          <span>Back</span>
        </Link>
        <div className="min-w-0 flex-1">
          {kicker && <p className="overline-label">{kicker}</p>}
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-barnwright-green/90 leading-tight mt-0.5">
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 text-sm text-barnwright-green/60 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </div>
      <div className="panel p-6 sm:p-7 shadow-[var(--shadow-panel)]">{children}</div>
    </div>
  );
}
