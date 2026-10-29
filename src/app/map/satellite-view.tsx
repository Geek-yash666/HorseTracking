"use client";

import { useState, useMemo } from "react";
import {
  Layers,
  MapPin,
  Maximize2,
  Minimize2,
  Compass,
  AlertTriangle,
  CheckCircle2,
  Droplets,
  Sun,
  Crosshair,
  Eye,
  EyeOff,
} from "lucide-react";
import { getHorseProfile } from "./horse-profiles";
import type { MapEvent, MapSpace, Selection } from "./types";
import { cn } from "@/lib/utils";

type SatelliteViewProps = {
  spaces: MapSpace[];
  events: MapEvent[];
  conflictedHorses: Map<string, string>;
  selection: Selection;
  onSelect: (selection: Selection) => void;
};

type PaddockGeo = {
  spaceId: string;
  name: string;
  type: string;
  poly: string; // SVG polygon points
  labelX: number;
  labelY: number;
  areaAcres: number;
  footing: string;
};

const STATUS_STROKE: Record<string, string> = {
  out: "#4ade80",
  in: "#60a5fa",
  scheduled: "#e2e8f0",
  skipped: "#fb923c",
};

// Spatial layout on a 1000x700 GIS coordinate canvas
const PADDOCK_GEOMETRIES: PaddockGeo[] = [
  {
    spaceId: "North Paddock",
    name: "North Paddock",
    type: "field",
    poly: "160,80 380,70 395,240 170,250",
    labelX: 275,
    labelY: 130,
    areaAcres: 2.4,
    footing: "Kentucky Bluegrass",
  },
  {
    spaceId: "East Pasture",
    name: "East Pasture",
    type: "field",
    poly: "620,70 940,80 920,290 600,270",
    labelX: 760,
    labelY: 135,
    areaAcres: 4.8,
    footing: "Rolling Fescue & Clover",
  },
  {
    spaceId: "South Ring",
    name: "South Ring",
    type: "paddock",
    poly: "610,340 910,340 910,560 610,560",
    labelX: 760,
    labelY: 410,
    areaAcres: 1.8,
    footing: "GGT All-Weather Sand",
  },
  {
    spaceId: "Round Pen",
    name: "Round Pen",
    type: "ring",
    poly: "440,110 540,110 560,190 520,240 460,240 420,190",
    labelX: 490,
    labelY: 145,
    areaAcres: 0.4,
    footing: "Deep Cushion Sand",
  },
  {
    spaceId: "Sick Bay Paddock",
    name: "Sick Bay Paddock",
    type: "paddock",
    poly: "220,320 380,315 375,440 215,440",
    labelX: 295,
    labelY: 350,
    areaAcres: 0.8,
    footing: "Non-Slip Rubber & Sand",
  },
  {
    spaceId: "Back Forty",
    name: "Back Forty",
    type: "field",
    poly: "80,480 480,470 470,660 70,660",
    labelX: 270,
    labelY: 530,
    areaAcres: 8.5,
    footing: "Natural Prairie Pasture",
  },
];

// Generous non-overlapping slot offsets relative to paddock label center
const PADDOCK_HORSE_SLOTS: [number, number][] = [
  [-44, 42],
  [44, 42],
  [-44, 86],
  [44, 86],
  [-84, 62],
  [84, 62],
  [0, 64],
  [0, 104],
];

