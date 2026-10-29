export const SPACE_TYPES = ["field", "paddock", "ring"] as const;
export type SpaceType = (typeof SPACE_TYPES)[number];

export const SPACE_TYPE_LABELS: Record<SpaceType, string> = {
  field: "Field",
  paddock: "Paddock",
  ring: "Ring / Arena",
};

export const SPACE_TYPE_STYLES: Record<string, { badge: string; border: string; text: string }> = {
  field: {
    badge: "border-status-in/25 bg-status-in/10 text-status-in",
    border: "border-status-in/30",
    text: "text-status-in",
  },
  paddock: {
    badge: "border-barnwright-pine/25 bg-barnwright-pine/10 text-barnwright-pine",
    border: "border-barnwright-pine/30",
    text: "text-barnwright-pine",
  },
  ring: {
    badge: "border-status-out/40 bg-status-out/15 text-status-out-strong",
    border: "border-status-out/40",
    text: "text-status-out-strong",
  },
};

export type SpaceFacilitySpecs = {
  photoUrl: string;
  acres: number;
  footing: string;
  fencing: string;
  waterer: string;
  shelter: string;
  bestFor: string;
};

export const SPACE_PRESETS: Record<string, SpaceFacilitySpecs> = {
  "back forty": {
    photoUrl: "/spaces/back-forty.jpg",
    acres: 8.5,
    footing: "Kentucky Bluegrass Turf",
    fencing: "4-Rail Centaur Polymer & Oak Post",
    waterer: "Dual Nelson Heated Automatic Trough",
    shelter: "Three-sided 24x12 Run-in Shed",
    bestFor: "Large social turnout herds, broodmares & retirees",
  },
  "east pasture": {
    photoUrl: "/spaces/east-pasture.jpg",
    acres: 4.8,
    footing: "Rolling Fescue, Orchard & Clover",
    fencing: "3-Rail Treated Pine Post & Board",
    waterer: "Ritchie Double-sided Heated Waterer",
    shelter: "Natural Mature Oak Canopy",
    bestFor: "Medium social groups (4-6 horses) AM/PM rotation",
  },
  "north paddock": {
    photoUrl: "/spaces/north-paddock.jpg",
    acres: 2.4,
    footing: "High-Traffic Pasture Mix with Sand Base",
    fencing: "Black 3-Rail Post & Board with Mesh",
    waterer: "Stainless Steel Float Waterer",
    shelter: "Run-in Shed with Rubber Paver Apron",
    bestFor: "Performance horses, individual or pair turnout",
  },
  "round pen": {
    photoUrl: "/spaces/round-pen.jpg",
    acres: 0.4,
    footing: "Deep Cushion Washed Mason Sand",
    fencing: "Heavy-Duty Powder-Coated Steel Pipe Panels (6ft)",
    waterer: "Insulated Bucket Station",
    shelter: "Open Air Training Ring",
    bestFor: "Groundwork, liberty training, and solo exercise",
  },
  "sick bay paddock": {
    photoUrl: "/spaces/sick-bay.jpg",
    acres: 0.8,
    footing: "Non-Slip Rubber Pavers & Level Sand",
    fencing: "Diamond Mesh No-Climb & Top Safety Rail",
    waterer: "Monitored Automatic Trough with Meter",
    shelter: "Direct Overhang from Heritage Main Barn",
    bestFor: "Rehab, post-surgery, or restricted medical turnout",
  },
  "south ring": {
    photoUrl: "/spaces/south-ring.jpg",
    acres: 1.8,
    footing: "GGT All-Weather Fiber & Silica Sand",
    fencing: "White Vinyl Arena Rail with Dressage Letters",
    waterer: "Wash Stall Hydrant & Hydration Station",
    shelter: "Judges Pavilion & Covered Viewing Porch",
    bestFor: "Show jumping, flatwork, and schooling",
  },
};

export function getSpacePhotoUrl(name: string, type: string): string {
  const key = name.trim().toLowerCase();
  if (SPACE_PRESETS[key]?.photoUrl) {
    return SPACE_PRESETS[key].photoUrl;
  }
  if (key.includes("forty") || key.includes("back")) return "/spaces/back-forty.jpg";
  if (key.includes("east") || key.includes("pasture")) return "/spaces/east-pasture.jpg";
  if (key.includes("north") || key.includes("paddock")) return "/spaces/north-paddock.jpg";
  if (key.includes("round") || key.includes("pen")) return "/spaces/round-pen.jpg";
  if (key.includes("sick") || key.includes("bay") || key.includes("medical")) return "/spaces/sick-bay.jpg";
  if (key.includes("south") || key.includes("ring") || key.includes("arena")) return "/spaces/south-ring.jpg";

  switch (type.toLowerCase()) {
    case "field":
      return "/spaces/field-default.jpg";
    case "ring":
      return "/spaces/ring-default.jpg";
    case "paddock":
    default:
      return "/spaces/paddock-default.jpg";
  }
}

export function getSpaceSpecs(name: string, type: string): SpaceFacilitySpecs {
  const key = name.trim().toLowerCase();
  if (SPACE_PRESETS[key]) {
    return SPACE_PRESETS[key];
  }
  return {
    photoUrl: getSpacePhotoUrl(name, type),
    acres: type === "field" ? 3.5 : type === "ring" ? 1.0 : 1.5,
    footing: type === "ring" ? "All-Weather Arena Sand" : "Kentucky Bluegrass Turf",
    fencing: "3-Rail Post & Board",
    waterer: "Automatic Heated Waterer",
    shelter: "Run-in Shed",
    bestFor: type === "ring" ? "Schooling & Exercise" : "Daily Turnout",
  };
}
