import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { SpaceForm } from "../../space-form";
import { updateSpace } from "../../actions";

export default async function EditSpacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const space = await prisma.space.findUnique({ where: { id } });

  if (!space) {
    notFound();
  }

  return (
    <FormShell
      kicker="Barn setup · Spaces"
      title={space.name}
      description="Update the space's type, capacity, or condition notes."
      backHref="/spaces"
    >
      <SpaceForm
        action={updateSpace.bind(null, space.id)}
        space={space}
        submitLabel="Save changes"
      />
    </FormShell>
  );
}
