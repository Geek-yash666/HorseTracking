"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { GroupForm } from "@/app/groups/group-form";
import { createGroup, updateGroup } from "@/app/groups/actions";
import type { DirectoryGroup } from "@/app/groups/group-directory";
import type { CompatHorse } from "@/app/compatibility/compatibility-manager";

export function GroupFormModal({
  onClose,
  group,
  horses,
}: {
  onClose: () => void;
  group?: DirectoryGroup;
  horses: CompatHorse[];
}) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (group) {
          await updateGroup(group.id, formData);
        } else {
          await createGroup(formData);
        }
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      <div className="relative z-50 w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-onstride-green/15 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-150">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-onstride-green/10 bg-card px-6 py-4">
          <h2 className="font-display text-lg font-bold text-onstride-green/90">
            {group ? "Edit Group" : "Add Group"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-onstride-green/40 hover:bg-muted hover:text-onstride-green transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-4">
          {error && (
            <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          <GroupForm
            action={handleSubmit}
            group={group ? {
              id: group.id,
              name: group.name,
              notes: group.notes,
            } : undefined}
            horses={horses.map(h => ({
              id: h.id,
              name: h.name,
              breed: h.breed,
              gender: h.gender,
              ageYears: h.ageYears,
              photoUrl: h.photoUrl,
              lifecycle: "rotation",
              notes: null,
            }))}
            selectedHorseIds={group?.horses.map(h => h.id) || []}
            submitLabel={group ? "Save Changes" : "Add Group"}
          />
        </div>
      </div>
    </div>
  );
}
