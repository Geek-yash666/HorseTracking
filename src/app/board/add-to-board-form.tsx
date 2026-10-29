import type { HorseModel, SpaceModel } from "@/generated/prisma/models";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SHIFTS } from "@/lib/schedule";
import { addEventToBoard } from "./actions";

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-barnwright-green/50">
        {label}
      </span>
      {children}
    </label>
  );
}

export function AddToBoardForm({
  horses,
  spaces,
  date,
}: {
  horses: HorseModel[];
  spaces: SpaceModel[];
  date: string;
}) {
  return (
    <form action={addEventToBoard} className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="date" value={date} />
      <Field label="Horse">
        <Select name="horseId" required>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Choose a horse" />
          </SelectTrigger>
          <SelectContent>
            {horses.map((h) => (
              <SelectItem key={h.id} value={h.id}>
                {h.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Into space">
        <Select name="spaceId" required>
          <SelectTrigger className="w-44 bg-card">
            <SelectValue placeholder="Choose a space" />
          </SelectTrigger>
          <SelectContent>
            {spaces.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label="Shift">
        <Select name="shift" defaultValue="AM" required>
          <SelectTrigger className="w-24 bg-card">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SHIFTS.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Button type="submit" size="sm" className="mb-0.5">
        <Plus data-icon="inline-start" /> Put on the board
      </Button>
    </form>
  );
}
