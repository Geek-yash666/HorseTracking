"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function parseRuleForm(formData: FormData) {
  const groupId = String(formData.get("groupId") ?? "").trim();
  const shift = String(formData.get("shift") ?? "").trim();
  const defaultSpaceId = String(formData.get("defaultSpaceId") ?? "").trim();
  const durationRaw = String(formData.get("durationMin") ?? "").trim();
  const daysOfWeek = formData
    .getAll("daysOfWeek")
    .map((d) => Number(d))
    .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    .sort((a, b) => a - b);

  if (!groupId) {
    throw new Error("Group is required");
  }
  if (!["AM", "PM"].includes(shift)) {
    throw new Error("Shift must be AM or PM");
  }
  if (daysOfWeek.length === 0) {
    throw new Error("Pick at least one day of the week");
  }

  const durationMin = durationRaw ? Number(durationRaw) : null;
  if (durationMin !== null && (!Number.isInteger(durationMin) || durationMin < 1)) {
    throw new Error("Duration must be a positive whole number of minutes");
  }

  return {
    groupId,
    shift,
    daysOfWeek,
    defaultSpaceId: defaultSpaceId || null,
    durationMin,
  };
}

export async function createRule(formData: FormData) {
  const data = parseRuleForm(formData);

  await prisma.scheduleRule.create({ data });

  revalidatePath("/rules");
  redirect("/rules");
}

export async function updateRule(id: string, formData: FormData) {
  const data = parseRuleForm(formData);

  await prisma.scheduleRule.update({ where: { id }, data });

  revalidatePath("/rules");
  redirect("/rules");
}

export async function deleteRule(id: string) {
  await prisma.scheduleRule.delete({ where: { id } });

  revalidatePath("/rules");
}
