import { generateFromSchedule } from "./actions";
import { RefreshCw } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { todayDateOnly, SHIFTS } from "@/lib/schedule";
import { buildConflictLookup } from "@/lib/compatibility";
import { PageHeader } from "@/components/page-header";
import { formatTime } from "@/lib/format";
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        backHref={!isToday ? "/board" : undefined}
        kicker={`Operations · ${boardDate.toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          timeZone: "UTC",
        })}`}
        title={isToday ? "Today's Board" : isPast ? "Past Board" : "Upcoming Board"}
        description={
          isToday
            ? "Every horse at a glance — run the day straight from the board."
            : "You're viewing a different day than today. Today's board is one click away."
        }
        actions={
          <div className="flex items-center gap-2">
            <form action={generateFromSchedule}>
              <input type="hidden" name="date" value={boardDate.toISOString().slice(0, 10)} />
              <button
                type="submit"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium transition-colors hover:bg-muted hover:text-foreground"
              >
                <RefreshCw className="size-3.5 text-onstride-gold-deep" />
                Generate from schedule
              </button>
            </form>
          </div>
        }
      />

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
    </div>
  );
}
