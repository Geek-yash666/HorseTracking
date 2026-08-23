import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { RuleForm } from "../rule-form";
import { createRule } from "../actions";

export default async function NewRulePage() {
  const [groups, spaces] = await Promise.all([
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.space.findMany({ orderBy: { name: "asc" } }),
  ]);

  return (
    <FormShell
      kicker="Barn setup · Schedule"
      title="Add a schedule rule"
      description="Days, shift, and default space for one group's recurring turnout."
      backHref="/rules"
    >
      <RuleForm
        action={createRule}
        groups={groups}
        spaces={spaces}
        submitLabel="Add rule"
      />
    </FormShell>
  );
}
