-- CreateIndex
CREATE UNIQUE INDEX "TurnoutEvent_date_horseId_shift_key" ON "TurnoutEvent"("date", "horseId", "shift");
