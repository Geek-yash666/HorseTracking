import type { HorseModel, SpaceModel, TurnoutEventModel } from "@/generated/prisma/models";

export type BoardEvent = TurnoutEventModel & { horse: HorseModel; space: SpaceModel };
