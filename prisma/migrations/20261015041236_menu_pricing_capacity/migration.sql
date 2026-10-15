-- CreateTable
CREATE TABLE "menu_slot" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "cutoffTime" TEXT NOT NULL DEFAULT '09:00',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_slot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menu_item" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "pricePaise" INTEGER NOT NULL,
    "vegType" TEXT NOT NULL DEFAULT 'VEG',
    "photoUrl" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_menu" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "capacity" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_menu_item" (
    "id" TEXT NOT NULL,
    "weeklyMenuId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_menu" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "closed" BOOLEAN NOT NULL DEFAULT false,
    "capacity" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "date_menu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "date_menu_item" (
    "id" TEXT NOT NULL,
    "dateMenuId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "date_menu_item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "holiday" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "holiday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "slot_day" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "capacity" INTEGER NOT NULL,
    "booked" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "menu_slot_messId_idx" ON "menu_slot"("messId");

-- CreateIndex
CREATE UNIQUE INDEX "menu_slot_messId_key_key" ON "menu_slot"("messId", "key");

-- CreateIndex
CREATE INDEX "menu_item_messId_idx" ON "menu_item"("messId");

-- CreateIndex
CREATE INDEX "weekly_menu_messId_idx" ON "weekly_menu"("messId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_menu_messId_slotId_dayOfWeek_key" ON "weekly_menu"("messId", "slotId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "weekly_menu_item_weeklyMenuId_idx" ON "weekly_menu_item"("weeklyMenuId");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_menu_item_weeklyMenuId_itemId_key" ON "weekly_menu_item"("weeklyMenuId", "itemId");

-- CreateIndex
CREATE INDEX "date_menu_messId_date_idx" ON "date_menu"("messId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "date_menu_messId_slotId_date_key" ON "date_menu"("messId", "slotId", "date");

-- CreateIndex
CREATE INDEX "date_menu_item_dateMenuId_idx" ON "date_menu_item"("dateMenuId");

-- CreateIndex
CREATE UNIQUE INDEX "date_menu_item_dateMenuId_itemId_key" ON "date_menu_item"("dateMenuId", "itemId");

-- CreateIndex
CREATE INDEX "holiday_messId_date_idx" ON "holiday"("messId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "holiday_messId_date_key" ON "holiday"("messId", "date");

-- CreateIndex
CREATE INDEX "slot_day_messId_date_idx" ON "slot_day"("messId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "slot_day_messId_slotId_date_key" ON "slot_day"("messId", "slotId", "date");

-- AddForeignKey
ALTER TABLE "menu_slot" ADD CONSTRAINT "menu_slot_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menu_item" ADD CONSTRAINT "menu_item_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu" ADD CONSTRAINT "weekly_menu_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu" ADD CONSTRAINT "weekly_menu_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "menu_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_item" ADD CONSTRAINT "weekly_menu_item_weeklyMenuId_fkey" FOREIGN KEY ("weeklyMenuId") REFERENCES "weekly_menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_menu_item" ADD CONSTRAINT "weekly_menu_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "menu_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_menu" ADD CONSTRAINT "date_menu_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_menu" ADD CONSTRAINT "date_menu_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "menu_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_menu_item" ADD CONSTRAINT "date_menu_item_dateMenuId_fkey" FOREIGN KEY ("dateMenuId") REFERENCES "date_menu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "date_menu_item" ADD CONSTRAINT "date_menu_item_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "menu_item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "holiday" ADD CONSTRAINT "holiday_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_day" ADD CONSTRAINT "slot_day_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "slot_day" ADD CONSTRAINT "slot_day_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "menu_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
