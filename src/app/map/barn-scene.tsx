"use client";

import { useMemo, useRef, useEffect } from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { RealisticHorseModel, type HorsePlacement } from "./realistic-horse-model";
import {
  findConflictPairs,
  buildPairKey,
  type MapCompatRule,
  type MapEvent,
  type MapSpace,
  type Selection,
} from "./types";

export type WeatherMode = "AM" | "NOON" | "PM" | "RAIN";

type SceneProps = {
  spaces: MapSpace[];
  events: MapEvent[];
  compatRules: MapCompatRule[];
  lighting: WeatherMode;
  selection: Selection;
  onSelect: (selection: Selection) => void;
  cameraPreset?: "drone" | "barnyard" | "default";
};

/* ------------------------------------------------------------------ */
/* Realistic Palette & Materials                                      */
/* ------------------------------------------------------------------ */

const PALETTE = {
  grass: "#486e3f",
  grassLush: "#3e6336",
  dirt: "#bfa982",
  dirtDark: "#94805e",
  arenaSand: "#d4bf94",
  barnWood: "#7a2e22", // Classic Barn Red
  barnTrim: "#f4eedf", // Cream White
  roof: "#2e2522",
  fenceWood: "#8c6f4b",
  fenceWhite: "#f6f3eb",
  metalPipe: "#6c7278",
  water: "#366478",
  tractorGreen: "#367c2b",
  tractorYellow: "#ffde00",
  hay: "#d6bc74",
  stone: "#7a7d78",
};

const M = {
  grass: new THREE.MeshStandardMaterial({
    color: PALETTE.grass,
    roughness: 0.95,
    metalness: 0.05,
  }),
  grassWet: new THREE.MeshStandardMaterial({
    color: "#2a4225",
    roughness: 0.35,
    metalness: 0.2,
  }),
  dirtRoad: new THREE.MeshStandardMaterial({
    color: PALETTE.dirt,
    roughness: 0.9,
  }),
  arenaSand: new THREE.MeshStandardMaterial({
    color: PALETTE.arenaSand,
    roughness: 0.95,
  }),
  water: new THREE.MeshStandardMaterial({
    color: PALETTE.water,
    roughness: 0.1,
    metalness: 0.3,
    transparent: true,
    opacity: 0.88,
  }),
  barn: new THREE.MeshStandardMaterial({
    color: PALETTE.barnWood,
    roughness: 0.75,
  }),
  trim: new THREE.MeshStandardMaterial({
    color: PALETTE.barnTrim,
    roughness: 0.6,
  }),
  roof: new THREE.MeshStandardMaterial({
    color: PALETTE.roof,
    roughness: 0.85,
  }),
  fenceWood: new THREE.MeshStandardMaterial({
    color: PALETTE.fenceWood,
    roughness: 0.85,
  }),
  fenceWhite: new THREE.MeshStandardMaterial({
    color: PALETTE.fenceWhite,
    roughness: 0.5,
  }),
  metalPipe: new THREE.MeshStandardMaterial({
    color: PALETTE.metalPipe,
    metalness: 0.7,
    roughness: 0.35,
  }),
  hay: new THREE.MeshStandardMaterial({
    color: PALETTE.hay,
    roughness: 1,
  }),
  lanternGlow: new THREE.MeshBasicMaterial({
    color: "#ffc86b",
  }),
  brassPlaque: new THREE.MeshStandardMaterial({
    color: "#d4af37",
    metalness: 0.85,
    roughness: 0.25,
  }),
  trunk: new THREE.MeshStandardMaterial({
    color: "#5c4028",
    roughness: 0.95,
  }),
  birchTrunk: new THREE.MeshStandardMaterial({
    color: "#e8e5dc",
    roughness: 0.85,
  }),
  oakLeaves: new THREE.MeshStandardMaterial({
    color: "#355931",
    roughness: 0.9,
  }),
  pineLeaves: new THREE.MeshStandardMaterial({
    color: "#223d24",
    roughness: 0.9,
  }),
};

/* ------------------------------------------------------------------ */
/* Deterministic Layout of Turnout Spaces                             */
/* ------------------------------------------------------------------ */

