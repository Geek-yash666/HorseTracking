import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { CompatibilityManager, type CompatRule, type CompatHorse } from "./compatibility-manager";

export default async function CompatibilityPage() {
  const [rules, horses] = await Promise.all([
    prisma.compatibilityRule.findMany({
      include: {
        horseA: {
          select: {
            id: true,
            name: true,
            breed: true,
            gender: true,
            ageYears: true,
            photoUrl: true,
          },
        },
        horseB: {
          select: {
            id: true,
            name: true,
            breed: true,
            gender: true,
            ageYears: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { id: "asc" },
    }),
    prisma.horse.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        breed: true,
        gender: true,
        ageYears: true,
        photoUrl: true,
      },
    }),
  ]);

  const compatRules: CompatRule[] = rules.map((r) => ({
    id: r.id,
    reason: r.reason,
    horseA: r.horseA,
    horseB: r.horseB,
  }));

  const compatHorses: CompatHorse[] = horses.map((h) => ({
    id: h.id,
    name: h.name,
    breed: h.breed,
    gender: h.gender,
    ageYears: h.ageYears,
    photoUrl: h.photoUrl,
  }));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        kicker="Barn setup"
        title="Compatibility & Separation"
        description="Pairwise rules that prevent incompatible horses from sharing the same turnout space."
      />
      <CompatibilityManager rules={compatRules} horses={compatHorses} />
    </div>
  );
}
