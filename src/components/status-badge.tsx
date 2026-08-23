import { Ban, CheckCircle2, Clock, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export const EVENT_STATUSES = [
  "scheduled",
  "out",
  "in",
  "skipped",
] as const;

type EventStatus = (typeof EVENT_STATUSES)[number];

const STATUS_META: Record<
  EventStatus,
  { label: string; icon: typeof Clock; classes: string }
> = {
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    classes: "border-border bg-card text-slate-500",
  },
  out: {
    label: "Out",
    icon: Sun,
    classes:
      "border-status-out/50 bg-status-out/15 text-status-out-strong",
  },
  in: {
    label: "In",
    icon: CheckCircle2,
    classes: "border-status-in/30 bg-status-in/10 text-status-in",
  },
  skipped: {
    label: "Skipped",
    icon: Ban,
    classes:
      "border-status-skipped/30 bg-status-skipped/10 text-status-skipped",
  },
};

/** The board's shared status language — one pill style everywhere. */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const meta = STATUS_META[status as EventStatus] ?? STATUS_META.scheduled;
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[0.78rem] font-semibold",
        meta.classes,
        className
      )}
    >
      <Icon className="size-3.5" />
      {meta.label}
    </span>
  );
}
