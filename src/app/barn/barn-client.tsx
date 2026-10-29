"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HorseDirectory, type DirectoryHorse } from "@/app/horses/horse-directory";
import { SpaceDirectory, type DirectorySpace } from "@/app/spaces/space-directory";
import { GroupDirectory, type DirectoryGroup } from "@/app/groups/group-directory";
import { RuleDirectory, type DirectoryRule } from "@/app/rules/rule-directory";
import { CompatibilityManager, type CompatRule, type CompatHorse } from "@/app/compatibility/compatibility-manager";
import { HorseFormModal } from "./modals/horse-form-modal";
import { SpaceFormModal } from "./modals/space-form-modal";
import { GroupFormModal } from "./modals/group-form-modal";
import { RuleFormModal } from "./modals/rule-form-modal";

const TABS = [
  { id: "horses", label: "Horses" },
  { id: "spaces", label: "Spaces" },
  { id: "groups", label: "Groups" },
  { id: "rules", label: "Rules" },
  { id: "compatibility", label: "Compat" },
] as const;

type TabId = (typeof TABS)[number]["id"];

export function BarnClient({
  activeTab: initialTab,
  horses,
  spaces,
  groups,
  rules,
  compatRules,
  allHorses,
  allSpaces,
  allGroups,
}: {
  activeTab: string;
  horses: DirectoryHorse[];
  spaces: DirectorySpace[];
  groups: DirectoryGroup[];
  rules: DirectoryRule[];
  compatRules: CompatRule[];
  allHorses: CompatHorse[];
  allSpaces: { id: string; name: string }[];
  allGroups: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(
    TABS.some((t) => t.id === initialTab) ? (initialTab as TabId) : "horses"
  );

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Record<string, unknown> | null>(null);

  const switchTab = useCallback(
    (tab: TabId) => {
      setActiveTab(tab);
      router.push(`/barn?tab=${tab}`, { scroll: false });
    },
    [router]
  );

  const openAddModal = () => {
    setEditingItem(null);
    setAddModalOpen(true);
  };

  const openEditModal = (item: Record<string, unknown>) => {
    setEditingItem(item);
    setEditModalOpen(true);
  };

  const closeModals = () => {
    setAddModalOpen(false);
    setEditModalOpen(false);
    setEditingItem(null);
  };

  const getAddLabel = () => {
    switch (activeTab) {
      case "horses": return "Add Horse";
      case "spaces": return "Add Space";
      case "groups": return "Add Group";
      case "rules": return "Add Rule";
      case "compatibility": return "Add Rule";
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-barnwright-green/50">
            Barn Setup
          </p>
          <h1 className="font-display text-2xl font-bold text-barnwright-green/90 sm:text-3xl">
            Barn
          </h1>
          <p className="mt-1 text-sm text-barnwright-green/55">
            Manage horses, spaces, groups, rules, and compatibility.
          </p>
        </div>
        <Button
          onClick={openAddModal}
          size="default"
          className="h-10 gap-1.5 rounded-xl font-semibold"
        >
          <Plus className="size-4" /> {getAddLabel()}
        </Button>
      </div>

      {/* iOS-style Tab Bar */}
      <div className="relative">
        <div className="flex overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="flex gap-1 rounded-2xl bg-barnwright-green/5 p-1 min-w-max sm:min-w-0 sm:w-full">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => switchTab(tab.id)}
                className={cn(
                  "relative flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-white text-barnwright-green shadow-sm"
                    : "text-barnwright-green/50 hover:text-barnwright-green/70"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px]">
        {activeTab === "horses" && (
          <HorseDirectory horses={horses} onEdit={openEditModal} />
        )}
        {activeTab === "spaces" && (
          <SpaceDirectory spaces={spaces} onEdit={openEditModal} />
        )}
        {activeTab === "groups" && (
          <GroupDirectory groups={groups} onEdit={openEditModal} />
        )}
        {activeTab === "rules" && (
          <RuleDirectory rules={rules} onEdit={openEditModal} />
        )}
        {activeTab === "compatibility" && (
          <CompatibilityManager rules={compatRules} horses={allHorses} />
        )}
      </div>

      {/* Add Modal */}
      {addModalOpen && (
        <>
          {activeTab === "horses" && (
            <HorseFormModal onClose={closeModals} />
          )}
          {activeTab === "spaces" && (
            <SpaceFormModal onClose={closeModals} />
          )}
          {activeTab === "groups" && (
            <GroupFormModal
              onClose={closeModals}
              horses={allHorses}
            />
          )}
          {activeTab === "rules" && (
            <RuleFormModal
              onClose={closeModals}
              groups={allGroups}
              spaces={allSpaces}
            />
          )}
          {activeTab === "compatibility" && (
            <CompatibilityManager rules={compatRules} horses={allHorses} />
          )}
        </>
      )}

      {/* Edit Modal */}
      {editModalOpen && editingItem && (
        <>
          {activeTab === "horses" && (
            <HorseFormModal
              onClose={closeModals}
              horse={editingItem as DirectoryHorse}
            />
          )}
          {activeTab === "spaces" && (
            <SpaceFormModal
              onClose={closeModals}
              space={editingItem as DirectorySpace}
            />
          )}
          {activeTab === "groups" && (
            <GroupFormModal
              onClose={closeModals}
              group={editingItem as DirectoryGroup}
              horses={allHorses}
            />
          )}
          {activeTab === "rules" && (
            <RuleFormModal
              onClose={closeModals}
              rule={editingItem as DirectoryRule}
              groups={allGroups}
              spaces={allSpaces}
            />
          )}
        </>
      )}
    </div>
  );
}
