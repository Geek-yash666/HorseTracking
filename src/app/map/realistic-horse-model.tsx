"use client";

import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { getHorseProfile, type HorseCoatProfile } from "./horse-profiles";
import type { MapEvent } from "./types";

export type HorsePlacement = {
  event: MapEvent;
  position: [number, number, number];
  rotationY: number;
  phase: number;
  conflictReason: string | null;
  isInPasture: boolean;
};

// Cached shared geometry instances to keep memory lightweight and 60fps rendering
const G = {
  barrel: new THREE.CapsuleGeometry(0.29, 0.88, 8, 16),
  croup: new THREE.SphereGeometry(0.31, 12, 12),
  withers: new THREE.CapsuleGeometry(0.19, 0.38, 6, 8),
  neck: new THREE.CylinderGeometry(0.13, 0.22, 0.65, 10),
  head: new THREE.BoxGeometry(0.18, 0.22, 0.38),
  muzzle: new THREE.CylinderGeometry(0.11, 0.14, 0.26, 10),
  nostril: new THREE.SphereGeometry(0.022, 6, 6),
  eye: new THREE.SphereGeometry(0.032, 8, 8),
  ear: new THREE.ConeGeometry(0.045, 0.16, 6),
  maneTuft: new THREE.BoxGeometry(0.07, 0.18, 0.12),
  forelock: new THREE.ConeGeometry(0.04, 0.18, 5),
  shoulder: new THREE.SphereGeometry(0.13, 8, 8),
  upperLeg: new THREE.CylinderGeometry(0.065, 0.05, 0.4, 8),
  knee: new THREE.SphereGeometry(0.054, 8, 8),
  cannonBone: new THREE.CylinderGeometry(0.045, 0.038, 0.35, 8),
  fetlock: new THREE.SphereGeometry(0.045, 8, 8),
  hoof: new THREE.CylinderGeometry(0.04, 0.062, 0.09, 10),
  tailSegment1: new THREE.CylinderGeometry(0.06, 0.075, 0.28, 8),
  tailSegment2: new THREE.CylinderGeometry(0.07, 0.08, 0.32, 8),
  tailSegment3: new THREE.ConeGeometry(0.08, 0.38, 8),
  halterStrapX: new THREE.BoxGeometry(0.2, 0.025, 0.02),
  halterStrapZ: new THREE.BoxGeometry(0.02, 0.025, 0.24),
  halterRing: new THREE.TorusGeometry(0.025, 0.007, 6, 12),
  starMarking: new THREE.CircleGeometry(0.045, 7),
  blazeMarking: new THREE.PlaneGeometry(0.048, 0.28),
  pintoPatch: new THREE.SphereGeometry(0.32, 8, 8),
  bandageWrap: new THREE.CylinderGeometry(0.052, 0.052, 0.22, 10),
  haloRing: new THREE.TorusGeometry(0.85, 0.035, 10, 48),
  alertRing: new THREE.TorusGeometry(0.32, 0.04, 8, 28),
};

const BRASS_MAT = new THREE.MeshStandardMaterial({
  color: "#d4af37",
  metalness: 0.85,
  roughness: 0.25,
});

const EYE_MAT = new THREE.MeshStandardMaterial({
  color: "#0a0908",
  metalness: 0.1,
  roughness: 0.1,
});

const NOSTRIL_MAT = new THREE.MeshStandardMaterial({
  color: "#181412",
  roughness: 0.9,
});

const WHITE_MARKING_MAT = new THREE.MeshStandardMaterial({
  color: "#fcfbf7",
  roughness: 0.6,
});

const BANDAGE_MAT = new THREE.MeshStandardMaterial({
  color: "#ffffff",
  roughness: 0.8,
});

const GOLD_HALO_MAT = new THREE.MeshBasicMaterial({
  color: "#e2b866",
  transparent: true,
  opacity: 0.9,
});

const RED_ALERT_MAT = new THREE.MeshStandardMaterial({
  color: "#e0422c",
  emissive: "#a8200d",
  emissiveIntensity: 0.6,
});

