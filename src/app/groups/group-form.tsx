import type { GroupModel, HorseModel } from "@/generated/prisma/models";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export function GroupForm({
  action,
  group,
  horses,
  selectedHorseIds = [],
  submitLabel,
}: {
  action: (formData: FormData) => void;
  group?: GroupModel;
  horses: HorseModel[];
  selectedHorseIds?: string[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={group?.name}
          placeholder="e.g. Turnout Group A"
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={group?.notes ?? ""}
          placeholder="e.g. quiet group, no geldings"
          rows={3}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label>Member horses</Label>
        {horses.length === 0 ? (
          <p className="text-sm text-onstride-green/60">
            No horses yet — add horses first, then come back to build this
            group.
          </p>
        ) : (
          <div className="flex max-h-64 flex-col gap-2 overflow-y-auto rounded-lg border border-onstride-green/15 p-3">
            {horses.map((horse) => (
              <div key={horse.id} className="flex items-center gap-2">
                <Checkbox
                  id={`horse-${horse.id}`}
                  name="horseIds"
                  value={horse.id}
                  defaultChecked={selectedHorseIds.includes(horse.id)}
                />
                <Label
                  htmlFor={`horse-${horse.id}`}
                  className="font-normal"
                >
                  {horse.name}
                  {horse.lifecycle !== "rotation" && (
                    <span className="text-onstride-green/50">
                      {" "}({horse.lifecycle})
                    </span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
