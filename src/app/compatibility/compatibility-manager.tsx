"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserX,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/submit-button";
import { Input } from "@/components/ui/input";
import { ConfirmSubmit } from "@/components/confirm-submit";
import { HorseAvatar } from "@/components/horse-avatar";
import { GENDER_LABELS } from "@/lib/horse-images";
import { cn } from "@/lib/utils";
import { createCompatibilityRule, deleteCompatibilityRule } from "./actions";

export type CompatHorse = {
  id: string;
  name: string;
  breed: string | null;
  gender: string | null;
  ageYears: number | null;
  photoUrl: string | null;
};

export type CompatRule = {
  id: string;
  reason: string | null;
  horseA: CompatHorse;
  horseB: CompatHorse;
};

const COMMON_REASONS = [
  "Kicks when crowded at gate",
  "Dominant gelding — fights over food",
  "Broodmare moody when in heat",
  "Plays too rough / bites blankets",
  "Medical isolation / quiet companion needed",
];

function StatCard({
  value,
  label,
  sublabel,
  icon: Icon,
  highlight,
  onClick,
}: {
  value: number | string;
  label: string;
  sublabel?: string;
  icon?: ComponentType<{ className?: string }>;
  highlight?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "panel flex flex-1 min-w-[140px] items-center gap-3.5 p-4 transition-all",
        onClick && "cursor-pointer hover:border-onstride-gold/40 hover:shadow-md",
        highlight && "border-amber-500/30 bg-amber-500/5"
      )}
    >
      {Icon && (
        <div
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            highlight
              ? "bg-amber-500/15 text-amber-600"
              : "bg-onstride-green/8 text-onstride-gold-deep"
          )}
        >
          <Icon className="size-5" />
        </div>
      )}
      <div className="min-w-0">
        <p className="font-display text-2xl font-bold text-onstride-gold-deep tabular-nums leading-tight">
          {value}
        </p>
        <p className="text-xs font-semibold text-onstride-green/80 truncate">{label}</p>
        {sublabel && (
          <p className="text-[11px] text-onstride-green/50 truncate">{sublabel}</p>
        )}
      </div>
    </div>
  );
}

