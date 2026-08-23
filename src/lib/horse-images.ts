/**
 * Sample photos bundled in /public/horses for demo barns — CC0/public-domain
 * sources (Openverse-filtered), normalized to ≤900px JPEG. A real barn
 * replaces these with uploads; every photo lives on the Horse record as
 * `photoUrl`, so swapping one out is just data.
 */
export const SAMPLE_HORSE_PHOTOS = [
  "/horses/birch.jpg",
  "/horses/comet.jpg",
  "/horses/juniper.jpg",
  "/horses/maple.jpg",
  "/horses/marigold.jpg",
  "/horses/sable.jpg",
  "/horses/whiskey.jpg",
  "/horses/clover.jpg",
  "/horses/rowan.jpg",
  "/horses/dune.jpg",
  "/horses/willow.jpg",
  "/horses/extra-1.jpg",
  "/horses/extra-2.jpg",
] as const;

export const GENDERS = ["mare", "gelding", "stallion"] as const;
export type HorseGender = (typeof GENDERS)[number];

export const LIFECYCLES = ["rotation", "training", "retired"] as const;
export type HorseLifecycle = (typeof LIFECYCLES)[number];

export const LIFECYCLE_LABELS: Record<HorseLifecycle, string> = {
  rotation: "In rotation",
  training: "In training",
  retired: "Retired",
};

export const GENDER_LABELS: Record<HorseGender, string> = {
  mare: "Mare",
  gelding: "Gelding",
  stallion: "Stallion",
};

/** Guards what we're willing to store in photoUrl (no arbitrary HTML). */
export function isValidPhotoUrl(value: string) {
  return (
    value.startsWith("/") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    /^data:image\/(jpeg|png|webp);base64,/.test(value)
  );
}
