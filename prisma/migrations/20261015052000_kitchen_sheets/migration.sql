-- CreateTable
CREATE TABLE "kitchen_sheet" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "finalizedAt" TIMESTAMP(3),
    "finalizedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kitchen_sheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "kitchen_adjustment" (
    "id" TEXT NOT NULL,
    "sheetId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "itemLabel" TEXT NOT NULL,
    "qtyDelta" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "kitchen_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "kitchen_sheet_messId_date_idx" ON "kitchen_sheet"("messId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "kitchen_sheet_messId_slotId_date_key" ON "kitchen_sheet"("messId", "slotId", "date");

-- CreateIndex
CREATE INDEX "kitchen_adjustment_sheetId_idx" ON "kitchen_adjustment"("sheetId");

-- AddForeignKey
ALTER TABLE "kitchen_sheet" ADD CONSTRAINT "kitchen_sheet_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_sheet" ADD CONSTRAINT "kitchen_sheet_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "menu_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kitchen_adjustment" ADD CONSTRAINT "kitchen_adjustment_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "kitchen_sheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

