"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  Clock,
  EllipsisVertical,
  LayoutGrid,
  List,
  MapPin,
  Moon,
  Pencil,
  Search,
  Sun,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HorseAvatar } from "@/components/horse-avatar";
import { SpacePhoto } from "@/components/space-photo";
import { getSpacePhotoUrl } from "@/lib/space-images";
import { DAYS_OF_WEEK } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { deleteRule } from "./actions";

export type RuleHorse = {
  id: string;
  name: string;
  photoUrl: string | null;
  breed: string | null;
  gender: string | null;
};

export type DirectoryRule = {
  id: string;
  shift: string;
  daysOfWeek: number[];
  durationMin: number | null;
  groupId: string;
  groupName: string;
  horses: RuleHorse[];
  defaultSpace: {
    id: string;
    name: string;
    type: string;
    capacity: number | null;
  } | null;
};

type SortKey = "shift-group" | "group-asc" | "space-asc" | "days-desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "shift-group", label: "Shift & Group" },
  { key: "group-asc", label: "Group (A–Z)" },
  { key: "space-asc", label: "Space (A–Z)" },
  { key: "days-desc", label: "Most Active Days" },
];

function StatCard({
  value,
  label,
  sublabel,
  icon: Icon,
  highlight,
  onClick,
}: {
  value: number | string;
  label: string;
  sublabel?: string;
  icon?: ComponentType<{ className?: string }>;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "panel flex flex-1 min-w-[140px] items-center gap-3.5 p-4 transition-all",
        onClick && "cursor-pointer hover:border-onstride-gold/40 hover:shadow-md",
        highlight && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-amber-500/15 text-amber-600"
              : "bg-onstride-green/8 text-onstride-gold-deep"
          )}
        >
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold text-onstride-gold-deep tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-xs font-semibold text-onstride-green/80 truncate">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-onstride-green/50 truncate">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

function RuleKebabMenu({ ruleId, groupName, shift, onEdit }: { ruleId: string; groupName: string; shift: string; onEdit?: () => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      {open && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 cursor-default"
          onClick={() => setOpen(false)}
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Actions for ${groupName}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-40 text-onstride-green/50 hover:text-onstride-green"
      >
        <EllipsisVertical className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-44 overflow-hidden rounded-xl border border-onstride-green/10 bg-popover py-1 shadow-[var(--shadow-panel-lg)] text-foreground">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onEdit?.();
            }}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="size-3.5 opacity-60" /> Edit rule
          </button>
          <form action={deleteRule.bind(null, ruleId)} className="block">
            <ConfirmSubmit
              message={`Delete the ${shift} rule for ${groupName}?`}
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
            >
              <Trash2 data-icon="inline-start" className="size-3.5" /> Delete rule
            </ConfirmSubmit>
          </form>
        </div>
      )}
    </div>
  );
}