type Plot = {
  space: MapSpace;
  x: number;
  z: number;
  w: number;
  d: number;
  isArena: boolean;
  isRoundPen: boolean;
};

function layoutPlots(spaces: MapSpace[]): Plot[] {
  return spaces.map((space, i) => {
    const n = Math.max(spaces.length, 1);
    const angle = -Math.PI / 2 + (i / n) * Math.PI * 2;
    const radiusX = 26 + (i % 2) * 8;
    const radiusZ = 22 + ((i + 1) % 2) * 6;

    const isArena = space.type === "paddock" && space.name.toLowerCase().includes("ring");
    const isRoundPen = space.type === "ring";

    const size =
      space.type === "field"
        ? { w: 15, d: 13 }
        : isArena
          ? { w: 14, d: 11 }
          : isRoundPen
            ? { w: 9, d: 9 }
            : { w: 11, d: 9 };

    return {
      space,
      x: Math.cos(angle) * radiusX,
      z: Math.sin(angle) * radiusZ * 0.92,
      isArena,
      isRoundPen,
      ...size,
    };
  });
}

const PASTURE_SLOTS: [number, number][] = [
  [0, 0],
  [2.4, 1.2],
  [-2.6, 1.4],
  [1.2, -2.2],
  [-1.4, -2.4],
  [-3.2, -0.4],
  [3.4, -0.6],
  [0.4, 3.1],
];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------------ */
/* 3D Props & Structures                                              */
/* ------------------------------------------------------------------ */

