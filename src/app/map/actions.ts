"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { todayDateOnly } from "@/lib/schedule";

export async function markHorseOut(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "out", actualOutTime: new Date() },
  });

  revalidatePath("/map");
  revalidatePath("/board");
}

export async function markHorseIn(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "in", actualInTime: new Date() },
  });

  revalidatePath("/map");
  revalidatePath("/board");
}

export async function markHorseSkipped(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "skipped" },
  });

  revalidatePath("/map");
  revalidatePath("/board");
}

export async function resetHorseEvent(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "scheduled", actualOutTime: null, actualInTime: null },
  });

  revalidatePath("/map");
  revalidatePath("/board");
}

export async function moveHorseToSpace(eventId: string, spaceId: string) {
  if (!spaceId) throw new Error("Space ID is required");

  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { spaceId },
  });

  revalidatePath("/map");
  revalidatePath("/board");
}

export async function quickAssignHorseToPaddock(
  horseId: string,
  spaceId: string,
  shift: "AM" | "PM" = "AM"
) {
  const today = todayDateOnly();

  await prisma.turnoutEvent.upsert({
    where: { date_horseId_shift: { date: today, horseId, shift } },
    create: {
      date: today,
      horseId,
      spaceId,
      shift,
      status: "out",
      actualOutTime: new Date(),
    },
    update: {
      spaceId,
      status: "out",
      actualOutTime: new Date(),
    },
  });

  revalidatePath("/map");
  revalidatePath("/board");
}