export function RuleDirectory({ rules, onEdit }: { rules: DirectoryRule[]; onEdit?: (item: DirectoryRule) => void }) {
  const [query, setQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"all" | "AM" | "PM">("all");
  const [dayFilter, setDayFilter] = useState<number | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("shift-group");
  const [view, setView] = useState<"grid" | "list">("grid");

  const stats = useMemo(() => {
    const am = rules.filter((r) => r.shift === "AM").length;
    const pm = rules.filter((r) => r.shift === "PM").length;
    const spaces = new Set(rules.map((r) => r.defaultSpace?.name).filter(Boolean)).size;
    const totalDaysCovered = rules.reduce((acc, r) => acc + r.daysOfWeek.length, 0);

    return {
      total: rules.length,
      am,
      pm,
      spaces,
      totalDaysCovered,
    };
  }, [rules]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rules.filter((rule) => {
      if (shiftFilter !== "all" && rule.shift !== shiftFilter) return false;
      if (dayFilter !== "all" && !rule.daysOfWeek.includes(dayFilter)) return false;
      if (q) {
        const horseNames = rule.horses.map((h) => h.name).join(" ");
        const spaceName = rule.defaultSpace?.name ?? "";
        const haystack = `${rule.groupName} ${spaceName} ${horseNames} ${rule.shift}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      switch (sortKey) {
        case "group-asc":
          return a.groupName.localeCompare(b.groupName);
        case "space-asc":
          return (a.defaultSpace?.name ?? "").localeCompare(b.defaultSpace?.name ?? "");
        case "days-desc":
          return b.daysOfWeek.length - a.daysOfWeek.length;
        case "shift-group":
        default:
          if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
          return a.groupName.localeCompare(b.groupName);
      }
    });
  }, [rules, query, shiftFilter, dayFilter, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          value={stats.total}
          label="Schedule Rules"
          sublabel="Recurring rhythms"
          icon={Calendar}
        />
        <StatCard
          value={stats.am}
          label="Morning (AM) Shifts"
          sublabel={`${Math.round((stats.am / (stats.total || 1)) * 100)}% of rules`}
          icon={Sun}
          onClick={() => setShiftFilter((c) => (c === "AM" ? "all" : "AM"))}
        />
        <StatCard
          value={stats.pm}
          label="Afternoon (PM) Shifts"
          sublabel={`${Math.round((stats.pm / (stats.total || 1)) * 100)}% of rules`}
          icon={Moon}
          onClick={() => setShiftFilter((c) => (c === "PM" ? "all" : "PM"))}
        />
        <StatCard
          value={stats.spaces}
          label="Target Spaces"
          sublabel="Fields, paddocks & rings"
          icon={MapPin}
        />
        <StatCard
          value={stats.totalDaysCovered}
          label="Day Slots Covered"
          sublabel="Total weekly instances"
          icon={Clock}
        />
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-onstride-green/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search group, space, or horse…"
              className="h-9.5 bg-card pl-9 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-onstride-green/40 hover:text-onstride-green"
              >
                Clear
              </button>
            )}
          </div>

          {/* Shift Filter Pills */}
          <div className="flex items-center gap-1 rounded-lg border border-input bg-card p-1">
            <button
              type="button"
              onClick={() => setShiftFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                shiftFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-onstride-green/60 hover:text-onstride-green"
              )}
            >
              All Shifts
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter("AM")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                shiftFilter === "AM"
                  ? "bg-primary text-primary-foreground"
                  : "text-onstride-green/60 hover:text-onstride-green"
              )}
            >
              <Sun className="size-3" /> AM
            </button>
            <button
              type="button"
              onClick={() => setShiftFilter("PM")}
              className={cn(
                "flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                shiftFilter === "PM"
                  ? "bg-primary text-primary-foreground"
                  : "text-onstride-green/60 hover:text-onstride-green"
              )}
            >
              <Moon className="size-3" /> PM
            </button>
          </div>

          {/* Day of Week Filter */}
          <div className="hidden sm:flex items-center gap-1 rounded-lg border border-input bg-card p-1">
            <button
              type="button"
              onClick={() => setDayFilter("all")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-semibold transition-colors",
                dayFilter === "all"
                  ? "bg-onstride-gold/30 text-onstride-gold-deep"
                  : "text-onstride-green/50 hover:text-onstride-green"
              )}
            >
              All Days
            </button>
            {DAYS_OF_WEEK.map((d) => (
              <button
                key={d.value}
                type="button"
                onClick={() => setDayFilter((curr) => (curr === d.value ? "all" : d.value))}
                className={cn(
                  "size-6 rounded text-xs font-bold transition-colors",
                  dayFilter === d.value
                    ? "bg-primary text-primary-foreground"
                    : "text-onstride-green/60 hover:bg-muted"
                )}
                title={d.label}
              >
                {d.label[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Sort selector */}
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="h-9.5 rounded-lg border border-input bg-card px-3 text-xs font-medium shadow-sm focus-visible:border-ring focus-visible:outline-none"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>
                {opt.label}
              </option>
            ))}
          </select>

          {/* Grid vs List View */}
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              className={cn(
                "flex size-9.5 items-center justify-center transition-colors",
                view === "grid"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-onstride-green/50 hover:text-onstride-green"
              )}
            >
              <LayoutGrid className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-pressed={view === "list"}
              aria-label="List view"
              className={cn(
                "flex size-9.5 items-center justify-center transition-colors",
                view === "list"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-onstride-green/50 hover:text-onstride-green"
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Rules Listing */}
      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Calendar className="size-10 text-onstride-gold opacity-60" />
          <p className="font-display text-xl font-semibold">No schedule rules match</p>
          <p className="max-w-sm text-sm text-onstride-green/55">
            {query || shiftFilter !== "all" || dayFilter !== "all"
              ? "Try resetting filters to view all automated recurring barn rules."
              : "Add a schedule rule to automate daily turnouts on Today's Board."}
          </p>
          {(query || shiftFilter !== "all" || dayFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setShiftFilter("all");
                setDayFilter("all");
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((rule) => {
            const isAM = rule.shift === "AM";
            const spacePhoto = rule.defaultSpace
              ? getSpacePhotoUrl(rule.defaultSpace.name, rule.defaultSpace.type)
              : null;

            return (
              <article
                key={rule.id}
                className="panel group overflow-hidden flex flex-col p-5 transition-all duration-300 hover:shadow-[var(--shadow-panel-lg)] hover:border-onstride-gold/40"
              >
                {/* Header: Shift Badge, Duration, and Actions */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold tracking-wide shadow-xs",
                        isAM
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-900"
                          : "border-sky-500/30 bg-sky-500/10 text-sky-950"
                      )}
                    >
                      {isAM ? <Sun className="size-3.5 text-amber-600" /> : <Moon className="size-3.5 text-sky-600" />}
                      {isAM ? "Morning (AM) Shift" : "Afternoon (PM) Shift"}
                    </span>
                    {rule.durationMin && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[0.7rem] font-semibold text-onstride-green/60 tabular-nums">
                        {rule.durationMin} min
                      </span>
                    )}
                  </div>

                  <RuleKebabMenu ruleId={rule.id} groupName={rule.groupName} shift={rule.shift} onEdit={() => onEdit?.(rule)} />
                </div>

                {/* Cohort to Target Space Pairing Visual Card */}
                <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-onstride-green/10 bg-muted/20 p-4">
                  {/* Left: Group Cohort */}
                  <div className="min-w-0">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50 mb-1">
                      Turnout Cohort
                    </p>
                    <p className="font-display text-lg font-bold truncate text-onstride-green/90 leading-tight">
                      {rule.groupName}
                    </p>
                    {/* Member Avatars */}
                    <div className="flex items-center -space-x-2 mt-2">
                      {rule.horses.slice(0, 3).map((h) => (
                        <HorseAvatar
                          key={h.id}
                          name={h.name}
                          photoUrl={h.photoUrl}
                          size="sm"
                          className="ring-2 ring-background shadow-xs"
                        />
                      ))}
                      {rule.horses.length > 3 && (
                        <span className="flex size-7 items-center justify-center rounded-full border border-onstride-green/20 bg-muted text-[10px] font-bold text-onstride-green/70 ring-2 ring-background">
                          +{rule.horses.length - 3}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-[11px] text-onstride-green/55">
                      {rule.horses.length} {rule.horses.length === 1 ? "horse" : "horses"}
                    </p>
                  </div>

                  {/* Center Transition Arrow */}
                  <div className="flex size-8 items-center justify-center rounded-full bg-onstride-gold/15 text-onstride-gold-deep shrink-0">
                    <ArrowRight className="size-4" />
                  </div>

                  {/* Right: Target Turnout Space */}
                  <div className="min-w-0 flex flex-col items-end text-right">
                    <p className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50 mb-1">
                      Designated Space
                    </p>
                    <p className="font-display text-lg font-bold truncate text-onstride-green/90 leading-tight">
                      {rule.defaultSpace?.name ?? "Manual / Flexible"}
                    </p>
                    {spacePhoto ? (
                      <div className="mt-2 flex items-center gap-2">
                        <SpacePhoto
                          name={rule.defaultSpace!.name}
                          photoUrl={spacePhoto}
                          className="size-7 rounded-lg object-cover shadow-sm"
                        />
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase text-onstride-green/70">
                          {rule.defaultSpace?.type}
                        </span>
                      </div>
                    ) : (
                      <span className="mt-2 text-xs italic text-onstride-green/45">No default set</span>
                    )}
                  </div>
                </div>

                {/* Recurring Days Strip */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50 mb-1.5">
                    <span>Active Recurring Days</span>
                    <span className="text-onstride-gold-deep font-semibold">
                      {rule.daysOfWeek.length} {rule.daysOfWeek.length === 1 ? "day / week" : "days / week"}
                    </span>
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const active = rule.daysOfWeek.includes(day.value);
                      return (
                        <div
                          key={day.value}
                          className={cn(
                            "flex h-8 flex-col items-center justify-center rounded-lg border text-[11px] font-bold transition-colors",
                            active
                              ? "border-onstride-gold/60 bg-onstride-gold/20 text-onstride-gold-deep shadow-xs font-black"
                              : "border-onstride-green/8 bg-muted/40 text-onstride-green/30"
                          )}
                          title={active ? `Active on ${day.label}` : `Off on ${day.label}`}
                        >
                          <span>{day.label.slice(0, 3)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-onstride-green/8 mt-5">
                  <Link
                    href="/board"
                    className="flex items-center gap-1 text-xs font-semibold text-onstride-gold-deep hover:underline"
                  >
                    <span>See on Today&apos;s Board</span>
                    <ArrowRight className="size-3.5" />
                  </Link>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(rule)}
                    >
                      <Pencil data-icon="inline-start" className="size-3.5" /> Edit rule
                    </Button>
                    <form action={deleteRule.bind(null, rule.id)}>
                      <ConfirmSubmit
                        message={`Delete the ${rule.shift} rule for ${rule.groupName}?`}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                      >
                        <Trash2 className="size-3.5" />
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="panel divide-y divide-onstride-green/8 overflow-hidden p-0">
          {filtered.map((rule) => {
            const isAM = rule.shift === "AM";

            return (
              <div
                key={rule.id}
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/40 transition-colors"
              >
                <div
                  className={cn(
                    "flex size-11 items-center justify-center rounded-xl shrink-0 font-bold text-xs shadow-xs",
                    isAM
                      ? "bg-amber-500/15 text-amber-700 border border-amber-500/30"
                      : "bg-sky-500/15 text-sky-800 border border-sky-500/30"
                  )}
                >
                  {isAM ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-display text-lg font-bold text-onstride-green/90">
                      {rule.groupName}
                    </p>
                    <ArrowRight className="size-3.5 text-onstride-green/40 shrink-0" />
                    <p className="font-semibold text-sm text-onstride-gold-deep">
                      {rule.defaultSpace?.name ?? "Flexible Space"}
                    </p>
                  </div>

                  <div className="mt-1 flex items-center gap-3 text-xs text-onstride-green/60">
                    <div className="flex items-center -space-x-1.5">
                      {rule.horses.slice(0, 3).map((h) => (
                        <HorseAvatar
                          key={h.id}
                          name={h.name}
                          photoUrl={h.photoUrl}
                          size="xs"
                          className="ring-1 ring-background"
                        />
                      ))}
                    </div>
                    <span>{rule.horses.length} horses</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      {DAYS_OF_WEEK.map((d) => (
                        <span
                          key={d.value}
                          className={cn(
                            "text-[10px] font-bold",
                            rule.daysOfWeek.includes(d.value)
                              ? "text-onstride-gold-deep font-black"
                              : "text-onstride-green/20"
                          )}
                        >
                          {d.label[0]}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit?.(rule)}
                  >
                    <Pencil data-icon="inline-start" className="size-3.5" /> Edit
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
