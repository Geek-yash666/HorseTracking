"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function createCompatibilityRule(formData: FormData) {
  const horseAId = String(formData.get("horseAId") ?? "").trim();
  const horseBId = String(formData.get("horseBId") ?? "").trim();
  const reason = String(formData.get("reason") ?? "").trim();

  if (!horseAId || !horseBId) {
    throw new Error("Both horses are required");
  }
  if (horseAId === horseBId) {
    throw new Error("Pick two different horses");
  }

  await prisma.compatibilityRule.create({
    data: { horseAId, horseBId, reason: reason || null },
  });

  revalidatePath("/compatibility");
}

export async function deleteCompatibilityRule(id: string) {
  await prisma.compatibilityRule.delete({ where: { id } });

  revalidatePath("/compatibility");
}
