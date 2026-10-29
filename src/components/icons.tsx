import { cn } from "@/lib/utils";

/**
 * Barnwright Horse Logo — clean horse head silhouette, left-facing.
 *
 * Uses a proven chess-knight inspired path that renders clearly at
 * small icon sizes (20–40px). The shape is bold, filled, and
 * unmistakably reads as a horse head profile.
 */
export function BarnwrightLogo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={cn("size-5", className)}
    >
      {/*
       * Left-facing horse head silhouette.
       * Key anatomy visible at small sizes:
       *   - Two distinct pointed ears at the top
       *   - Long horizontal muzzle projecting to the left
       *   - Rounded forehead above the eye
       *   - Strong curved neck sweeping down to the right
       *
       * Starting from the chest (bottom-right), going counter-clockwise:
       * bottom-right → bottom-left → front-chest → throat → jaw →
       * muzzle-bottom → muzzle-tip → top-lip → nose-bridge →
       * forehead → (rear-ear-spike) → between-ears → (front-ear-spike) →
       * poll → crest → back-of-neck → wither → bottom-right
       */}
      <path
        d="
          M78 88
          L22 88
          C22 76 26 64 34 54
          C38 48 40 43 38 37
          C36 32 32 27 30 21
          C28 15 32 9 38 8
          C36 4 38 2 40 3
          L42 8
          C44 3 46 1 49 2
          L50 8
          C52 3 56 1 58 4
          C64 7 67 15 64 24
          C70 18 76 19 78 26
          C80 33 76 42 68 48
          C62 52 56 52 54 48
          C52 44 54 38 56 32
          C58 26 58 18 54 13
          C50 8 44 10 42 15
          C40 10 36 9 34 13
          C32 17 32 23 34 30
          C36 37 34 45 28 56
          C24 64 22 76 22 88
        "
        fill="currentColor"
      />
      {/* White eye cutout for depth */}
      <circle cx="44" cy="24" r="6" fill="white" opacity="0.85" />
      {/* Nostril — small teardrop shape near muzzle tip */}
      <ellipse cx="21" cy="50" rx="3" ry="2" fill="white" opacity="0.55" transform="rotate(-15 21 50)" />
    </svg>
  );
}

/** Backward-compatible alias for HorseMark */
export const HorseMark = BarnwrightLogo;

/** Platinum-framed brand lockup used in the sidebar and mobile bar. */
export function BrandLockup({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <span className="flex items-center gap-3">
      {!compact && (
        <span className="flex min-w-0 flex-col leading-tight">
          <span className="font-display text-lg font-bold tracking-wide text-white">
            Barnwright
          </span>
          <span className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-slate-400">
            Turnout Planner
          </span>
        </span>
      )}
    </span>
  );
}
