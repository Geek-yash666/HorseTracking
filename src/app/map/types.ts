export type MapSpace = {
  id: string;
  name: string;
  type: string;
  capacity: number | null;
  notes: string | null;
};

export type MapEvent = {
  id: string;
  horseId: string;
  horseName: string;
  spaceId: string;
  shift: string;
  status: string;
  note: string | null;
  outLabel: string | null;
  inLabel: string | null;
  spaceName: string;
};

export type MapCompatRule = {
  horseAId: string;
  horseBId: string;
  reason: string | null;
};

export type Selection =
  | { kind: "horse"; id: string }
  | { kind: "space"; id: string }
  | null;

/** Unordered-pair conflict lookup, mirroring src/lib/compatibility.ts for the client. */
export function buildPairKey(a: string, b: string) {
  return [a, b].sort().join("::");
}

export function findConflictPairs(
  horseIds: string[],
  lookup: Map<string, string | null>
) {
  const pairs: { a: string; b: string; reason: string | null }[] = [];
  for (let i = 0; i < horseIds.length; i++) {
    for (let j = i + 1; j < horseIds.length; j++) {
      const key = buildPairKey(horseIds[i], horseIds[j]);
      if (lookup.has(key)) {
        pairs.push({ a: horseIds[i], b: horseIds[j], reason: lookup.get(key) ?? null });
      }
    }
  }
  return pairs;
}
