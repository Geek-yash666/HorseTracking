"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  EllipsisVertical,
  Fence,
  Info,
  Layers,
  LayoutGrid,
  List,
  MapPin,
  Pencil,
  Search,
  Sparkles,
  Trash2,
  Trees,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { SpacePhoto } from "@/components/space-photo";
import { cn } from "@/lib/utils";
import {
  SPACE_TYPES,
  SPACE_TYPE_LABELS,
  SPACE_TYPE_STYLES,
  getSpacePhotoUrl,
  getSpaceSpecs,
  type SpaceType,
} from "@/lib/space-images";
import { deleteSpace } from "./actions";

export type DirectorySpace = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  notes: string | null;
  currentHorses?: { id: string; name: string; status: string }[];
};

type SortKey = "name-asc" | "name-desc" | "capacity-desc" | "capacity-asc";

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: "name-asc", label: "Name (A–Z)" },
  { key: "name-desc", label: "Name (Z–A)" },
  { key: "capacity-desc", label: "Capacity (High to Low)" },
  { key: "capacity-asc", label: "Capacity (Low to High)" },
];

function TypeChip({ type }: { type: string }) {
  const style = SPACE_TYPE_STYLES[type.toLowerCase()] ?? {
    badge: "border-onstride-green/15 bg-muted text-muted-foreground",
    border: "border-onstride-green/20",
    text: "text-muted-foreground",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-bold tracking-wide uppercase",
        style.badge
      )}
    >
      {SPACE_TYPE_LABELS[type.toLowerCase() as SpaceType] ?? type}
    </span>
  );
}

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

function SpaceKebabMenu({
  spaceId,
  name,
  onView,
}: {
  spaceId: string;
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
        className="relative z-40 text-white/80 hover:bg-black/30 hover:text-white"
      >
        <EllipsisVertical className="size-4" />
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-40 w-44 overflow-hidden rounded-xl border border-onstride-green/10 bg-popover py-1 shadow-[var(--shadow-panel-lg)] text-foreground">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              onView();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted"
          >
            <Info className="size-3.5 opacity-60" /> View details
          </button>
          <Link
            href={`/spaces/${spaceId}/edit`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-xs font-medium hover:bg-muted"
          >
            <Pencil className="size-3.5 opacity-60" /> Edit space
          </Link>
          <form action={deleteSpace.bind(null, spaceId)} className="block">
            <ConfirmSubmit
              message={`Delete ${name}? This cannot be undone.`}
              variant="ghost"
              size="sm"
              className="w-full justify-start rounded-none px-3 py-2 text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
            >
              <Trash2 data-icon="inline-start" className="size-3.5" /> Delete space
            </ConfirmSubmit>
          </form>
        </div>
      )}
    </div>
  );
}

