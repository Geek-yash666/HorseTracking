import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormShell } from "@/components/form-shell";
import { HorseForm } from "../../horse-form";
import { updateHorse, deleteHorse } from "../../actions";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { AlertTriangle, Trash2 } from "lucide-react";

export default async function EditHorsePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const horse = await prisma.horse.findUnique({
    where: { id },
    include: {
      groups: {
        include: {
          group: {
            select: {
              name: true,
              rules: { select: { id: true } },
            },
          },
        },
      },
      events: { select: { id: true, status: true } },
    },
  });

  if (!horse) {
    notFound();
  }

  const groupNames = horse.groups.map((g) => g.group.name);
  const scheduleRulesCount = horse.groups.reduce(
    (sum, g) => sum + g.group.rules.length,
    0
  );
  const activeEventsCount = horse.events.filter(
    (e) => e.status === "scheduled" || e.status === "out"
  ).length;

  const warnings: string[] = [];
  if (activeEventsCount > 0) {
    warnings.push(
      `is currently active in ${activeEventsCount} turnout event(s) on Today's Board`
    );
  } else if (horse.events.length > 0) {
    warnings.push(`has ${horse.events.length} turnout event(s) on record`);
  }
  if (groupNames.length > 0) {
    warnings.push(
      `belongs to ${groupNames.length} turnout group(s) (${groupNames.join(", ")})`
    );
  }
  if (scheduleRulesCount > 0) {
    warnings.push(`is part of ${scheduleRulesCount} recurring schedule rule(s)`);
  }

  const deleteWarningMessage =
    warnings.length > 0
      ? `⚠️ WARNING: ${horse.name} ${warnings.join(", and ")}.\n\nDeleting ${horse.name} will immediately remove them from Today's Board, group rosters, and turnout schedules.\n\nAre you sure you want to permanently delete ${horse.name}?`
      : `Delete ${horse.name}? This can't be undone.`;

  return (
    <div className="flex flex-col gap-6">
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

      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
        <div className="panel border-destructive/25 p-5 bg-destructive/5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="font-display text-base font-semibold text-destructive">
                Delete horse record
              </p>
              {warnings.length > 0 ? (
                <div className="mt-2 flex items-start gap-2 text-xs text-amber-900">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>
                    <strong>Schedule Warning:</strong> {horse.name} {warnings.join(", and ")}. Deleting will remove all associated schedule events and group memberships.
                  </span>
                </div>
              ) : (
                <p className="text-xs text-barnwright-green/60 mt-1">
                  Permanently remove this horse from the barn roster.
                </p>
              )}
            </div>
            <form action={deleteHorse.bind(null, horse.id)}>
              <ConfirmSubmit
                message={deleteWarningMessage}
                variant="destructive"
                size="sm"
              >
                <Trash2 data-icon="inline-start" /> Delete horse
              </ConfirmSubmit>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
