"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { RuleForm } from "@/app/rules/rule-form";
import { createRule, updateRule } from "@/app/rules/actions";
import type { DirectoryRule } from "@/app/rules/rule-directory";

export function RuleFormModal({
  onClose,
  rule,
  groups,
  spaces,
}: {
  onClose: () => void;
  rule?: DirectoryRule;
  groups: { id: string; name: string }[];
  spaces: { id: string; name: string }[];
}) {
  const [, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (formData: FormData) => {
    setError(null);
    startTransition(async () => {
      try {
        if (rule) {
          await updateRule(rule.id, formData);
        } else {
          await createRule(formData);
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
      <div className="relative z-50 w-full sm:max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card border border-barnwright-green/15 shadow-2xl animate-in slide-in-from-bottom duration-300 sm:animate-in sm:fade-in sm:zoom-in-95 sm:duration-150">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-barnwright-green/10 bg-card px-6 py-4">
          <h2 className="font-display text-lg font-bold text-barnwright-green/90">
            {rule ? "Edit Rule" : "Add Rule"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-barnwright-green/40 hover:bg-muted hover:text-barnwright-green transition-colors"
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
          <RuleForm
            action={handleSubmit}
            rule={rule ? {
              id: rule.id,
              groupId: rule.groupId,
              shift: rule.shift,
              daysOfWeek: rule.daysOfWeek,
              durationMin: rule.durationMin,
              defaultSpaceId: rule.defaultSpace?.id || null,
            } : undefined}
            groups={groups.map(g => ({ ...g, notes: null }))}
            spaces={spaces.map(s => ({ ...s, type: "paddock", notes: null, capacity: null }))}
            submitLabel={rule ? "Save Changes" : "Add Rule"}
          />
        </div>
      </div>
    </div>
  );
}
