import { prisma } from "@/lib/prisma";
import { todayDateOnly } from "@/lib/schedule";
import { PageHeader } from "@/components/page-header";
import { MapView } from "./map-view";
import type { MapEvent, MapSpace } from "./types";
import { formatTime } from "@/lib/format";

export const metadata = {
  title: "Barn Map · The Turnout Planner",
};

export default async function MapPage() {
  const today = todayDateOnly();

  const [spaces, events, allHorses, compatRules] = await Promise.all([
    prisma.space.findMany({ orderBy: { name: "asc" } }),
    prisma.turnoutEvent.findMany({
      where: { date: today },
      include: { horse: true, space: true },
      orderBy: [{ horse: { name: "asc" } }],
    }),
    prisma.horse.findMany({ where: { lifecycle: "rotation" }, orderBy: { name: "asc" } }),
    prisma.compatibilityRule.findMany(),
  ]);

  const mapSpaces: MapSpace[] = spaces.map((space) => ({
    id: space.id,
    name: space.name,
    type: space.type,
    capacity: space.capacity,
    notes: space.notes,
  }));

  const existingHorseIds = new Set(events.map((e) => e.horseId));

  const mapEvents: MapEvent[] = events.map((event) => ({
    id: event.id,
    horseId: event.horseId,
    horseName: event.horse.name,
    spaceId: event.spaceId,
    shift: event.shift,
    status: event.status,
    note: event.note,
    outLabel: formatTime(event.actualOutTime),
    inLabel: formatTime(event.actualInTime),
    spaceName: event.space.name,
  }));

  // Include any active horses that are unscheduled today so they appear
  // resting at the barn (virtual rows — the drawer offers a safe upsert
  // "turn out now" flow instead of mutating a nonexistent event).
  for (const horse of allHorses) {
    if (!existingHorseIds.has(horse.id)) {
      const restNote = horse.notes ? `${horse.notes} · resting in the barn` : "Resting in the barn — not scheduled today";
      mapEvents.push({
        id: `virtual-${horse.id}`,
        horseId: horse.id,
        horseName: horse.name,
        spaceId: spaces[0]?.id ?? "stall",
        shift: "AM",
        status: "in",
        note: restNote,
        outLabel: null,
        inLabel: null,
        spaceName: "Barn Stall Row",
      });
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Operations · Interactive Facility & GIS Map"
        title="The Barn at a Glance"
        description=""
      />
      <MapView
        spaces={mapSpaces}
        events={mapEvents}
        compatRules={compatRules.map((rule) => ({
          horseAId: rule.horseAId,
          horseBId: rule.horseBId,
          reason: rule.reason,
        }))}
      />
    </div>
  );
}
