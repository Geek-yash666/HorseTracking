-- CreateTable
CREATE TABLE "Horse" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Horse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Space" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "capacity" INTEGER,
    "notes" TEXT,

    CONSTRAINT "Space_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Group" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "notes" TEXT,

    CONSTRAINT "Group_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroupHorse" (
    "groupId" TEXT NOT NULL,
    "horseId" TEXT NOT NULL,

    CONSTRAINT "GroupHorse_pkey" PRIMARY KEY ("groupId","horseId")
);

-- CreateTable
CREATE TABLE "ScheduleRule" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "daysOfWeek" INTEGER[],
    "shift" TEXT NOT NULL,
    "defaultSpaceId" TEXT,
    "durationMin" INTEGER,

    CONSTRAINT "ScheduleRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TurnoutEvent" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "horseId" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "actualOutTime" TIMESTAMP(3),
    "actualInTime" TIMESTAMP(3),
    "note" TEXT,

    CONSTRAINT "TurnoutEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompatibilityRule" (
    "id" TEXT NOT NULL,
    "horseAId" TEXT NOT NULL,
    "horseBId" TEXT NOT NULL,
    "reason" TEXT,

    CONSTRAINT "CompatibilityRule_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GroupHorse" ADD CONSTRAINT "GroupHorse_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GroupHorse" ADD CONSTRAINT "GroupHorse_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleRule" ADD CONSTRAINT "ScheduleRule_defaultSpaceId_fkey" FOREIGN KEY ("defaultSpaceId") REFERENCES "Space"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoutEvent" ADD CONSTRAINT "TurnoutEvent_horseId_fkey" FOREIGN KEY ("horseId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TurnoutEvent" ADD CONSTRAINT "TurnoutEvent_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityRule" ADD CONSTRAINT "CompatibilityRule_horseAId_fkey" FOREIGN KEY ("horseAId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompatibilityRule" ADD CONSTRAINT "CompatibilityRule_horseBId_fkey" FOREIGN KEY ("horseBId") REFERENCES "Horse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
