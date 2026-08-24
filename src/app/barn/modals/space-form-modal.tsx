"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { SpaceForm } from "@/app/spaces/space-form";
import { createSpace, updateSpace } from "@/app/spaces/actions";
import type { DirectorySpace } from "@/app/spaces/space-directory";

export function SpaceFormModal({
  onClose,
  space,
}: {
  onClose: () => void;
  space?: DirectorySpace;
}) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (space) {
          await updateSpace(space.id, formData);
        } else {
          await createSpace(formData);
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
            {space ? "Edit Space" : "Add Space"}
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
          <SpaceForm
            action={handleSubmit}
            space={space ? {
              id: space.id,
              name: space.name,
              type: space.type,
              capacity: space.capacity,
              notes: space.notes,
            } : undefined}
            submitLabel={space ? "Save Changes" : "Add Space"}
          />
        </div>
      </div>
    </div>
  );
}