/*
 * Status beacon colors — must stay in sync with the map legend in
 * map-view.tsx. Coats are realistic, so this floating marker is what
 * makes "who's out vs waiting" readable from drone view.
 */
const STATUS_BEACON_HEX: Record<string, string> = {
  out: "#4ade80",
  in: "#60a5fa",
  scheduled: "#e2e8f0",
  skipped: "#fb923c",
};

const STATUS_BEACON_MATS: Record<string, THREE.MeshBasicMaterial> = Object.fromEntries(
  Object.entries(STATUS_BEACON_HEX).map(([status, hex]) => [
    status,
    new THREE.MeshBasicMaterial({ color: hex }),
  ])
);

const BEACON_ORB = new THREE.SphereGeometry(0.085, 12, 12);
const BEACON_STEM = new THREE.CylinderGeometry(0.012, 0.012, 0.42, 6);

const M_STEM = new THREE.MeshStandardMaterial({
  color: "#3a3f3c",
  roughness: 0.8,
});

export function RealisticHorseModel({
  placement,
  selected,
  onSelect,
}: {
  placement: HorsePlacement;
  selected: boolean;
  onSelect: () => void;
}) {
  const { event, position, rotationY, phase, conflictReason, isInPasture } = placement;
  const profile: HorseCoatProfile = useMemo(
    () => getHorseProfile(event.horseName),
    [event.horseName]
  );

  const [hovered, setHovered] = useState(false);

  // Animation refs
  const neckGroupRef = useRef<THREE.Group>(null);
  const headGroupRef = useRef<THREE.Group>(null);
  const leftEarRef = useRef<THREE.Mesh>(null);
  const rightEarRef = useRef<THREE.Mesh>(null);
  const tailBaseRef = useRef<THREE.Group>(null);
  const tailMidRef = useRef<THREE.Group>(null);
  const tailTipRef = useRef<THREE.Group>(null);
  const bodyRootRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const alertRef = useRef<THREE.Mesh>(null);
  const beaconRef = useRef<THREE.Group>(null);

  // Dedicated Materials tailored to this horse's coat profile
  const materials = useMemo(() => {
    return {
      body: new THREE.MeshStandardMaterial({
        color: profile.bodyColor,
        roughness: 0.68,
        metalness: 0.08,
      }),
      secondary: profile.bodySecondaryColor
        ? new THREE.MeshStandardMaterial({
            color: profile.bodySecondaryColor,
            roughness: 0.7,
          })
        : null,
      mane: new THREE.MeshStandardMaterial({
        color: profile.maneColor,
        roughness: 0.85,
      }),
      tail: new THREE.MeshStandardMaterial({
        color: profile.tailColor,
        roughness: 0.85,
      }),
      muzzle: new THREE.MeshStandardMaterial({
        color: profile.muzzleColor,
        roughness: 0.8,
      }),
      hoof: new THREE.MeshStandardMaterial({
        color: profile.hoofColor,
        roughness: 0.5,
        metalness: 0.15,
      }),
      halter: new THREE.MeshStandardMaterial({
        color: profile.halterColor,
        roughness: 0.45,
        metalness: 0.2,
      }),
    };
  }, [profile]);

  const timeRef = useRef(0);
  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    // 1. Natural idle breathing sway
    if (bodyRootRef.current) {
      bodyRootRef.current.position.y = Math.sin(t * 1.5 + phase) * 0.015;
    }

    // 2. Realistic Grazing vs Alert Head Motion
    if (neckGroupRef.current && headGroupRef.current) {
      if (isInPasture) {
        // Natural grazing cycle: neck down eating grass, with occasional raising to look around
        const grazeCycle = Math.sin(t * 0.4 + phase);
        const isHeadRaised = grazeCycle > 0.75;
        const targetNeckAngle = isHeadRaised
          ? -0.35 + Math.sin(t * 1.8 + phase) * 0.05
          : -1.25 + Math.sin(t * 1.2 + phase) * 0.08; // Down grazing
        const targetHeadAngle = isHeadRaised ? 0.35 : 0.85;

        neckGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          neckGroupRef.current.rotation.x,
          targetNeckAngle,
          0.04
        );
        headGroupRef.current.rotation.x = THREE.MathUtils.lerp(
          headGroupRef.current.rotation.x,
          targetHeadAngle,
          0.04
        );
      } else {
        // Stood alert at gate or in stall
        neckGroupRef.current.rotation.x = -0.55 + Math.sin(t * 1.4 + phase) * 0.05;
        headGroupRef.current.rotation.x = 0.35 + Math.sin(t * 1.6 + phase) * 0.04;
      }
    }

    // 3. Fluid Multi-Segment Tail Swish
    if (tailBaseRef.current && tailMidRef.current && tailTipRef.current) {
      const swishSpeed = isInPasture ? 2.6 : 1.8;
      const swishAngle = Math.sin(t * swishSpeed + phase) * 0.28;
      tailBaseRef.current.rotation.z = swishAngle * 0.7;
      tailMidRef.current.rotation.z = Math.sin(t * swishSpeed + phase - 0.4) * 0.35;
      tailTipRef.current.rotation.z = Math.sin(t * swishSpeed + phase - 0.8) * 0.45;
    }

    // 4. Ear micro-twitches
    if (leftEarRef.current && rightEarRef.current) {
      leftEarRef.current.rotation.y = Math.sin(t * 3.5 + phase) * 0.18;
      rightEarRef.current.rotation.y = Math.sin(t * 2.8 + phase * 1.4) * 0.18;
    }

    // 5. Selection halo rotation & Conflict bounce
    if (haloRef.current) {
      haloRef.current.rotation.z += 0.015;
    }
    if (alertRef.current) {
      alertRef.current.rotation.z += 0.035;
      alertRef.current.position.y = 2.95 + Math.sin(t * 3.2 + phase) * 0.08;
    }

    // 6. Status beacon bob
    if (beaconRef.current) {
      beaconRef.current.position.y = 2.35 + Math.sin(t * 2.1 + phase * 1.3) * 0.06;
    }
  });

  return (
    <group
      position={position}
      rotation-y={rotationY}
      scale={hovered && !selected ? 1.07 : 1}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onSelect();
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = "pointer";
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = "auto";
      }}
    >
      <group ref={bodyRootRef}>
        {/* ================= TORSO & MUSCLED BARREL ================= */}
        {/* Main barrel */}
        <mesh
          geometry={G.barrel}
          material={materials.body}
          position={[0, 0.94, 0]}
          rotation-x={Math.PI / 2}
          castShadow
          receiveShadow
        />

        {/* Muscled croup / rump */}
        <mesh
          geometry={G.croup}
          material={materials.body}
          position={[0, 1.02, -0.42]}
          scale={[0.92, 1.05, 1.15]}
          castShadow
        />

        {/* Withers & shoulder rise */}
        <mesh
          geometry={G.withers}
          material={materials.body}
          position={[0, 1.16, 0.34]}
          rotation-x={Math.PI / 2.3}
          castShadow
        />

        {/* Pinto / Tobiano Patches for Paint Horses (e.g. Clover) */}
        {profile.markings.includes("pinto") && materials.secondary && (
          <group>
            <mesh
              geometry={G.pintoPatch}
              material={materials.secondary}
              position={[0.16, 0.96, 0.08]}
              scale={[0.7, 0.85, 0.8]}
            />
            <mesh
              geometry={G.pintoPatch}
              material={materials.secondary}
              position={[-0.14, 1.02, -0.32]}
              scale={[0.75, 0.9, 0.8]}
            />
          </group>
        )}

        {/* ================= NECK & CREST ================= */}
        <group ref={neckGroupRef} position={[0, 1.14, 0.44]}>
          <mesh
            geometry={G.neck}
            material={materials.body}
            position={[0, 0.3, 0.12]}
            rotation-x={0.35}
            scale={[1, 1, 1.3]}
            castShadow
          />

          {/* Flowing Mane along crest */}
          <group position={[0, 0.35, 0.02]}>
            {[-0.2, -0.08, 0.04, 0.16, 0.28].map((yOffset, i) => (
              <mesh
                key={i}
                geometry={G.maneTuft}
                material={materials.mane}
                position={[0, yOffset, -0.11 - i * 0.025]}
                rotation-x={-0.45 + i * 0.08}
                castShadow
              />
            ))}
          </group>

          {/* ================= HEAD & MUZZLE ================= */}
          <group ref={headGroupRef} position={[0, 0.58, 0.28]}>
            {/* Forehead & Jowls */}
            <mesh
              geometry={G.head}
              material={materials.body}
              position={[0, 0, 0]}
              castShadow
            />

            {/* Tapered Muzzle */}
            <mesh
              geometry={G.muzzle}
              material={materials.muzzle}
              position={[0, -0.11, 0.2]}
              rotation-x={Math.PI / 2.8}
              castShadow
            />

            {/* Nostrils */}
            <mesh
              geometry={G.nostril}
              material={NOSTRIL_MAT}
              position={[-0.055, -0.16, 0.32]}
            />
            <mesh
              geometry={G.nostril}
              material={NOSTRIL_MAT}
              position={[0.055, -0.16, 0.32]}
            />

            {/* Soft Equine Eyes */}
            <mesh
              geometry={G.eye}
              material={EYE_MAT}
              position={[-0.102, 0.03, -0.04]}
            />
            <mesh
              geometry={G.eye}
              material={EYE_MAT}
              position={[0.102, 0.03, -0.04]}
            />

            {/* Alert Movable Ears */}
            <mesh
              ref={leftEarRef}
              geometry={G.ear}
              material={materials.body}
              position={[-0.07, 0.18, -0.12]}
              rotation-x={-0.15}
              rotation-z={-0.15}
              castShadow
            />
            <mesh
              ref={rightEarRef}
              geometry={G.ear}
              material={materials.body}
              position={[0.07, 0.18, -0.12]}
              rotation-x={-0.15}
              rotation-z={0.15}
              castShadow
            />

            {/* Forelock Hair */}
            <mesh
              geometry={G.forelock}
              material={materials.mane}
              position={[0, 0.14, -0.02]}
              rotation-x={0.4}
              castShadow
            />

            {/* Facial Markings (Star / Blaze) */}
            {profile.markings.includes("star") && (
              <mesh
                geometry={G.starMarking}
                material={WHITE_MARKING_MAT}
                position={[0, 0.06, 0.192]}
                rotation-x={-0.15}
              />
            )}
            {profile.markings.includes("blaze") && (
              <mesh
                geometry={G.blazeMarking}
                material={WHITE_MARKING_MAT}
                position={[0, -0.03, 0.205]}
                rotation-x={0.3}
              />
            )}

            {/* ================= LEATHER HALTER & BRASS HARDWARE ================= */}
            <group position={[0, -0.05, 0.14]}>
              {/* Noseband */}
              <mesh
                geometry={G.halterStrapX}
                material={materials.halter}
                position={[0, 0, 0.06]}
              />
              {/* Cheekpieces */}
              <mesh
                geometry={G.halterStrapZ}
                material={materials.halter}
                position={[-0.095, 0.06, -0.06]}
                rotation-x={0.4}
              />
              <mesh
                geometry={G.halterStrapZ}
                material={materials.halter}
                position={[0.095, 0.06, -0.06]}
                rotation-x={0.4}
              />
              {/* Brass Rings */}
              <mesh
                geometry={G.halterRing}
                material={BRASS_MAT}
                position={[-0.1, 0, 0.05]}
                rotation-y={Math.PI / 2}
              />
              <mesh
                geometry={G.halterRing}
                material={BRASS_MAT}
                position={[0.1, 0, 0.05]}
                rotation-y={Math.PI / 2}
              />
            </group>
          </group>
        </group>

        {/* ================= 4 ARTICULATED LEGS & HOOVES ================= */}
        {/* Front-Left, Front-Right, Back-Left, Back-Right */}
        {[
          { x: -0.21, z: 0.36, isFront: true, index: 0 },
          { x: 0.21, z: 0.36, isFront: true, index: 1 },
          { x: -0.22, z: -0.42, isFront: false, index: 2 },
          { x: 0.22, z: -0.42, isFront: false, index: 3 },
        ].map(({ x, z, isFront, index }) => {
          const hasWhiteSock = profile.hasWhiteSocks[index];
          const isRowanRehabLeg =
            profile.name === "Rowan" && index === 0; // Front left wrap

          return (
            <group key={index} position={[x, 0, z]}>
              {/* Shoulder / Stifle joint */}
              <mesh
                geometry={G.shoulder}
                material={materials.body}
                position={[0, 0.82, isFront ? 0.04 : -0.05]}
                castShadow
              />

              {/* Forearm / Gaskin */}
              <mesh
                geometry={G.upperLeg}
                material={materials.body}
                position={[0, 0.62, 0]}
                castShadow
              />

              {/* Knee / Hock Joint */}
              <mesh
                geometry={G.knee}
                material={materials.body}
                position={[0, 0.44, 0]}
                castShadow
              />

              {/* Cannon Bone (with White Sock or Rehab Bandage) */}
              <mesh
                geometry={G.cannonBone}
                material={
                  isRowanRehabLeg
                    ? BANDAGE_MAT
                    : hasWhiteSock
                      ? WHITE_MARKING_MAT
                      : materials.body
                }
                position={[0, 0.25, 0]}
                castShadow
              />

              {/* Rehab Bandage Indicator Wrap on Rowan */}
              {isRowanRehabLeg && (
                <mesh
                  geometry={G.bandageWrap}
                  material={BANDAGE_MAT}
                  position={[0, 0.25, 0]}
                />
              )}

              {/* Fetlock Joint */}
              <mesh
                geometry={G.fetlock}
                material={hasWhiteSock ? WHITE_MARKING_MAT : materials.body}
                position={[0, 0.08, 0]}
                castShadow
              />

              {/* Dark Hoof */}
              <mesh
                geometry={G.hoof}
                material={materials.hoof}
                position={[0, 0.045, 0.015]}
                castShadow
              />
            </group>
          );
        })}

        {/* ================= FLOWING MULTI-SEGMENT TAIL ================= */}
        <group ref={tailBaseRef} position={[0, 1.05, -0.68]}>
          <mesh
            geometry={G.tailSegment1}
            material={materials.tail}
            position={[0, -0.12, -0.06]}
            rotation-x={0.45}
            castShadow
          />
          <group ref={tailMidRef} position={[0, -0.24, -0.12]}>
            <mesh
              geometry={G.tailSegment2}
              material={materials.tail}
              position={[0, -0.14, -0.04]}
              rotation-x={0.2}
              castShadow
            />
            <group ref={tailTipRef} position={[0, -0.28, -0.06]}>
              <mesh
                geometry={G.tailSegment3}
                material={materials.tail}
                position={[0, -0.18, 0]}
                rotation-x={0.08}
                castShadow
              />
            </group>
          </group>
        </group>
      </group>

      {/* ================= STATUS BEACON ================= */}
      <group ref={beaconRef} position={[0, 2.35, 0]}>
        <mesh geometry={BEACON_STEM} material={M_STEM} position={[0, -0.24, 0]} />
        <mesh
          geometry={BEACON_ORB}
          material={STATUS_BEACON_MATS[event.status] ?? STATUS_BEACON_MATS.scheduled}
        />
      </group>

      {/* ================= SELECTION HALO & CONFLICT ALERT ================= */}
      {selected && (
        <mesh
          ref={haloRef}
          geometry={G.haloRing}
          material={GOLD_HALO_MAT}
          rotation-x={Math.PI / 2}
          position={[0, 0.06, 0]}
        />
      )}

      {conflictReason && (
        <mesh
          ref={alertRef}
          geometry={G.alertRing}
          material={RED_ALERT_MAT}
          position={[0, 2.95, 0]}
        />
      )}
    </group>
  );
}
