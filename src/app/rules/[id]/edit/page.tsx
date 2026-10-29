import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { RuleForm } from "../../rule-form";
import { updateRule } from "../../actions";

export default async function EditRulePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [rule, groups, spaces] = await Promise.all([
    prisma.scheduleRule.findUnique({ where: { id } }),
    prisma.group.findMany({ orderBy: { name: "asc" } }),
    prisma.space.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!rule) {
    notFound();
  }

  return (
    <FormShell
      kicker="Barn setup · Schedule"
      title="Edit schedule rule"
      description="Change the days, shift, or default space for this rule."
      backHref="/rules"
    >
      <RuleForm
        action={updateRule.bind(null, rule.id)}
        rule={rule}
        groups={groups}
        spaces={spaces}
        submitLabel="Save changes"
      />
    </FormShell>
  );
}
