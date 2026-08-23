import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { GroupForm } from "../../group-form";
import { updateGroup } from "../../actions";

export default async function EditGroupPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [group, horses] = await Promise.all([
    prisma.group.findUnique({
      where: { id },
      include: { horses: true },
    }),
    prisma.horse.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!group) {
    notFound();
  }

  return (
    <FormShell
      kicker="Barn setup · Groups"
      title={group.name}
      description="Adjust the roster or notes for this turnout group."
      backHref="/groups"
    >
      <GroupForm
        action={updateGroup.bind(null, group.id)}
        group={group}
        horses={horses}
        selectedHorseIds={group.horses.map((h) => h.horseId)}
        submitLabel="Save changes"
      />
    </FormShell>
  );
}
