"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  Cake,
  EllipsisVertical,
  LayoutGrid,
  List,
  ListFilter,
  Pencil,
  Mars,
  Search,
  Trash2,
  UserRound,
  Venus,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HorsePhoto } from "@/components/horse-photo";
import { cn } from "@/lib/utils";
import {
  GENDERS,
  GENDER_LABELS,
  LIFECYCLES,
  LIFECYCLE_LABELS,
} from "@/lib/horse-images";
import { deleteHorse } from "./actions";

export type DirectoryHorse = {
  id: string;
  name: string;
  notes: string | null;
  breed: string | null;
  gender: string | null;
  ageYears: number | null;
  lifecycle: string;
  photoUrl: string | null;
  groups: string[];
  eventsCount?: number;
  activeEventsCount?: number;
  scheduleRulesCount?: number;
};

function getHorseDeleteWarning(horse: DirectoryHorse): string {
  const warnings: string[] = [];

  if (horse.activeEventsCount && horse.activeEventsCount > 0) {
    warnings.push(
      `is currently active in ${horse.activeEventsCount} turnout event(s) on Today's Board`
    );
  } else if (horse.eventsCount && horse.eventsCount > 0) {
    warnings.push(`has ${horse.eventsCount} turnout event(s) on record`);
  }

  if (horse.groups && horse.groups.length > 0) {
    warnings.push(
      `is assigned to ${horse.groups.length} turnout group(s) (${horse.groups.join(", ")})`
    );
  }

  if (horse.scheduleRulesCount && horse.scheduleRulesCount > 0) {
    warnings.push(
      `is part of ${horse.scheduleRulesCount} recurring schedule rule(s)`
    );
  }

  if (warnings.length > 0) {
    return `⚠️ WARNING: ${horse.name} ${warnings.join(", and ")}.\n\nDeleting ${horse.name} will immediately remove them from Today's Board, group rosters, and turnout schedules.\n\nAre you sure you want to permanently delete ${horse.name}?`;
  }

  return `Delete ${horse.name}? This can't be undone.`;
}

type SortKey = "name-asc" | "name-desc" | "age-asc" | "age-desc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Name (A–Z)" },
  { key: "name-desc", label: "Name (Z–A)" },
  { key: "age-asc", label: "Age (youngest first)" },
  { key: "age-desc", label: "Age (oldest first)" },
];

function GenderIcon({ gender }: { gender: string | null }) {
  if (gender === "mare") return <Venus className="size-3.5" />;
  if (gender === "gelding" || gender === "stallion")
    return <Mars className="size-3.5" />;
  return null;
}

function LifecycleChip({ lifecycle }: { lifecycle: string }) {
  const styles: Record<string, string> = {
    rotation: "border-status-in/25 bg-status-in/10 text-status-in",
    training: "border-status-out/40 bg-status-out/15 text-status-out-strong",
    retired: "border-onstride-green/15 bg-muted text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold",
        styles[lifecycle] ?? styles.retired
      )}
    >
      {LIFECYCLE_LABELS[lifecycle as keyof typeof LIFECYCLE_LABELS] ?? lifecycle}
    </span>
  );
}

function StatBlock({
  value,
  label,
  share,
}: {
  value: number;
  label: string;
  share?: string;
}) {
  return (
    <div className="flex items-baseline gap-2.5">
      <span className="font-display text-3xl font-semibold text-onstride-gold-deep tabular-nums">
        {value}
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold">{label}</span>
        {share && (
          <span className="block text-xs text-onstride-green/50">{share}</span>
        )}
      </span>
    </div>
  );
}

function KebabMenu({
  horse,
  onView,
}: {
  horse: DirectoryHorse;
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
        aria-label={`Actions for ${horse.name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="relative z-40 text-onstride-green/45 hover:text-onstride-green"
      >
        <EllipsisVertical className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-40 overflow-hidden rounded-xl border border-onstride-green/10 bg-popover py-1 shadow-[var(--shadow-panel-lg)]">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted"
          >
            <UserRound className="size-3.5 opacity-60" /> View profile
          </button>
          <Link
            href={`/horses/${horse.id}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="size-3.5 opacity-60" /> Edit
          </Link>
          <form action={deleteHorse.bind(null, horse.id)} className="block">
            <ConfirmSubmit
              message={getHorseDeleteWarning(horse)}
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 data-icon="inline-start" /> Delete
            </ConfirmSubmit>
          </form>
        </div>
      )}
    </div>
  );
}

