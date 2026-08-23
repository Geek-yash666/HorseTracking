"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Ban,
  Search,
  CheckCircle2,
  Clock,
  EyeOff,
  Home,
  LayoutGrid,
  List,
  MoreVertical,
  NotebookPen,
  Pencil,
  Plus,
  ShieldAlert,
  Sun,
  Moon,
  Trash2,
  UserRound,
  X,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HorsePhoto } from "@/components/horse-photo";
import { HorseAvatar } from "@/components/horse-avatar";
import { GENDER_LABELS } from "@/lib/horse-images";
import { cn } from "@/lib/utils";
import {
  markOut,
  markIn,
  markSkipped,
  resetEvent,
  removeEvent,
  updateEventSpace,
  updateEventNote,
  addEventToBoard,
} from "./actions";

export type BoardEventDto = {
  id: string;
  horseId: string;
  horseName: string;
  photoUrl: string | null;
  breed?: string | null;
  gender?: string | null;
  ageYears?: number | null;
  horseNotes?: string | null;
  lifecycle?: string | null;
  groups?: string[];
  shift: string;
  status: string;
  note: string | null;
  spaceId: string;
  spaceName: string;
  outLabel: string | null;
  inLabel: string | null;
  conflictReason: string | null;
};

export type HorseProfileData = {
  id: string;
  name: string;
  photoUrl?: string | null;
  breed?: string | null;
  gender?: string | null;
  ageYears?: number | null;
  notes?: string | null;
  lifecycle?: string | null;
  groups?: string[];
  event?: BoardEventDto;
};

type SpaceOption = { id: string; name: string };
type ActivityItem = {
  key: string;
  name: string;
  photoUrl?: string | null;
  spaceName?: string | null;
  action: string;
  detail: string;
  timeLabel: string | null;
  tone: "success" | "info" | "alert" | "muted";
};
type SpaceStat = {
  id: string;
  name: string;
  type: string;
  count: number;
  capacity: number | null;
  conflict: boolean;
};
type ShiftRow = { shift: string; spaces: SpaceStat[] };
type SpecialGroup = {
  id: string;
  name: string;
  chip: string;
  count: number;
  capacity: number | null;
};

const STATUS_META: Record<
  string,
  { label: string; dot: string; icon: ComponentType<{ className?: string }> }
> = {
  out: { label: "Out on pasture", dot: "bg-status-in", icon: Sun },
  scheduled: {
    label: "Waiting to go out",
    dot: "bg-status-out-strong",
    icon: Clock,
  },
  in: { label: "Back in the barn", dot: "bg-onstride-moss", icon: CheckCircle2 },
  skipped: { label: "Staying in", dot: "bg-status-skipped", icon: Home },
};

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

function InitialAvatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full border border-onstride-green/8 bg-[#efe9dc] font-display text-sm font-semibold text-onstride-green/70",
        className
      )}
    >
      {name[0]?.toUpperCase()}
    </span>
  );
}

function CardActions({
  event,
  spaces,
  onEditNote,
  onViewProfile,
}: {
  event: BoardEventDto;
  spaces: SpaceOption[];
  onEditNote: () => void;
  onViewProfile: () => void;
}) {
  const item =
    "flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted transition-colors";
  return (
    <>
      <MenuItemButton onClick={onViewProfile}>
        <UserRound className="size-3.5 opacity-60" /> View Horse Profile
      </MenuItemButton>

      {event.status === "scheduled" && (
        <>
          <form action={markOut.bind(null, event.id)}>
            <button type="submit" className={item}>
              <Sun className="size-3.5 opacity-60 text-status-out-strong" /> Turn out now
            </button>
          </form>
          <form action={markSkipped.bind(null, event.id)}>
            <button type="submit" className={item}>
              <Ban className="size-3.5 opacity-60 text-destructive" /> Skip today
            </button>
          </form>
        </>
      )}
      {event.status === "out" && (
        <form action={markIn.bind(null, event.id)}>
          <button type="submit" className={item}>
            <CheckCircle2 className="size-3.5 opacity-60 text-status-in" /> Bring in
          </button>
        </form>
      )}
      {(event.status === "in" || event.status === "skipped") && (
        <form action={resetEvent.bind(null, event.id)}>
          <button type="submit" className={item}>
            <Clock className="size-3.5 opacity-60" /> Undo status
          </button>
        </form>
      )}

      {spaces.length > 0 && (
        <form action={updateEventSpace.bind(null, event.id)} className="px-3 py-1.5">
          <p className="mb-1 text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-onstride-green/45">
            Move to
          </p>
          <select
            name="spaceId"
            defaultValue={event.spaceId}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            aria-label="Move to another paddock"
            className="h-7 w-full cursor-pointer rounded-md border border-input bg-card px-1.5 text-xs font-medium text-onstride-green/80 focus-visible:outline-none"
          >
            {spaces.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </form>
      )}

      <MenuItemButton onClick={onEditNote}>
        <NotebookPen className="size-3.5 opacity-60 text-amber-700" />
        {event.note ? "Edit note" : "Add note"}
      </MenuItemButton>

      <form action={removeEvent.bind(null, event.id)} className="border-t border-onstride-green/8">
        <ConfirmSubmit
          message={`Remove ${event.horseName}'s ${event.shift} turnout from the board?`}
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-none px-3 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 data-icon="inline-start" /> Remove from board
        </ConfirmSubmit>
      </form>
    </>
  );
}

function MenuItemButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium hover:bg-muted"
    >
      {children}
    </button>
  );
}

