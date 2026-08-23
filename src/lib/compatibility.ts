import type { CompatibilityRuleModel } from "@/generated/prisma/models";

function pairKey(a: string, b: string) {
  return [a, b].sort().join("::");
}

/** Builds a lookup from an unordered horse-id pair to the reason they can't share a space. */
export function buildConflictLookup(rules: CompatibilityRuleModel[]) {
  const map = new Map<string, string | null>();
  for (const rule of rules) {
    map.set(pairKey(rule.horseAId, rule.horseBId), rule.reason);
  }
  return map;
}

/** Returns the conflicting pairs (with reasons) found among a group of horses sharing a space/shift. */
export function findConflicts(
  horseIds: string[],
  lookup: Map<string, string | null>
) {
  const conflicts: { a: string; b: string; reason: string | null }[] = [];
  for (let i = 0; i < horseIds.length; i++) {
    for (let j = i + 1; j < horseIds.length; j++) {
      const key = pairKey(horseIds[i], horseIds[j]);
      if (lookup.has(key)) {
        conflicts.push({ a: horseIds[i], b: horseIds[j], reason: lookup.get(key) ?? null });
      }
    }
  }
  return conflicts;
}
