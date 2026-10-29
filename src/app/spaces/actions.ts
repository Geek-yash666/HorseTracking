"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseSpaceForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "").trim();
  const capacityRaw = String(formData.get("capacity") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) {
    throw new Error("Space name is required");
  }
  if (!["paddock", "field", "ring"].includes(type)) {
    throw new Error("Space type must be paddock, field, or ring");
  }

  const capacity = capacityRaw ? Number(capacityRaw) : null;
  if (capacity !== null && (!Number.isInteger(capacity) || capacity < 1)) {
    throw new Error("Capacity must be a positive whole number");
  }

  return { name, type, capacity, notes: notes || null };
}

export async function createSpace(formData: FormData) {
  const data = parseSpaceForm(formData);

  await prisma.space.create({ data });

  revalidatePath("/spaces");
  redirect("/spaces");
}

export async function updateSpace(id: string, formData: FormData) {
  const data = parseSpaceForm(formData);

  await prisma.space.update({ where: { id }, data });

  revalidatePath("/spaces");
  redirect("/spaces");
}

export async function deleteSpace(id: string) {
  await prisma.$transaction([
    prisma.turnoutEvent.deleteMany({ where: { spaceId: id } }),
    prisma.scheduleRule.updateMany({
      where: { defaultSpaceId: id },
      data: { defaultSpaceId: null },
    }),
    prisma.space.delete({ where: { id } }),
  ]);

  revalidatePath("/spaces");
  revalidatePath("/board");
  revalidatePath("/map");
  revalidatePath("/rules");
}
