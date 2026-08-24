import { generateFromSchedule } from "./actions";
import { RefreshCw, Sun, ClipboardList, Fence, Users, ScrollText, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, SHIFTS } from "@/lib/schedule";
import { buildConflictLookup } from "@/lib/compatibility";
import { formatTime } from "@/lib/format";
import { HorsePhoto } from "@/components/horse-photo";
import { BoardClient, type BoardEventDto } from "./board-client";

export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const today = todayDateOnly();
  // Calendar links arrive as ?date=YYYY-MM-DD — anything invalid or
  // missing means "today", so the plain /board URL keeps its meaning.
  const boardDate =
    params.date && /^\d{4}-\d{2}-\d{2}$/.test(params.date)
      ? new Date(`${params.date}T00:00:00Z`)
      : today;
  if (Number.isNaN(boardDate.getTime())) throw new Error("Invalid date");
  const isToday = boardDate.getTime() === today.getTime();
  const isPast = boardDate.getTime() < today.getTime();

  const [events, horses, spaces, compatRules] = await Promise.all([
    prisma.turnoutEvent.findMany({
      where: { date: boardDate },
      include: {
        horse: {
          include: {
            groups: {
              include: { group: true },
            },
          },
        },
        space: true,
      },
      orderBy: [{ shift: "asc" }, { horse: { name: "asc" } }],
    }),
    prisma.horse.findMany({
      where: { lifecycle: "rotation" },
      include: {
        groups: {
          include: { group: true },
        },
      },
      orderBy: { name: "asc" },
    }),
    prisma.space.findMany({ orderBy: { name: "asc" } }),
    prisma.compatibilityRule.findMany(),
  ]);

  // Fetch setup counts for quick links
  const [horseCount, spaceCount, groupCount, ruleCount, compatCount] = await Promise.all([
    prisma.horse.count({ where: { lifecycle: "rotation" } }),
    prisma.space.count(),
    prisma.group.count(),
    prisma.scheduleRule.count(),
    prisma.compatibilityRule.count(),
  ]);

  const conflictLookup = buildConflictLookup(compatRules);

  /** horseId → reason, for horses sharing a paddock with an enemy. */
  const conflictByHorse = new Map<string, string>();
  const bySpaceShift = new Map<string, typeof events>();
  for (const event of events) {
    if (event.status !== "out") continue;
    const key = `${event.shift}::${event.spaceId}`;
    const list = bySpaceShift.get(key) ?? [];
    list.push(event);
    bySpaceShift.set(key, list);
  }
  for (const group of bySpaceShift.values()) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const reason = conflictLookup.get(
          [group[i].horseId, group[j].horseId].sort().join("::")
        );
        if (reason !== undefined) {
          const label = reason ?? "compatibility rule";
          conflictByHorse.set(group[i].horseId, label);
          conflictByHorse.set(group[j].horseId, label);
        }
      }
    }
  }

  const dtoEvents: BoardEventDto[] = events.map((event) => ({
    id: event.id,
    horseId: event.horseId,
    horseName: event.horse.name,
    photoUrl: event.horse.photoUrl,
    breed: event.horse.breed,
    gender: event.horse.gender,
    ageYears: event.horse.ageYears,
    horseNotes: event.horse.notes,
    lifecycle: event.horse.lifecycle,
    groups: event.horse.groups.map((g) => g.group.name),
    shift: event.shift,
    status: event.status,
    note: event.note,
    spaceId: event.spaceId,
    spaceName: event.space.name,
    outLabel: formatTime(event.actualOutTime),
    inLabel: formatTime(event.actualInTime),
    conflictReason: conflictByHorse.get(event.horseId) ?? null,
  }));

  const offBoard = horses
    .filter((h) => !events.some((e) => e.horseId === h.id))
    .map((h) => ({
      id: h.id,
      name: h.name,
      photoUrl: h.photoUrl,
      breed: h.breed,
      gender: h.gender,
      ageYears: h.ageYears,
      notes: h.notes,
      lifecycle: h.lifecycle,
      groups: h.groups.map((g) => g.group.name),
    }));

  // Status counts for the strip
  const outNow = events.filter((e) => e.status === "out");
  const waiting = events.filter((e) => e.status === "scheduled");
  const backIn = events.filter((e) => e.status === "in");
  const skipped = events.filter((e) => e.status === "skipped");
  let conflictCount = 0;
  for (const group of bySpaceShift.values()) {
    const horseIds = group.map((e) => e.horseId);
    for (let i = 0; i < horseIds.length; i++) {
      for (let j = i + 1; j < horseIds.length; j++) {
        const reason = conflictLookup.get(
          [horseIds[i], horseIds[j]].sort().join("::")
        );
        if (reason !== undefined) conflictCount++;
      }
    }
  }

  /**
   * Recent activity, derived straight from the day's timestamps —
   * completed actions first (newest first), then what's still pending.
   */
  type ActivityItem = {
    key: string;
    name: string;
    photoUrl: string | null;
    spaceName: string | null;
    action: string;
    detail: string;
    timeLabel: string | null;
    tone: "success" | "info" | "alert" | "muted";
  };
  const activity: ActivityItem[] = [];
  for (const event of events) {
    const base = {
      id: event.id,
      name: event.horse.name,
      photoUrl: event.horse.photoUrl,
      spaceName: event.space.name,
    };
    if (event.actualInTime) {
      activity.push({
        ...base,
        key: `in-${event.id}`,
        action: "Brought In",
        detail: `Returned from ${event.space.name}`,
        timeLabel: formatTime(event.actualInTime),
        tone: "success",
      });
    } else if (event.actualOutTime) {
      activity.push({
        ...base,
        key: `out-${event.id}`,
        action: "Turned Out",
        detail: `Out in ${event.space.name}`,
        timeLabel: formatTime(event.actualOutTime),
        tone: "info",
      });
    }
    if (conflictByHorse.has(event.horseId)) {
      activity.push({
        ...base,
        key: `cf-${event.id}`,
        action: "Conflict Alert",
        detail: conflictByHorse.get(event.horseId) ?? `Incompatible in ${event.space.name}`,
        timeLabel: formatTime(event.actualOutTime),
        tone: "alert",
      });
    }
    if (event.status === "scheduled") {
      activity.push({
        ...base,
        key: `due-${event.id}`,
        action: `Scheduled ${event.shift}`,
        detail: `Assigned to ${event.space.name}`,
        timeLabel: null,
        tone: "muted",
      });
    }
  }
  activity.sort((a, b) => {
    if (a.timeLabel && b.timeLabel) return b.timeLabel.localeCompare(a.timeLabel);
    if (a.timeLabel) return -1;
    if (b.timeLabel) return 1;
    return a.name.localeCompare(b.name);
  });

  /** Per-shift, per-space occupancy for the Shifts & Groups panel. */
  const shiftMatrix = SHIFTS.map((shift) => ({
    shift,
    spaces: spaces
      .map((space) => {
        const residents = events.filter(
          (e) => e.shift === shift && e.spaceId === space.id
        );
        const hasConflict = residents.some((e) =>
          conflictByHorse.has(e.horseId)
        );
        return {
          id: space.id,
          name: space.name,
          type: space.type,
          count: residents.length,
          capacity: space.capacity,
          conflict: hasConflict,
        };
      })
      .filter((s) => s.count > 0),
  })).filter((s) => s.spaces.length > 0);

  /**
   * Special groups for the third column: "Solo horses" (paddocks with 1
   * horse), "Horses on rest" (skipped turnout).
   */
  const soloHorses = events.filter((event) => {
    const cohort = events.filter(
      (e) => e.shift === event.shift && e.spaceId === event.spaceId
    );
    return cohort.length === 1 && event.status !== "skipped";
  });
  const skippedCount = events.filter((e) => e.status === "skipped").length;

  type SpecialGroup = {
    id: string;
    name: string;
    chip: string;
    count: number;
    capacity: number;
  };
  const specialGroups: SpecialGroup[] = [
    ...(soloHorses.length > 0
      ? [
          {
            id: "solo",
            name: "Solo turnouts",
            chip: "paddock",
            count: soloHorses.length,
            capacity: horses.length,
          },
        ]
      : []),
    ...(skippedCount > 0
      ? [
          {
            id: "on-rest",
            name: "Horses on rest",
            chip: "group",
            count: skippedCount,
            capacity: horses.length,
          },
        ]
      : []),
  ];


  const stats = [
    { label: "Out Now", value: outNow.length, accent: "text-status-out-strong", bg: "bg-status-out/10" },
    { label: "Scheduled", value: waiting.length, accent: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "Back In", value: backIn.length, accent: "text-status-in", bg: "bg-emerald-500/10" },
    { label: "Skipped", value: skipped.length, accent: "text-status-skipped", bg: "bg-gray-500/10" },
    { label: "Conflicts", value: conflictCount, accent: "text-destructive", bg: "bg-red-500/10" },
  ];

  const setupLinks = [
    { href: "/barn?tab=horses", icon: ClipboardList, label: "Horses", count: horseCount },
    { href: "/barn?tab=spaces", icon: Fence, label: "Spaces", count: spaceCount },
    { href: "/barn?tab=groups", icon: Users, label: "Groups", count: groupCount },
    { href: "/barn?tab=rules", icon: ScrollText, label: "Rules", count: ruleCount },
    { href: "/barn?tab=compatibility", icon: ShieldAlert, label: "Compat", count: compatCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-onstride-green/50">
            {boardDate.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: "UTC",
            })}
          </p>
          <h1 className="font-display text-2xl font-bold text-onstride-green/90 sm:text-3xl">
            {isToday ? "Today's Board" : isPast ? "Past Board" : "Upcoming Board"}
          </h1>
          <p className="mt-1 text-sm text-onstride-green/55">
            {isToday
              ? "Everything you need for today's turnout operations."
              : "Viewing a different day. Today's board is one click away."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!isToday && (
            <Link
              href="/board"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              Back to Today
            </Link>
          )}
          <form action={generateFromSchedule}>
            <input type="hidden" name="date" value={boardDate.toISOString().slice(0, 10)} />
            <button
              type="submit"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted"
            >
              <RefreshCw className="size-3.5 text-onstride-gold-deep" />
              Generate from Schedule
            </button>
          </form>
        </div>
      </div>

      {/* Status Strip */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`panel px-4 py-4 ${stat.bg}`}
          >
            <p className={`font-display text-3xl font-semibold ${stat.accent}`}>
              {stat.value}
            </p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-onstride-green/55">
              {stat.label}
            </p>
          </div>
        ))}
      </section>

      {/* Active Turnout Strip */}
      {outNow.length > 0 && (
        <section className="panel border border-status-out/20 bg-status-out/5 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="size-4 text-amber-600" />
              <h2 className="font-display text-sm font-bold text-onstride-green/90">
                Out Right Now
              </h2>
              <span className="rounded-full bg-status-out/20 px-2 py-0.5 text-xs font-bold text-amber-800">
                {outNow.length}
              </span>
            </div>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {outNow.map((event) => (
              <div
                key={event.id}
                className="flex shrink-0 items-center gap-3 rounded-xl border border-onstride-green/10 bg-card px-3 py-2"
              >
                <HorsePhoto
                  name={event.horse.name}
                  photoUrl={event.horse.photoUrl}
                  className="size-10 rounded-lg object-cover"
                  sizesClass="text-sm"
                />
                <div>
                  <p className="text-sm font-semibold text-onstride-green/90">{event.horse.name}</p>
                  <p className="text-xs text-onstride-green/60">{event.space.name}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Board Client */}
      <BoardClient
        dateISO={boardDate.toISOString().slice(0, 10)}
        events={dtoEvents}
        offBoard={offBoard}
        allHorses={horses.map((h) => ({
          id: h.id,
          name: h.name,
          photoUrl: h.photoUrl,
          breed: h.breed,
          gender: h.gender,
        }))}
        spaceOptions={spaces.map((s) => ({ id: s.id, name: s.name }))}
        activity={activity}
        shiftMatrix={shiftMatrix}
        specialGroups={specialGroups}
      />

      {/* Barn Setup Quick Links */}
      <section className="panel p-4">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-onstride-green/50">
          Barn Setup
        </h2>
        <div className="flex flex-wrap gap-2">
          {setupLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-2 rounded-lg border border-onstride-green/10 bg-background px-3 py-2 text-sm font-medium text-onstride-green/70 transition-colors hover:border-onstride-gold/40 hover:text-onstride-green"
              >
                <Icon className="size-4 text-onstride-gold/70" />
                {link.label}
                <span className="rounded-full bg-onstride-green/8 px-1.5 py-0.5 text-xs font-bold text-onstride-green/50">
                  {link.count}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
