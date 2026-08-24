import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { HorseDirectory, type DirectoryHorse } from "./horse-directory";

export default async function HorsesPage() {
  const horses = await prisma.horse.findMany({
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
  });

  const directoryHorses: DirectoryHorse[] = horses.map((horse) => {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Barn setup"
        title="Horses"
        description="The whole barn at a glance — search, filter, and manage every horse in your care."
        actions={
          <Button render={<Link href="/horses/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" /> Add Horse
          </Button>
        }
      />
      <HorseDirectory horses={directoryHorses} />
    </div>
  );
}
