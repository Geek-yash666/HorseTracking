import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { RuleDirectory, type DirectoryRule } from "./rule-directory";

export default async function RulesPage() {
  const rules = await prisma.scheduleRule.findMany({
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
  });

  const directoryRules: DirectoryRule[] = rules.map((r) => ({
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

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Barn setup"
        title="Schedule Rules"
        description="The recurring rhythm: which cohort turns out on which days, in which shift, to which pasture. Today's Board generates automatically from these."
        actions={
          <Button render={<Link href="/rules/new" />} nativeButton={false}>
            <Plus data-icon="inline-start" /> Add rule
          </Button>
        }
      />
      <RuleDirectory rules={directoryRules} />
    </div>
  );
}