export function SpaceDirectory({ spaces }: { spaces: DirectorySpace[] }) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [warningFilter, setWarningFilter] = useState<boolean>(false);
  const [sortKey, setSortKey] = useState<SortKey>("name-asc");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [viewing, setViewing] = useState<DirectorySpace | null>(null);

  const stats = useMemo(() => {
    const totalCapacity = spaces.reduce((acc, s) => acc + (s.capacity ?? 0), 0);
    const fields = spaces.filter((s) => s.type.toLowerCase() === "field").length;
    const paddocks = spaces.filter((s) => s.type.toLowerCase() === "paddock").length;
    const rings = spaces.filter((s) => s.type.toLowerCase() === "ring").length;
    const withNotes = spaces.filter((s) => Boolean(s.notes)).length;

    return {
      total: spaces.length,
      totalCapacity,
      fields,
      paddocks,
      rings,
      withNotes,
    };
  }, [spaces]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = spaces.filter((space) => {
      if (typeFilter !== "all" && space.type.toLowerCase() !== typeFilter.toLowerCase()) {
        return false;
      }
      if (warningFilter && !space.notes) {
        return false;
      }
      if (q) {
        const specs = getSpaceSpecs(space.name, space.type);
        const haystack = `${space.name} ${space.type} ${space.notes ?? ""} ${specs.footing} ${specs.bestFor}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return list.sort((a, b) => {
      switch (sortKey) {
        case "name-desc":
          return b.name.localeCompare(a.name);
        case "capacity-desc":
          return (b.capacity ?? 0) - (a.capacity ?? 0);
        case "capacity-asc":
          return (a.capacity ?? 0) - (b.capacity ?? 0);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [spaces, query, typeFilter, warningFilter, sortKey]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats Banner */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard
          value={stats.total}
          label="Total Spaces"
          sublabel="All pastures & rings"
          icon={Fence}
        />
        <StatCard
          value={stats.totalCapacity}
          label="Total Capacity"
          sublabel="Equine capacity"
          icon={Users}
        />
        <StatCard
          value={stats.fields}
          label="Fields"
          sublabel={`${Math.round((stats.fields / (stats.total || 1)) * 100)}% of total`}
          icon={Trees}
          onClick={() => setTypeFilter((curr) => (curr === "field" ? "all" : "field"))}
        />
        <StatCard
          value={stats.paddocks}
          label="Paddocks"
          sublabel={`${Math.round((stats.paddocks / (stats.total || 1)) * 100)}% of total`}
          icon={Layers}
          onClick={() => setTypeFilter((curr) => (curr === "paddock" ? "all" : "paddock"))}
        />
        <StatCard
          value={stats.rings}
          label="Rings / Arena"
          sublabel={`${Math.round((stats.rings / (stats.total || 1)) * 100)}% of total`}
          icon={Sparkles}
          onClick={() => setTypeFilter((curr) => (curr === "ring" ? "all" : "ring"))}
        />
        <StatCard
          value={stats.withNotes}
          label="Space Alerts"
          sublabel={warningFilter ? "Showing alerts" : "Click to inspect"}
          icon={AlertTriangle}
          highlight={stats.withNotes > 0}
          onClick={() => setWarningFilter((v) => !v)}
        />
      </div>

      {/* Toolbar: Search, Filters & View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-onstride-green/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search spaces, footing, or notes…"
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

          {/* Type Filter Pills */}
          <div className="flex items-center gap-1 rounded-lg border border-input bg-card p-1">
            <button
              type="button"
              onClick={() => setTypeFilter("all")}
              className={cn(
                "rounded-md px-2.5 py-1 text-xs font-semibold transition-colors",
                typeFilter === "all"
                  ? "bg-primary text-primary-foreground"
                  : "text-onstride-green/60 hover:text-onstride-green"
              )}
            >
              All
            </button>
            {SPACE_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTypeFilter(t)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors",
                  typeFilter === t
                    ? "bg-primary text-primary-foreground"
                    : "text-onstride-green/60 hover:text-onstride-green"
                )}
              >
                {t}s
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

      {/* Spaces Listing */}
      {filtered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <Fence className="size-10 text-onstride-gold opacity-60" />
          <p className="font-display text-xl font-semibold">No spaces match your criteria</p>
          <p className="max-w-sm text-sm text-onstride-green/55">
            {query || typeFilter !== "all" || warningFilter
              ? "Try clearing filters or changing search keywords to see all barn spaces."
              : "Add your first space to start organizing pasture turnouts."}
          </p>
          {(query || typeFilter !== "all" || warningFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setTypeFilter("all");
                setWarningFilter(false);
              }}
              className="mt-2"
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((space) => {
            const specs = getSpaceSpecs(space.name, space.type);
            const photoUrl = getSpacePhotoUrl(space.name, space.type);
            const currentCount = space.currentHorses?.length ?? 0;
            const maxCap = space.capacity ?? 0;
            const isFull = maxCap > 0 && currentCount >= maxCap;

            return (
              <article
                key={space.id}
                className="panel group overflow-hidden flex flex-col p-0 transition-all duration-300 hover:shadow-[var(--shadow-panel-lg)] hover:border-onstride-gold/40 cursor-pointer"
                onClick={() => setViewing(space)}
              >
                {/* Hero Space Image Header */}
                <div className="relative aspect-[16/9] w-full overflow-hidden bg-black/20">
                  <SpacePhoto
                    name={space.name}
                    photoUrl={photoUrl}
                    className="h-full w-full object-cover"
                  />
                  {/* Subtle vignette gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/40 pointer-events-none" />

                  {/* Top Bar: Space Type & Kebab Actions */}
                  <div className="absolute left-3 top-3 right-3 flex items-center justify-between">
                    <TypeChip type={space.type} />
                    <div onClick={(e) => e.stopPropagation()}>
                      <SpaceKebabMenu
                        spaceId={space.id}
                        name={space.name}
                        onView={() => setViewing(space)}
                      />
                    </div>
                  </div>

                  {/* Bottom Image Overlay: Capacity & Acreage Tag */}
                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white">
                    <span className="flex items-center gap-1.5 font-medium text-white/90 drop-shadow-md">
                      <MapPin className="size-3.5 text-onstride-gold" />
                      {specs.acres} acres · {specs.footing.split("&")[0]}
                    </span>
                    {space.capacity != null && (
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-[0.7rem] font-bold shadow-md",
                          isFull
                            ? "bg-amber-500/90 text-black"
                            : "bg-black/60 text-white backdrop-blur-md border border-white/20"
                        )}
                      >
                        {currentCount > 0 ? `${currentCount} / ${maxCap}` : `Fits ${maxCap}`}
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Body */}
                <div className="flex min-w-0 flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-xl font-bold leading-tight group-hover:text-onstride-gold-deep transition-colors">
                        {space.name}
                      </h3>
                      <p className="mt-1 text-xs text-onstride-green/60 line-clamp-1">
                        {specs.bestFor}
                      </p>
                    </div>
                  </div>

                  {/* Warning / Handler Notes */}
                  {space.notes && (
                    <div className="mt-3.5 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-900">
                      <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                      <span className="font-medium italic">{space.notes}</span>
                    </div>
                  )}

                  {/* Footer Actions */}
                  <div
                    className="mt-auto flex items-center justify-between gap-2 pt-5 border-t border-onstride-green/8 mt-4"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => setViewing(space)}
                      className="text-xs font-semibold text-onstride-gold-deep hover:underline flex items-center gap-1"
                    >
                      View details <ChevronRight className="size-3.5" />
                    </button>

                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        render={<Link href={`/spaces/${space.id}/edit`} />}
                        nativeButton={false}
                      >
                        <Pencil data-icon="inline-start" className="size-3.5" /> Edit
                      </Button>
                      <form action={deleteSpace.bind(null, space.id)}>
                        <ConfirmSubmit
                          message={`Delete ${space.name}? This cannot be undone.`}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive px-2"
                        >
                          <Trash2 className="size-3.5" />
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="panel divide-y divide-onstride-green/8 overflow-hidden p-0">
          {filtered.map((space) => {
            const specs = getSpaceSpecs(space.name, space.type);
            const photoUrl = getSpacePhotoUrl(space.name, space.type);

            return (
              <div
                key={space.id}
                onClick={() => setViewing(space)}
                className="flex flex-wrap items-center gap-4 p-4 hover:bg-muted/40 transition-colors cursor-pointer"
              >
                <SpacePhoto
                  name={space.name}
                  photoUrl={photoUrl}
                  className="size-16 rounded-xl shrink-0 object-cover shadow-sm"
                />

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5">
                    <p className="font-display text-lg font-bold">{space.name}</p>
                    <TypeChip type={space.type} />
                    {space.capacity != null && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium tabular-nums text-onstride-green/70">
                        fits {space.capacity} {space.capacity === 1 ? "horse" : "horses"}
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-onstride-green/60">
                    {specs.acres} acres · {specs.footing} · {specs.fencing}
                  </p>
                  {space.notes && (
                    <p className="mt-1 flex items-center gap-1.5 text-xs italic text-amber-700">
                      <AlertTriangle className="size-3 shrink-0" />
                      {space.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href={`/spaces/${space.id}/edit`} />}
                    nativeButton={false}
                  >
                    <Pencil data-icon="inline-start" className="size-3.5" /> Edit
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setViewing(space)}
                  >
                    Details
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Space Profile Modal */}
      {viewing && (
        <>
          <button
            type="button"
            aria-label="Close details"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[3px]"
            onClick={() => setViewing(null)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-card border border-onstride-green/10 shadow-2xl flex flex-col">
              {/* Modal Hero Header with Space Photo */}
              <div className="relative h-64 w-full shrink-0 overflow-hidden bg-black/30">
                <SpacePhoto
                  name={viewing.name}
                  photoUrl={getSpacePhotoUrl(viewing.name, viewing.type)}
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20" />

                {/* Close Button */}
                <button
                  type="button"
                  aria-label="Close"
                  onClick={() => setViewing(null)}
                  className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full bg-black/40 text-white/80 hover:bg-black/60 hover:text-white backdrop-blur-md transition-colors"
                >
                  <X className="size-4.5" />
                </button>

                {/* Title & Type over Hero Banner */}
                <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
                  <div>
                    <TypeChip type={viewing.type} />
                    <h2 className="mt-2 font-display text-3xl font-bold text-white leading-tight drop-shadow-md">
                      {viewing.name}
                    </h2>
                  </div>
                  {viewing.capacity != null && (
                    <div className="rounded-xl border border-white/20 bg-black/60 px-3.5 py-2 text-center text-white backdrop-blur-md">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-onstride-gold">
                        Capacity
                      </p>
                      <p className="font-display text-xl font-bold tabular-nums">
                        {viewing.capacity} {viewing.capacity === 1 ? "Horse" : "Horses"}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Content Specs & Details */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Facility Specifications Grid */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-onstride-green/50">
                    Estate Specifications
                  </h4>
                  {(() => {
                    const specs = getSpaceSpecs(viewing.name, viewing.type);
                    return (
                      <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-sm">
                        <div className="rounded-xl border border-onstride-green/8 bg-muted/30 p-3">
                          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-onstride-green/50">
                            Acreage / Size
                          </dt>
                          <dd className="mt-1 font-semibold text-onstride-green/90">
                            {specs.acres} Acres
                          </dd>
                        </div>
                        <div className="rounded-xl border border-onstride-green/8 bg-muted/30 p-3">
                          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-onstride-green/50">
                            Footing Surface
                          </dt>
                          <dd className="mt-1 font-semibold text-onstride-green/90">
                            {specs.footing}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-onstride-green/8 bg-muted/30 p-3">
                          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-onstride-green/50">
                            Fencing Architecture
                          </dt>
                          <dd className="mt-1 font-semibold text-onstride-green/90">
                            {specs.fencing}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-onstride-green/8 bg-muted/30 p-3">
                          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-onstride-green/50">
                            Hydration & Waterer
                          </dt>
                          <dd className="mt-1 font-semibold text-onstride-green/90">
                            {specs.waterer}
                          </dd>
                        </div>
                        <div className="rounded-xl border border-onstride-green/8 bg-muted/30 p-3 sm:col-span-2">
                          <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-onstride-green/50">
                            Recommended Herd / Best For
                          </dt>
                          <dd className="mt-1 font-semibold text-onstride-green/90">
                            {specs.bestFor}
                          </dd>
                        </div>
                      </dl>
                    );
                  })()}
                </div>

                {/* Handler Notes & Safety Warnings */}
                {viewing.notes && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-widest text-onstride-green/50">
                      Safety & Operational Notes
                    </h4>
                    <div className="mt-2.5 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-950">
                      <AlertTriangle className="size-5 shrink-0 text-amber-600 mt-0.5" />
                      <p className="italic leading-relaxed font-medium">“{viewing.notes}”</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Footer Actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-onstride-green/10 bg-muted/20 p-5">
                <div className="flex items-center gap-2">
                  <Button
                    render={<Link href={`/spaces/${viewing.id}/edit`} />}
                    nativeButton={false}
                    size="sm"
                  >
                    <Pencil data-icon="inline-start" className="size-3.5" /> Edit space
                  </Button>
                  <form action={deleteSpace.bind(null, viewing.id)}>
                    <ConfirmSubmit
                      message={`Delete ${viewing.name}? This cannot be undone.`}
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
                    className="flex items-center gap-1 text-xs font-semibold text-onstride-gold-deep hover:underline"
                  >
                    <span>View on Barn Map</span>
                    <ArrowRight className="size-3.5" />
                  </Link>
                  <Link
                    href="/board"
                    className="flex items-center gap-1 text-xs font-semibold text-onstride-gold-deep hover:underline"
                  >
                    <span>See Today&apos;s Board</span>
                    <ArrowRight className="size-3.5" />
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
