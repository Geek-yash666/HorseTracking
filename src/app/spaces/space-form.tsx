import type { SpaceModel } from "@/generated/prisma/models";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SPACE_TYPES = [
  { value: "paddock", label: "Paddock" },
  { value: "field", label: "Field" },
  { value: "ring", label: "Ring" },
];

export function SpaceForm({
  action,
  space,
  submitLabel,
}: {
  action: (formData: FormData) => void;
  space?: SpaceModel;
  submitLabel: string;
}) {
  return (
    <form action={action} className="flex flex-col gap-5">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={space?.name}
          placeholder="e.g. North Paddock"
          required
          autoFocus
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="type">Type</Label>
        <Select name="type" defaultValue={space?.type ?? "paddock"} required>
          <SelectTrigger id="type" className="w-full">
            <SelectValue placeholder="Select a type" />
          </SelectTrigger>
          <SelectContent>
            {SPACE_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="capacity">Capacity</Label>
        <Input
          id="capacity"
          name="capacity"
          type="number"
          min={1}
          step={1}
          defaultValue={space?.capacity ?? ""}
          placeholder="Leave blank if unlimited"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes">Notes</Label>
        <Textarea
          id="notes"
          name="notes"
          defaultValue={space?.notes ?? ""}
          placeholder="e.g. too wet — pull from rotation"
          rows={3}
        />
      </div>

      <div className="flex gap-3 pt-2">
        <Button type="submit">{submitLabel}</Button>
      </div>
    </form>
  );
}
