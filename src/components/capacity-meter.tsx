import { cn } from "@/lib/utils";

/**
 * Segmented capacity indicator for a turnout space: one slot per allowed
 * horse, filled per headcount. Over-capacity slots render in red so the
 * "too many horses in this paddock" mistake is visible before it happens.
 */
export function CapacityMeter({
  capacity,
  count,
  className,
}: {
  capacity: number | null;
  count: number;
  className?: string;
}) {
  if (capacity == null || capacity <= 0) return null;

  return (
    <span
      className={cn("inline-flex items-center gap-1.5", className)}
      title={`${count} of ${capacity} slots in use`}
    >
      <span className="flex gap-[4px]">
        {Array.from({ length: Math.max(capacity, count) }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-4 w-2 rounded-[3px]",
              i < count
                ? i < capacity
                  ? "bg-status-in/75"
                  : "bg-destructive"
                : "bg-barnwright-green/12"
            )}
          />
        ))}
      </span>
      <span
        className={cn(
          "text-xs font-semibold tabular-nums",
          count > capacity ? "text-destructive" : "text-barnwright-green/50"
        )}
      >
        {count}/{capacity}
      </span>
    </span>
  );
}
