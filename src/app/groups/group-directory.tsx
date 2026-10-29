"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  ChevronRight,
  Clock,
  EllipsisVertical,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HorseAvatar } from "@/components/horse-avatar";
import { SpacePhoto } from "@/components/space-photo";
import { getSpacePhotoUrl } from "@/lib/space-images";
import { GENDER_LABELS } from "@/lib/horse-images";
import { DAYS_OF_WEEK } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { deleteGroup } from "./actions";

export type GroupMember = {
  id: string;
  name: string;
  breed: string | null;
  gender: string | null;
  ageYears: number | null;
  photoUrl: string | null;
  lifecycle: string;
  notes: string | null;
};

export type GroupRule = {
  id: string;
  shift: string;
  daysOfWeek: number[];
  durationMin: number | null;
  defaultSpace: { id: string; name: string; type: string } | null;
};

export type DirectoryGroup = {
  id: string;
  name: string;
  notes: string | null;
  horses: GroupMember[];
  rules: GroupRule[];
};

type SortKey = "name-asc" | "name-desc" | "members-desc" | "members-asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Name (A–Z)" },
  { key: "name-desc", label: "Name (Z–A)" },
  { key: "members-desc", label: "Most Horses" },
  { key: "members-asc", label: "Fewest Horses" },
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
        onClick && "cursor-pointer hover:border-barnwright-gold/40 hover:shadow-md",
        highlight && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-amber-500/15 text-amber-600"
              : "bg-barnwright-green/8 text-barnwright-gold-deep"
          )}
        >
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold text-barnwright-gold-deep tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-xs font-semibold text-barnwright-green/80 truncate">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-barnwright-green/50 truncate">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

function GroupKebabMenu({
  groupId,
  name,
  onView,
}: {
  groupId: string;
  name: string;
  onView: () => void;
}) {
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
        aria-label={`Actions for ${name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-40 text-barnwright-green/50 hover:text-barnwright-green"
      >
        <EllipsisVertical className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-44 overflow-hidden rounded-xl border border-barnwright-green/10 bg-popover py-1 shadow-[var(--shadow-panel-lg)] text-foreground">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted"
          >
            <Users className="size-3.5 opacity-60" /> View members
          </button>
          <Link
            href={`/groups/${groupId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="size-3.5 opacity-60" /> Edit group
          </Link>
          <form action={deleteGroup.bind(null, groupId)} className="block">
            <ConfirmSubmit
              message={`Delete ${name}? Horses remain in the barn; only the group is removed.`}
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
            >
              <Trash2 data-icon="inline-start" className="size-3.5" /> Delete group
            </ConfirmSubmit>
          </form>
        </div>
      )}
    </div>
  );
}

