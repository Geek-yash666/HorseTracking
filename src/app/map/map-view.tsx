"use client";

import {
  useMemo,
  useState,
  useCallback,
  useSyncExternalStore,
  useTransition,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  MousePointerClick,
  Moon,
  Sun,
  CloudRain,
  Sparkles,
  Map as MapIcon,
  Box,
  Video,
  Camera,
  ArrowRight,
  ShieldAlert,
  CheckCircle,
  XCircle,
  RotateCcw,
} from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { CapacityMeter } from "@/components/capacity-meter";
import { cn } from "@/lib/utils";
import { getHorseProfile } from "./horse-profiles";
import { SatelliteView } from "./satellite-view";
import {
  markHorseIn,
  markHorseOut,
  markHorseSkipped,
  resetHorseEvent,
  moveHorseToSpace,
  quickAssignHorseToPaddock,
} from "./actions";
import {
  findConflictPairs,
  buildPairKey,
  type MapCompatRule,
  type MapEvent,
  type MapSpace,
  type Selection,
} from "./types";
import type { WeatherMode } from "./barn-scene";

// three.js client-side dynamic load
const BarnScene = dynamic(() => import("./barn-scene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center bg-[#132219]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 animate-spin rounded-full border-2 border-barnwright-gold border-t-transparent" />
        <p className="animate-pulse font-display text-sm text-barnwright-gold">
          Preparing the 3D Equestrian Estate…
        </p>
      </div>
    </div>
  ),
});

const LEGEND = [
  { color: "#4ade80", label: "Out on pasture" },
  { color: "#60a5fa", label: "In the barn stall" },
  { color: "#e2e8f0", label: "Scheduled / Waiting" },
  { color: "#fb923c", label: "Skipped today" },
  { color: "#ef4444", label: "Compatibility conflict" },
];

function webglSupported() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

const subscribeNoop = () => () => {};

function useWebglSupported() {
  return useSyncExternalStore(subscribeNoop, webglSupported, () => null);
}

