/**
 * Resets the barn to a fuller, more realistic demo state: a dozen horses,
 * six spaces, five groups, their schedule rules, a few compatibility
 * conflicts, and today's board already mid-morning — some horses in, some
 * out, one skipped, one still waiting. Wipes existing turnout data first,
 * so re-running this always gets you back to the same known-good demo.
 *
 * Run with: npm run seed
 */
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function todayDateOnly() {
  return new Date(new Date().toISOString().slice(0, 10));
}

function todayAt(hour: number, minute: number) {
  const d = todayDateOnly();
  d.setUTCHours(hour, minute, 0, 0);
  return d;
}

async function main() {
  console.log("Clearing existing turnout data...");
  await prisma.turnoutEvent.deleteMany();
  await prisma.groupHorse.deleteMany();
  await prisma.compatibilityRule.deleteMany();
  await prisma.scheduleRule.deleteMany();
  await prisma.group.deleteMany();
  await prisma.horse.deleteMany();
  await prisma.space.deleteMany();

  console.log("Creating horses...");
  const horseData: {
    name: string;
    notes: string | null;
    breed?: string;
    gender?: string;
    ageYears?: number;
    photoUrl?: string;
    lifecycle?: string;
  }[] = [
    { name: "Comet", notes: "Head-shy, needs fly mask", breed: "Thoroughbred", gender: "gelding", ageYears: 7, photoUrl: "/horses/comet.jpg" },
    { name: "Juniper", notes: null, breed: "Dutch Warmblood", gender: "mare", ageYears: 9, photoUrl: "/horses/juniper.jpg" },
    { name: "Sable", notes: "Senior — limited turnout, arthritis in front left", breed: "Trakehner", gender: "gelding", ageYears: 22, photoUrl: "/horses/sable.jpg" },
    { name: "Maple", notes: "Green, 3yo — needs a calm, experienced buddy", breed: "Canadian Warmblood", gender: "mare", ageYears: 3, photoUrl: "/horses/maple.jpg" },
    { name: "Birch", notes: "Dominant gelding, kicks when crowded at the gate", breed: "Holsteiner", gender: "gelding", ageYears: 11, photoUrl: "/horses/birch.jpg" },
    { name: "Marigold", notes: "Broodmare — moody when in heat, watch fence lines", breed: "Warmblood x TB", gender: "mare", ageYears: 12, photoUrl: "/horses/marigold.jpg" },
    { name: "Ember", notes: "Retired lesson horse, very easy", breed: "Quarter Horse", gender: "gelding", ageYears: 18, photoUrl: "/horses/extra-1.jpg" },
    { name: "Whiskey", notes: "Colt, stallion-like behavior — solo turnout only", breed: "Oldenburg", gender: "stallion", ageYears: 4, photoUrl: "/horses/whiskey.jpg" },
    { name: "Clover", notes: "Easy keeper pony, muzzle on grass turnout", breed: "Welsh Pony", gender: "mare", ageYears: 8, photoUrl: "/horses/clover.jpg" },
    { name: "Rowan", notes: "Recovering from suspensory strain — hand-walk only, no free turnout yet", breed: "Irish Sport Horse", gender: "gelding", ageYears: 6, photoUrl: "/horses/rowan.jpg", lifecycle: "training" },
    { name: "Dune", notes: "Food aggressive at the gate, feed him last", breed: "Quarter Horse", gender: "gelding", ageYears: 10, photoUrl: "/horses/dune.jpg" },
    { name: "Willow", notes: "New boarder, first week — pair with a quiet horse", breed: "Selle Français", gender: "mare", ageYears: 5, photoUrl: "/horses/willow.jpg" },
  ];
  const horses: Record<string, string> = {};
  for (const h of horseData) {
    const created = await prisma.horse.create({ data: h });
    horses[h.name] = created.id;
  }

  console.log("Creating spaces...");
  const spaceData = [
    { name: "North Paddock", type: "field", capacity: 4, notes: null },
    { name: "South Ring", type: "paddock", capacity: null, notes: null },
    { name: "East Pasture", type: "field", capacity: 6, notes: "Big group turnout" },
    { name: "Round Pen", type: "ring", capacity: 1, notes: "Solo/training only" },
    {
      name: "Sick Bay Paddock",
      type: "paddock",
      capacity: 2,
      notes: "Close to the barn — for injury/limited turnout",
    },
    {
      name: "Back Forty",
      type: "field",
      capacity: 8,
      notes: "Far pasture — halter check before bringing in",
    },
  ];
  const spaces: Record<string, string> = {};
  for (const s of spaceData) {
    const created = await prisma.space.create({ data: s });
    spaces[s.name] = created.id;
  }

  console.log("Creating groups and memberships...");
  const groupData: { name: string; notes: string | null; members: string[] }[] = [
    { name: "Weekday Turnout", notes: null, members: ["Comet", "Juniper"] },
    {
      name: "Morning Mares",
      notes: "Marigold and Clover know each other well; Willow is new to the group",
      members: ["Marigold", "Clover", "Willow"],
    },
    {
      name: "Gelding Group",
      notes: "Birch and Dune don't get along at the gate — see compatibility rules",
      members: ["Birch", "Ember", "Dune"],
    },
    { name: "Solo Turnout", notes: "One horse per rule, by design", members: ["Whiskey"] },
    {
      name: "Limited & Rehab",
      notes: "Vet/farrier restrictions — check notes before turning out",
      members: ["Sable", "Rowan"],
    },
  ];
  const groups: Record<string, string> = {};
  for (const g of groupData) {
    const created = await prisma.group.create({ data: { name: g.name, notes: g.notes } });
    groups[g.name] = created.id;
    for (const horseName of g.members) {
      await prisma.groupHorse.create({
        data: { groupId: created.id, horseId: horses[horseName] },
      });
    }
  }

  console.log("Creating schedule rules...");
  const everyDay = [0, 1, 2, 3, 4, 5, 6];
  await prisma.scheduleRule.createMany({
    data: [
      {
        groupId: groups["Weekday Turnout"],
        daysOfWeek: everyDay,
        shift: "AM",
        defaultSpaceId: spaces["North Paddock"],
        durationMin: 240,
      },
      {
        groupId: groups["Morning Mares"],
        daysOfWeek: everyDay,
        shift: "AM",
        defaultSpaceId: spaces["East Pasture"],
        durationMin: 300,
      },
      {
        groupId: groups["Gelding Group"],
        daysOfWeek: everyDay,
        shift: "PM",
        defaultSpaceId: spaces["Back Forty"],
        durationMin: 240,
      },
      {
        groupId: groups["Solo Turnout"],
        daysOfWeek: everyDay,
        shift: "AM",
        defaultSpaceId: spaces["Round Pen"],
        durationMin: 90,
      },
      {
        groupId: groups["Limited & Rehab"],
        daysOfWeek: everyDay,
        shift: "PM",
        defaultSpaceId: spaces["Sick Bay Paddock"],
        durationMin: 60,
      },
    ],
  });

  console.log("Creating compatibility rules...");
  await prisma.compatibilityRule.createMany({
    data: [
      { horseAId: horses["Comet"], horseBId: horses["Juniper"], reason: "kicks" },
      {
        horseAId: horses["Birch"],
        horseBId: horses["Dune"],
        reason: "fights over food at the gate",
      },
      {
        horseAId: horses["Whiskey"],
        horseBId: horses["Marigold"],
        reason: "colt gets agitated around mares in heat",
      },
    ],
  });

  console.log("Creating today's board...");
  const today = todayDateOnly();
  await prisma.turnoutEvent.createMany({
    data: [
      // AM — North Paddock: already finished for the morning
      {
        date: today,
        horseId: horses["Comet"],
        spaceId: spaces["North Paddock"],
        shift: "AM",
        status: "in",
        actualOutTime: todayAt(7, 10),
        actualInTime: todayAt(9, 25),
      },
      {
        date: today,
        horseId: horses["Juniper"],
        spaceId: spaces["North Paddock"],
        shift: "AM",
        status: "out",
        actualOutTime: todayAt(7, 15),
      },
      // AM — East Pasture: Morning Mares
      {
        date: today,
        horseId: horses["Marigold"],
        spaceId: spaces["East Pasture"],
        shift: "AM",
        status: "out",
        actualOutTime: todayAt(7, 30),
      },
      {
        date: today,
        horseId: horses["Clover"],
        spaceId: spaces["East Pasture"],
        shift: "AM",
        status: "out",
        actualOutTime: todayAt(7, 30),
      },
      {
        date: today,
        horseId: horses["Willow"],
        spaceId: spaces["East Pasture"],
        shift: "AM",
        status: "scheduled",
        note: "First time out with this group — waiting for a second handler before turning out",
      },
      // AM — Round Pen: solo
      {
        date: today,
        horseId: horses["Whiskey"],
        spaceId: spaces["Round Pen"],
        shift: "AM",
        status: "out",
        actualOutTime: todayAt(8, 0),
      },
      // PM — Back Forty: Gelding Group (Birch + Dune will flag a conflict)
      {
        date: today,
        horseId: horses["Birch"],
        spaceId: spaces["Back Forty"],
        shift: "PM",
        status: "scheduled",
      },
      {
        date: today,
        horseId: horses["Ember"],
        spaceId: spaces["Back Forty"],
        shift: "PM",
        status: "scheduled",
      },
      {
        date: today,
        horseId: horses["Dune"],
        spaceId: spaces["Back Forty"],
        shift: "PM",
        status: "scheduled",
      },
      // PM — Sick Bay: limited/rehab
      {
        date: today,
        horseId: horses["Sable"],
        spaceId: spaces["Sick Bay Paddock"],
        shift: "PM",
        status: "skipped",
        note: "Vet checked her this morning — holding off turnout until this evening",
      },
      {
        date: today,
        horseId: horses["Rowan"],
        spaceId: spaces["Sick Bay Paddock"],
        shift: "PM",
        status: "out",
        actualOutTime: todayAt(9, 0),
        note: "Hand-walk only, 20 min — no free turnout yet per vet",
      },
    ],
  });

  console.log("Done. Maple is intentionally unscheduled today — no rule covers her yet.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