function PostAndRailFence({ w, d, isWhite }: { w: number; d: number; isWhite?: boolean }) {
  const mat = isWhite ? M.fenceWhite : M.fenceWood;
  const postStep = 3.5;
  const countX = Math.ceil(w / postStep);
  const countZ = Math.ceil(d / postStep);

  const posts: [number, number][] = [];
  for (let i = 0; i <= countX; i++) {
    const x = -w / 2 + (i / countX) * w;
    posts.push([x, -d / 2]);
    posts.push([x, d / 2]);
  }
  for (let j = 1; j < countZ; j++) {
    const z = -d / 2 + (j / countZ) * d;
    posts.push([-w / 2, z]);
    posts.push([w / 2, z]);
  }

  return (
    <group>
      {/* Fence Posts */}
      {posts.map(([px, pz], i) => (
        <mesh key={i} position={[px, 0.65, pz]} material={mat} castShadow>
          <boxGeometry args={[0.16, 1.3, 0.16]} />
        </mesh>
      ))}

      {/* 3 Rails along perimeter */}
      {[0.4, 0.75, 1.1].map((y) => (
        <group key={y}>
          <mesh position={[0, y, -d / 2]} material={mat}>
            <boxGeometry args={[w, 0.08, 0.045]} />
          </mesh>
          <mesh position={[0, y, d / 2]} material={mat}>
            <boxGeometry args={[w, 0.08, 0.045]} />
          </mesh>
          <mesh position={[-w / 2, y, 0]} material={mat}>
            <boxGeometry args={[0.045, 0.08, d]} />
          </mesh>
          <mesh position={[w / 2, y, 0]} material={mat}>
            <boxGeometry args={[0.045, 0.08, d]} />
          </mesh>
        </group>
      ))}

      {/* Entrance gate just outside the fence, where the path meets */}
      <group position={[0, 0, d / 2 + 0.9]}>
        <mesh position={[-1.2, 0.7, 0]} material={M.fenceWhite} castShadow>
          <boxGeometry args={[0.18, 1.4, 0.18]} />
        </mesh>
        <mesh position={[1.2, 0.7, 0]} material={M.fenceWhite} castShadow>
          <boxGeometry args={[0.18, 1.4, 0.18]} />
        </mesh>
        {[0.6, 1.1].map((y) => (
          <mesh key={y} position={[0, y, 0]} material={M.fenceWhite} castShadow>
            <boxGeometry args={[2.4, 0.09, 0.06]} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

function PipeRoundPen({ radius }: { radius: number }) {
  const count = 16;
  return (
    <group>
      {Array.from({ length: count }).map((_, i) => {
        const a = (i / count) * Math.PI * 2;
        return (
          <mesh
            key={i}
            material={M.metalPipe}
            position={[Math.cos(a) * radius, 0.75, Math.sin(a) * radius]}
            castShadow
          >
            <cylinderGeometry args={[0.06, 0.06, 1.5, 8]} />
          </mesh>
        );
      })}
      {[0.4, 0.8, 1.2].map((y) => (
        <mesh key={y} rotation-x={Math.PI / 2} position={[0, y, 0]}>
          <torusGeometry args={[radius, 0.035, 6, 48]} />
          <primitive object={M.metalPipe} attach="material" />
        </mesh>
      ))}
    </group>
  );
}

function DressageArenaLetters({ w, d }: { w: number; d: number }) {
  const letters = [
    { label: "C", pos: [0, 0.45, -d / 2 - 0.5] as [number, number, number] },
    { label: "A", pos: [0, 0.45, d / 2 + 0.5] as [number, number, number] },
    { label: "B", pos: [-w / 2 - 0.5, 0.45, 0] as [number, number, number] },
    { label: "E", pos: [w / 2 + 0.5, 0.45, 0] as [number, number, number] },
    { label: "H", pos: [-w / 2 - 0.5, 0.45, -d / 3] as [number, number, number] },
    { label: "M", pos: [w / 2 + 0.5, 0.45, -d / 3] as [number, number, number] },
    { label: "K", pos: [-w / 2 - 0.5, 0.45, d / 3] as [number, number, number] },
    { label: "F", pos: [w / 2 + 0.5, 0.45, d / 3] as [number, number, number] },
  ];

  return (
    <group>
      {letters.map((item, i) => (
        <group key={i} position={item.pos}>
          <mesh material={M.trim} castShadow>
            <cylinderGeometry args={[0.2, 0.24, 0.8, 8]} />
          </mesh>
          <Html position={[0, 0.6, 0]} center distanceFactor={22} zIndexRange={[10, 0]}>
            <span className="font-mono text-[10px] font-extrabold text-[#10241c] bg-white/90 px-1 py-0.5 rounded shadow">
              {item.label}
            </span>
          </Html>
        </group>
      ))}

      {/* Show Jump Obstacles */}
      <group position={[-2.5, 0, 0]}>
        {/* Jump Standards */}
        <mesh position={[-1.2, 0.7, 0]} material={M.fenceWhite} castShadow>
          <boxGeometry args={[0.2, 1.4, 0.2]} />
        </mesh>
        <mesh position={[1.2, 0.7, 0]} material={M.fenceWhite} castShadow>
          <boxGeometry args={[0.2, 1.4, 0.2]} />
        </mesh>
        {/* Striped Jump Pole */}
        <mesh position={[0, 0.9, 0]} rotation-z={Math.PI / 2} material={M.trim} castShadow>
          <cylinderGeometry args={[0.06, 0.06, 2.3, 8]} />
        </mesh>
      </group>
    </group>
  );
}

function WaterTrough({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Galvanized / Poly Tub */}
      <mesh position={[0, 0.35, 0]} material={M.metalPipe} castShadow>
        <cylinderGeometry args={[0.7, 0.6, 0.7, 16]} />
      </mesh>
      {/* Water Surface */}
      <mesh position={[0, 0.62, 0]} rotation-x={-Math.PI / 2} material={M.water}>
        <circleGeometry args={[0.65, 16]} />
      </mesh>
    </group>
  );
}

function AmericanHeritageBarn() {
  return (
    <group>
      {/* Main Timber Barn Structure */}
      <mesh position={[0, 2.2, 0]} material={M.barn} castShadow receiveShadow>
        <boxGeometry args={[13, 4.4, 7.8]} />
      </mesh>

      {/* Dutch Gable Gambrel Roof */}
      <mesh position={[0, 5.2, -2.1]} rotation-x={0.65} material={M.roof} castShadow>
        <boxGeometry args={[13.8, 0.25, 4.5]} />
      </mesh>
      <mesh position={[0, 5.2, 2.1]} rotation-x={-0.65} material={M.roof} castShadow>
        <boxGeometry args={[13.8, 0.25, 4.5]} />
      </mesh>

      {/* White Trim Ridge & Eaves */}
      <mesh position={[0, 6.35, 0]} material={M.trim}>
        <boxGeometry args={[13.9, 0.18, 0.3]} />
      </mesh>

      {/* Roof Cupolas with Horse Weathervane */}
      {[-3.5, 3.5].map((cx) => (
        <group key={cx} position={[cx, 6.8, 0]}>
          <mesh material={M.trim} castShadow>
            <boxGeometry args={[1.3, 0.9, 1.3]} />
          </mesh>
          <mesh position={[0, 0.8, 0]} rotation-y={Math.PI / 4} material={M.roof}>
            <coneGeometry args={[1.1, 0.85, 4]} />
          </mesh>
          {/* Weathervane spire */}
          <mesh position={[0, 1.45, 0]} material={M.brassPlaque}>
            <cylinderGeometry args={[0.02, 0.02, 0.6, 6]} />
          </mesh>
        </group>
      ))}

      {/* Double Sliding Cross-Buck Barn Doors */}
      {[-3.2, 3.2].map((dx) => (
        <group key={dx} position={[dx, 1.5, 3.95]}>
          <mesh material={M.roof}>
            <boxGeometry args={[2.4, 3, 0.12]} />
          </mesh>
          <mesh material={M.trim}>
            <boxGeometry args={[2.2, 2.8, 0.14]} />
          </mesh>
        </group>
      ))}

      {/* Glowing Stable Sconce Lanterns */}
      {[-5, -1.6, 1.6, 5].map((lx) => (
        <group key={lx} position={[lx, 2.8, 4.02]}>
          <mesh material={M.roof}>
            <boxGeometry args={[0.18, 0.32, 0.18]} />
          </mesh>
          <mesh position={[0, 0, 0.05]} material={M.lanternGlow}>
            <sphereGeometry args={[0.08, 8, 8]} />
          </mesh>
          <pointLight color="#ffbe53" intensity={0.65} distance={5} />
        </group>
      ))}

      {/* Exterior Dutch Stall Row facing the Barnyard */}
      {[-6.2, -4.4, -2.6, -0.8, 1, 2.8, 4.6, 6.4].map((sx, i) => (
        <group key={i} position={[sx, 0, 6.8]}>
          {/* Stall Wall */}
          <mesh position={[0, 0.9, 0]} material={M.fenceWood} castShadow>
            <boxGeometry args={[1.6, 1.8, 1.8]} />
          </mesh>
          {/* Open Dutch Door Upper */}
          <mesh position={[0, 1.1, 0.92]} material={M.trim}>
            <boxGeometry args={[1.3, 0.1, 0.05]} />
          </mesh>
          {/* Brass Nameplate */}
          <mesh position={[0, 1.35, 0.92]} material={M.brassPlaque}>
            <boxGeometry args={[0.5, 0.14, 0.02]} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function EstateTractor({ position }: { position: [number, number, number] }) {
  return (
    <group position={position} rotation-y={0.4}>
      {/* Tractor Green Body */}
      <mesh position={[0, 0.7, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 2.2]} />
        <meshStandardMaterial color={PALETTE.tractorGreen} roughness={0.4} metalness={0.4} />
      </mesh>
      {/* Engine Hood */}
      <mesh position={[0, 0.6, 0.8]} castShadow>
        <boxGeometry args={[1.1, 0.6, 1.2]} />
        <meshStandardMaterial color={PALETTE.tractorGreen} roughness={0.4} />
      </mesh>
      {/* ROPS Roll Bar */}
      <mesh position={[0, 1.6, -0.4]} material={M.metalPipe}>
        <torusGeometry args={[0.55, 0.05, 6, 16, Math.PI]} />
      </mesh>
      {/* Big Rear Yellow Wheels */}
      {[-0.7, 0.7].map((wx) => (
        <mesh key={wx} position={[wx, 0.65, -0.6]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 0.35, 16]} />
          <meshStandardMaterial color={PALETTE.tractorYellow} roughness={0.6} />
        </mesh>
      ))}
      {/* Front Wheels */}
      {[-0.6, 0.6].map((wx) => (
        <mesh key={wx} position={[wx, 0.4, 1.1]} rotation-z={Math.PI / 2} castShadow>
          <cylinderGeometry args={[0.4, 0.4, 0.25, 16]} />
          <meshStandardMaterial color={PALETTE.tractorYellow} roughness={0.6} />
        </mesh>
      ))}
      {/* Stacked Round Hay Bales */}
      <group position={[2.4, 0, 0]}>
        <mesh position={[0, 0.65, 0]} rotation-x={Math.PI / 2} material={M.hay} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.2, 16]} />
        </mesh>
        <mesh position={[1.3, 0.65, 0]} rotation-x={Math.PI / 2} material={M.hay} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.2, 16]} />
        </mesh>
        <mesh position={[0.65, 1.7, 0]} rotation-x={Math.PI / 2} material={M.hay} castShadow>
          <cylinderGeometry args={[0.65, 0.65, 1.2, 16]} />
        </mesh>
      </group>
    </group>
  );
}

function EstateTree({
  position,
  type,
  scale,
}: {
  position: [number, number, number];
  type: "oak" | "birch" | "pine";
  scale: number;
}) {
  return (
    <group position={position} scale={scale}>
      {type === "pine" ? (
        <>
          <mesh material={M.trunk} position={[0, 1, 0]} castShadow>
            <cylinderGeometry args={[0.18, 0.28, 2, 8]} />
          </mesh>
          <mesh material={M.pineLeaves} position={[0, 2.8, 0]} castShadow>
            <coneGeometry args={[1.5, 3.2, 8]} />
          </mesh>
          <mesh material={M.pineLeaves} position={[0, 4.2, 0]} castShadow>
            <coneGeometry args={[1.1, 2.6, 8]} />
          </mesh>
        </>
      ) : type === "birch" ? (
        <>
          <mesh material={M.birchTrunk} position={[0, 1.4, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.22, 2.8, 8]} />
          </mesh>
          <mesh material={M.oakLeaves} position={[0, 3.2, 0]} castShadow>
            <sphereGeometry args={[1.3, 8, 8]} />
          </mesh>
        </>
      ) : (
        <>
          <mesh material={M.trunk} position={[0, 1.2, 0]} castShadow>
            <cylinderGeometry args={[0.26, 0.38, 2.4, 8]} />
          </mesh>
          <mesh material={M.oakLeaves} position={[0, 3.6, 0]} scale={[1.4, 1.1, 1.3]} castShadow>
            <sphereGeometry args={[1.8, 10, 10]} />
          </mesh>
        </>
      )}
    </group>
  );
}

function RainParticles() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 700;

  // Seeded RNG keeps this a pure computation (render-safe) while still
  // looking random; the same storm falls on every reload.
  const positions = useMemo(() => {
    const rand = mulberry32(777001);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 120;
      pos[i * 3 + 1] = rand() * 40;
      pos[i * 3 + 2] = (rand() - 0.5) * 120;
    }
    return pos;
  }, []);

  useFrame((_, delta) => {
    if (!pointsRef.current) return;
    const geom = pointsRef.current.geometry;
    const posAttr = geom.attributes.position;
    const array = posAttr.array as Float32Array;

    for (let i = 0; i < count; i++) {
      array[i * 3 + 1] -= delta * 35;
      if (array[i * 3 + 1] < 0) {
        array[i * 3 + 1] = 40;
      }
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        color="#a5c4d4"
        size={0.25}
        transparent
        opacity={0.65}
        depthWrite={false}
      />
    </points>
  );
}

/* ------------------------------------------------------------------ */
/* Interactive Paddock Label                                          */
/* ------------------------------------------------------------------ */

function PlotLabel({
  plot,
  count,
  capacity,
  hasConflict,
  selected,
  onSelect,
}: {
  plot: Plot;
  count: number;
  capacity: number | null;
  hasConflict: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <Html position={[plot.x, 3.4, plot.z]} center distanceFactor={34} zIndexRange={[15, 0]}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
        className={`flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold shadow-lg backdrop-blur-md transition-all duration-200 ${
          selected
            ? "border-onstride-gold bg-[#10241c] text-[#f7f4ef] scale-110 shadow-[0_8px_24px_-8px_rgba(226,184,102,0.55)]"
            : "border-[#10241c]/15 bg-white/95 text-[#10241c] hover:border-onstride-gold hover:scale-105"
        }`}
      >
        <span>{plot.space.name}</span>
        <span className="rounded-full bg-[#10241c]/10 px-1.5 py-0.5 font-mono text-[10px] tabular-nums">
          {count}/{capacity ?? "∞"}
        </span>
        {hasConflict && (
          <span className="flex size-4 items-center justify-center rounded-full bg-[#e0422c] font-bold text-white text-[10px]">
            !
          </span>
        )}
      </button>
    </Html>
  );
}

/* ------------------------------------------------------------------ */
/* Main 3D Scene Contents                                             */
/* ------------------------------------------------------------------ */

function SceneContents({
  spaces,
  events,
  compatRules,
  lighting,
  selection,
  onSelect,
  cameraPreset,
}: SceneProps) {
  const plots = useMemo(() => layoutPlots(spaces), [spaces]);
  const controlsRef = useRef<OrbitControlsImpl>(null);

  const conflictLookup = useMemo(() => {
    const map = new Map<string, string | null>();
    for (const rule of compatRules) {
      map.set(buildPairKey(rule.horseAId, rule.horseBId), rule.reason);
    }
    return map;
  }, [compatRules]);

  const conflictByHorse = useMemo(() => {
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
        const reason = pair.reason ?? "compatibility rule";
        map.set(pair.a, reason);
        map.set(pair.b, reason);
      }
    }
    return map;
  }, [events, conflictLookup]);

  const spaceStats = useMemo(() => {
    const stats = new Map<string, { count: number; conflict: boolean }>();
    for (const plot of plots) stats.set(plot.space.id, { count: 0, conflict: false });
    for (const event of events) {
      if (event.status !== "out") continue;
      const stat = stats.get(event.spaceId);
      if (!stat) continue;
      stat.count += 1;
      if (conflictByHorse.has(event.horseId)) stat.conflict = true;
    }
    return stats;
  }, [events, plots, conflictByHorse]);

  const placements = useMemo<HorsePlacement[]>(() => {
    const result: HorsePlacement[] = [];
    const outBySpace = new Map<string, MapEvent[]>();

    for (const event of events) {
      if (event.status !== "out") continue;
      const list = outBySpace.get(event.spaceId) ?? [];
      list.push(event);
      outBySpace.set(event.spaceId, list);
    }

    // Out horses placed inside their realistic paddock
    for (const plot of plots) {
      const residents = outBySpace.get(plot.space.id) ?? [];
      residents.forEach((event, i) => {
        const slot = PASTURE_SLOTS[i % PASTURE_SLOTS.length];
        result.push({
          event,
          position: [
            plot.x + slot[0] * (plot.w / 12),
            0,
            plot.z + slot[1] * (plot.d / 12),
          ],
          rotationY: mulberry32(i + Math.abs(plot.x))() * Math.PI * 2,
          phase: i * 1.7 + plot.z,
          conflictReason: conflictByHorse.get(event.horseId) ?? null,
          isInPasture: true,
        });
      });
    }

    // Yard / In-stall horses: each stands directly in front of its stall
    // bay (the stall row's bay centers), facing out toward the viewer.
    const STALL_BAY_X = [-6.2, -4.4, -2.6, -0.8, 1.0, 2.8, 4.6, 6.4];
    const yardHorses = events.filter((e) => e.status !== "out");
    yardHorses.forEach((event, i) => {
      const col = i % STALL_BAY_X.length;
      const row = Math.floor(i / STALL_BAY_X.length);
      result.push({
        event,
        position: [STALL_BAY_X[col], 0, 9.7 + row * 2.3],
        rotationY: (mulberry32(i * 31 + 7)() - 0.5) * 0.4,
        phase: i * 1.2,
        conflictReason: conflictByHorse.get(event.horseId) ?? null,
        isInPasture: false,
      });
    });

    return result;
  }, [events, plots, conflictByHorse]);

  // Trees generation
  const trees = useMemo(() => {
    const rand = mulberry32(20260822);
    const list: {
      pos: [number, number, number];
      type: "oak" | "birch" | "pine";
      scale: number;
    }[] = [];
    const treeTypes: ("oak" | "birch" | "pine")[] = ["oak", "birch", "pine"];

    let guard = 0;
    while (list.length < 28 && guard++ < 300) {
      const angle = rand() * Math.PI * 2;
      const radius = 32 + rand() * 22;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius * 0.88;
      const clearOfBarn = Math.abs(x) > 11 || Math.abs(z) > 11;
      const clearOfPlots = plots.every(
        (p) => Math.abs(x - p.x) > p.w / 2 + 2.5 || Math.abs(z - p.z) > p.d / 2 + 2.5
      );
      if (clearOfBarn && clearOfPlots) {
        list.push({
          pos: [x, 0, z],
          type: treeTypes[Math.floor(rand() * treeTypes.length)],
          scale: 0.85 + rand() * 0.5,
        });
      }
    }
    return list;
  }, [plots]);

  // Camera preset focus
  useEffect(() => {
    if (!controlsRef.current) return;
    if (cameraPreset === "barnyard") {
      controlsRef.current.target.set(0, 1.2, 7);
      controlsRef.current.object.position.set(0, 5, 20);
    } else if (cameraPreset === "drone") {
      controlsRef.current.target.set(0, 0, 2);
      controlsRef.current.object.position.set(48, 38, 48);
    }
    controlsRef.current.update();
  }, [cameraPreset]);

  // Smoothly target selected horse
  useEffect(() => {
    if (selection?.kind === "horse" && controlsRef.current) {
      const targetPlacement = placements.find((p) => p.event.horseId === selection.id);
      if (targetPlacement) {
        controlsRef.current.target.set(
          targetPlacement.position[0],
          1.2,
          targetPlacement.position[2]
        );
        controlsRef.current.update();
      }
    } else if (selection?.kind === "space" && controlsRef.current) {
      const targetPlot = plots.find((p) => p.space.id === selection.id);
      if (targetPlot) {
        controlsRef.current.target.set(targetPlot.x, 1, targetPlot.z);
        controlsRef.current.update();
      }
    }
  }, [selection, placements, plots]);

  // Dynamic Lighting parameters based on WeatherMode
  const { sunPos, sunColor, sunIntensity, ambientColor, skyColor, fogDensity } =
    useMemo(() => {      switch (lighting) {
        case "AM": // Morning golden sunrise
          return {
            sunPos: [42, 28, 22] as [number, number, number],
            sunColor: "#ffe7b8",
            sunIntensity: 1.6,
            ambientColor: "#e8efe1",
            skyColor: "#e2ecdc",
            fogDensity: 0.007,
          };
        case "NOON": // Crisp Midday
          return {
            sunPos: [10, 48, 10] as [number, number, number],
            sunColor: "#ffffff",
            sunIntensity: 1.85,
            ambientColor: "#f4f8ed",
            skyColor: "#dbe8f4",
            fogDensity: 0.004,
          };
        case "PM": // Sunset Golden Hour
          return {
            sunPos: [-42, 20, -18] as [number, number, number],
            sunColor: "#ffaa5e",
            sunIntensity: 1.45,
            ambientColor: "#f6e4d0",
            skyColor: "#f7dcc1",
            fogDensity: 0.006,
          };
        case "RAIN": // Moody Rain & Overcast
          return {
            sunPos: [20, 30, 20] as [number, number, number],
            sunColor: "#b8c9d4",
            sunIntensity: 0.7,
            ambientColor: "#c2d1db",
            skyColor: "#9bb3c2",
            fogDensity: 0.014,
          };
      }
    }, [lighting]);

  const isRaining = lighting === "RAIN";

  return (
    <>
      <color attach="background" args={[skyColor]} />
      <fogExp2 attach="fog" args={[skyColor, fogDensity]} />

      <hemisphereLight intensity={0.7} groundColor={PALETTE.grass} color={ambientColor} />
      <ambientLight intensity={0.3} color={ambientColor} />
      <directionalLight
        position={sunPos}
        intensity={sunIntensity}
        color={sunColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0003}
        shadow-camera-left={-55}
        shadow-camera-right={55}
        shadow-camera-top={55}
        shadow-camera-bottom={-55}
        shadow-camera-far={130}
      />

      {/* Main Pasture Grass Base */}
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <planeGeometry args={[260, 260]} />
        <primitive object={isRaining ? M.grassWet : M.grass} attach="material" />
      </mesh>

      {/* Central Staging Courtyard */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.02, 3]} receiveShadow>
        <circleGeometry args={[13, 64]} />
        <primitive object={M.dirtRoad} attach="material" />
      </mesh>

      {/* Dirt Roadways radiating from Barnyard to Each Space */}
      {plots.map((plot) => {
        const dx = plot.x;
        const dz = plot.z - 3;
        const dist = Math.hypot(dx, dz);
        const ux = dx / dist;
        const uz = dz / dist;
        const startDist = 12.8;
        const endDist = Math.max(dist - Math.max(plot.w, plot.d) / 2 - 0.5, startDist + 2);
        const len = endDist - startDist;

        return (
          <group key={`path-${plot.space.id}`} rotation-y={Math.atan2(ux, uz)}>
            <mesh
              rotation-x={-Math.PI / 2}
              position={[0, 0.018, (startDist + endDist) / 2]}
              receiveShadow
            >
              <planeGeometry args={[1.8, len]} />
              <primitive object={M.dirtRoad} attach="material" />
            </mesh>
          </group>
        );
      })}

      {/* American Heritage Barn */}
      <AmericanHeritageBarn />

      {/* Utility Tractor & Hay Bales — parked on the grass beside the yard */}
      <EstateTractor position={[-14.5, 0, 8.5]} />

      {/* All Paddock Plots & Rings */}
      {plots.map((plot) => {
        const stats = spaceStats.get(plot.space.id) ?? { count: 0, conflict: false };

        return (
          <group key={plot.space.id} position={[plot.x, 0, plot.z]}>
            {/* Footing Surface */}
            <mesh rotation-x={-Math.PI / 2} position={[0, 0.015, 0]} receiveShadow>
              {plot.isRoundPen ? (
                <circleGeometry args={[plot.w / 2 - 0.4, 32]} />
              ) : (
                <planeGeometry args={[plot.w - 0.4, plot.d - 0.4]} />
              )}
              <primitive
                object={
                  plot.isArena || plot.isRoundPen
                    ? M.arenaSand
                    : isRaining
                      ? M.grassWet
                      : M.grass
                }
                attach="material"
              />
            </mesh>

            {/* Fencing */}
            {plot.isRoundPen ? (
              <PipeRoundPen radius={plot.w / 2 - 0.6} />
            ) : (
              <PostAndRailFence w={plot.w} d={plot.d} isWhite={plot.isArena} />
            )}

            {/* Arena Dressage Letters & Jump Standard */}
            {plot.isArena && <DressageArenaLetters w={plot.w} d={plot.d} />}

            {/* Water Trough — rect plots only, far corner away from the gate */}
            {!plot.isArena && !plot.isRoundPen && (
              <WaterTrough
                position={[
                  -plot.w / 2 + 1.6,
                  0,
                  plot.d / 2 - 1.6,
                ]}
              />
            )}

            {/* Floating Paddock Tag */}
            <PlotLabel
              plot={plot}
              count={stats.count}
              capacity={plot.space.capacity}
              hasConflict={stats.conflict}
              selected={selection?.kind === "space" && selection.id === plot.space.id}
              onSelect={() => onSelect({ kind: "space", id: plot.space.id })}
            />
          </group>
        );
      })}

      {/* Trees and Woods */}
      {trees.map((tree, i) => (
        <EstateTree key={i} position={tree.pos} type={tree.type} scale={tree.scale} />
      ))}

      {/* Realistic 3D Horses */}
      {placements.map((placement) => (
        <RealisticHorseModel
          key={placement.event.id}
          placement={placement}
          selected={
            selection?.kind === "horse" && selection.id === placement.event.horseId
          }
          onSelect={() => onSelect({ kind: "horse", id: placement.event.horseId })}
        />
      ))}

      {/* Rain Effect in Rain Mode */}
      {isRaining && <RainParticles />}

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0, 2]}
        enableDamping
        dampingFactor={0.08}
        minDistance={10}
        maxDistance={120}
        maxPolarAngle={Math.PI / 2.1}
      />
    </>
  );
}

export default function BarnScene(props: SceneProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      camera={{ position: [38, 30, 42], fov: 40, near: 0.5, far: 450 }}
      gl={{ antialias: true }}
      onPointerMissed={() => props.onSelect(null)}
    >
      <SceneContents {...props} />
    </Canvas>
  );
}
