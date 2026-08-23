import { cn } from "@/lib/utils";

/**
 * Minimal horse-head mark drawn by hand so the brand has a hoofed mascot
 * instead of a generic paw/star. Used in the sidebar and as the favicon-
 * adjacent glyph on dashboards.
 */
export function HorseMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      <path d="M4.5 21c0-4 .8-6.7 2.6-9C5.6 10.6 5 9 5.2 7.2c1.6-.3 3.1.1 4.4 1.1A9.6 9.6 0 0 1 12.5 8c4 0 7 3.4 7 8.2 0 1.7-.3 3.3-.8 4.8" />
      <path d="M19.5 21c.4-1.5.6-3.1.6-4.8" />
      <circle cx="15.5" cy="11.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

/** Gold-framed brand lockup used in the sidebar and mobile bar. */
export function BrandLockup({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-onstride-gold/60 bg-onstride-gold/10 text-onstride-gold">
        <HorseMark className="size-5" />
      </span>
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-lg font-semibold tracking-wide text-onstride-cream">
            OnStride
          </span>
          <span className="text-[0.6rem] font-semibold uppercase tracking-[0.28em] text-onstride-gold/90">
            Turnout Planner
          </span>
        </span>
      )}
    </span>
  );
}
