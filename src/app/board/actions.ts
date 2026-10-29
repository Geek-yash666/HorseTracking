"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { todayDateOnly } from "@/lib/schedule";

/** Parses a YYYY-MM-DD board date from a form, falling back to today. */
function parseBoardDate(formData: FormData) {
  const raw = String(formData.get("date") ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return todayDateOnly();
}

export async function generateFromSchedule(formData: FormData) {
  const date = parseBoardDate(formData);
  const dayOfWeek = date.getUTCDay();

  const rules = await prisma.scheduleRule.findMany({
    where: { daysOfWeek: { has: dayOfWeek }, defaultSpaceId: { not: null } },
    include: { group: { include: { horses: { include: { horse: true } } } } },
  });

  const data = rules.flatMap((rule) =>
    rule.group.horses
      .filter((gh) => gh.horse.lifecycle === "rotation")
      .map((gh) => ({
        date,
        horseId: gh.horseId,
        spaceId: rule.defaultSpaceId as string,
        shift: rule.shift,
        status: "scheduled",
      }))
  );

  if (data.length > 0) {
    await prisma.turnoutEvent.createMany({ data, skipDuplicates: true });
  }

  revalidatePath("/board");
}

export async function markOut(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "out", actualOutTime: new Date() },
  });

  revalidatePath("/board");
}

export async function markIn(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "in", actualInTime: new Date() },
  });

  revalidatePath("/board");
}

export async function markSkipped(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "skipped" },
  });

  revalidatePath("/board");
}

export async function resetEvent(eventId: string) {
  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { status: "scheduled", actualOutTime: null, actualInTime: null },
  });

  revalidatePath("/board");
}

export async function updateEventSpace(eventId: string, formData: FormData) {
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  if (!spaceId) {
    throw new Error("Space is required");
  }

  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { spaceId },
  });

  revalidatePath("/board");
}

export async function updateEventNote(eventId: string, formData: FormData) {
  const note = String(formData.get("note") ?? "").trim();

  await prisma.turnoutEvent.update({
    where: { id: eventId },
    data: { note: note || null },
  });

  revalidatePath("/board");
}

export async function removeEvent(eventId: string) {
  await prisma.turnoutEvent.delete({ where: { id: eventId } });

  revalidatePath("/board");
}

export async function addEventToBoard(formData: FormData) {
  const horseId = String(formData.get("horseId") ?? "").trim();
  const spaceId = String(formData.get("spaceId") ?? "").trim();
  const shift = String(formData.get("shift") ?? "").trim();
  const date = parseBoardDate(formData);

  if (!horseId || !spaceId || !["AM", "PM"].includes(shift)) {
    throw new Error("Horse, space, and shift are required");
  }

  await prisma.turnoutEvent.upsert({
    where: { date_horseId_shift: { date, horseId, shift } },
    create: { date, horseId, spaceId, shift, status: "scheduled" },
    update: {
      spaceId,
      status: "scheduled",
      actualOutTime: null,
      actualInTime: null,
    },
  });

  revalidatePath("/board");
}
