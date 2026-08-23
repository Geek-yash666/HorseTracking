"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseGroupForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const horseIds = formData.getAll("horseIds").map(String);

  if (!name) {
    throw new Error("Group name is required");
  }

  return { name, notes: notes || null, horseIds };
}

export async function createGroup(formData: FormData) {
  const { name, notes, horseIds } = parseGroupForm(formData);

  await prisma.group.create({
    data: {
      name,
      notes,
      horses: {
        create: horseIds.map((horseId) => ({ horseId })),
      },
    },
  });

  revalidatePath("/groups");
  redirect("/groups");
}

export async function updateGroup(id: string, formData: FormData) {
  const { name, notes, horseIds } = parseGroupForm(formData);

  await prisma.$transaction([
    prisma.group.update({ where: { id }, data: { name, notes } }),
    prisma.groupHorse.deleteMany({ where: { groupId: id } }),
    prisma.groupHorse.createMany({
      data: horseIds.map((horseId) => ({ groupId: id, horseId })),
    }),
  ]);

  revalidatePath("/groups");
  redirect("/groups");
}

export async function deleteGroup(id: string) {
  await prisma.$transaction([
    prisma.groupHorse.deleteMany({ where: { groupId: id } }),
    prisma.group.delete({ where: { id } }),
  ]);

  revalidatePath("/groups");
}