export function SatelliteView({
  spaces,
  events,
  conflictedHorses,
  selection,
  onSelect,
}: SatelliteViewProps) {
  const [mapStyle, setMapStyle] = useState<"satellite" | "topo" | "blueprint">("satellite");
  const [showBoundaries, setShowBoundaries] = useState(true);
  const [showHorses, setShowHorses] = useState(true);
  const [showWaterTroughs, setShowWaterTroughs] = useState(true);
  const [showMudHeatmap, setShowMudHeatmap] = useState(false);
  const [showLayersDropdown, setShowLayersDropdown] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  const matchedPaddocks = useMemo(() => {
    const unmatched = spaces.filter(
      (s) =>
        !PADDOCK_GEOMETRIES.some(
          (g) => g.spaceId === s.id || g.name.toLowerCase() === s.name.toLowerCase()
        )
    );

    return spaces.map((space) => {
      const geo =
        PADDOCK_GEOMETRIES.find(
          (g) => g.spaceId === space.id || g.name.toLowerCase() === space.name.toLowerCase()
        ) ?? null;

      let resolved: PaddockGeo;
      if (geo) {
        resolved = geo;
      } else {
        const k = Math.max(
          unmatched.findIndex((s) => s.id === space.id),
          0
        );
        const col = k % 3;
        const x0 = 640 + col * 108;
        const y0 = 588;
        resolved = {
          spaceId: space.id,
          name: space.name,
          type: space.type,
          poly: `${x0},${y0} ${x0 + 92},${y0} ${x0 + 92},${y0 + 66} ${x0},${y0 + 66}`,
          labelX: x0 + 46,
          labelY: y0 + 26,
          areaAcres: 1.2,
          footing: "Grass",
        };
      }

      const outEvents = events.filter((e) => e.status === "out" && e.spaceId === space.id);
      const hasConflict = outEvents.some((e) => conflictedHorses.has(e.horseId));

      return {
        space,
        geo: resolved,
        outEvents,
        hasConflict,
      };
    });
  }, [spaces, events, conflictedHorses]);

  // Derive non-overlapping horse coordinate positions
  const placedHorses = useMemo(() => {
    const list: {
      event: MapEvent;
      x: number;
      y: number;
      isOut: boolean;
      conflictReason?: string;
    }[] = [];

    // Horses out in paddocks
    matchedPaddocks.forEach(({ geo, outEvents }) => {
      outEvents.forEach((event, i) => {
        const offset = PADDOCK_HORSE_SLOTS[i % PADDOCK_HORSE_SLOTS.length];
        list.push({
          event,
          x: geo.labelX + offset[0],
          y: geo.labelY + offset[1],
          isOut: true,
          conflictReason: conflictedHorses.get(event.horseId),
        });
      });
    });

    // Horses at barn stalls / yard — arranged with generous 48px vertical & 68px horizontal spacing
    const stallHorses = events.filter((e) => e.status !== "out");
    stallHorses.forEach((event, i) => {
      const isLeft = i % 2 === 0;
      const row = Math.floor(i / 2);
      list.push({
        event,
        x: isLeft ? 355 : 645,
        y: 330 + row * 48,
        isOut: false,
        conflictReason: conflictedHorses.get(event.horseId),
      });
    });

    return list;
  }, [matchedPaddocks, events, conflictedHorses]);

  return (
    <div className="relative h-full w-full select-none overflow-hidden bg-[#0f0c0a]">
      {/* Top Map Toolbar — Right aligned to leave left area for View Mode Switcher */}
      <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
        {/* Farm GPS & Weather Badge (hidden on small viewports to prevent wrapping) */}
        <div className="hidden xl:flex items-center gap-2 rounded-xl border border-white/20 bg-[#1c1511]/90 px-3 py-1.5 text-xs text-white shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-1 font-medium text-barnwright-gold">
            <Compass className="size-3.5 animate-[spin_6s_linear_infinite]" />
            <span>Wellington Estate</span>
          </div>
          <span className="opacity-40">|</span>
          <div className="flex items-center gap-1 text-white/90">
            <Sun className="size-3 text-amber-400" />
            <span>74°F</span>
          </div>
          <div className="flex items-center gap-1 text-emerald-400">
            <CheckCircle2 className="size-3" />
            <span>Safe</span>
          </div>
        </div>

        {/* Layers Dropdown Toggle */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowLayersDropdown((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#1c1511]/90 px-3 py-1.5 text-xs font-semibold text-white shadow-xl backdrop-blur-md transition-colors hover:bg-white/10",
              showLayersDropdown && "border-barnwright-gold text-barnwright-gold"
            )}
          >
            <Layers className="size-3.5" />
            <span>Layers</span>
          </button>

          {showLayersDropdown && (
            <div
              className="absolute right-0 top-10 z-30 w-44 rounded-xl border border-white/20 bg-[#1c1511]/95 p-2 text-xs text-white shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-barnwright-gold">
                Map Layers
              </p>
              <div className="space-y-1 mt-1">
                <button
                  type="button"
                  onClick={() => setShowHorses((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <MapPin className="size-3 text-emerald-400" />
                    <span>Horses</span>
                  </span>
                  {showHorses ? (
                    <Eye className="size-3.5 text-barnwright-gold" />
                  ) : (
                    <EyeOff className="size-3.5 text-white/40" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowBoundaries((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Layers className="size-3 text-sky-300" />
                    <span>Fences & Gates</span>
                  </span>
                  {showBoundaries ? (
                    <Eye className="size-3.5 text-barnwright-gold" />
                  ) : (
                    <EyeOff className="size-3.5 text-white/40" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowWaterTroughs((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Droplets className="size-3 text-blue-400" />
                    <span>Water Troughs</span>
                  </span>
                  {showWaterTroughs ? (
                    <Eye className="size-3.5 text-barnwright-gold" />
                  ) : (
                    <EyeOff className="size-3.5 text-white/40" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setShowMudHeatmap((v) => !v)}
                  className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-white/10 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="size-3 text-amber-400" />
                    <span>Mud Radar</span>
                  </span>
                  {showMudHeatmap ? (
                    <Eye className="size-3.5 text-barnwright-gold" />
                  ) : (
                    <EyeOff className="size-3.5 text-white/40" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Style selector */}
        <div className="flex items-center gap-1 rounded-xl border border-white/20 bg-[#1c1511]/90 p-1 text-xs text-white shadow-xl backdrop-blur-md">
          {(
            [
              { id: "satellite", label: "Satellite" },
              { id: "topo", label: "Topo" },
              { id: "blueprint", label: "Blueprint" },
            ] as const
          ).map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setMapStyle(mode.id)}
              className={cn(
                "rounded-lg px-2.5 py-1 font-medium transition-colors",
                mapStyle === mode.id
                  ? "bg-white font-semibold text-[#0a0f1d] shadow"
                  : "text-white/75 hover:bg-white/10 hover:text-white"
              )}
            >
              {mode.label}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Geographic Aerial SVG Canvas */}
      <div
        className="relative h-full w-full cursor-grab active:cursor-grabbing"
        onClick={() => setShowLayersDropdown(false)}
      >
        <svg
          viewBox="0 0 1000 700"
          className="h-full w-full object-cover transition-transform duration-300"
          style={{ transform: `scale(${zoomLevel})` }}
        >
          <defs>
            {/* Satellite Landscape Pattern */}
            <radialGradient id="sunGlow" cx="70%" cy="30%" r="80%">
              <stop offset="0%" stopColor="#2e4d36" />
              <stop offset="50%" stopColor="#1e3827" />
              <stop offset="100%" stopColor="#14261b" />
            </radialGradient>

            {/* Bluegrass Pasture Texture */}
            <pattern id="grassTexture" width="40" height="40" patternUnits="userSpaceOnUse">
              <rect width="40" height="40" fill="#2d4a34" />
              <circle cx="8" cy="12" r="1.5" fill="#385c41" />
              <circle cx="28" cy="24" r="2" fill="#253e2c" />
              <circle cx="18" cy="32" r="1.2" fill="#3e6648" />
            </pattern>

            {/* Arena Sand Footing */}
            <pattern id="arenaSand" width="20" height="20" patternUnits="userSpaceOnUse">
              <rect width="20" height="20" fill="#cfb88c" />
              <line x1="0" y1="5" x2="20" y2="5" stroke="#be9f6d" strokeWidth="1" />
              <line x1="0" y1="15" x2="20" y2="15" stroke="#be9f6d" strokeWidth="1" />
            </pattern>

            {/* Crushed Limestone Path */}
            <pattern id="limestonePath" width="16" height="16" patternUnits="userSpaceOnUse">
              <rect width="16" height="16" fill="#d9cfbe" />
              <circle cx="4" cy="4" r="1" fill="#baa991" />
              <circle cx="12" cy="12" r="1" fill="#baa991" />
            </pattern>

            {/* Mud alert pattern */}
            <pattern id="mudPattern" width="24" height="24" patternUnits="userSpaceOnUse">
              <rect width="24" height="24" fill="none" />
              <circle cx="12" cy="12" r="6" fill="#b0532f" opacity="0.35" />
            </pattern>
          </defs>

          {/* Satellite / Terrain Base */}
          <rect
            width="1000"
            height="700"
            fill={
              mapStyle === "satellite"
                ? "url(#sunGlow)"
                : mapStyle === "topo"
                  ? "#1c2b21"
                  : "#0d1712"
            }
          />

          {/* Surrounding Forest Treelines */}
          <g opacity="0.85">
            <ellipse cx="500" cy="20" rx="490" ry="30" fill="#14261b" />
            <ellipse cx="980" cy="350" rx="30" ry="320" fill="#14261b" />
            <ellipse cx="500" cy="685" rx="490" ry="25" fill="#14261b" />
          </g>

          {/* Natural Estate Pond in Back Forty */}
          <g>
            <path
              d="M 100,580 C 130,550 180,560 210,590 C 230,620 190,650 130,650 C 90,640 80,600 100,580 Z"
              fill="#1d3f4a"
              stroke="#2e5d6e"
              strokeWidth="3"
            />
            <text x="145" y="610" fill="#75b2c7" fontSize="10" fontWeight="bold" opacity="0.7">
              Willow Pond
            </text>
          </g>

          {/* Crushed Limestone Farm Roadways & Walkways */}
          <g>
            <path
              d="M 500,20 L 500,260 C 500,310 430,330 400,350 L 400,470 L 600,470 L 600,350 C 570,330 500,310 500,260"
              fill="none"
              stroke="url(#limestonePath)"
              strokeWidth="24"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <line
              x1="450"
              y1="230"
              x2="380"
              y2="200"
              stroke="url(#limestonePath)"
              strokeWidth="14"
            />
            <line
              x1="550"
              y1="230"
              x2="620"
              y2="200"
              stroke="url(#limestonePath)"
              strokeWidth="14"
            />
            <line
              x1="400"
              y1="470"
              x2="350"
              y2="500"
              stroke="url(#limestonePath)"
              strokeWidth="16"
            />
          </g>

          {/* ================= PADDOCK GIS POLYGONS ================= */}
          {matchedPaddocks.map(({ space, geo, outEvents, hasConflict }) => {
            const isSelected = selection?.kind === "space" && selection.id === space.id;
            const isArena = space.type === "paddock" && space.name.includes("Ring");
            const isRoundPen = space.type === "ring";

            return (
              <g
                key={space.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect({ kind: "space", id: space.id });
                }}
                className="cursor-pointer transition-all duration-200"
              >
                {/* Paddock Ground Surface */}
                <polygon
                  points={geo.poly}
                  fill={
                    isArena
                      ? "url(#arenaSand)"
                      : isRoundPen
                        ? "#be9f6d"
                        : "url(#grassTexture)"
                  }
                  stroke={
                    isSelected
                      ? "#e2b866"
                      : hasConflict
                        ? "#e0422c"
                        : showBoundaries
                          ? "#8ca37b"
                          : "transparent"
                  }
                  strokeWidth={isSelected ? 4 : 2.5}
                  strokeDasharray={isRoundPen ? "6 3" : undefined}
                  className="hover:filter hover:brightness-110"
                />

                {/* Mud overlay if toggled */}
                {showMudHeatmap && (
                  <polygon points={geo.poly} fill="url(#mudPattern)" pointerEvents="none" />
                )}

                {/* Automatic Water Troughs */}
                {showWaterTroughs && (
                  <circle
                    cx={geo.labelX - 45}
                    cy={geo.labelY - 10}
                    r="5"
                    fill="#3b82f6"
                    stroke="#1d4ed8"
                    strokeWidth="1.5"
                  />
                )}

                {/* Center Paddock Tag — elevated to top of paddock */}
                <g transform={`translate(${geo.labelX}, ${geo.labelY})`}>
                  <rect
                    x="-65"
                    y="-15"
                    width="130"
                    height="30"
                    rx="15"
                    fill={isSelected ? "#0f0c0a" : "rgba(15, 12, 10, 0.92)"}
                    stroke={isSelected ? "#e2b866" : "rgba(255,255,255,0.25)"}
                    strokeWidth={isSelected ? 2 : 1}
                  />
                  <text
                    x="0"
                    y="1"
                    fill="#ffffff"
                    fontSize="11"
                    fontWeight="600"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {space.name}
                  </text>
                  <text
                    x="0"
                    y="11"
                    fill="#c7a87c"
                    fontSize="8.5"
                    fontWeight="bold"
                    textAnchor="middle"
                  >
                    {outEvents.length} / {space.capacity ?? "∞"} OUT
                  </text>
                </g>
              </g>
            );
          })}

          {/* ================= MAIN BARN & COURTYARD ================= */}
          <g>
            {/* Stalls & Staging Area */}
            <rect
              x="420"
              y="320"
              width="160"
              height="100"
              rx="6"
              fill="#52241b"
              stroke="#f0e8d9"
              strokeWidth="2"
            />
            {/* Barn Center Roof Gable */}
            <polygon
              points="420,370 500,310 580,370 500,430"
              fill="#381912"
              stroke="#6b3024"
              strokeWidth="1.5"
            />
            {/* Cupola */}
            <rect
              x="490"
              y="360"
              width="20"
              height="20"
              fill="#f0e8d9"
              stroke="#10241c"
              strokeWidth="1"
            />
            <text
              x="500"
              y="374"
              fill="#10241c"
              fontSize="9"
              fontWeight="bold"
              textAnchor="middle"
            >
              BARN
            </text>
          </g>

          {/* ================= LIVE HORSE GPS MARKERS ================= */}
          {showHorses &&
            placedHorses.map(({ event, x, y, conflictReason }) => {
              const isSelected = selection?.kind === "horse" && selection.id === event.horseId;
              const profile = getHorseProfile(event.horseName);

              return (
                <g
                  key={event.id}
                  transform={`translate(${x}, ${y})`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelect({ kind: "horse", id: event.horseId });
                  }}
                  className="cursor-pointer transition-transform duration-150 hover:scale-125"
                >
                  {/* Selection pulse ring */}
                  {isSelected && (
                    <circle
                      cx="0"
                      cy="0"
                      r="18"
                      fill="none"
                      stroke="#e2b866"
                      strokeWidth="2.5"
                      className="animate-ping opacity-75"
                    />
                  )}

                  {/* Conflict alert halo */}
                  {conflictReason && (
                    <circle
                      cx="0"
                      cy="0"
                      r="16"
                      fill="none"
                      stroke="#e0422c"
                      strokeWidth="2"
                      strokeDasharray="4 2"
                    />
                  )}

                  {/* Horse Avatar Circle */}
                  <circle
                    cx="0"
                    cy="0"
                    r="13"
                    fill={profile.bodyColor}
                    stroke={
                      isSelected
                        ? "#e2b866"
                        : conflictReason
                          ? "#e0422c"
                          : STATUS_STROKE[event.status] ?? "#ffffff"
                    }
                    strokeWidth="2"
                  />

                  {/* Horse Initials */}
                  <text
                    x="0"
                    y="1"
                    fill="#ffffff"
                    fontSize="9"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                  >
                    {event.horseName.slice(0, 2).toUpperCase()}
                  </text>

                  {/* Floating Name Label */}
                  <g transform="translate(0, 19)">
                    <rect
                      x="-28"
                      y="-7"
                      width="56"
                      height="14"
                      rx="7"
                      fill="#10241c"
                      stroke="rgba(255,255,255,0.3)"
                      strokeWidth="0.8"
                    />
                    <text
                      x="0"
                      y="1"
                      fill="#ffffff"
                      fontSize="7.5"
                      fontWeight="600"
                      textAnchor="middle"
                      dominantBaseline="middle"
                    >
                      {event.horseName}
                    </text>
                  </g>
                </g>
              );
            })}
        </svg>
      </div>

      {/* Zoom Controls */}
      <div className="absolute bottom-4 right-4 z-20 flex flex-col gap-1 rounded-xl border border-white/20 bg-[#10241c]/90 p-1 text-white shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(z + 0.25, 2))}
          className="rounded-lg p-1.5 hover:bg-white/10"
          title="Zoom In"
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(z - 0.25, 0.75))}
          className="rounded-lg p-1.5 hover:bg-white/10"
          title="Zoom Out"
        >
          <Minimize2 className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoomLevel(1)}
          className="rounded-lg p-1.5 hover:bg-white/10"
          title="Reset View"
        >
          <Crosshair className="size-4" />
        </button>
      </div>
    </div>
  );
}