function MetaRow({ horse, className }: { horse: DirectoryHorse; className?: string }) {
  return (
    <div className={cn("flex items-center gap-4 text-xs text-onstride-green/60", className)}>
      <span className="inline-flex items-center gap-1.5">
        <Cake className="size-3.5 opacity-60" />
        {horse.ageYears != null ? `${horse.ageYears} ${horse.ageYears === 1 ? "year" : "years"}` : "—"}
      </span>
      {horse.gender && (
        <span className="inline-flex items-center gap-1.5 capitalize">
          <GenderIcon gender={horse.gender} />
          {GENDER_LABELS[horse.gender as keyof typeof GENDER_LABELS] ?? horse.gender}
        </span>
      )}
      {horse.breed && (
        <span className="hidden truncate lg:inline">{horse.breed}</span>
      )}
    </div>
  );
}

export function HorseDirectory({ horses }: { horses: DirectoryHorse[] }) {
  const [query, setQuery] = useState("");
  const [statuses, setStatuses] = useState<Set<string>>(new Set(LIFECYCLES));
  const [genders, setGenders] = useState<Set<string>>(new Set(GENDERS));
  const [ageMin, setAgeMin] = useState(1);
  const [ageMax, setAgeMax] = useState(20);
  const [group, setGroup] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [railOpen, setRailOpen] = useState(false);
  const [viewing, setViewing] = useState<DirectoryHorse | null>(null);

  const groupNames = useMemo(
    () => [...new Set(horses.flatMap((h) => h.groups))].sort(),
    [horses]
  );

  const stats = useMemo(() => {
    const by = (g: string) => horses.filter((h) => h.gender === g).length;
    const total = horses.length || 1;
    return {
      total: horses.length,
      mares: by("mare"),
      geldings: by("gelding"),
      stallions: by("stallion"),
      pct: (n: number) => `${Math.round((n / total) * 100)}% of total`,
    };
  }, [horses]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = horses.filter((horse) => {
      if (!statuses.has(horse.lifecycle)) return false;
      if (horse.gender && !genders.has(horse.gender)) return false;
      if (group !== "all" && !horse.groups.includes(group)) return false;
      if (horse.ageYears != null) {
        // Slider tops out at 20 meaning "20 and older".
        if (horse.ageYears < ageMin) return false;
        if (ageMax < 20 && horse.ageYears > ageMax) return false;
      }
      if (q) {
        const haystack =
          `${horse.name} ${horse.breed ?? ""} ${horse.notes ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      switch (sortKey) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "age-asc":
          return (a.ageYears ?? -1) - (b.ageYears ?? -1);
        case "age-desc":
          return (b.ageYears ?? -1) - (a.ageYears ?? -1);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [horses, query, statuses, genders, group, ageMin, ageMax, sortKey]);

  const filtersActive =
    statuses.size !== LIFECYCLES.length ||
    genders.size !== GENDERS.length ||
    group !== "all" ||
    ageMin !== 1 ||
    ageMax !== 20;

  function clearFilters() {
    setStatuses(new Set(LIFECYCLES));
    setGenders(new Set(GENDERS));
    setGroup("all");
    setAgeMin(1);
    setAgeMax(20);
  }

  function toggle(set: Set<string>, apply: (next: Set<string>) => void, value: string) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    apply(next);
  }

  const filtersBody = (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Filters</p>
        {filtersActive && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-destructive hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-onstride-green/50">
          Status
        </p>
        {LIFECYCLES.map((lifecycle) => (
          <label key={lifecycle} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={statuses.has(lifecycle)}
              onChange={() => toggle(statuses, setStatuses, lifecycle)}
              className="size-4 accent-[#10241c]"
            />
            {LIFECYCLE_LABELS[lifecycle]}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-onstride-green/50">
          Gender
        </p>
        {GENDERS.map((gender) => (
          <label key={gender} className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input
              type="checkbox"
              checked={genders.has(gender)}
              onChange={() => toggle(genders, setGenders, gender)}
              className="size-4 accent-[#10241c]"
            />
            <GenderIcon gender={gender} />
            {GENDER_LABELS[gender]}
          </label>
        ))}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-onstride-green/50">
          Age
        </p>
        <div className="relative h-5 w-full">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-onstride-green/12" />
          <div
            className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-status-in/70"
            style={{
              left: `${((ageMin - 1) / 19) * 100}%`,
              right: `${((20 - ageMax) / 19) * 100}%`,
            }}
          />
          <input
            type="range"
            min={1}
            max={20}
            value={ageMin}
            onChange={(e) => setAgeMin(Math.min(Number(e.target.value), ageMax))}
            aria-label="Minimum age"
            className="dual-range absolute inset-0 w-full"
          />
          <input
            type="range"
            min={1}
            max={20}
            value={ageMax}
            onChange={(e) => setAgeMax(Math.max(Number(e.target.value), ageMin))}
            aria-label="Maximum age"
            className="dual-range absolute inset-0 w-full"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-onstride-green/55">
          <span>1 year</span>
          <span className="rounded-full bg-muted px-2 py-0.5 font-semibold tabular-nums">
            {ageMin}–{ageMax === 20 ? "20+" : ageMax} yrs
          </span>
          <span>20+ years</span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="group-filter" className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-onstride-green/50">
          Group
        </Label>
        <select
          id="group-filter"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="all">All groups</option>
          {groupNames.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sort-by" className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-onstride-green/50">
          Sort by
        </Label>
        <select
          id="sort-by"
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className="h-9 rounded-lg border border-input bg-card px-2.5 text-sm shadow-sm focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      {/* Stats strip */}
      <div className="panel flex flex-wrap items-center gap-x-10 gap-y-4 px-6 py-5">
        <StatBlock value={stats.total} label="Total Horses" share="All registered" />
        <StatBlock value={stats.mares} label="Mares" share={stats.pct(stats.mares)} />
        <StatBlock value={stats.geldings} label="Geldings" share={stats.pct(stats.geldings)} />
        <StatBlock value={stats.stallions} label="Stallions" share={stats.pct(stats.stallions)} />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-onstride-green/35" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search horses…"
            className="h-9 bg-card pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="xl:hidden"
            onClick={() => setRailOpen(true)}
          >
            <ListFilter data-icon="inline-start" /> Filters
            {filtersActive && (
              <span className="ml-1 size-1.5 rounded-full bg-onstride-gold-deep" />
            )}
          </Button>
          <div className="flex overflow-hidden rounded-lg border border-border">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-pressed={view === "grid"}
              aria-label="Grid view"
              className={cn(
                "flex size-9 items-center justify-center transition-colors",
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
                "flex size-9 items-center justify-center transition-colors",
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

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_270px]">
        {/* Cards */}
        <div>
          {filtered.length === 0 ? (
            <div className="panel flex flex-col items-center gap-2 px-6 py-14 text-center">
              <p className="font-display text-xl font-semibold">No horses match</p>
              <p className="max-w-sm text-sm text-onstride-green/55">
                {filtersActive
                  ? "Try widening the filters — or clear them to see the whole barn."
                  : "Add your first horse to start building turnout groups."}
              </p>
              {filtersActive && (
                <Button variant="outline" size="sm" onClick={clearFilters} className="mt-1">
                  Clear filters
                </Button>
              )}
            </div>
          ) : view === "grid" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 2xl:grid-cols-3">
              {filtered.map((horse) => (
                <article key={horse.id} className="panel overflow-hidden">
                  <div className="flex">
                    <HorsePhoto
                      name={horse.name}
                      photoUrl={horse.photoUrl}
                      className="aspect-[4/5] w-28 shrink-0 sm:w-32"
                      sizesClass="text-xl"
                    />
                    <div className="flex min-w-0 flex-1 flex-col p-4">
                      <div className="flex items-start justify-between gap-1.5">
                        <div className="min-w-0">
                          <p className="truncate font-display text-lg font-semibold leading-tight">
                            {horse.name}
                          </p>
                          <div className="mt-1">
                            <LifecycleChip lifecycle={horse.lifecycle} />
                          </div>
                        </div>
                        <KebabMenu
                          horse={horse}
                          onView={() => setViewing(horse)}
                        />
                      </div>
                      {horse.notes && (
                        <p className="mt-2 line-clamp-2 text-xs italic leading-relaxed text-onstride-green/60">
                          {horse.notes}
                        </p>
                      )}
                      <MetaRow horse={horse} className="mt-auto pt-3" />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="panel divide-y divide-onstride-green/6 overflow-hidden">
              {filtered.map((horse) => (
                <div key={horse.id} className="flex items-center gap-4 p-3.5">
                  <HorsePhoto
                    name={horse.name}
                    photoUrl={horse.photoUrl}
                    className="size-14 rounded-lg"
                    sizesClass="text-sm"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-base font-semibold">
                        {horse.name}
                      </p>
                      <LifecycleChip lifecycle={horse.lifecycle} />
                    </div>
                    {horse.notes && (
                      <p className="mt-0.5 truncate text-xs italic text-onstride-green/55">
                        {horse.notes}
                      </p>
                    )}
                  </div>
                  <MetaRow horse={horse} className="hidden md:flex" />
                  <KebabMenu
                    horse={horse}
                    onView={() => setViewing(horse)}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filter rail */}
        <aside className="panel sticky top-8 hidden h-fit p-5 xl:block">
          {filtersBody}
        </aside>
      </div>

      {/* Mobile filter drawer */}
      {railOpen && (
        <>
          <button
            type="button"
            aria-label="Close filters"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setRailOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-80 max-w-[85vw] overflow-y-auto bg-background p-5 shadow-2xl">
            <button
              type="button"
              aria-label="Close filters"
              onClick={() => setRailOpen(false)}
              className="mb-3 ml-auto flex size-8 items-center justify-center rounded-lg hover:bg-muted"
            >
              <X className="size-4" />
            </button>
            {filtersBody}
            <Button className="mt-5 w-full" onClick={() => setRailOpen(false)}>
              Apply Filters
            </Button>
          </aside>
        </>
      )}

      {/* Profile modal */}
      {viewing && (
        <>
          <button
            type="button"
            aria-label="Close profile"
            className="fixed inset-0 z-40 bg-black/45 backdrop-blur-[2px]"
            onClick={() => setViewing(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-card border border-onstride-green/10 shadow-[var(--shadow-panel-lg)]">
              <div className="grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)] max-h-[90vh] overflow-y-auto">
                <div className="relative h-60 sm:h-auto sm:min-h-full w-full shrink-0 overflow-hidden bg-muted">
                  <HorsePhoto
                    name={viewing.name}
                    photoUrl={viewing.photoUrl}
                    className="h-full w-full"
                    sizesClass="text-4xl"
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-display text-2xl font-semibold leading-tight">
                        {viewing.name}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <LifecycleChip lifecycle={viewing.lifecycle} />
                        {viewing.breed && (
                          <span className="rounded-full border border-onstride-green/12 px-2 py-0.5 text-[0.65rem] font-medium text-onstride-green/65">
                            {viewing.breed}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label="Close"
                      onClick={() => setViewing(null)}
                      className="flex size-8 shrink-0 items-center justify-center rounded-lg text-onstride-green/45 hover:bg-muted hover:text-onstride-green"
                    >
                      <X className="size-4" />
                    </button>
                  </div>

                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-onstride-green/45">
                        Age
                      </dt>
                      <dd className="font-medium">{viewing.ageYears != null ? `${viewing.ageYears} years` : "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-onstride-green/45">
                        Gender
                      </dt>
                      <dd className="capitalize font-medium">
                        {viewing.gender
                          ? GENDER_LABELS[viewing.gender as keyof typeof GENDER_LABELS] ??
                            viewing.gender
                          : "—"}
                      </dd>
                    </div>
                    <div className="col-span-2">
                      <dt className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-onstride-green/45">
                        Turnout groups
                      </dt>
                      <dd className="mt-1.5 flex flex-wrap gap-1.5">
                        {viewing.groups.length === 0 ? (
                          <span className="text-xs text-onstride-green/45 italic">No groups yet</span>
                        ) : (
                          viewing.groups.map((g) => (
                            <span
                              key={g}
                              className="rounded-full border border-onstride-green/12 bg-background px-2.5 py-0.5 text-xs font-medium text-onstride-green/80"
                            >
                              {g}
                            </span>
                          ))
                        )}
                      </dd>
                    </div>
                  </dl>

                  {viewing.notes && (
                    <p className="mt-4 border-l-2 border-onstride-gold/60 pl-3 text-xs italic leading-relaxed text-onstride-green/70">
                      “{viewing.notes}”
                    </p>
                  )}

                  {((viewing.eventsCount && viewing.eventsCount > 0) ||
                    (viewing.groups && viewing.groups.length > 0) ||
                    (viewing.scheduleRulesCount && viewing.scheduleRulesCount > 0)) && (
                    <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-950 font-medium">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                      <span>
                        <strong>Scheduled horse:</strong> Assigned to{" "}
                        {viewing.groups.length > 0 ? viewing.groups.join(", ") : "turnout groups"}
                        {viewing.eventsCount ? ` with ${viewing.eventsCount} board event(s)` : ""}.
                        Deleting will clear all associated schedule events.
                      </span>
                    </div>
                  )}

                  <div className="mt-auto flex flex-wrap items-center gap-2 pt-6 border-t border-onstride-green/8 mt-6">
                    <Button
                      render={<Link href={`/horses/${viewing.id}/edit`} />}
                      nativeButton={false}
                      size="sm"
                    >
                      Edit profile
                    </Button>
                    <form action={deleteHorse.bind(null, viewing.id)}>
                      <ConfirmSubmit
                        message={getHorseDeleteWarning(viewing)}
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        Delete
                      </ConfirmSubmit>
                    </form>
                    <Link
                      href="/board"
                      className="ml-auto flex items-center gap-1 text-xs font-semibold text-onstride-gold-deep hover:underline"
                    >
                      <span>See today&apos;s board</span>
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