/**
 * One horse on the board. Renders as a photo card (out), an initial
 * card (everywhere else), or a dense list row; the kebab carries every
 * mutation so the compact layout stays tappable.
 */
function BoardItem({
  event,
  spaces,
  display,
  onOpenProfile,
  onOpenNoteEditor,
}: {
  event: BoardEventDto;
  spaces: SpaceOption[];
  display: "card-out" | "card" | "conflict" | "list";
  onOpenProfile?: (horseId: string) => void;
  onOpenNoteEditor?: (event: BoardEventDto) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [resolveOpen, setResolveOpen] = useState(false);

  const metaLine =
    event.status === "out"
      ? `Out since ${event.outLabel ?? "—"}`
      : event.status === "in"
        ? `Back in ${event.inLabel ?? ""}`.trim()
        : event.status === "skipped"
          ? "Staying in today"
          : `Due ${event.shift}`;

  const subLine =
    event.status === "scheduled"
      ? `${event.shift} · ${event.spaceName}`
      : event.spaceName;

  const isConflict = display === "conflict";

  const kebab = (
    <div className="relative">
      {menuOpen && (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 cursor-default"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={`Actions for ${event.horseName}`}
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((v) => !v)}
        className="relative z-40 text-onstride-green/40 hover:text-onstride-green"
      >
        <MoreVertical className="size-4" />
      </Button>
      {menuOpen && (
        <div className="absolute right-0 top-9 z-50 w-48 overflow-hidden rounded-xl border border-onstride-green/10 bg-popover py-1 shadow-2xl">
          <CardActions
            event={event}
            spaces={spaces}
            onViewProfile={() => {
              setMenuOpen(false);
              onOpenProfile?.(event.horseId);
            }}
            onEditNote={() => {
              setMenuOpen(false);
              onOpenNoteEditor?.(event);
            }}
          />
        </div>
      )}
    </div>
  );

  /* ----------------------------- list row ----------------------------- */
  if (display === "list") {
    return (
      <div className="flex items-center gap-3 px-3.5 py-2.5">
        <div
          onClick={() => onOpenProfile?.(event.horseId)}
          className="cursor-pointer"
        >
          <HorsePhoto
            name={event.horseName}
            photoUrl={event.photoUrl}
            className="size-10 rounded-lg shrink-0 object-cover"
            sizesClass="text-sm"
          />
        </div>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => onOpenProfile?.(event.horseId)}
            className="truncate text-sm font-semibold hover:text-onstride-gold-deep transition-colors text-left"
          >
            {event.horseName}
          </button>
          <p className="truncate text-xs text-onstride-green/55">
            {metaLine} · {event.spaceName}
          </p>
        </div>
        {isConflict && (
          <span className="rounded-full border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-[0.65rem] font-semibold text-destructive">
            Conflict
          </span>
        )}
        {kebab}
      </div>
    );
  }

  /* ------------------------------ cards ------------------------------- */
  return (
    <article
      className={cn(
        "rounded-2xl border transition-all duration-150 hover:shadow-[var(--shadow-panel)] min-h-[6.25rem] flex flex-col justify-between",
        isConflict
          ? "border-destructive/25 bg-destructive/[0.04]"
          : "border-onstride-green/12 bg-card"
      )}
    >
      <div className="flex min-h-[6.25rem] items-stretch flex-1">
        {/* Uniform Left Vertical Rectangle Photo Strip */}
        <div
          onClick={() => onOpenProfile?.(event.horseId)}
          className="w-24 sm:w-26 shrink-0 self-stretch rounded-l-2xl overflow-hidden cursor-pointer group/photo relative bg-muted"
          title={`View ${event.horseName}'s profile`}
        >
          <HorsePhoto
            name={event.horseName}
            photoUrl={event.photoUrl}
            className="h-full w-full object-cover group-hover/photo:scale-105 transition-transform duration-200"
            sizesClass="text-xl"
          />
        </div>

        {/* Content Column */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div>
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                onClick={() => onOpenProfile?.(event.horseId)}
                className="truncate font-display text-[0.98rem] font-bold text-onstride-green/90 hover:text-onstride-gold-deep text-left transition-colors leading-tight cursor-pointer"
                title={`View ${event.horseName}'s profile`}
              >
                {event.horseName}
              </button>
              <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                <span className="text-onstride-gold-deep">
                  {event.status === "out" ? (
                    <Sun className="size-4" />
                  ) : event.status === "in" ? (
                    <CheckCircle2 className="size-4 text-status-in" />
                  ) : event.status === "skipped" ? (
                    <Home className="size-4 text-status-skipped" />
                  ) : (
                    <Clock className="size-4 text-onstride-sage" />
                  )}
                </span>
                {kebab}
              </div>
            </div>

            <p className="truncate text-xs font-semibold text-onstride-green/75 mt-0.5">{subLine}</p>
          </div>

          <div className="mt-2 flex items-center justify-between gap-1.5">
            <p className="truncate text-xs text-onstride-green/50">{metaLine}</p>

            <div className="flex items-center gap-1.5 shrink-0">
              {event.note && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenNoteEditor?.(event);
                  }}
                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[0.62rem] font-bold text-amber-900 hover:bg-amber-500/25 transition-all cursor-pointer shadow-2xs"
                  title={`Handler note: “${event.note}” (Click to view/edit)`}
                >
                  <NotebookPen className="size-3 text-amber-700" />
                  <span>NOTE</span>
                </button>
              )}

              {isConflict && event.conflictReason && (
                <span
                  className="inline-flex items-center gap-1 rounded-md border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[0.62rem] font-bold text-destructive cursor-help"
                  title={`Conflict: ${event.conflictReason}`}
                >
                  <ShieldAlert className="size-2.5" />
                  <span>CONFLICT</span>
                </span>
              )}
            </div>
          </div>

          {isConflict && resolveOpen && (
            <div className="flex items-center gap-1.5 pt-1.5 border-t border-destructive/15 mt-1.5">
              <form
                action={updateEventSpace.bind(null, event.id)}
                className="flex-1"
              >
                <select
                  name="spaceId"
                  defaultValue={event.spaceId}
                  onChange={(e) => {
                    e.currentTarget.form?.requestSubmit();
                    setResolveOpen(false);
                  }}
                  aria-label={`Move ${event.horseName} to another paddock`}
                  className="h-7 w-full cursor-pointer rounded-md border border-input bg-card px-1.5 text-xs font-medium text-onstride-green/80 focus-visible:outline-none"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </form>
              <form action={markSkipped.bind(null, event.id)}>
                <Button type="submit" size="sm" variant="outline" className="h-7 text-xs px-2">
                  Skip
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Column shell                                                        */
/* ------------------------------------------------------------------ */

function StatusColumn({
  title,
  dot,
  count,
  children,
  footer,
  className,
}: {
  title: string;
  dot: string;
  count: number;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-onstride-green/10 bg-[#faf7f1] p-3",
        className
      )}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={cn("size-2 rounded-full", dot)} />
        <h3 className="text-[0.68rem] font-bold uppercase tracking-[0.18em] text-onstride-green/70">
          {title}
        </h3>
        <span className="ml-auto rounded-full bg-onstride-green/8 px-2 py-0.5 text-[0.65rem] font-bold tabular-nums text-onstride-green/60">
          {count}
        </span>
      </header>
      <div className="flex flex-col gap-2">{children}</div>
      {footer}
    </section>
  );
}

const ACTIVITY_TONE: Record<string, string> = {
  success: "bg-status-in/15 text-status-in",
  info: "bg-status-out/20 text-status-out-strong",
  alert: "bg-destructive/12 text-destructive",
muted: "bg-muted text-muted-foreground",
};

/* ------------------------------------------------------------------ */
/* Board                                                               */
/* ------------------------------------------------------------------ */

export function BoardClient({
  dateISO,
  events,
  offBoard,
  allHorses,
  spaceOptions,
  activity,
  shiftMatrix,
  specialGroups,
}: {
  dateISO: string;
  events: BoardEventDto[];
  offBoard: {
    id: string;
    name: string;
    photoUrl?: string | null;
    breed?: string | null;
    gender?: string | null;
    ageYears?: number | null;
    notes?: string | null;
    lifecycle?: string | null;
    groups?: string[];
  }[];
  allHorses?: {
    id: string;
    name: string;
    photoUrl?: string | null;
    breed?: string | null;
    gender?: string | null;
    ageYears?: number | null;
    notes?: string | null;
    lifecycle?: string | null;
    groups?: string[];
  }[];
  spaceOptions: SpaceOption[];
  activity: ActivityItem[];
  shiftMatrix: ShiftRow[];
  specialGroups: SpecialGroup[];
}) {
  const [query, setQuery] = useState("");
  const [shiftFilter, setShiftFilter] = useState<"all" | "AM" | "PM">("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [groupBy, setGroupBy] = useState<"status" | "shift">("status");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedHorseId, setSelectedHorseId] = useState<string>("");
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>("");
  const [selectedShift, setSelectedShift] = useState<"AM" | "PM">("AM");
  const [viewingHorse, setViewingHorse] = useState<HorseProfileData | null>(null);
  const [editingNoteEvent, setEditingNoteEvent] = useState<BoardEventDto | null>(null);

  const q = query.trim().toLowerCase();
  const filtered = useMemo(
    () =>
      q
        ? events.filter((e) => e.horseName.toLowerCase().includes(q))
        : events,
    [events, q]
  );
  const visible = useMemo(
    () =>
      shiftFilter === "all"
        ? filtered
        : filtered.filter((e) => e.shift === shiftFilter),
    [filtered, shiftFilter]
  );

  const byStatus = (status: string) => visible.filter((e) => e.status === status);
  const conflicts = visible.filter((e) => e.conflictReason);
  const offBoardFiltered = offBoard.filter((h) =>
    q ? h.name.toLowerCase().includes(q) : true
  );

  const shownActivity = showAllActivity ? activity : activity.slice(0, 6);

  const openAddModal = (horseId?: string) => {
    setSelectedHorseId(horseId || offBoardFiltered[0]?.id || allHorses?.[0]?.id || "");
    setSelectedSpaceId(spaceOptions[0]?.id || "");
    setSelectedShift("AM");
    setAddModalOpen(true);
  };

  const openProfile = (horseId: string) => {
    const ev = events.find((e) => e.horseId === horseId);
    const horseObj =
      allHorses?.find((h) => h.id === horseId) ||
      offBoard.find((h) => h.id === horseId);

    if (horseObj) {
      setViewingHorse({
        id: horseObj.id,
        name: horseObj.name,
        photoUrl: horseObj.photoUrl,
        breed: horseObj.breed,
        gender: horseObj.gender,
        ageYears: horseObj.ageYears,
        notes: horseObj.notes,
        lifecycle: horseObj.lifecycle,
        groups: horseObj.groups,
        event: ev,
      });
    } else if (ev) {
      setViewingHorse({
        id: ev.horseId,
        name: ev.horseName,
        photoUrl: ev.photoUrl,
        breed: ev.breed,
        gender: ev.gender,
        ageYears: ev.ageYears,
        notes: ev.horseNotes,
        lifecycle: ev.lifecycle,
        groups: ev.groups,
        event: ev,
      });
    }
  };

  const openNoteEditor = (event: BoardEventDto) => {
    setEditingNoteEvent(event);
  };

  return (
    <div className="flex flex-col gap-6">
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

        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => openAddModal()}
            size="sm"
            className="h-9 gap-1.5 rounded-lg font-semibold"
          >
            <Plus className="size-4" /> Add turnout
          </Button>
          {/* Shift filter */}
          <div className="relative">
            {filterOpen && (
              <button
                type="button"
                aria-label="Close filter"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => setFilterOpen(false)}
              />
            )}
            <Button
              variant="outline"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              className={cn(
                "relative z-40 h-9 rounded-lg",
                shiftFilter !== "all" && "border-onstride-gold text-onstride-gold-deep"
              )}
            >
              Filter{shiftFilter !== "all" ? `: ${shiftFilter}` : ""}
            </Button>
            {filterOpen && (
              <div className="absolute right-0 top-10 z-40 w-40 overflow-hidden rounded-xl border border-onstride-green/10 bg-popover py-1 shadow-[var(--shadow-panel-lg)]">
                {(["all", "AM", "PM"] as const).map((option) => (
                  <MenuItemButton
                    key={option}
                    onClick={() => {
                      setShiftFilter(option);
                      setFilterOpen(false);
                    }}
                  >
                    {option === "all" ? "Both shifts" : `${option} shift only`}
                    {shiftFilter === option && (
                      <CheckCircle2 className="ml-auto size-3.5 text-onstride-gold-deep" />
                    )}
                  </MenuItemButton>
                ))}
              </div>
            )}
          </div>

          <label className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 h-9">
            <span className="text-xs font-medium text-onstride-green/55">Group by</span>
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as "status" | "shift")}
              aria-label="Group board by"
              className="cursor-pointer bg-transparent pr-1 text-xs font-semibold text-onstride-green outline-none"
            >
              <option value="status">Status</option>
              <option value="shift">Shift</option>
            </select>
          </label>

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

      {/* Empty state */}
      {visible.length === 0 && offBoardFiltered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 border-dashed px-6 py-14 text-center">
          <Sun className="size-8 text-onstride-gold" />
          <p className="font-display text-xl font-semibold">No horses match</p>
          <p className="max-w-sm text-sm text-onstride-green/55">
            Nothing on the board for {dateISO}. Adjust your search or generate
            from the schedule above.
          </p>
        </div>
      ) : view === "list" ? (
        /* ------------------------------ list ------------------------------ */
        <div className="panel divide-y divide-onstride-green/8 p-0">
          {(["out", "scheduled", "in", "skipped"] as const).flatMap((status) =>
            byStatus(status).map((event) => (
              <BoardItem
                key={`l-${event.id}`}
                event={event}
                spaces={spaceOptions}
                display={"list"}
                onOpenProfile={openProfile}
                onOpenNoteEditor={openNoteEditor}
              />
            ))
          )}
        </div>
      ) : groupBy === "status" ? (
        /* ------------------------- kanban: status ------------------------ */
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1.15fr]">
          <StatusColumn {...columnProps(STATUS_META.out, byStatus("out").length)}>
            {byStatus("out").map((event) => (
              <BoardItem
                key={event.id}
                event={event}
                spaces={spaceOptions}
                display="card-out"
                onOpenProfile={openProfile}
                onOpenNoteEditor={openNoteEditor}
              />
            ))}
          </StatusColumn>

          <StatusColumn
            {...columnProps(STATUS_META.scheduled, byStatus("scheduled").length)}
          >
            {byStatus("scheduled").map((event) => (
              <BoardItem
                key={event.id}
                event={event}
                spaces={spaceOptions}
                display="card"
                onOpenProfile={openProfile}
                onOpenNoteEditor={openNoteEditor}
              />
            ))}
          </StatusColumn>

          <div className="flex min-w-0 flex-col gap-4">
            <StatusColumn {...columnProps(STATUS_META.in, byStatus("in").length)}>
              {byStatus("in").map((event) => (
                <BoardItem
                  key={event.id}
                  event={event}
                  spaces={spaceOptions}
                  display="card"
                  onOpenProfile={openProfile}
                  onOpenNoteEditor={openNoteEditor}
                />
              ))}
            </StatusColumn>
            <StatusColumn
              {...columnProps(STATUS_META.skipped, byStatus("skipped").length)}
            >
              {byStatus("skipped").map((event) => (
                <BoardItem
                  key={event.id}
                  event={event}
                  spaces={spaceOptions}
                  display="card"
                  onOpenProfile={openProfile}
                  onOpenNoteEditor={openNoteEditor}
                />
              ))}
            </StatusColumn>
            <StatusColumn title="Not on the board" dot="bg-onstride-green/25" count={offBoardFiltered.length}>
              {offBoardFiltered.map((horse) => (
                <article
                  key={horse.id}
                  className="rounded-2xl border border-dashed border-onstride-green/20 bg-card/60 transition-all hover:bg-card hover:border-onstride-gold/40 hover:shadow-xs min-h-[6.25rem] flex flex-col justify-between"
                >
                  <div className="flex min-h-[6.25rem] items-stretch flex-1">
                    <div
                      onClick={() => openProfile(horse.id)}
                      className="w-24 sm:w-26 shrink-0 self-stretch rounded-l-2xl overflow-hidden cursor-pointer group/photo relative bg-muted"
                      title={`View ${horse.name}'s profile`}
                    >
                      <HorsePhoto
                        name={horse.name}
                        photoUrl={horse.photoUrl}
                        className="h-full w-full object-cover opacity-85 group-hover/photo:opacity-100 group-hover/photo:scale-105 transition-all duration-200"
                        sizesClass="text-xl"
                      />
                    </div>
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-3.5">
                      <div className="flex items-start justify-between gap-1">
                        <button
                          type="button"
                          onClick={() => openProfile(horse.id)}
                          className="truncate font-display text-[0.98rem] font-bold text-onstride-green/90 hover:text-onstride-gold-deep text-left transition-colors leading-tight cursor-pointer"
                          title={`View ${horse.name}'s profile`}
                        >
                          {horse.name}
                        </button>
                        <EyeOff className="size-3.5 shrink-0 text-onstride-green/35 -mr-0.5 -mt-0.5" />
                      </div>
                      <div className="mt-1">
                        <p className="text-xs font-semibold text-onstride-green/60">No turnout today</p>
                        <p className="text-xs italic text-onstride-green/40">Day off</p>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => openAddModal(horse.id)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-onstride-gold-deep hover:text-onstride-gold transition-colors"
                        >
                          <Plus className="size-3.5" /> Add to today
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </StatusColumn>
          </div>

          <StatusColumn
            title="Conflicts"
            dot="bg-destructive"
            count={conflicts.length}
            footer={
              conflicts.length > 0 ? (
                <p className="mt-3 px-1 text-[0.65rem] leading-relaxed text-onstride-green/45">
                  Horses appear here and in their status column. Resolve by moving
                  one of them to another paddock.
                </p>
              ) : undefined
            }
          >
            {conflicts.map((event) => (
              <BoardItem
                key={`c-${event.id}`}
                event={event}
                spaces={spaceOptions}
                display="conflict"
                onOpenProfile={openProfile}
                onOpenNoteEditor={openNoteEditor}
              />
            ))}
          </StatusColumn>
        </div>
      ) : (
        /* ------------------------- kanban: shift -------------------------- */
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {(["AM", "PM"] as const).map((shift) => {
            const isAM = shift === "AM";
            const Icon = isAM ? Sun : Moon;
            const shiftEvents = visible.filter((e) => e.shift === shift);
            return (
              <section
                key={shift}
                className="rounded-2xl border border-onstride-green/10 bg-[#faf7f1] p-4"
              >
                <header className="mb-4 flex items-center gap-3.5">
                  <span
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full border",
                      isAM
                        ? "border-status-out/40 bg-status-out/15 text-status-out-strong"
                        : "border-onstride-pine/25 bg-onstride-pine/10 text-onstride-moss"
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  <div>
                    <h2 className="font-display text-xl font-semibold leading-tight">
                      {isAM ? "Morning shift" : "Afternoon shift"}
                    </h2>
                    <p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-onstride-green/45">
                      {shift} · {shiftEvents.length}{" "}
                      {shiftEvents.length === 1 ? "turnout" : "turnouts"}
                    </p>
                  </div>
                </header>

                {shiftEvents.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-onstride-green/15 py-8 text-center text-xs text-onstride-green/45">
                    Nothing scheduled for this shift.
                  </p>
                ) : (
                  [...new Set(shiftEvents.map((e) => e.spaceId))].map((spaceId) => {
                    const residents = shiftEvents.filter((e) => e.spaceId === spaceId);
                    return (
                      <div key={spaceId} className="mb-5 last:mb-0">
                        <p className="mb-2 flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.16em] text-onstride-green/65">
                          {residents[0].spaceName}
                          <span className="rounded-md border border-onstride-green/15 bg-background px-1.5 py-px text-[0.65rem] font-medium normal-case tracking-normal text-onstride-green/50">
                            {residents.length}
                          </span>
                        </p>
                        <div className="flex flex-col gap-2">
                          {residents.map((event) => (
                            <BoardItem
                              key={event.id}
                              event={event}
                              spaces={[]}
                              display="card"
                              onOpenProfile={openProfile}
                              onOpenNoteEditor={openNoteEditor}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })
                )}
              </section>
            );
          })}
        </div>
      )}

      {/* Shifts & Groups */}
      {shiftMatrix.length > 0 && view === "grid" && (
        <section className="panel p-5">
          <p className="overline-label mb-4">Shifts &amp; groups</p>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[repeat(auto-fit,minmax(230px,1fr))]">
            {shiftMatrix.map((row) => {
              const isAM = row.shift === "AM";
              return (
                <div key={row.shift} className="flex flex-col gap-2">
                  <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.16em] text-onstride-green/50">
                    {isAM ? <Sun className="size-3" /> : <Moon className="size-3" />}
                    {isAM ? "Morning shift" : "Afternoon shift"}
                  </p>
                  {row.spaces.map((stat) => (
                    <SpaceStatRow key={`${row.shift}-${stat.id}`} stat={stat} />
                  ))}
                </div>
              );
            })}
            {specialGroups.length > 0 && (
              <div className="flex flex-col gap-2">
                <p className="text-[0.65rem] font-bold uppercase tracking-[0.16em] text-onstride-green/50">
                  Special groups
                </p>
                {specialGroups.map((group) => (
                  <SpaceStatRow key={group.id} stat={group} />
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent activity */}
      {activity.length > 0 && (
        <section className="rounded-2xl border border-onstride-green/10 bg-[#faf7f1] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg font-bold text-onstride-green/90 leading-tight">
                Recent Board Activity
              </h2>
              <p className="text-xs text-onstride-green/55">
                Timestamped log of turnouts and status changes for today
              </p>
            </div>
            {activity.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllActivity((v) => !v)}
                className="text-xs font-semibold text-onstride-gold-deep hover:underline"
              >
                {showAllActivity ? "Show less" : `View all ${activity.length} updates`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {shownActivity.map((item) => {
              const isSuccess = item.tone === "success";
              const isInfo = item.tone === "info";
              const isAlert = item.tone === "alert";

              const Icon = isSuccess
                ? CheckCircle2
                : isInfo
                  ? Sun
                  : isAlert
                    ? ShieldAlert
                    : Clock;

              return (
                <div
                  key={item.key}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border p-3 transition-all hover:shadow-xs",
                    isSuccess && "border-emerald-500/20 bg-emerald-500/[0.04]",
                    isInfo && "border-amber-500/20 bg-amber-500/[0.04]",
                    isAlert && "border-red-500/25 bg-red-500/[0.05]",
                    !isSuccess && !isInfo && !isAlert && "border-onstride-green/10 bg-card"
                  )}
                >
                  <HorseAvatar
                    name={item.name}
                    photoUrl={item.photoUrl}
                    size="md"
                    className="shadow-xs shrink-0"
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="font-display text-sm font-bold text-onstride-green/90 truncate leading-tight">
                        {item.name}
                      </p>
                      {item.timeLabel ? (
                        <span className="text-[11px] font-bold tabular-nums text-onstride-green/60 shrink-0">
                          {item.timeLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-onstride-green/40 uppercase shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold",
                          ACTIVITY_TONE[item.tone]
                        )}
                      >
                        <Icon className="size-3 shrink-0" />
                        {item.action}
                      </span>
                    </div>

                    {item.detail && (
                      <p className="mt-1 text-[11px] text-onstride-green/55 truncate">
                        {item.detail}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Add Turnout Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setAddModalOpen(false)}
          />
          <div className="relative z-50 w-full max-w-md rounded-2xl border border-onstride-green/15 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-onstride-green/10">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-onstride-gold/15 text-onstride-gold-deep">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-onstride-green/90 leading-tight">
                    Add Turnout to Board
                  </h3>
                  <p className="text-xs text-onstride-green/50">
                    Schedule a horse into a pasture for {dateISO}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="rounded-lg p-1.5 text-onstride-green/40 hover:bg-muted hover:text-onstride-green transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await addEventToBoard(formData);
                setAddModalOpen(false);
              }}
              className="mt-5 space-y-4"
            >
              <input type="hidden" name="date" value={dateISO} />

              {/* Horse Selector */}
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/55">
                  Horse
                </label>
                <select
                  name="horseId"
                  value={selectedHorseId}
                  onChange={(e) => setSelectedHorseId(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:border-ring"
                >
                  {offBoardFiltered.length > 0 && (
                    <optgroup label="Not Yet On Board">
                      {offBoardFiltered.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name} (Day Off)
                        </option>
                      ))}
                    </optgroup>
                  )}
                  <optgroup label="All Barn Horses">
                    {(allHorses ?? []).map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name} {h.gender ? `(${h.gender})` : ""}
                      </option>
                    ))}
                  </optgroup>
                </select>
              </div>

              {/* Target Turnout Space */}
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/55">
                  Turnout Space / Paddock
                </label>
                <select
                  name="spaceId"
                  value={selectedSpaceId}
                  onChange={(e) => setSelectedSpaceId(e.target.value)}
                  required
                  className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium focus-visible:outline-none focus-visible:border-ring"
                >
                  {spaceOptions.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Shift Radio / Selector */}
              <div className="space-y-1.5">
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/55">
                  Shift
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["AM", "PM"] as const).map((shift) => (
                    <label
                      key={shift}
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-bold transition-all",
                        selectedShift === shift
                          ? "border-onstride-gold bg-onstride-gold/10 text-onstride-gold-deep shadow-xs"
                          : "border-onstride-green/10 bg-background text-onstride-green/60 hover:bg-muted/40"
                      )}
                    >
                      <input
                        type="radio"
                        name="shift"
                        value={shift}
                        checked={selectedShift === shift}
                        onChange={() => setSelectedShift(shift)}
                        className="sr-only"
                      />
                      {shift === "AM" ? (
                        <>
                          <Sun className="size-3.5 text-status-out-strong" /> Morning (AM)
                        </>
                      ) : (
                        <>
                          <Moon className="size-3.5 text-onstride-moss" /> Afternoon (PM)
                        </>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-onstride-green/10">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="default">
                  <Plus className="size-4" /> Add to Today&apos;s Board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNoteEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setEditingNoteEvent(null)}
          />
          <div className="relative z-50 w-full max-w-lg rounded-2xl border border-onstride-green/15 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-onstride-green/10">
              <div className="flex items-center gap-3">
                <HorseAvatar
                  name={editingNoteEvent.horseName}
                  photoUrl={editingNoteEvent.photoUrl}
                  size="md"
                />
                <div>
                  <h3 className="font-display text-lg font-bold text-onstride-green/90 leading-tight">
                    Turnout Note · {editingNoteEvent.horseName}
                  </h3>
                  <p className="text-xs text-onstride-green/55">
                    Handler instructions for {editingNoteEvent.spaceName} ({editingNoteEvent.shift} shift)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingNoteEvent(null)}
                className="rounded-lg p-1.5 text-onstride-green/40 hover:bg-muted hover:text-onstride-green transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateEventNote(editingNoteEvent.id, formData);
                setEditingNoteEvent(null);
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/55 mb-1.5 block">
                  Handler Advisory & Notes
                </label>
                <textarea
                  name="note"
                  defaultValue={editingNoteEvent.note ?? ""}
                  rows={4}
                  autoFocus
                  placeholder="e.g. Needs fly mask, hand-walk only 20 min, keep away from paddock fence…"
                  className="w-full rounded-xl border border-input bg-background p-3 text-sm text-onstride-green/90 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring resize-none leading-relaxed"
                />
              </div>

              {/* Quick Suggestion Preset Chips */}
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50 mb-2">
                  Quick Presets
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    "Needs fly mask",
                    "Hand-walk only, 20 min",
                    "Hold turnout until vet arrives",
                    "Muzzle on grass",
                    "First time out with this group",
                    "Easy keeper · monitor grass",
                    "Watch near fences",
                  ].map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={(e) => {
                        const textarea = e.currentTarget
                          .closest("form")
                          ?.querySelector("textarea[name=note]") as HTMLTextAreaElement;
                        if (textarea) {
                          const current = textarea.value.trim();
                          textarea.value = current ? `${current} — ${chip}` : chip;
                        }
                      }}
                      className="rounded-full border border-onstride-green/12 bg-background px-2.5 py-1 text-xs font-medium text-onstride-green/70 hover:border-onstride-gold hover:text-onstride-gold-deep hover:bg-onstride-gold/5 transition-all"
                    >
                      + {chip}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-onstride-green/10">
                {editingNoteEvent.note ? (
                  <button
                    type="button"
                    onClick={async () => {
                      const fd = new FormData();
                      fd.append("note", "");
                      await updateEventNote(editingNoteEvent.id, fd);
                      setEditingNoteEvent(null);
                    }}
                    className="text-xs font-semibold text-destructive hover:underline"
                  >
                    Clear note
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingNoteEvent(null)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="default">
                    Save Note
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Horse Profile Inspector Modal */}
      {viewingHorse && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
            onClick={() => setViewingHorse(null)}
          />
          <div className="relative z-50 max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-card border border-onstride-green/15 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)] max-h-[90vh] overflow-y-auto">
              {/* Left Column: High-Res Photo */}
              <div className="relative h-60 sm:h-auto sm:min-h-full w-full shrink-0 overflow-hidden bg-muted">
                <HorsePhoto
                  name={viewingHorse.name}
                  photoUrl={viewingHorse.photoUrl}
                  className="h-full w-full object-cover"
                  sizesClass="text-4xl"
                />
              </div>

              {/* Right Column: Profile & Live Turnout Details */}
              <div className="flex min-w-0 flex-1 flex-col p-6 sm:p-7">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-display text-2xl font-bold text-onstride-green/90 leading-tight">
                      {viewingHorse.name}
                    </h3>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <span className="rounded-full border border-onstride-green/15 bg-onstride-green/8 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/75">
                        {viewingHorse.lifecycle === "rotation"
                          ? "Active Rotation"
                          : (viewingHorse.lifecycle ?? "Active")}
                      </span>
                      {viewingHorse.breed && (
                        <span className="rounded-full border border-onstride-green/12 px-2 py-0.5 text-[0.65rem] font-medium text-onstride-green/65">
                          {viewingHorse.breed}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => setViewingHorse(null)}
                    className="flex size-8 shrink-0 items-center justify-center rounded-lg text-onstride-green/45 hover:bg-muted hover:text-onstride-green transition-colors"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-onstride-green/45">
                      Age
                    </dt>
                    <dd className="font-medium text-onstride-green/85">
                      {viewingHorse.ageYears != null ? `${viewingHorse.ageYears} years` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-onstride-green/45">
                      Gender
                    </dt>
                    <dd className="capitalize font-medium text-onstride-green/85">
                      {viewingHorse.gender
                        ? GENDER_LABELS[viewingHorse.gender as keyof typeof GENDER_LABELS] ??
                          viewingHorse.gender
                        : "—"}
                    </dd>
                  </div>
                  <div className="col-span-2">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-onstride-green/45">
                      Turnout Groups
                    </dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {!viewingHorse.groups || viewingHorse.groups.length === 0 ? (
                        <span className="text-xs text-onstride-green/45 italic">
                          No groups assigned
                        </span>
                      ) : (
                        viewingHorse.groups.map((g) => (
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

                {/* Horse Permanent Notes */}
                {viewingHorse.notes && (
                  <div className="mt-4">
                    <dt className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-onstride-green/45 mb-1">
                      Medical & Behavioral Notes
                    </dt>
                    <p className="border-l-2 border-onstride-gold/60 pl-3 text-xs italic leading-relaxed text-onstride-green/75">
                      “{viewingHorse.notes}”
                    </p>
                  </div>
                )}

                {/* Today's Turnout Live Status Banner */}
                <div className="mt-5 rounded-xl border border-onstride-green/12 bg-background p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-onstride-green/50">
                        Today&apos;s Status:
                      </span>
                      <span className="text-xs font-bold text-onstride-green/90">
                        {viewingHorse.event ? (
                          viewingHorse.event.status === "out" ? "☀️ Out on pasture" :
                          viewingHorse.event.status === "in" ? "✅ Back in the barn" :
                          viewingHorse.event.status === "skipped" ? "🏠 Staying in" : "⏳ Waiting to go out"
                        ) : "Off Board (Day off)"}
                      </span>
                    </div>
                    {viewingHorse.event && (
                      <span className="text-xs font-semibold text-onstride-gold-deep">
                        {viewingHorse.event.spaceName} ({viewingHorse.event.shift})
                      </span>
                    )}
                  </div>

                  {/* Today's Event Handler Note */}
                  {viewingHorse.event?.note && (
                    <div className="mt-2.5 flex items-start gap-1.5 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-950 font-medium">
                      <NotebookPen className="size-3.5 text-amber-700 shrink-0 mt-0.5" />
                      <span>Turnout note: {viewingHorse.event.note}</span>
                    </div>
                  )}
                </div>

                {/* Modal Footer Actions */}
                <div className="mt-6 flex items-center justify-between gap-3 pt-4 border-t border-onstride-green/10">
                  <Link
                    href={`/horses/${viewingHorse.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-onstride-green/70 hover:text-onstride-green"
                  >
                    <Pencil className="size-3.5" /> Edit horse profile
                  </Link>

                  {viewingHorse.event && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        const ev = viewingHorse.event!;
                        setViewingHorse(null);
                        setEditingNoteEvent(ev);
                      }}
                      className="gap-1.5"
                    >
                      <NotebookPen className="size-3.5" /> Edit turnout note
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  function columnProps(
    meta: { label: string; dot: string },
    count: number
  ) {
    return { title: meta.label, dot: meta.dot, count };
  }
}

function SpaceStatRow({
  stat,
}: {
  stat: {
    id: string;
    name: string;
    type?: string;
    chip?: string;
    count: number;
    capacity: number | null;
    conflict?: boolean;
  };
}) {
  const conflict = Boolean(stat.conflict);
  const chip = stat.type ?? stat.chip ?? "";
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-onstride-green/8 bg-background px-3 py-2">
      <p className="min-w-0 truncate text-xs font-semibold text-onstride-green/80">
        {stat.name}
        <span className="ml-1.5 rounded border border-onstride-green/12 px-1 py-px text-[0.58rem] font-medium normal-case text-onstride-green/50">
          {chip}
        </span>
      </p>
      {conflict && (
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-destructive">
          <ShieldAlert className="size-2.5" /> Conflict
        </span>
      )}
      <CapacityMini count={stat.count} capacity={stat.capacity} />
    </div>
  );
}

function CapacityMini({
  count,
  capacity,
}: {
  count: number;
  capacity: number | null;
}) {
  const over = capacity != null && count > capacity;
  return (
    <span className="shrink-0 text-[0.65rem] font-bold tabular-nums text-onstride-green/50">
      <span className={cn(over && "text-destructive")}>{count}</span>/
      {capacity ?? "—"}
    </span>
  );
}

