import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  Clock,
  Fence,
  KanbanSquare,
  Map as MapIcon,
  MapPin,
  ScrollText,
  ShieldAlert,
  Sun,
  Users,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { todayDateOnly } from "@/lib/schedule";
import { buildConflictLookup, findConflicts } from "@/lib/compatibility";
import { Button } from "@/components/ui/button";
import { HorseAvatar } from "@/components/horse-avatar";
import { HorsePhoto } from "@/components/horse-photo";
import { formatTime } from "@/lib/format";

export default async function HomePage() {
  const today = todayDateOnly();

  const [
    activeHorses,
    spaceCount,
    groupCount,
    ruleCount,
    compatCount,
    eventsToday,
    compatRules,
  ] = await Promise.all([
    prisma.horse.count({ where: { lifecycle: "rotation" } }),
    prisma.space.count(),
    prisma.group.count(),
    prisma.scheduleRule.count(),
    prisma.compatibilityRule.count(),
    prisma.turnoutEvent.findMany({
      where: { date: today },
      include: { horse: true, space: true },
      orderBy: [{ shift: "asc" }, { horse: { name: "asc" } }],
    }),
    prisma.compatibilityRule.findMany(),
  ]);

  // Conflicts among horses actually sharing a space+shift today.
  const bySpaceShift = new Map<string, typeof eventsToday>();
  for (const event of eventsToday) {
    const key = `${event.shift}::${event.spaceId}`;
    const bucket = bySpaceShift.get(key);
    if (bucket) bucket.push(event);
    else bySpaceShift.set(key, [event]);
  }
  const conflictLookup = buildConflictLookup(compatRules);
  let conflictCount = 0;
  for (const group of bySpaceShift.values()) {
    conflictCount += findConflicts(
      group.map((e) => e.horseId),
      conflictLookup
    ).length;
  }

  const outNow = eventsToday.filter((e) => e.status === "out");
  const waiting = eventsToday.filter((e) => e.status === "scheduled");
  const backIn = eventsToday.filter((e) => e.status === "in");
  const skipped = eventsToday.filter((e) => e.status === "skipped");
  const doneCount = backIn.length + skipped.length;

  const stats = [
    { label: "Out right now", value: outNow.length, accent: "text-status-out-strong" },
    { label: "Waiting to go out", value: waiting.length, accent: "text-onstride-sage" },
    { label: "Back in", value: backIn.length, accent: "text-status-in" },
    { label: "Skipped today", value: skipped.length, accent: "text-status-skipped" },
    { label: "Conflicts flagged", value: conflictCount, accent: "text-destructive" },
  ];

  const setupCards = [
    {
      href: "/horses",
      icon: ClipboardList,
      title: "Horses",
      description: "The barn's roster and each horse's handling notes.",
      count: `${activeHorses} active`,
    },
    {
      href: "/spaces",
      icon: Fence,
      title: "Spaces",
      description: "Paddocks, fields, and rings with capacities.",
      count: `${spaceCount} spaces`,
    },
    {
      href: "/groups",
      icon: Users,
      title: "Groups",
      description: "Who turns out together, day after day.",
      count: `${groupCount} groups`,
    },
    {
      href: "/rules",
      icon: ScrollText,
      title: "Schedule Rules",
      description: "Days, shifts, and default spaces per group.",
      count: `${ruleCount} rules`,
    },
    {
      href: "/compatibility",
      icon: ShieldAlert,
      title: "Compatibility",
      description: "Pairs that can never share a paddock.",
      count: `${compatCount} rules`,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Hero */}
      <section className="panel relative overflow-hidden bg-gradient-to-br from-[#0c1c15] via-[#10241c] to-[#1b3a2c] px-6 py-10 text-onstride-cream sm:px-10 sm:py-14">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full bg-onstride-gold/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 left-1/3 size-72 rounded-full bg-status-in/20 blur-3xl"
        />
        <div className="relative max-w-2xl">
          <p className="overline-label">OnStride · Daily Operations</p>
          <h1 className="font-display mt-3 text-4xl font-semibold leading-tight sm:text-5xl">
            The Turnout Planner
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-onstride-cream/70 sm:text-base">
            Every horse, every shift, every paddock — planned, run, and
            accounted for.
            <br />
            Today{" "}
            <strong className="font-semibold text-onstride-cream">
              {eventsToday.length > 0
                ? `${doneCount} of ${eventsToday.length}`
                : "no"}
            </strong>{" "}
            {eventsToday.length === 1 ? "turnout is" : "turnouts are"} settled.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button
              render={<Link href="/board" />}
              nativeButton={false}
              className="bg-onstride-gold text-[#10241c] hover:bg-onstride-gold/85"
            >
              <KanbanSquare data-icon="inline-start" /> Open Today&apos;s Board
            </Button>
            <Button
              render={<Link href="/map" />}
              nativeButton={false}
              variant="outline"
              className="border-white/25 bg-white/5 text-onstride-cream hover:bg-white/10 hover:text-white"
            >
              <MapIcon data-icon="inline-start" /> Barn Map
            </Button>
          </div>
        </div>
      </section>

      {/* Live status strip */}
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="overline-label">Right now</h2>
          <Link
            href="/board"
            className="inline-flex items-center gap-1 text-xs font-medium text-onstride-green/60 transition-colors hover:text-onstride-green"
          >
            Full board <ArrowUpRight className="size-3.5" />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div key={stat.label} className="panel px-4 py-4">
              <p
                className={`font-display text-3xl font-semibold ${stat.accent}`}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-onstride-green/55">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Who's out at this moment */}
        {outNow.length > 0 && (
          <div className="panel p-5 sm:p-6 border border-onstride-green/12 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-xl bg-amber-500/15 text-amber-700 shadow-2xs">
                  <Sun className="size-4.5" />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-onstride-green/90 leading-tight">
                    Active Turnout · Enjoying the Weather
                  </h3>
                  <p className="text-[11px] text-onstride-green/50">
                    Horses currently grazing and exercising across estate pastures
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-900">
                  {outNow.length} out now
                </span>
                <Link
                  href="/board"
                  className="flex items-center gap-1 text-xs font-semibold text-onstride-gold-deep hover:underline"
                >
                  <span>Today&apos;s Board</span>
                  <ArrowRight className="size-3.5" />
                </Link>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {outNow.map((event) => (
                <article
                  key={event.id}
                  className="group rounded-2xl border border-onstride-green/12 bg-card transition-all duration-150 hover:shadow-[var(--shadow-panel)] hover:border-onstride-gold/40"
                >
                  <div className="flex min-h-[5.5rem] items-stretch">
                    <HorsePhoto
                      name={event.horse.name}
                      photoUrl={event.horse.photoUrl}
                      className="w-18 shrink-0 self-stretch rounded-l-2xl object-cover"
                      sizesClass="text-lg"
                    />
                    <div className="flex min-w-0 flex-1 flex-col justify-between p-3">
                      <div>
                        <p className="truncate font-display text-[0.95rem] font-bold text-onstride-green/90 group-hover:text-onstride-gold-deep transition-colors leading-tight">
                          {event.horse.name}
                        </p>
                        <p className="truncate text-xs font-medium text-onstride-green/70 mt-0.5">
                          {event.space.name}
                        </p>
                      </div>

                      <div className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-amber-800/90">
                        <Sun className="size-3 text-amber-600 shrink-0" />
                        <span className="truncate">Since {formatTime(event.actualOutTime)}</span>
                      </div>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Setup grid */}
      <section className="flex flex-col gap-3">
        <h2 className="overline-label">Barn setup</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {setupCards.map((card) => {
            const Icon = card.icon;
            return (
              <Link
                key={card.href}
                href={card.href}
                className="group panel flex items-start justify-between gap-4 p-5 transition-all hover:-translate-y-0.5 hover:shadow-[var(--shadow-panel-lg)]"
              >
                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="flex size-9 items-center justify-center rounded-lg border border-onstride-green/10 bg-onstride-pine/5 text-onstride-moss">
                      <Icon className="size-4" />
                    </span>
                    <h3 className="font-display text-lg font-semibold">
                      {card.title}
                    </h3>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-onstride-green/60">
                    {card.description}
                  </p>
                  <p className="mt-3 text-xs font-semibold text-onstride-gold-deep">
                    {card.count}
                  </p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-onstride-green/30 transition-colors group-hover:text-onstride-gold-deep" />
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
