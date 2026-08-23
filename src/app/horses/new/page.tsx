import { FormShell } from "@/components/form-shell";
import { HorseForm } from "../horse-form";
import { createHorse } from "../actions";

export default function NewHorsePage() {
  return (
    <FormShell
      kicker="Barn setup · Horses"
      title="Add a horse"
      description="Name, handling notes, and whether they're in the turnout rotation."
      backHref="/horses"
    >
      <HorseForm action={createHorse} submitLabel="Add horse" />
    </FormShell>
  );
}
