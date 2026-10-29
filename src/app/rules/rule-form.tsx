import type { GroupModel, ScheduleRuleModel, SpaceModel } from "@/generated/prisma/models";
import { SubmitButton } from "@/components/submit-button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DAYS_OF_WEEK, SHIFTS } from "@/lib/schedule";

export function RuleForm({
  action,
  rule,
  groups,
  spaces,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  rule?: ScheduleRuleModel;
  groups: GroupModel[];
  spaces: SpaceModel[];
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="groupId">Group</Label>
        <Select name="groupId" defaultValue={rule?.groupId} required>
          <SelectTrigger id="groupId" className="w-full">
            <SelectValue placeholder="Select a group" />
          </SelectTrigger>
          <SelectContent>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="shift">Shift</Label>
        <Select name="shift" defaultValue={rule?.shift ?? "AM"} required>
          <SelectTrigger id="shift" className="w-full">
            <SelectValue placeholder="Select a shift" />
          </SelectTrigger>
          <SelectContent>
            {SHIFTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label>Days of week</Label>
        <div className="flex flex-wrap gap-3 rounded-lg border border-barnwright-green/15 p-3">
          {DAYS_OF_WEEK.map((day) => (
            <div key={day.value} className="flex items-center gap-2">
              <Checkbox
                id={`day-${day.value}`}
                name="daysOfWeek"
                value={String(day.value)}
                defaultChecked={rule?.daysOfWeek.includes(day.value) ?? false}
              />
              <Label htmlFor={`day-${day.value}`} className="font-normal">
                {day.label}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="defaultSpaceId">Default space</Label>
        <Select name="defaultSpaceId" defaultValue={rule?.defaultSpaceId ?? undefined}>
          <SelectTrigger id="defaultSpaceId" className="w-full">
            <SelectValue placeholder="No default — assign each day" />
          </SelectTrigger>
          <SelectContent>
            {spaces.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-barnwright-green/50">
          Without a default space, this rule won&apos;t auto-generate onto
          Today&apos;s Board — you&apos;ll need to add those horses manually.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="durationMin">Duration (minutes)</Label>
        <Input
          id="durationMin"
          name="durationMin"
          type="number"
          min={1}
          step={1}
          defaultValue={rule?.durationMin ?? ""}
          placeholder="Optional"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <SubmitButton>{submitLabel}</SubmitButton>
      </div>
    </form>
  );
}