export function CompatibilityManager({
  rules,
  horses,
}: {
  rules: CompatRule[];
  horses: CompatHorse[];
}) {
  const [query, setQuery] = useState("");
  const [horseFilter, setHorseFilter] = useState<string>("all");
  const [selectedReason, setSelectedReason] = useState("");

  const stats = useMemo(() => {
    const restrictedHorseIds = new Set<string>();
    rules.forEach((r) => {
      restrictedHorseIds.add(r.horseA.id);
      restrictedHorseIds.add(r.horseB.id);
    });

    const dominantKickers = rules.filter(
      (r) =>
        r.reason?.toLowerCase().includes("kick") ||
        r.reason?.toLowerCase().includes("dominant") ||
        r.reason?.toLowerCase().includes("fight")
    ).length;

    const safeHorses = horses.filter((h) => !restrictedHorseIds.has(h.id)).length;

    return {
      totalRules: rules.length,
      restrictedCount: restrictedHorseIds.size,
      dominantKickers,
      safeHorses,
    };
  }, [rules, horses]);

  const filteredRules = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rules.filter((rule) => {
      if (horseFilter !== "all") {
        if (rule.horseA.id !== horseFilter && rule.horseB.id !== horseFilter) {
          return false;
        }
      }
      if (q) {
        const haystack = `${rule.horseA.name} ${rule.horseB.name} ${rule.reason ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [rules, query, horseFilter]);

  return (
    <div className="flex flex-col gap-6">
      {/* Top Stats Ribbon */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          value={stats.totalRules}
          label="Conflict Rules"
          sublabel="Prohibited pairings"
          icon={ShieldAlert}
          highlight={stats.totalRules > 0}
        />
        <StatCard
          value={stats.restrictedCount}
          label="Restricted Horses"
          sublabel="Must avoid certain peers"
          icon={UserX}
        />
        <StatCard
          value={stats.dominantKickers}
          label="Dominance Alerts"
          sublabel="Kicking or aggression notes"
          icon={Zap}
        />
        <StatCard
          value={stats.safeHorses}
          label="Universal Turnout"
          sublabel="Zero active clash rules"
          icon={ShieldCheck}
        />
      </div>

      {/* Add Pair Form Card */}
      <section className="panel p-5 sm:p-6 border border-onstride-green/15 shadow-md">
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert className="size-5 text-amber-600" />
          <h3 className="font-display text-xl font-bold text-onstride-green/90">
            Record Compatibility Clash
          </h3>
        </div>
        <p className="text-xs text-onstride-green/60 mb-5 max-w-2xl">
          Define two horses that should never be placed in the same turnout space. Today&apos;s Board and the 3D/Satellite maps will automatically highlight and prevent conflicts.
        </p>

        <form action={createCompatibilityRule} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Horse A */}
            <div className="space-y-1.5">
              <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50">
                First Horse (Horse A)
              </label>
              <select
                name="horseAId"
                required
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="">Select first horse…</option>
                {horses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.gender ? `(${h.gender})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Horse B */}
            <div className="space-y-1.5">
              <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50">
                Cannot Turn Out With (Horse B)
              </label>
              <select
                name="horseBId"
                required
                className="h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs focus-visible:border-ring focus-visible:outline-none"
              >
                <option value="">Select peer to separate…</option>
                {horses.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name} {h.gender ? `(${h.gender})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reason Input with Quick Suggestions */}
          <div className="space-y-2">
            <label className="text-[0.65rem] font-bold uppercase tracking-wider text-onstride-green/50">
              Behavioral Reason / Incident Notes
            </label>
            <Input
              name="reason"
              value={selectedReason}
              onChange={(e) => setSelectedReason(e.target.value)}
              placeholder="e.g. Kicks when crowded at gate, bossy gelding…"
              className="h-10 bg-card text-sm"
            />
            {/* Quick Reason Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-semibold text-onstride-green/45 mr-1">Quick presets:</span>
              {COMMON_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setSelectedReason(r)}
                  className="rounded-full border border-onstride-green/10 bg-muted/40 px-2.5 py-0.5 text-[11px] text-onstride-green/70 hover:bg-onstride-gold/15 hover:border-onstride-gold/40 hover:text-onstride-gold-deep transition-colors"
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <SubmitButton size="default" pendingText="Saving rule…">
              <ShieldAlert data-icon="inline-start" className="size-4" /> Save Compatibility Rule
            </SubmitButton>
          </div>
        </form>
      </section>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-onstride-green/35" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by horse name or reason…"
              className="h-9.5 bg-card pl-9 text-sm"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-onstride-green/40 hover:text-onstride-green"
              >
                Clear
              </button>
            )}
          </div>

          {/* Horse filter selector */}
          <select
            value={horseFilter}
            onChange={(e) => setHorseFilter(e.target.value)}
            className="h-9.5 rounded-lg border border-input bg-card px-3 text-xs font-medium shadow-sm focus-visible:border-ring focus-visible:outline-none"
          >
            <option value="all">All Horses ({horses.length})</option>
            {horses.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {horseFilter !== "all" && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setHorseFilter("all")}
            className="text-xs text-onstride-green/60 hover:text-onstride-green"
          >
            Reset filter
          </Button>
        )}
      </div>

      {/* Compatibility Rules Grid */}
      {filteredRules.length === 0 ? (
        <div className="panel flex flex-col items-center gap-3 px-6 py-16 text-center">
          <CheckCircle2 className="size-10 text-emerald-500 opacity-60" />
          <p className="font-display text-xl font-semibold">No compatibility clashes recorded</p>
          <p className="max-w-sm text-sm text-onstride-green/55">
            {query || horseFilter !== "all"
              ? "No conflict rules match your current filter."
              : "All horses in your barn are currently cleared for shared turnout."}
          </p>
          {(query || horseFilter !== "all") && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setQuery("");
                setHorseFilter("all");
              }}
              className="mt-2"
            >
              Clear filter
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredRules.map((rule) => (
            <article
              key={rule.id}
              className="panel flex flex-col p-5 border border-amber-500/20 bg-card shadow-sm hover:shadow-[var(--shadow-panel-lg)] hover:border-amber-500/40 transition-all"
            >
              {/* Pair Confrontation Visual */}
              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                {/* Horse A */}
                <div className="flex items-center gap-3 rounded-xl border border-onstride-green/10 bg-muted/30 p-2.5 min-w-0">
                  <HorseAvatar
                    name={rule.horseA.name}
                    photoUrl={rule.horseA.photoUrl}
                    size="lg"
                    className="shadow-sm ring-2 ring-red-500/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold text-onstride-green/90 truncate leading-tight">
                      {rule.horseA.name}
                    </p>
                    <p className="text-xs text-onstride-green/55 truncate">
                      {rule.horseA.gender ? GENDER_LABELS[rule.horseA.gender as keyof typeof GENDER_LABELS] ?? rule.horseA.gender : ""}
                      {rule.horseA.breed ? ` · ${rule.horseA.breed}` : ""}
                    </p>
                  </div>
                </div>

                {/* Clash Bolt Badge */}
                <div className="flex flex-col items-center justify-center">
                  <div className="flex size-8 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-600 shadow-xs">
                    <Zap className="size-4 animate-pulse" />
                  </div>
                  <span className="text-[9px] font-black tracking-wider text-red-600 uppercase mt-0.5">
                    Separated
                  </span>
                </div>

                {/* Horse B */}
                <div className="flex items-center gap-3 rounded-xl border border-onstride-green/10 bg-muted/30 p-2.5 min-w-0">
                  <HorseAvatar
                    name={rule.horseB.name}
                    photoUrl={rule.horseB.photoUrl}
                    size="lg"
                    className="shadow-sm ring-2 ring-red-500/20"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="font-display text-base font-bold text-onstride-green/90 truncate leading-tight">
                      {rule.horseB.name}
                    </p>
                    <p className="text-xs text-onstride-green/55 truncate">
                      {rule.horseB.gender ? GENDER_LABELS[rule.horseB.gender as keyof typeof GENDER_LABELS] ?? rule.horseB.gender : ""}
                      {rule.horseB.breed ? ` · ${rule.horseB.breed}` : ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* Conflict Advisory Banner */}
              {rule.reason && (
                <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs leading-relaxed text-amber-950 font-medium italic">
                  <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
                  <span>“{rule.reason}”</span>
                </div>
              )}

              {/* Card Footer */}
              <div className="mt-auto flex items-center justify-between gap-2 pt-4 border-t border-onstride-green/8 mt-4">
                <span className="text-xs font-medium text-onstride-green/50">
                  Monitored automatically on Today&apos;s Board
                </span>
                <form action={deleteCompatibilityRule.bind(null, rule.id)}>
                  <ConfirmSubmit
                    message={`Remove separation rule between ${rule.horseA.name} and ${rule.horseB.name}?`}
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive text-xs"
                  >
                    <Trash2 className="size-3.5" /> Remove rule
                  </ConfirmSubmit>
                </form>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
