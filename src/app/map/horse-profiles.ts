export type HorseMarking =
  | "star"
  | "blaze"
  | "snip"
  | "socks"
  | "stockings"
  | "dapple"
  | "pinto"
  | "dun_stripes"
  | "bandage_wrap";

export type HorseCoatProfile = {
  name: string;
  breed: string;
  age: number;
  gender: "Gelding" | "Mare" | "Stallion" | "Colt";
  discipline: string;
  coatName: string;
  bodyColor: string;
  bodySecondaryColor?: string;
  flankHighlight: string;
  maneColor: string;
  tailColor: string;
  muzzleColor: string;
  hoofColor: string;
  markingColor: string;
  markings: HorseMarking[];
  hasWhiteSocks: [boolean, boolean, boolean, boolean]; // [FL, FR, BL, BR]
  halterColor: string;
  avatarBg: string;
  tagline: string;
};

export const HORSE_PROFILES: Record<string, HorseCoatProfile> = {
  Comet: {
    name: "Comet",
    breed: "Thoroughbred",
    age: 7,
    gender: "Gelding",
    discipline: "Show Jumper",
    coatName: "Rich Mahogany Bay",
    bodyColor: "#522b17",
    flankHighlight: "#683920",
    maneColor: "#120f0e",
    tailColor: "#0f0d0c",
    muzzleColor: "#2a160c",
    hoofColor: "#221d19",
    markingColor: "#f7f4ef",
    markings: ["star", "socks"],
    hasWhiteSocks: [false, true, true, false],
    halterColor: "#1d382b", // British Racing Green
    avatarBg: "bg-emerald-900/15 border-emerald-800/30 text-emerald-800",
    tagline: "High-energy jumper, head-shy, requires fly mask & careful gate handling.",
  },
  Juniper: {
    name: "Juniper",
    breed: "Dutch Warmblood (KWPN)",
    age: 9,
    gender: "Mare",
    discipline: "Grand Prix Dressage",
    coatName: "Dapple Grey",
    bodyColor: "#b8bcc2",
    flankHighlight: "#caced3",
    maneColor: "#e4e7eb",
    tailColor: "#dcdee3",
    muzzleColor: "#52575e",
    hoofColor: "#3a3d42",
    markingColor: "#ffffff",
    markings: ["dapple", "snip"],
    hasWhiteSocks: [false, false, false, false],
    halterColor: "#3f2747", // Royal Purple
    avatarBg: "bg-slate-700/15 border-slate-700/30 text-slate-800",
    tagline: "Elegant mover with rhythmic cadence, confident herd leader.",
  },
  Sable: {
    name: "Sable",
    breed: "Trakehner",
    age: 22,
    gender: "Gelding",
    discipline: "Retired Hunter",
    coatName: "Obsidian Black",
    bodyColor: "#181716",
    flankHighlight: "#272422",
    maneColor: "#0d0c0c",
    tailColor: "#0a0a0a",
    muzzleColor: "#24201d",
    hoofColor: "#1a1918",
    markingColor: "#fdfbf7",
    markings: ["star"],
    hasWhiteSocks: [false, false, false, false],
    halterColor: "#66221c", // Burgundy
    avatarBg: "bg-stone-900/15 border-stone-800/30 text-stone-900",
    tagline: "Gentle barn veteran; arthritis in front-left knee, prefers soft footing.",
  },
  Maple: {
    name: "Maple",
    breed: "Canadian Warmblood",
    age: 3,
    gender: "Mare",
    discipline: "Young Horse Prospect",
    coatName: "Golden Flaxen Chestnut",
    bodyColor: "#8f3e18",
    flankHighlight: "#a84e20",
    maneColor: "#f6e2b8",
    tailColor: "#f3deae",
    muzzleColor: "#4f220d",
    hoofColor: "#382317",
    markingColor: "#ffffff",
    markings: ["blaze", "stockings"],
    hasWhiteSocks: [true, true, true, true],
    halterColor: "#19455c", // Navy Blue
    avatarBg: "bg-amber-800/15 border-amber-800/30 text-amber-900",
    tagline: "Curious 3-year-old filly; thrives when turned out alongside a calm mentor.",
  },
  Birch: {
    name: "Birch",
    breed: "Holsteiner",
    age: 11,
    gender: "Gelding",
    discipline: "Derby Jumper",
    coatName: "Vibrant Blood Bay",
    bodyColor: "#6c2612",
    flankHighlight: "#85331a",
    maneColor: "#14100e",
    tailColor: "#100d0b",
    muzzleColor: "#36140a",
    hoofColor: "#281b16",
    markingColor: "#fbf8f2",
    markings: ["star", "socks"],
    hasWhiteSocks: [false, false, true, true],
    halterColor: "#182b23", // Hunter Green
    avatarBg: "bg-red-900/15 border-red-900/30 text-red-900",
    tagline: "Dominant gelding with high presence; kicks if crowded at the paddock gate.",
  },
  Marigold: {
    name: "Marigold",
    breed: "Warmblood / Thoroughbred Cross",
    age: 12,
    gender: "Mare",
    discipline: "Broodmare / Foundation",
    coatName: "Lustrous Golden Palomino",
    bodyColor: "#c99a4c",
    flankHighlight: "#dcb265",
    maneColor: "#fffdf5",
    tailColor: "#fcf8eb",
    muzzleColor: "#7a5c2d",
    hoofColor: "#473822",
    markingColor: "#ffffff",
    markings: ["blaze"],
    hasWhiteSocks: [false, false, false, false],
    halterColor: "#804c15", // Havana Leather
    avatarBg: "bg-yellow-700/15 border-yellow-700/30 text-yellow-800",
    tagline: "Sweet temperament; alert along boundary fence lines when in season.",
  },
  Ember: {
    name: "Ember",
    breed: "Quarter Horse",
    age: 18,
    gender: "Gelding",
    discipline: "Schoolmaster / Equitation",
    coatName: "Liver Chestnut",
    bodyColor: "#472115",
    flankHighlight: "#592b1d",
    maneColor: "#29130c",
    tailColor: "#23100a",
    muzzleColor: "#2d150e",
    hoofColor: "#261611",
    markingColor: "#faf6ed",
    markings: ["snip"],
    hasWhiteSocks: [false, false, true, false],
    halterColor: "#2a4736",
    avatarBg: "bg-amber-950/15 border-amber-950/30 text-amber-950",
    tagline: "The rock of the barn; patient, quiet, loves morning turnouts.",
  },
  Whiskey: {
    name: "Whiskey",
    breed: "Oldenburg",
    age: 4,
    gender: "Colt",
    discipline: "Stallion Prospect / Dressage",
    coatName: "Golden Buckskin with Primitive Stripe",
    bodyColor: "#b2884f",
    flankHighlight: "#c59c63",
    maneColor: "#110e0c",
    tailColor: "#0d0b09",
    muzzleColor: "#4d391e",
    hoofColor: "#2c2317",
    markingColor: "#f7f4ef",
    markings: ["star", "dun_stripes"],
    hasWhiteSocks: [true, false, true, false],
    halterColor: "#1e1e1e", // Midnight Black leather
    avatarBg: "bg-yellow-900/15 border-yellow-900/30 text-yellow-900",
    tagline: "Energetic young colt; requires solitary turnout in secure round pen.",
  },
  Clover: {
    name: "Clover",
    breed: "Welsh Section B Pony",
    age: 8,
    gender: "Mare",
    discipline: "Children's Pony Hunter",
    coatName: "Bay Tobiano Pinto",
    bodyColor: "#4d2815",
    bodySecondaryColor: "#f6f1e7", // White Pinto patch
    flankHighlight: "#61341c",
    maneColor: "#14100e",
    tailColor: "#e8ded1",
    muzzleColor: "#805844",
    hoofColor: "#614d3c",
    markingColor: "#ffffff",
    markings: ["pinto", "blaze", "stockings"],
    hasWhiteSocks: [true, true, true, true],
    halterColor: "#7a2b4b", // Mulberry Pink
    avatarBg: "bg-rose-800/15 border-rose-800/30 text-rose-900",
    tagline: "Adorable easy-keeper pony; requires grazing muzzle during lush spring grass.",
  },
  Rowan: {
    name: "Rowan",
    breed: "Irish Sport Horse",
    age: 6,
    gender: "Gelding",
    discipline: "Three-Day Eventer (Rehab)",
    coatName: "Dark Seal Bay",
    bodyColor: "#341d13",
    flankHighlight: "#45281c",
    maneColor: "#100d0b",
    tailColor: "#0d0b09",
    muzzleColor: "#24140d",
    hoofColor: "#1c1410",
    markingColor: "#f6f1e8",
    markings: ["star", "bandage_wrap"],
    hasWhiteSocks: [false, false, false, false],
    halterColor: "#203a54", // Medical Navy
    avatarBg: "bg-blue-950/15 border-blue-950/30 text-blue-900",
    tagline: "Suspensory ligament rehab; vet prescribed 20-min hand-walks only.",
  },
  Dune: {
    name: "Dune",
    breed: "Quarter Horse / Warmblood",
    age: 10,
    gender: "Gelding",
    discipline: "Ranch & Trail Mount",
    coatName: "Classic Red Dun",
    bodyColor: "#a37a4e",
    flankHighlight: "#b68e60",
    maneColor: "#3b1e13",
    tailColor: "#31180e",
    muzzleColor: "#593d25",
    hoofColor: "#36281c",
    markingColor: "#fff8eb",
    markings: ["dun_stripes", "star"],
    hasWhiteSocks: [false, false, true, false],
    halterColor: "#5c3c1b", // Tan Rawhide
    avatarBg: "bg-orange-900/15 border-orange-900/30 text-orange-950",
    tagline: "Food possessive at gate; keep distance from dominant herd mates at feed time.",
  },
  Willow: {
    name: "Willow",
    breed: "Selle Français",
    age: 5,
    gender: "Mare",
    discipline: "Show Jumper Prospect",
    coatName: "Rose Grey / Steel Grey",
    bodyColor: "#8f8b8a",
    flankHighlight: "#a49f9e",
    maneColor: "#423e3d",
    tailColor: "#403c3b",
    muzzleColor: "#2f2b2b",
    hoofColor: "#262423",
    markingColor: "#f5f3f0",
    markings: ["star", "socks"],
    hasWhiteSocks: [true, false, false, true],
    halterColor: "#304d3e", // Sage Green
    avatarBg: "bg-teal-900/15 border-teal-900/30 text-teal-950",
    tagline: "New arrival to the facility; currently integrating with morning mare group.",
  },
};

export function getHorseProfile(name: string): HorseCoatProfile {
  if (HORSE_PROFILES[name]) {
    return HORSE_PROFILES[name];
  }
  return {
    name,
    breed: "Sport Horse",
    age: 8,
    gender: "Gelding",
    discipline: "All-Rounder",
    coatName: "Bay",
    bodyColor: "#522b17",
    flankHighlight: "#683920",
    maneColor: "#120f0e",
    tailColor: "#0f0d0c",
    muzzleColor: "#2a160c",
    hoofColor: "#221d19",
    markingColor: "#f7f4ef",
    markings: ["star"],
    hasWhiteSocks: [false, false, false, false],
    halterColor: "#1d382b",
    avatarBg: "bg-emerald-900/15 border-emerald-800/30 text-emerald-800",
    tagline: "Active horse in the turnout program.",
  };
}
