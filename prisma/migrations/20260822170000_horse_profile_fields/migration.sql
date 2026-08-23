-- Add horse profile fields and replace the boolean `active` with a
-- three-state lifecycle ("rotation" | "training" | "retired").
-- Every existing active horse maps to "rotation", inactive to "retired".

ALTER TABLE "Horse" ADD COLUMN "lifecycle" TEXT NOT NULL DEFAULT 'rotation';
ALTER TABLE "Horse" ADD COLUMN "breed" TEXT;
ALTER TABLE "Horse" ADD COLUMN "gender" TEXT;
ALTER TABLE "Horse" ADD COLUMN "ageYears" INTEGER;
ALTER TABLE "Horse" ADD COLUMN "photoUrl" TEXT;

UPDATE "Horse" SET "lifecycle" = 'retired' WHERE "active" = false;

ALTER TABLE "Horse" DROP COLUMN "active";
