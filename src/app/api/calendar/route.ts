import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Per-day turnout-event counts for one month, powering the sidebar
 * calendar's dots. Public data (counts only), so no extra guards beyond
 * input validation.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const year = Number.parseInt(searchParams.get("year") ?? "", 10);
  const month = Number.parseInt(searchParams.get("month") ?? "", 10);

  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12 ||
    year < 2000 ||
    year > 2100
  ) {
    return NextResponse.json({ error: "Invalid year/month" }, { status: 400 });
  }

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const grouped = await prisma.turnoutEvent.groupBy({
    by: ["date"],
    where: { date: { gte: start, lt: end } },
    _count: { _all: true },
  });

  const counts: Record<string, number> = {};
  for (const row of grouped) {
    const key = row.date.toISOString().slice(0, 10);
    counts[key] = row._count._all;
  }

  return NextResponse.json(
    { counts },
    { headers: { "Cache-Control": "no-store" } }
  );
}
