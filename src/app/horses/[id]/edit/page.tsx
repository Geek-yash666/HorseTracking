import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { HorseForm } from "../../horse-form";
import { updateHorse } from "../../actions";

export default async function EditHorsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const horse = await prisma.horse.findUnique({ where: { id } });

  if (!horse) {
    notFound();
  }

  return (
    <FormShell
      kicker="Barn setup · Horses"
      title={horse.name}
      description="Update details or pull this horse from the rotation."
      backHref="/horses"
    >
      <HorseForm
        action={updateHorse.bind(null, horse.id)}
        horse={horse}
        submitLabel="Save changes"
      />
    </FormShell>
  );
}
