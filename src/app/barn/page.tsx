import { prisma } from "@/lib/prisma";
import { BarnClient } from "./barn-client";
import type { DirectoryHorse } from "@/app/horses/horse-directory";
import type { DirectorySpace } from "@/app/spaces/space-directory";
import type { DirectoryGroup } from "@/app/groups/group-directory";
import type { DirectoryRule } from "@/app/rules/rule-directory";
import type { CompatRule, CompatHorse } from "@/app/compatibility/compatibility-manager";

export default async function BarnPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab || "horses";

  const [
    horsesData,
    spacesData,
    groupsData,
    rulesData,
    compatData,
    activeTurnouts,
  ] = await Promise.all([
    // Horses
    prisma.horse.findMany({
      orderBy: { name: "asc" },
      include: {
        groups: {
          include: {
            group: {
              select: {
                name: true,
                rules: { select: { id: true, shift: true } },
              },
            },
          },
        },
        events: {
          select: { id: true, status: true, shift: true },
        },
      },
    }),
    // Spaces
    prisma.space.findMany({
      orderBy: { name: "asc" },
    }),
    // Groups
    prisma.group.findMany({
      orderBy: { name: "asc" },
      include: {
        horses: {
          include: {
            horse: true,
          },
        },
        rules: {
          include: {
            defaultSpace: {
              select: { id: true, name: true, type: true },
            },
          },
        },
      },
    }),
    // Rules
    prisma.scheduleRule.findMany({
      orderBy: [{ shift: "asc" }, { groupId: "asc" }],
      include: {
        group: {
          include: {
            horses: {
              include: {
                horse: {
                  select: {
                    id: true,
                    name: true,
                    photoUrl: true,
                    breed: true,
                    gender: true,
                  },
                },
              },
            },
          },
        },
        defaultSpace: true,
      },
    }),
    // Compatibility
    prisma.compatibilityRule.findMany({
      include: {
        horseA: {
          select: {
            id: true,
            name: true,
            breed: true,
            gender: true,
            ageYears: true,
            photoUrl: true,
          },
        },
        horseB: {
          select: {
            id: true,
            name: true,
            breed: true,
            gender: true,
            ageYears: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    // Active turnouts (for spaces)
    prisma.turnoutEvent.findMany({
      where: { status: "out" },
      include: {
        horse: { select: { id: true, name: true } },
      },
    }),
  ]);

  // Map horses to directory format
  const horses: DirectoryHorse[] = horsesData.map((horse) => {
    const groupNames = horse.groups.map((gh) => gh.group.name);
    const scheduleRulesCount = horse.groups.reduce(
      (sum, gh) => sum + gh.group.rules.length,
      0
    );
    const eventsCount = horse.events.length;
    const activeEventsCount = horse.events.filter(
      (e) => e.status === "scheduled" || e.status === "out"
    ).length;

    return {
      id: horse.id,
      name: horse.name,
      notes: horse.notes,
      breed: horse.breed,
      gender: horse.gender,
      ageYears: horse.ageYears,
      lifecycle: horse.lifecycle,
      photoUrl: horse.photoUrl,
      groups: groupNames,
      eventsCount,
      activeEventsCount,
      scheduleRulesCount,
    };
  });

  // Map spaces to directory format
  const spaces: DirectorySpace[] = spacesData.map((space) => {
    const currentHorses = activeTurnouts
      .filter((t) => t.spaceId === space.id)
      .map((t) => ({
        id: t.horse.id,
        name: t.horse.name,
        status: t.status,
      }));

    return {
      id: space.id,
      name: space.name,
      type: space.type,
      capacity: space.capacity,
      notes: space.notes,
      currentHorses,
    };
  });

  // Map groups to directory format
  const groups: DirectoryGroup[] = groupsData.map((g) => ({
    id: g.id,
    name: g.name,
    notes: g.notes,
    horses: g.horses.map((gh) => ({
      id: gh.horse.id,
      name: gh.horse.name,
      breed: gh.horse.breed,
      gender: gh.horse.gender,
      ageYears: gh.horse.ageYears,
      photoUrl: gh.horse.photoUrl,
      lifecycle: gh.horse.lifecycle,
      notes: gh.horse.notes,
    })),
    rules: g.rules.map((r) => ({
      id: r.id,
      shift: r.shift,
      daysOfWeek: r.daysOfWeek,
      durationMin: r.durationMin,
      defaultSpace: r.defaultSpace,
    })),
  }));

  // Map rules to directory format
  const rules: DirectoryRule[] = rulesData.map((r) => ({
    id: r.id,
    shift: r.shift,
    daysOfWeek: r.daysOfWeek,
    durationMin: r.durationMin,
    groupId: r.groupId,
    groupName: r.group.name,
    horses: r.group.horses.map((gh) => gh.horse),
    defaultSpace: r.defaultSpace
      ? {
          id: r.defaultSpace.id,
          name: r.defaultSpace.name,
          type: r.defaultSpace.type,
          capacity: r.defaultSpace.capacity,
        }
      : null,
  }));

  // Map compatibility rules
  const compatRules: CompatRule[] = compatData.map((r) => ({
    id: r.id,
    reason: r.reason,
    horseA: r.horseA,
    horseB: r.horseB,
  }));

  // All horses for compatibility form
  const allHorses: CompatHorse[] = horsesData.map((h) => ({
    id: h.id,
    name: h.name,
    breed: h.breed,
    gender: h.gender,
    ageYears: h.ageYears,
    photoUrl: h.photoUrl,
  }));

  return (
    <BarnClient
      activeTab={activeTab}
      horses={horses}
      spaces={spaces}
      groups={groups}
      rules={rules}
      compatRules={compatRules}
      allHorses={allHorses}
      allSpaces={spacesData.map((s) => ({ id: s.id, name: s.name }))}
      allGroups={groupsData.map((g) => ({ id: g.id, name: g.name }))}
    />
  );
}
