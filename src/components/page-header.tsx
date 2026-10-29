import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Standard page chrome: gold kicker line, serif headline, optional
 * left back button, description and right-aligned actions (buttons, forms).
 */
export function PageHeader({
  kicker,
  title,
  description,
  actions,
  backHref,
  className,
}: {
  kicker?: string;
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-end justify-between gap-4",
        className
      )}
    >
      <div className="flex items-start gap-3.5 sm:gap-4 max-w-2xl">
        {backHref && (
          <Link
            href={backHref}
            aria-label="Back"
            className="group mt-1 flex h-10 sm:h-11 items-center gap-1.5 rounded-xl sm:rounded-2xl border border-barnwright-green/15 bg-card px-3 sm:px-3.5 text-xs sm:text-sm font-bold text-barnwright-green/80 shadow-xs transition-all hover:border-barnwright-gold hover:bg-barnwright-gold/10 hover:text-barnwright-gold-deep hover:shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            title="Back"
          >
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-0.5" />
            <span>Back</span>
          </Link>
        )}
        <div className="min-w-0 flex-1">
          {kicker && <p className="overline-label">{kicker}</p>}
          <h1 className="font-display mt-1 text-3xl font-semibold tracking-tight text-barnwright-green sm:text-[2.5rem] sm:leading-tight">
            {title}
          </h1>
          {description && (
            <p className="mt-2 text-sm leading-relaxed text-barnwright-green/60">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