export function MapView({
  spaces,
  events,
  compatRules,
}: {
  spaces: MapSpace[];
  events: MapEvent[];
  compatRules: MapCompatRule[];
}) {
  const [viewMode, setViewMode] = useState<"3d" | "satellite">("3d");
  const [weather, setWeather] = useState<WeatherMode>("AM");
  const [cameraPreset, setCameraPreset] = useState<"drone" | "barnyard" | "default">("default");
  const [selection, setSelection] = useState<Selection>(null);
  const [isPending, startTransition] = useTransition();
  // Target paddock for turning out a horse that isn't on the board yet.
  const [turnoutSpaceId, setTurnoutSpaceId] = useState<string>("");

  const webgl = useWebglSupported();

  const conflictLookup = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const rule of compatRules) {
      map.set(buildPairKey(rule.horseAId, rule.horseBId), rule.reason);
    }
    return map;
  }, [compatRules]);

  const conflictedHorses = useMemo(() => {
    const map = new Map<string, string>();
    const bySpace = new Map<string, MapEvent[]>();
    for (const event of events) {
      if (event.status !== "out") continue;
      const list = bySpace.get(event.spaceId) ?? [];
      list.push(event);
      bySpace.set(event.spaceId, list);
    }
    for (const group of bySpace.values()) {
      for (const pair of findConflictPairs(group.map((e) => e.horseId), conflictLookup)) {
        const reason = pair.reason ?? "incompatible pair";
        map.set(pair.a, reason);
        map.set(pair.b, reason);
      }
    }
    return map;
  }, [events, conflictLookup]);

  const selectedEvent =
    selection?.kind === "horse"
      ? events.find((e) => e.horseId === selection.id)
      : undefined;

  const selectedHorseProfile = selectedEvent
    ? getHorseProfile(selectedEvent.horseName)
    : undefined;

  const selectedSpace =
    selection?.kind === "space"
      ? spaces.find((s) => s.id === selection.id)
      : undefined;

  const handleSelect = useCallback((next: Selection) => setSelection(next), []);

  // Quick Action Handlers
  const handleTurnOut = (eventId: string) => {
    startTransition(async () => {
      await markHorseOut(eventId);
    });
  };

  const handleBringIn = (eventId: string) => {
    startTransition(async () => {
      await markHorseIn(eventId);
    });
  };

  const handleSkip = (eventId: string) => {
    startTransition(async () => {
      await markHorseSkipped(eventId);
    });
  };

  const handleReset = (eventId: string) => {
    startTransition(async () => {
      await resetHorseEvent(eventId);
    });
  };

  const handleSpaceChange = (eventId: string, spaceId: string) => {
    startTransition(async () => {
      await moveHorseToSpace(eventId, spaceId);
    });
  };

  // Unscheduled horses exist only as virtual rows client-side — turning
  // them out has to create the real event via upsert, keyed by horse.
  const isVirtual = Boolean(selectedEvent?.id.startsWith("virtual-"));
  const effectiveSpaceId = turnoutSpaceId || spaces[0]?.id || "";

  return (
    <div className="panel relative h-[clamp(520px,78vh,880px)] overflow-hidden p-0 rounded-2xl border border-[#10241c]/15 shadow-2xl bg-[#0f1d16]">
      {/* ================= VIEW MODE (3D vs Satellite) ================= */}
      {viewMode === "satellite" ? (
        <SatelliteView
          spaces={spaces}
          events={events}
          conflictedHorses={conflictedHorses}
          selection={selection}
          onSelect={handleSelect}
        />
      ) : webgl !== false && spaces.length > 0 ? (
        webgl ? (
          <BarnScene
            spaces={spaces}
            events={events}
            compatRules={compatRules}
            lighting={weather}
            selection={selection}
            onSelect={handleSelect}
            cameraPreset={cameraPreset}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#132219]">
            <p className="animate-pulse font-display text-sm text-barnwright-gold">
              Loading 3D scene…
            </p>
          </div>
        )
      ) : (
        <div className="flex h-full flex-col items-center justify-center gap-2 bg-[#132219] px-6 text-center text-white">
          <p className="font-display text-xl font-semibold text-barnwright-gold">
            WebGL Acceleration Required
          </p>
          <p className="max-w-sm text-sm text-white/70">
            Switch to the Satellite Map mode above to view the full interactive facility layout.
          </p>
        </div>
      )}

      {/* ================= TOP LEFT: DUAL-MODE TOGGLE ================= */}
      <div className="absolute left-4 top-4 z-20 flex items-center gap-2">
        <div className="flex overflow-hidden rounded-xl border border-white/20 bg-[#10241c]/90 p-1 shadow-xl backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewMode("3d")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "3d"
                ? "bg-barnwright-gold text-[#10241c] shadow"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <Box className="size-3.5" />
            <span>3D Realistic Estate</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("satellite")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
              viewMode === "satellite"
                ? "bg-barnwright-gold text-[#10241c] shadow"
                : "text-white/80 hover:bg-white/10 hover:text-white"
            )}
          >
            <MapIcon className="size-3.5" />
            <span>Satellite / GIS Map</span>
          </button>
        </div>
      </div>

      {/* ================= TOP RIGHT: WEATHER & CAMERA CONTROLS (3D Mode) ================= */}
      {viewMode === "3d" && (
        <div className="absolute right-4 top-4 z-20 flex flex-wrap items-center gap-2">
          {/* Weather / Time Selector */}
          <div className="flex overflow-hidden rounded-xl border border-white/20 bg-[#10241c]/90 p-1 shadow-xl backdrop-blur-md">
            {(
              [
                { id: "AM", label: "Morning Sun", icon: Sun },
                { id: "NOON", label: "Midday", icon: Sparkles },
                { id: "PM", label: "Sunset", icon: Moon },
                { id: "RAIN", label: "Rain / Wet", icon: CloudRain },
              ] as const
            ).map((mode) => {
              const Icon = mode.icon;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setWeather(mode.id)}
                  title={mode.label}
                  className={cn(
                    "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                    weather === mode.id
                      ? "bg-barnwright-gold font-semibold text-[#10241c]"
                      : "text-white/75 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="hidden sm:inline">{mode.label}</span>
                </button>
              );
            })}
          </div>

          {/* Camera View Presets */}
          <div className="flex overflow-hidden rounded-xl border border-white/20 bg-[#10241c]/90 p-1 shadow-xl backdrop-blur-md">
            <button
              type="button"
              onClick={() => setCameraPreset("drone")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                cameraPreset === "drone"
                  ? "bg-white/20 text-white font-semibold"
                  : "text-white/70 hover:text-white"
              )}
              title="Overview Drone Cam"
            >
              <Camera className="size-3.5" />
              <span className="hidden md:inline">Drone</span>
            </button>
            <button
              type="button"
              onClick={() => setCameraPreset("barnyard")}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors",
                cameraPreset === "barnyard"
                  ? "bg-white/20 text-white font-semibold"
                  : "text-white/70 hover:text-white"
              )}
              title="Barn Stalls View"
            >
              <Video className="size-3.5" />
              <span className="hidden md:inline">Stalls</span>
            </button>
          </div>
        </div>
      )}

      {/* ================= BOTTOM LEFT: LEGEND ================= */}
      <div className="pointer-events-none absolute bottom-4 left-4 z-20 hidden sm:flex flex-col gap-1.5 rounded-xl border border-white/20 bg-[#10241c]/90 px-3.5 py-3 text-white shadow-xl backdrop-blur-md">
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.22em] text-barnwright-gold">
          Live Status
        </p>
        {LEGEND.map((item) => (
          <span key={item.label} className="flex items-center gap-2 text-xs text-white/80">
            <span
              className="size-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: item.color }}
            />
            {item.label}
          </span>
        ))}
      </div>

      {/* ================= BOTTOM CENTER: INTERACTION HINT ================= */}
      {!selection && (
        <p className="pointer-events-none absolute bottom-4 left-1/2 z-20 -translate-x-1/2 rounded-full border border-white/20 bg-[#10241c]/90 px-4 py-1.5 text-xs font-medium text-white/85 shadow-xl backdrop-blur-md">
          <MousePointerClick className="mr-1.5 inline size-3.5 text-barnwright-gold" />
          {viewMode === "3d"
            ? "Drag to orbit · scroll to zoom · click any horse or paddock for live actions"
            : "Click any paddock polygon or horse marker for details"}
        </p>
      )}

      {/* ================= HORSE DETAIL & LIVE ACTIONS DRAWER ================= */}
      {selectedEvent && selectedHorseProfile && (
        <aside className="absolute bottom-4 right-4 z-30 w-80 max-h-[85vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#10241c]/95 p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className="flex size-11 items-center justify-center rounded-full border-2 border-barnwright-gold font-display text-sm font-bold text-white shadow-md"
                style={{ backgroundColor: selectedHorseProfile.bodyColor }}
              >
                {selectedEvent.horseName.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <p className="font-display text-lg font-bold leading-tight text-white">
                  {selectedEvent.horseName}
                </p>
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-barnwright-gold">
                  {selectedHorseProfile.breed} · {selectedHorseProfile.age} yo {selectedHorseProfile.gender}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              aria-label="Close panel"
              className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          {/* Coat & Discipline Badge */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-medium text-white/90">
              {selectedHorseProfile.coatName}
            </span>
            <span className="rounded-md bg-barnwright-gold/20 px-2 py-0.5 text-[10px] font-medium text-barnwright-gold">
              {selectedHorseProfile.discipline}
            </span>
          </div>

          <div className="mt-3">
            <StatusBadge status={selectedEvent.status} />
          </div>

          {/* Details list */}
          <dl className="mt-3.5 space-y-1.5 rounded-xl bg-white/5 p-3 text-xs text-white/80">
            <div className="flex justify-between gap-2">
              <dt className="text-white/50">Current Location</dt>
              <dd className="font-semibold text-white">{selectedEvent.spaceName}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-white/50">Shift</dt>
              <dd className="font-medium">{selectedEvent.shift} Shift</dd>
            </div>
            {selectedEvent.outLabel && (
              <div className="flex justify-between gap-2">
                <dt className="text-white/50">Turned out</dt>
                <dd className="font-mono text-emerald-400">{selectedEvent.outLabel}</dd>
              </div>
            )}
            {selectedEvent.inLabel && (
              <div className="flex justify-between gap-2">
                <dt className="text-white/50">Brought in</dt>
                <dd className="font-mono text-sky-400">{selectedEvent.inLabel}</dd>
              </div>
            )}
          </dl>

          {/* Compatibility conflict warning */}
          {conflictedHorses.has(selectedEvent.horseId) && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-destructive/20 border border-destructive/40 p-2.5 text-xs text-rose-200">
              <ShieldAlert className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <div>
                <p className="font-semibold text-rose-300">Compatibility Alert</p>
                <p className="text-[11px] leading-snug text-white/80">
                  {conflictedHorses.get(selectedEvent.horseId)}
                </p>
              </div>
            </div>
          )}

          {/* Handler Note */}
          {selectedEvent.note && (
            <p className="mt-3 rounded-lg bg-barnwright-gold/10 border-l-2 border-barnwright-gold px-2.5 py-1.5 text-xs italic text-barnwright-gold leading-relaxed">
              “{selectedEvent.note}”
            </p>
          )}

          {/* Tagline / Personality */}
          <p className="mt-2 text-[11px] text-white/60 leading-relaxed">
            {selectedHorseProfile.tagline}
          </p>

          {/* ================= ONE-CLICK LIVE OPERATIONS ================= */}
          <div className="mt-4 border-t border-white/10 pt-3">
            <p className="text-[10px] font-bold uppercase tracking-wider text-barnwright-gold mb-2">
              Quick Operations
            </p>

            {isVirtual ? (
              /* Unscheduled horse: create today's turnout via upsert */
              <>
                <p className="mb-2 rounded-lg bg-white/5 px-2.5 py-1.5 text-[11px] leading-snug text-white/70">
                  Not on today&apos;s board yet — pick a paddock and send them
                  out; the board updates instantly.
                </p>
                <select
                  value={effectiveSpaceId}
                  disabled={isPending || spaces.length === 0}
                  onChange={(e) => setTurnoutSpaceId(e.target.value)}
                  className="w-full rounded-lg border border-white/20 bg-[#162a21] px-2.5 py-1.5 text-xs text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-barnwright-gold"
                >
                  {spaces.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.type})
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isPending || !effectiveSpaceId}
                  onClick={() =>
                    startTransition(async () => {
                      await quickAssignHorseToPaddock(
                        selectedEvent.horseId,
                        effectiveSpaceId,
                        "AM"
                      );
                    })
                  }
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow transition-colors disabled:opacity-50"
                >
                  <CheckCircle className="size-3.5" />
                  Turn Out Now
                </button>
              </>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-2">
                  {selectedEvent.status !== "out" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleTurnOut(selectedEvent.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-700/80 hover:bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow transition-colors"
                    >
                      <CheckCircle className="size-3.5" />
                      Turn Out
                    </button>
                  )}
                  {selectedEvent.status === "out" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleBringIn(selectedEvent.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-sky-700/80 hover:bg-sky-600 px-3 py-2 text-xs font-semibold text-white shadow transition-colors"
                    >
                      <ArrowRight className="size-3.5" />
                      Bring In
                    </button>
                  )}
                  {selectedEvent.status !== "skipped" && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleSkip(selectedEvent.id)}
                      className="flex items-center justify-center gap-1.5 rounded-lg bg-amber-700/70 hover:bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow transition-colors"
                    >
                      <XCircle className="size-3.5" />
                      Skip
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleReset(selectedEvent.id)}
                    className="flex items-center justify-center gap-1.5 rounded-lg bg-white/10 hover:bg-white/20 px-3 py-2 text-xs font-medium text-white/90 transition-colors"
                  >
                    <RotateCcw className="size-3" />
                    Reset
                  </button>
                </div>

                {/* Quick Space Swap Dropdown */}
                <div className="mt-2.5">
                  <label className="text-[10px] text-white/50 block mb-1">
                    Move to another paddock:
                  </label>
                  <select
                    value={selectedEvent.spaceId}
                    disabled={isPending}
                    onChange={(e) => handleSpaceChange(selectedEvent.id, e.target.value)}
                    className="w-full rounded-lg border border-white/20 bg-[#162a21] px-2.5 py-1.5 text-xs text-white shadow-inner focus:outline-none focus:ring-1 focus:ring-barnwright-gold"
                  >
                    {spaces.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.type})
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <Link
            href="/board"
            className="mt-4 flex items-center justify-center gap-1.5 text-center text-xs font-semibold text-barnwright-gold hover:underline"
          >
            <span>Open Today&apos;s Board</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </aside>
      )}

      {/* ================= SPACE DETAIL DRAWER ================= */}
      {selectedSpace && (
        <aside className="absolute bottom-4 right-4 z-30 w-80 max-h-[85vh] overflow-y-auto rounded-2xl border border-white/20 bg-[#10241c]/95 p-5 text-white shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-display text-lg font-bold leading-tight text-white">
                {selectedSpace.name}
              </p>
              <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-barnwright-gold">
                {selectedSpace.type === "ring"
                  ? "Training Arena / Ring"
                  : selectedSpace.type === "field"
                    ? "Grass Pasture"
                    : "Individual / Group Paddock"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelection(null)}
              aria-label="Close panel"
              className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
            >
              ×
            </button>
          </div>

          <div className="mt-4">
            <CapacityMeter
              capacity={selectedSpace.capacity}
              count={
                events.filter(
                  (e) => e.status === "out" && e.spaceId === selectedSpace.id
                ).length
              }
            />
          </div>

          {selectedSpace.notes && (
            <p className="mt-3 rounded-lg bg-white/5 p-2.5 text-xs italic leading-relaxed text-white/80">
              “{selectedSpace.notes}”
            </p>
          )}

          <p className="mt-4 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-barnwright-gold">
            Current Occupants
          </p>
          <ul className="mt-2 space-y-1.5">
            {events.filter((e) => e.status === "out" && e.spaceId === selectedSpace.id).length ===
            0 ? (
              <li className="text-xs text-white/50 italic py-2">
                No horses currently in this paddock.
              </li>
            ) : (
              events
                .filter((e) => e.status === "out" && e.spaceId === selectedSpace.id)
                .map((e) => {
                  const prof = getHorseProfile(e.horseName);
                  return (
                    <li
                      key={e.id}
                      onClick={() => setSelection({ kind: "horse", id: e.horseId })}
                      className="flex cursor-pointer items-center justify-between gap-2 rounded-lg bg-white/5 p-2 text-xs hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="flex size-6 items-center justify-center rounded-full font-display text-[10px] font-bold text-white"
                          style={{ backgroundColor: prof.bodyColor }}
                        >
                          {e.horseName.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="font-semibold text-white">{e.horseName}</span>
                      </div>
                      {conflictedHorses.has(e.horseId) && (
                        <span className="rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                          Conflict !
                        </span>
                      )}
                    </li>
                  );
                })
            )}
          </ul>
        </aside>
      )}
    </div>
  );
}
