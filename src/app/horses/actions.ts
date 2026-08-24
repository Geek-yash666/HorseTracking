"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  GENDERS,
  LIFECYCLES,
  isValidPhotoUrl,
} from "@/lib/horse-images";

const MAX_PHOTO_CHARS = 500_000; // ~370KB binary as base64 — canvas-resized uploads land well under this

function parseHorseForm(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const breed = String(formData.get("breed") ?? "").trim();

  const lifecycleRaw = String(formData.get("lifecycle") ?? "rotation");
  if (!LIFECYCLES.includes(lifecycleRaw as (typeof LIFECYCLES)[number])) {
    throw new Error("Lifecycle must be rotation, training, or retired");
  }

  const genderRaw = String(formData.get("gender") ?? "");
  const gender =
    genderRaw && GENDERS.includes(genderRaw as (typeof GENDERS)[number])
      ? genderRaw
      : null;

  const ageRaw = String(formData.get("ageYears") ?? "").trim();
  let ageYears: number | null = null;
  if (ageRaw) {
    ageYears = Number.parseInt(ageRaw, 10);
    if (!Number.isFinite(ageYears) || ageYears < 0 || ageYears > 45) {
      throw new Error("Age must be between 0 and 45 years");
    }
  }

  const photoRaw = String(formData.get("photoUrl") ?? "").trim();
  let photoUrl: string | null = null;
  if (photoRaw) {
    if (!isValidPhotoUrl(photoRaw)) {
      throw new Error("Photo must be an uploaded image, /path, or https URL");
    }
    if (photoRaw.length > MAX_PHOTO_CHARS) {
      throw new Error("Photo is too large — pick a smaller image");
    }
    photoUrl = photoRaw;
  }

  if (!name) {
    throw new Error("Horse name is required");
  }

  return {
    name,
    notes: notes || null,
    breed: breed || null,
    lifecycle: lifecycleRaw,
    gender,
    ageYears,
    photoUrl,
  };
}

export async function createHorse(formData: FormData) {
  const data = parseHorseForm(formData);

  await prisma.horse.create({ data });

  revalidatePath("/horses");
  redirect("/horses");
}

export async function updateHorse(id: string, formData: FormData) {
  const data = parseHorseForm(formData);

  await prisma.horse.update({ where: { id }, data });

  revalidatePath("/horses");
  redirect("/horses");
}

export async function deleteHorse(id: string) {
  await prisma.$transaction([
    prisma.groupHorse.deleteMany({ where: { horseId: id } }),
    prisma.turnoutEvent.deleteMany({ where: { horseId: id } }),
    prisma.compatibilityRule.deleteMany({
      where: {
        OR: [{ horseAId: id }, { horseBId: id }],
      },
    }),
    prisma.horse.delete({ where: { id } }),
  ]);

  revalidatePath("/horses");
  revalidatePath("/board");
  revalidatePath("/map");
  revalidatePath("/groups");
  revalidatePath("/compatibility");
}
