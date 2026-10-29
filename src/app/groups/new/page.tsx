import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { GroupForm } from "../group-form";
import { createGroup } from "../actions";

export default async function NewGroupPage() {
  const horses = await prisma.horse.findMany({ orderBy: { name: "asc" } });

  return (
    <FormShell
      kicker="Barn setup · Groups"
      title="Add a group"
      description="Name the crew and pick which horses turn out together."
      backHref="/groups"
    >
      <GroupForm action={createGroup} horses={horses} submitLabel="Add group" />
    </FormShell>
  );
}
