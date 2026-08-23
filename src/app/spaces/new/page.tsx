import { FormShell } from "@/components/form-shell";
import { SpaceForm } from "../space-form";
import { createSpace } from "../actions";

export default function NewSpacePage() {
  return (
    <FormShell
      kicker="Barn setup · Spaces"
      title="Add a space"
      description="A paddock, field, or ring horses can be turned out into."
      backHref="/spaces"
    >
      <SpaceForm action={createSpace} submitLabel="Add space" />
    </FormShell>
  );
}
