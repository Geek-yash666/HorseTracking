import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Branded empty state used by every list page — explains what will live
 * here and offers the next action instead of leaving a blank table.
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="panel flex flex-col items-center gap-3 border-dashed px-6 py-14 text-center">
      <div
        aria-hidden="true"
        className="mb-1 h-px w-16 bg-gradient-to-r from-transparent via-onstride-gold to-transparent"
      />
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="max-w-md text-sm leading-relaxed text-onstride-green/60">
        {description}
      </p>
      {actionLabel && actionHref && (
        <Button
          render={<Link href={actionHref} />}
          nativeButton={false}
          className="mt-2"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
