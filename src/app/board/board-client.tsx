"use client";

import { useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  Ban,
  Search,
  CheckCircle2,
  Clock,
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
  ChevronDown,
  ChevronUp,
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

/* ------------------------------------------------------------------ */
/* Shared bits                                                         */
/* ------------------------------------------------------------------ */

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
    "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted transition-colors";
  return (
    <>
      <MenuItemButton onClick={onViewProfile}>
        <UserRound className="size-4 opacity-60" /> View Profile
      </MenuItemButton>

      {event.status === "scheduled" && (
        <>
          <form action={markOut.bind(null, event.id)}>
            <button type="submit" className={item}>
              <Sun className="size-4 opacity-60 text-amber-600" /> Turn out now
            </button>
          </form>
          <form action={markSkipped.bind(null, event.id)}>
            <button type="submit" className={item}>
              <Ban className="size-4 opacity-60 text-destructive" /> Skip today
            </button>
          </form>
        </>
      )}
      {event.status === "out" && (
        <form action={markIn.bind(null, event.id)}>
          <button type="submit" className={item}>
            <CheckCircle2 className="size-4 opacity-60 text-status-in" /> Bring in
          </button>
        </form>
      )}
      {(event.status === "in" || event.status === "skipped") && (
        <form action={resetEvent.bind(null, event.id)}>
          <button type="submit" className={item}>
            <Clock className="size-4 opacity-60" /> Undo status
          </button>
        </form>
      )}

      {spaces.length > 0 && (
        <form action={updateEventSpace.bind(null, event.id)} className="px-3 py-2">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-onstride-green/45">
            Move to
          </p>
          <select
            name="spaceId"
            defaultValue={event.spaceId}
            onChange={(e) => e.currentTarget.form?.requestSubmit()}
            aria-label="Move to another paddock"
            className="h-9 w-full cursor-pointer rounded-lg border border-input bg-card px-2 text-sm font-medium text-onstride-green/80 focus-visible:outline-none"
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
        <NotebookPen className="size-4 opacity-60 text-amber-700" />
        {event.note ? "Edit note" : "Add note"}
      </MenuItemButton>

      <form action={removeEvent.bind(null, event.id)} className="border-t border-onstride-green/8">
        <ConfirmSubmit
          message={`Remove ${event.horseName}'s ${event.shift} turnout from the board?`}
          variant="ghost"
          size="sm"
          className="w-full justify-start rounded-none px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 data-icon="inline-start" /> Remove
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
      className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-medium hover:bg-muted"
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Board Item — Simplified card with one-tap actions                   */
/* ------------------------------------------------------------------ */

function BoardItem({
  event,
  spaces,
  column,
  onOpenProfile,
  onOpenNoteEditor,
}: {
  event: BoardEventDto;
  spaces: SpaceOption[];
  column: "out" | "scheduled" | "done";
  onOpenProfile?: (horseId: string) => void;
  onOpenNoteEditor?: (event: BoardEventDto) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const metaLine =
    column === "out"
      ? `Since ${event.outLabel ?? "—"}`
      : column === "done"
        ? event.status === "in"
          ? `Back in ${event.inLabel ?? ""}`.trim()
          : "Skipped today"
        : `${event.shift} · ${event.spaceName}`;

  const isConflict = !!event.conflictReason;

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
        className="relative z-40 size-8 text-onstride-green/40 hover:text-onstride-green"
      >
        <MoreVertical className="size-4" />
      </Button>
      {menuOpen && (
        <div className="absolute right-0 top-10 z-50 w-52 overflow-hidden rounded-xl border border-onstride-green/10 bg-popover py-1 shadow-2xl">
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

  return (
    <article
      className={cn(
        "rounded-2xl border transition-all duration-150 hover:shadow-[var(--shadow-panel)]",
        isConflict
          ? "border-destructive/25 bg-destructive/[0.04]"
          : column === "out"
            ? "border-status-out/20 bg-card"
            : "border-onstride-green/12 bg-card"
      )}
    >
      <div className="flex items-stretch">
        {/* Photo */}
        <div
          onClick={() => onOpenProfile?.(event.horseId)}
          className="w-20 shrink-0 cursor-pointer overflow-hidden rounded-l-2xl bg-muted group/photo"
          title={`View ${event.horseName}'s profile`}
        >
          <HorsePhoto
            name={event.horseName}
            photoUrl={event.photoUrl}
            className="h-full w-full object-cover group-hover/photo:scale-105 transition-transform duration-200"
            sizesClass="text-lg"
          />
        </div>

        {/* Content */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
          <div>
            <div className="flex items-start justify-between gap-1">
              <button
                type="button"
                onClick={() => onOpenProfile?.(event.horseId)}
                className="truncate font-display text-base font-bold text-onstride-green/90 hover:text-onstride-gold-deep text-left transition-colors leading-tight cursor-pointer"
                title={`View ${event.horseName}'s profile`}
              >
                {event.horseName}
              </button>
              <div className="flex items-center gap-1 shrink-0 -mr-1 -mt-1">
                {isConflict && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-destructive/30 bg-destructive/10 px-1.5 py-0.5 text-[0.6rem] font-bold text-destructive">
                    <ShieldAlert className="size-2.5" />
                  </span>
                )}
                {event.note && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenNoteEditor?.(event);
                    }}
                    className="inline-flex items-center gap-1 rounded-full border border-amber-500/35 bg-amber-500/15 px-1.5 py-0.5 text-[0.6rem] font-bold text-amber-900 hover:bg-amber-500/25 transition-all cursor-pointer"
                    title={`Handler note: "${event.note}" (Click to edit)`}
                  >
                    <NotebookPen className="size-2.5 text-amber-700" />
                  </button>
                )}
                {kebab}
              </div>
            </div>
            <p className="truncate text-sm font-medium text-onstride-green/65 mt-0.5">
              {metaLine}
            </p>
          </div>

          {/* One-tap action buttons */}
          <div className="mt-2.5 flex items-center gap-2">
            {column === "scheduled" && (
              <>
                <form action={markOut.bind(null, event.id)} className="flex-1">
                  <button
                    type="submit"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-status-out-strong px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-amber-600 active:scale-[0.98]"
                  >
                    <Sun className="size-4" />
                    Turn Out
                  </button>
                </form>
                <form action={markSkipped.bind(null, event.id)}>
                  <button
                    type="submit"
                    className="flex items-center justify-center rounded-xl border border-onstride-green/15 bg-background px-3 py-2.5 text-sm font-semibold text-onstride-green/70 transition-colors hover:bg-muted active:scale-[0.98]"
                  >
                    Skip
                  </button>
                </form>
              </>
            )}
            {column === "out" && (
              <form action={markIn.bind(null, event.id)} className="flex-1">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-status-in px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-emerald-600 active:scale-[0.98]"
                >
                  <CheckCircle2 className="size-4" />
                  Bring In
                </button>
              </form>
            )}
            {column === "done" && (
              <form action={resetEvent.bind(null, event.id)} className="flex-1">
                <button
                  type="submit"
                  className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-onstride-green/15 bg-background px-3 py-2.5 text-sm font-semibold text-onstride-green/60 transition-colors hover:bg-muted active:scale-[0.98]"
                >
                  <Clock className="size-3.5" />
                  Undo
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Column shell                                                        */
/* ------------------------------------------------------------------ */

function KanbanColumn({
  title,
  icon: Icon,
  iconColor,
  count,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
  iconColor: string;
  count: number;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-onstride-green/10 bg-[#faf7f1]",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 p-4 text-left transition-colors hover:bg-white/50"
      >
        <span className={cn("flex size-8 items-center justify-center rounded-lg", iconColor)}>
          <Icon className="size-4" />
        </span>
        <h3 className="font-display text-sm font-bold text-onstride-green/90">{title}</h3>
        <span className="ml-auto rounded-full bg-onstride-green/8 px-2 py-0.5 text-xs font-bold tabular-nums text-onstride-green/60">
          {count}
        </span>
        {isOpen ? (
          <ChevronUp className="size-4 text-onstride-green/40" />
        ) : (
          <ChevronDown className="size-4 text-onstride-green/40" />
        )}
      </button>
      {isOpen && <div className="flex flex-col gap-2 px-3 pb-3">{children}</div>}
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
  shiftMatrix: _shiftMatrix, // eslint-disable-line @typescript-eslint/no-unused-vars
  specialGroups: _specialGroups, // eslint-disable-line @typescript-eslint/no-unused-vars
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

  const outEvents = filtered.filter((e) => e.status === "out");
  const scheduledEvents = filtered.filter((e) => e.status === "scheduled");
  const doneEvents = filtered.filter((e) => e.status === "in" || e.status === "skipped");
  const conflicts = filtered.filter((e) => e.conflictReason);
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
            className="h-10 bg-card pl-9 text-sm"
          />
        </div>

        <Button
          onClick={() => openAddModal()}
          size="default"
          className="h-10 gap-1.5 rounded-xl font-semibold"
        >
          <Plus className="size-4" /> Add Turnout
        </Button>
      </div>

      {/* Conflict Banner */}
      {conflicts.length > 0 && (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/[0.06] p-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-destructive/15">
              <ShieldAlert className="size-5 text-destructive" />
            </div>
            <div>
              <h3 className="font-display text-sm font-bold text-destructive">
                {conflicts.length} Conflict{conflicts.length > 1 ? "s" : ""} Detected
              </h3>
              <p className="text-xs text-destructive/70">
                Horses with compatibility issues are sharing a paddock. Resolve by moving one to a different space.
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {conflicts.map((event) => (
              <div
                key={event.id}
                className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-background px-3 py-2"
              >
                <HorseAvatar
                  name={event.horseName}
                  photoUrl={event.photoUrl}
                  size="sm"
                />
                <span className="text-sm font-semibold text-onstride-green/80">{event.horseName}</span>
                <span className="text-xs text-destructive/70">in {event.spaceName}</span>
                <form action={updateEventSpace.bind(null, event.id)}>
                  <select
                    name="spaceId"
                    defaultValue={event.spaceId}
                    onChange={(e) => e.currentTarget.form?.requestSubmit()}
                    className="h-7 cursor-pointer rounded-md border border-input bg-card px-1.5 text-xs font-medium text-onstride-green/80 focus-visible:outline-none"
                  >
                    {spaceOptions.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </form>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 && offBoardFiltered.length === 0 ? (
        <div className="panel flex flex-col items-center gap-2 border-dashed px-6 py-14 text-center">
          <Sun className="size-8 text-onstride-gold" />
          <p className="font-display text-xl font-semibold">No horses match</p>
          <p className="max-w-sm text-sm text-onstride-green/55">
            Nothing on the board for {dateISO}. Adjust your search or generate
            from the schedule above.
          </p>
        </div>
      ) : (
        /* 3-Column Kanban */
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* Out Now Column */}
          <KanbanColumn
            title="Out Now"
            icon={Sun}
            iconColor="bg-amber-100 text-amber-700"
            count={outEvents.length}
          >
            {outEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-onstride-green/15 py-6 text-center text-sm text-onstride-green/45">
                No horses out right now.
              </p>
            ) : (
              outEvents.map((event) => (
                <BoardItem
                  key={event.id}
                  event={event}
                  spaces={spaceOptions}
                  column="out"
                  onOpenProfile={openProfile}
                  onOpenNoteEditor={openNoteEditor}
                />
              ))
            )}
          </KanbanColumn>

          {/* Scheduled Column */}
          <KanbanColumn
            title="Scheduled"
            icon={Clock}
            iconColor="bg-amber-50 text-amber-600"
            count={scheduledEvents.length}
          >
            {scheduledEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-onstride-green/15 py-6 text-center text-sm text-onstride-green/45">
                Nothing scheduled.
              </p>
            ) : (
              scheduledEvents.map((event) => (
                <BoardItem
                  key={event.id}
                  event={event}
                  spaces={spaceOptions}
                  column="scheduled"
                  onOpenProfile={openProfile}
                  onOpenNoteEditor={openNoteEditor}
                />
              ))
            )}
          </KanbanColumn>

          {/* Done Column (collapsed by default) */}
          <KanbanColumn
            title="Done"
            icon={CheckCircle2}
            iconColor="bg-emerald-50 text-emerald-600"
            count={doneEvents.length}
            defaultOpen={false}
          >
            {doneEvents.length === 0 ? (
              <p className="rounded-xl border border-dashed border-onstride-green/15 py-6 text-center text-sm text-onstride-green/45">
                No completed turnouts yet.
              </p>
            ) : (
              doneEvents.map((event) => (
                <BoardItem
                  key={event.id}
                  event={event}
                  spaces={spaceOptions}
                  column="done"
                  onOpenProfile={openProfile}
                  onOpenNoteEditor={openNoteEditor}
                />
              ))
            )}
          </KanbanColumn>
        </div>
      )}

      {/* Not on Board */}
      {offBoardFiltered.length > 0 && (
        <section className="panel p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-onstride-green/50">
            Not on Board Today ({offBoardFiltered.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {offBoardFiltered.map((horse) => (
              <button
                key={horse.id}
                type="button"
                onClick={() => openAddModal(horse.id)}
                className="flex items-center gap-2 rounded-xl border border-dashed border-onstride-green/15 bg-background px-3 py-2 text-sm font-medium text-onstride-green/60 transition-colors hover:border-onstride-gold/40 hover:text-onstride-green hover:bg-muted"
              >
                <HorseAvatar name={horse.name} photoUrl={horse.photoUrl} size="sm" />
                {horse.name}
                <Plus className="size-3.5 text-onstride-gold" />
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      {activity.length > 0 && (
        <section className="rounded-2xl border border-onstride-green/10 bg-[#faf7f1] p-5">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="font-display text-base font-bold text-onstride-green/90 leading-tight">
                Recent Activity
              </h2>
              <p className="text-xs text-onstride-green/50">
                Timestamped log of turnouts and status changes
              </p>
            </div>
            {activity.length > 6 && (
              <button
                type="button"
                onClick={() => setShowAllActivity((v) => !v)}
                className="text-xs font-semibold text-onstride-gold-deep hover:underline"
              >
                {showAllActivity ? "Show less" : `View all ${activity.length}`}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
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
                        <span className="text-xs font-bold tabular-nums text-onstride-green/60 shrink-0">
                          {item.timeLabel}
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold text-onstride-green/40 uppercase shrink-0">
                          Pending
                        </span>
                      )}
                    </div>

                    <div className="mt-1 flex items-center gap-1.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
                          ACTIVITY_TONE[item.tone]
                        )}
                      >
                        <Icon className="size-3 shrink-0" />
                        {item.action}
                      </span>
                    </div>

                    {item.detail && (
                      <p className="mt-1 text-xs text-onstride-green/50 truncate">
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
                <div className="flex size-10 items-center justify-center rounded-xl bg-onstride-gold/15 text-onstride-gold-deep">
                  <Plus className="size-5" />
                </div>
                <div>
                  <h3 className="font-display text-lg font-bold text-onstride-green/90 leading-tight">
                    Add Turnout
                  </h3>
                  <p className="text-xs text-onstride-green/50">
                    Schedule a horse for {dateISO}
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
                <label className="text-xs font-bold uppercase tracking-wider text-onstride-green/55">
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
                <label className="text-xs font-bold uppercase tracking-wider text-onstride-green/55">
                  Turnout Space
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

              {/* Shift */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold uppercase tracking-wider text-onstride-green/55">
                  Shift
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {(["AM", "PM"] as const).map((shift) => (
                    <label
                      key={shift}
                      className={cn(
                        "flex cursor-pointer items-center justify-center gap-2 rounded-xl border p-3 text-sm font-bold transition-all",
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
                          <Sun className="size-4 text-amber-600" /> Morning
                        </>
                      ) : (
                        <>
                          <Moon className="size-4 text-onstride-moss" /> Afternoon
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
                  size="default"
                  onClick={() => setAddModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="default" className="gap-1.5">
                  <Plus className="size-4" /> Add to Board
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Note Modal */}
      {editingNoteEvent && (
        <NoteEditorModal
          event={editingNoteEvent}
          onClose={() => setEditingNoteEvent(null)}
        />
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
                      <span className="rounded-full border border-onstride-green/15 bg-onstride-green/8 px-2 py-0.5 text-xs font-bold uppercase tracking-wider text-onstride-green/75">
                        {viewingHorse.lifecycle === "rotation"
                          ? "Active Rotation"
                          : (viewingHorse.lifecycle ?? "Active")}
                      </span>
                      {viewingHorse.breed && (
                        <span className="rounded-full border border-onstride-green/12 px-2 py-0.5 text-xs font-medium text-onstride-green/65">
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
                    <dt className="text-xs font-bold uppercase tracking-wider text-onstride-green/45">
                      Age
                    </dt>
                    <dd className="font-medium text-onstride-green/85">
                      {viewingHorse.ageYears != null ? `${viewingHorse.ageYears} years` : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-bold uppercase tracking-wider text-onstride-green/45">
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
                    <dt className="text-xs font-bold uppercase tracking-wider text-onstride-green/45">
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
                    <dt className="text-xs font-bold uppercase tracking-wider text-onstride-green/45 mb-1">
                      Medical & Behavioral Notes
                    </dt>
                    <p className="border-l-2 border-onstride-gold/60 pl-3 text-xs italic leading-relaxed text-onstride-green/75">
                      &ldquo;{viewingHorse.notes}&rdquo;
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
                          viewingHorse.event.status === "out" ? "Out on pasture" :
                          viewingHorse.event.status === "in" ? "Back in the barn" :
                          viewingHorse.event.status === "skipped" ? "Staying in" : "Waiting to go out"
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
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-onstride-green/70 hover:text-onstride-green"
                  >
                    <Pencil className="size-3.5" /> Edit horse
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
                      <NotebookPen className="size-3.5" /> Edit note
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
}

/* ------------------------------------------------------------------ */
/* Note Editor Modal — 2-column preset grid, auto-save                 */
/* ------------------------------------------------------------------ */

const COMMON_PRESETS = [
  { label: "Too wet — keep in", icon: "💧" },
  { label: "Lameness — stall rest", icon: "🦶" },
  { label: "Colic watch — monitor", icon: "🩺" },
  { label: "Farrier today — no turnout", icon: "🔨" },
  { label: "New horse — separate paddock", icon: "🆕" },
  { label: "Hot weather — extra water", icon: "🌡️" },
  { label: "Off feed — monitor", icon: "📋" },
  { label: "Rough coat — supplement", icon: "✨" },
];

const HANDLER_PRESETS = [
  { label: "Needs fly mask", icon: "🪰" },
  { label: "Hand-walk only, 20 min", icon: "🚶" },
  { label: "Hold turnout until vet arrives", icon: "🩺" },
  { label: "Muzzle on grass", icon: "🌿" },
  { label: "First time out with this group", icon: "👥" },
  { label: "Easy keeper — monitor grass", icon: "🍽️" },
  { label: "Watch near fences", icon: "🏗️" },
  { label: "Injured — hand-walk only", icon: "⚠️" },
];

function NoteEditorModal({
  event,
  onClose,
}: {
  event: BoardEventDto;
  onClose: () => void;
}) {
  const [noteValue, setNoteValue] = useState(event.note ?? "");

  const handlePresetClick = (preset: string) => {
    const current = noteValue.trim();
    const newValue = current ? `${current} — ${preset}` : preset;
    setNoteValue(newValue);
  };

  const handleSave = async () => {
    const fd = new FormData();
    fd.append("note", noteValue);
    await updateEventNote(event.id, fd);
    onClose();
  };

  const handleClear = async () => {
    const fd = new FormData();
    fd.append("note", "");
    await updateEventNote(event.id, fd);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-50 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-onstride-green/15 bg-card p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-onstride-green/10">
          <div className="flex items-center gap-3">
            <HorseAvatar
              name={event.horseName}
              photoUrl={event.photoUrl}
              size="md"
            />
            <div>
              <h3 className="font-display text-lg font-bold text-onstride-green/90 leading-tight">
                Turnout Note
              </h3>
              <p className="text-xs text-onstride-green/55">
                {event.horseName} · {event.spaceName} ({event.shift})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-onstride-green/40 hover:bg-muted hover:text-onstride-green transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Textarea */}
        <div className="mt-4">
          <label className="text-xs font-bold uppercase tracking-wider text-onstride-green/55 mb-1.5 block">
            Handler Notes
          </label>
          <textarea
            value={noteValue}
            onChange={(e) => setNoteValue(e.target.value)}
            rows={3}
            autoFocus
            placeholder="Add notes for the handler..."
            className="w-full rounded-xl border border-input bg-background p-3 text-sm text-onstride-green/90 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-ring resize-none leading-relaxed"
          />
        </div>

        {/* Common Presets - 2-column grid */}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-onstride-green/50 mb-2">
            Common Reasons to Keep In
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {COMMON_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset.label)}
                className="flex items-center gap-2 rounded-lg border border-onstride-green/10 bg-background px-2.5 py-2.5 text-left text-sm font-medium text-onstride-green/70 transition-all hover:border-onstride-gold hover:text-onstride-green hover:bg-onstride-gold/5 active:scale-[0.98]"
              >
                <span className="text-base">{preset.icon}</span>
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Handler Advisories - 2-column grid */}
        <div className="mt-4">
          <p className="text-xs font-bold uppercase tracking-wider text-onstride-green/50 mb-2">
            Handler Advisories
          </p>
          <div className="grid grid-cols-2 gap-1.5 max-h-40 overflow-y-auto">
            {HANDLER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => handlePresetClick(preset.label)}
                className="flex items-center gap-2 rounded-lg border border-onstride-green/10 bg-background px-2.5 py-2.5 text-left text-sm font-medium text-onstride-green/70 transition-all hover:border-onstride-gold hover:text-onstride-green hover:bg-onstride-gold/5 active:scale-[0.98]"
              >
                <span className="text-base">{preset.icon}</span>
                <span className="truncate">{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-onstride-green/10">
          {event.note ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-sm font-semibold text-destructive hover:underline"
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
              size="default"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="button" size="default" onClick={handleSave}>
              Save Note
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