export function GroupDirectory({ groups, onEdit }: { groups: DirectoryGroup[]; onEdit?: (item: DirectoryGroup) => void }) {
  const [query, setQuery] = useState("");
  const [sizeFilter, setSizeFilter] = useState<"all" | "pairs" | "herds">("all");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [viewing, setViewing] = useState<DirectoryGroup | null>(null);

  const stats = useMemo(() => {
    const totalMembers = groups.reduce((acc, g) => acc + g.horses.length, 0);
    const avgSize = groups.length > 0 ? (totalMembers / groups.length).toFixed(1) : "0";
    const withRules = groups.filter((g) => g.rules.length > 0).length;
    const withNotes = groups.filter((g) => Boolean(g.notes)).length;

    return {
      total: groups.length,
      totalMembers,
      avgSize,
      withRules,
      withNotes,
    };
  }, [groups]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = groups.filter((g) => {
      if (sizeFilter === "pairs" && g.horses.length > 2) return false;
      if (sizeFilter === "herds" && g.horses.length < 3) return false;
      if (q) {
        const horseNames = g.horses.map((h) => h.name).join(" ");
        const haystack = `${g.name} ${g.notes ?? ""} ${horseNames}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      switch (sortKey) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "members-desc":
          return b.horses.length - a.horses.length;
        case "members-asc":
          return a.horses.length - b.horses.length;
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [groups, query, sizeFilter, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          value={stats.total}
          label="Turnout Groups"
          sublabel="Organized cohorts"
          icon={Users}
        />
        <StatCard
          value={stats.totalMembers}
          label="Assigned Horses"
          sublabel="Members in groups"
          icon={Sparkles}
        />
        <StatCard
          value={stats.avgSize}
          label="Average Herd Size"
          sublabel="Horses per group"
          icon={Layers}
        />
        <StatCard
          value={stats.withRules}
          label="Scheduled Rhythm"
          sublabel={`${Math.round((stats.withRules / (stats.total || 1)) * 100)}% automated`}
          icon={Calendar}
        />
        <StatCard
          value={stats.withNotes}
          label="Advisories"
          sublabel="Special handler notes"
          icon={Clock}
          highlight={stats.withNotes > 0}
        />
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-barnwright-green/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search groups or horse members…"
              className="h-9.5 bg-card pl-9 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-barnwright-green/40 hover:text-barnwright-green"
              >
                Clear
              </button>
            )}
          </div>

          {/* Size Filter Pills */}
          <div className="flex items-center gap-1 rounded-lg border border-input bg-card p-1">
            <button
              type="button"
              onClick={() => setSizeFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                sizeFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-barnwright-green/60 hover:text-barnwright-green"
              )}
            >
              All Groups
            </button>
            <button
              type="button"
              onClick={() => setSizeFilter("pairs")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                sizeFilter === "pairs"
                  ? "bg-primary text-primary-foreground"
                  : "text-barnwright-green/60 hover:text-barnwright-green"
              )}
            >
              Pairs (1–2)
            </button>
            <button
              type="button"
              onClick={() => setSizeFilter("herds")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                sizeFilter === "herds"
                  ? "bg-primary text-primary-foreground"
                  : "text-barnwright-green/60 hover:text-barnwright-green"
              )}
            >
              Herds (3+)
            </button>
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
                  : "bg-background text-barnwright-green/50 hover:text-barnwright-green"
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
                  : "bg-background text-barnwright-green/50 hover:text-barnwright-green"
              )}
            >
              <List className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Groups Listing */}
      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Users className="size-10 text-barnwright-gold opacity-60" />
          <p className="font-display text-xl font-semibold">No turnout groups match</p>
          <p className="max-w-sm text-sm text-barnwright-green/55">
            {query || sizeFilter !== "all"
              ? "Try clearing filters to see all groups in your barn."
              : "Add your first turnout group to bundle horses that turn out together."}
          </p>
          {(query || sizeFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setSizeFilter("all");
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map((group) => {
            const primaryRule = group.rules[0];
            const spaceName = primaryRule?.defaultSpace?.name;
            const spaceType = primaryRule?.defaultSpace?.type ?? "field";
            const spacePhoto = spaceName ? getSpacePhotoUrl(spaceName, spaceType) : null;

            return (
              <article
                key={group.id}
                className="panel group overflow-hidden flex flex-col p-5 transition-all duration-300 hover:shadow-[var(--shadow-panel-lg)] hover:border-barnwright-gold/40 cursor-pointer"
                onClick={() => setViewing(group)}
              >
                {/* Header: Title, Member Count & Actions */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-2xl font-bold leading-tight group-hover:text-barnwright-gold-deep transition-colors">
                      {group.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-2 text-xs text-barnwright-green/60">
                      <span className="font-semibold text-barnwright-gold-deep">
                        {group.horses.length} {group.horses.length === 1 ? "Horse" : "Horses"}
                      </span>
                      <span>·</span>
                      <span>
                        {group.rules.length} {group.rules.length === 1 ? "schedule rule" : "schedule rules"}
                      </span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <GroupKebabMenu
                      groupId={group.id}
                      name={group.name}
                      onView={() => setViewing(group)}
                    />
                  </div>
                </div>

                {/* Target Space & Shift Rhythm Preview */}
                {primaryRule && (
                  <div className="mt-4 flex items-center gap-3 rounded-xl border border-barnwright-green/10 bg-muted/30 p-2.5">
                    {spacePhoto ? (
                      <SpacePhoto
                        name={spaceName!}
                        photoUrl={spacePhoto}
                        className="size-10 rounded-lg shrink-0 object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex size-10 items-center justify-center rounded-lg bg-barnwright-green/10 text-barnwright-green">
                        <MapPin className="size-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold truncate text-barnwright-green/90 flex items-center gap-1">
                        <span>{primaryRule.shift === "AM" ? "Morning (AM)" : "Afternoon (PM)"} Turnout</span>
                        <ArrowRight className="size-3 opacity-60 shrink-0" />
                        <span className="text-barnwright-gold-deep truncate">{spaceName ?? "Flexible Space"}</span>
                      </p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {DAYS_OF_WEEK.map((d) => (
                          <span
                            key={d.value}
                            className={cn(
                              "text-[10px] font-bold",
                              primaryRule.daysOfWeek.includes(d.value)
                                ? "text-barnwright-gold-deep font-black"
                                : "text-barnwright-green/25"
                            )}
                          >
                            {d.label[0]}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Horse Members Face Stack & Avatars */}
                <div className="mt-4">
                  <p className="text-[0.65rem] font-bold uppercase tracking-wider text-barnwright-green/50 mb-2">
                    Horse Members
                  </p>
                  {group.horses.length === 0 ? (
                    <p className="text-xs italic text-barnwright-green/45">No horses assigned yet</p>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {group.horses.map((horse) => (
                        <div
                          key={horse.id}
                          className="inline-flex items-center gap-2 rounded-full border border-barnwright-green/12 bg-background/80 py-1 pl-1 pr-3 shadow-xs transition-transform hover:scale-105"
                        >
                          <HorseAvatar
                            name={horse.name}
                            photoUrl={horse.photoUrl}
                            size="sm"
                            className="shadow-sm"
                          />
                          <div className="leading-none">
                            <p className="text-xs font-bold text-barnwright-green/90">{horse.name}</p>
                            {horse.breed && (
                              <p className="text-[10px] text-barnwright-green/50 truncate max-w-[90px]">
                                {horse.breed}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Handler / Social Notes */}
                {group.notes && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-barnwright-gold/30 bg-barnwright-gold/5 p-3 text-xs leading-relaxed text-barnwright-green/80 italic">
                    “{group.notes}”
                  </div>
                )}

                {/* Footer Actions */}
                <div
                  className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-barnwright-green/8 mt-5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={() => setViewing(group)}
                    className="text-xs font-semibold text-barnwright-gold-deep hover:underline flex items-center gap-1"
                  >
                    View group roster <ChevronRight className="size-3.5" />
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit?.(group)}
                    >
                      <Pencil data-icon="inline-start" className="size-3.5" /> Edit
                    </Button>
                    <form action={deleteGroup.bind(null, group.id)}>
                      <ConfirmSubmit
                        message={`Delete ${group.name}? Horses remain in the barn.`}
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
        <div className="panel divide-y divide-barnwright-green/8 overflow-hidden p-0">
          {filtered.map((group) => (
            <div
              key={group.id}
              onClick={() => setViewing(group)}
              className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="flex -space-x-2 overflow-hidden py-1 shrink-0">
                {group.horses.slice(0, 4).map((h) => (
                  <HorseAvatar
                    key={h.id}
                    name={h.name}
                    photoUrl={h.photoUrl}
                    size="md"
                    className="ring-2 ring-background shadow-xs"
                  />
                ))}
                {group.horses.length > 4 && (
                  <div className="flex size-9 items-center justify-center rounded-full border border-barnwright-green/20 bg-muted text-xs font-bold text-barnwright-green/70 ring-2 ring-background">
                    +{group.horses.length - 4}
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <p className="font-display text-lg font-bold">{group.name}</p>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-barnwright-green/70">
                    {group.horses.length} {group.horses.length === 1 ? "horse" : "horses"}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-barnwright-green/60 truncate">
                  {group.horses.map((h) => h.name).join(", ") || "No horses yet"}
                </p>
                {group.notes && (
                  <p className="mt-1 text-xs italic text-barnwright-gold-deep truncate">
                    “{group.notes}”
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(group)}
                >
                  <Pencil data-icon="inline-start" className="size-3.5" /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setViewing(group)}
                >
                  Details
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Interactive Group Profile Modal */}
      {viewing && (
        <>
          <button
            type="button"
            aria-label="Close details"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
            onClick={() => setViewing(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-card border border-barnwright-green/10 shadow-2xl flex flex-col">
              {/* Modal Header */}
              <div className="relative bg-gradient-to-br from-[#1c1511] to-[#0f0c0a] p-6 text-white shrink-0">
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setViewing(null)}
                  className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/20 hover:text-white transition-colors"
                >
                  <X className="size-4" />
                </button>

                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-barnwright-gold">
                  <Users className="size-4" />
                  <span>Turnout Cohort</span>
                </div>
                <h2 className="mt-1 font-display text-3xl font-bold">{viewing.name}</h2>
                <p className="mt-1 text-xs text-white/70">
                  {viewing.horses.length} registered {viewing.horses.length === 1 ? "horse" : "horses"} · {viewing.rules.length} schedule rules
                </p>
              </div>

              {/* Modal Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Horse Roster */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-barnwright-green/50 mb-3">
                    Group Members Roster ({viewing.horses.length})
                  </h4>
                  {viewing.horses.length === 0 ? (
                    <p className="text-sm italic text-barnwright-green/45">No horses currently assigned to this group.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {viewing.horses.map((horse) => (
                        <div
                          key={horse.id}
                          className="flex items-center gap-3 rounded-xl border border-barnwright-green/10 bg-muted/30 p-3"
                        >
                          <HorseAvatar
                            name={horse.name}
                            photoUrl={horse.photoUrl}
                            size="lg"
                            className="shadow-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="font-display text-base font-bold text-barnwright-green/90 leading-tight">
                              {horse.name}
                            </p>
                            <p className="text-xs text-barnwright-green/60">
                              {horse.ageYears ? `${horse.ageYears} yrs · ` : ""}
                              {horse.gender ? GENDER_LABELS[horse.gender as keyof typeof GENDER_LABELS] ?? horse.gender : ""}
                            </p>
                            {horse.breed && (
                              <p className="text-[11px] font-medium text-barnwright-gold-deep truncate">
                                {horse.breed}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Schedule Rules */}
                {viewing.rules.length > 0 && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-barnwright-green/50 mb-3">
                      Automated Turnout Rhythm
                    </h4>
                    <div className="space-y-2">
                      {viewing.rules.map((rule) => {
                        const spacePhoto = rule.defaultSpace
                          ? getSpacePhotoUrl(rule.defaultSpace.name, rule.defaultSpace.type)
                          : null;

                        return (
                          <div
                            key={rule.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-barnwright-green/10 bg-muted/30 p-3"
                          >
                            <div className="flex items-center gap-3">
                              {spacePhoto && (
                                <SpacePhoto
                                  name={rule.defaultSpace?.name ?? "Paddock"}
                                  photoUrl={spacePhoto}
                                  className="size-10 rounded-lg object-cover"
                                />
                              )}
                              <div>
                                <p className="text-sm font-bold text-barnwright-green/90">
                                  {rule.shift === "AM" ? "Morning (AM)" : "Afternoon (PM)"} Shift →{" "}
                                  <span className="text-barnwright-gold-deep">
                                    {rule.defaultSpace?.name ?? "Flexible Space"}
                                  </span>
                                </p>
                                <div className="flex items-center gap-1 mt-1">
                                  {DAYS_OF_WEEK.map((d) => (
                                    <span
                                      key={d.value}
                                      className={cn(
                                        "text-[10px] font-bold px-1 rounded",
                                        rule.daysOfWeek.includes(d.value)
                                          ? "bg-barnwright-gold/20 text-barnwright-gold-deep font-black"
                                          : "text-barnwright-green/20"
                                      )}
                                    >
                                      {d.label[0]}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                            {rule.durationMin && (
                              <span className="text-xs font-semibold text-barnwright-green/60">
                                {rule.durationMin} min
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Group Notes */}
                {viewing.notes && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-barnwright-green/50 mb-2">
                      Cohort Notes & Advisories
                    </h4>
                    <p className="rounded-xl border border-barnwright-gold/30 bg-barnwright-gold/5 p-4 text-sm italic leading-relaxed text-barnwright-green/80">
                      “{viewing.notes}”
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-barnwright-green/10 bg-muted/20 p-5">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => onEdit?.(viewing)}
                    size="sm"
                  >
                    <Pencil data-icon="inline-start" className="size-3.5" /> Edit group
                  </Button>
                  <form action={deleteGroup.bind(null, viewing.id)}>
                    <ConfirmSubmit
                      message={`Delete ${viewing.name}? Horses remain in the barn.`}
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      Delete
                    </ConfirmSubmit>
                  </form>
                </div>

                <div className="flex items-center gap-3">
                  <Link
                    href="/map"
                    className="text-xs font-semibold text-barnwright-gold-deep hover:underline"
                  >
                    View on Barn Map →
                  </Link>
                  <Link
                    href="/board"
                    className="text-xs font-semibold text-barnwright-gold-deep hover:underline"
                  >
                    See Today&apos;s Board →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
