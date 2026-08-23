import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { SpaceDirectory, type DirectorySpace } from "./space-directory";

export default async function SpacesPage() {
  const [spaces, activeTurnouts] = await Promise.all([
    prisma.space.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.turnoutEvent.findMany({
      where: {
        status: "out",
      },
      include: {
        horse: {
          select: { id: true, name: true },
        },
      },
    }),
  ]);

  const directorySpaces: DirectorySpace[] = spaces.map((space) => {
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Barn setup"
        title="Turnout Spaces"
        description="Paddocks, fields, and rings"
        actions={
          <Button render={<Link href="/spaces/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" /> Add space
          </Button>
        }
      />
      <SpaceDirectory spaces={directorySpaces} />
    </div>
  );
}
