import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { GroupDirectory, type DirectoryGroup } from "./group-directory";

export default async function GroupsPage() {
  const groups = await prisma.group.findMany({
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
  });

  const directoryGroups: DirectoryGroup[] = groups.map((g) => ({
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Barn setup"
        title="Turnout Groups"
        description="Who goes out together"
        actions={
          <Button render={<Link href="/groups/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" /> Add group
          </Button>
        }
      />
      <GroupDirectory groups={directoryGroups} />
    </div>
  );
}
