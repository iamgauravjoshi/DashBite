-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "subscriptionId" TEXT,
ALTER COLUMN "orderId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "subscription_plan" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mealsTotal" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "slotId" TEXT NOT NULL,
    "planName" TEXT NOT NULL,
    "mealsTotal" INTEGER NOT NULL,
    "validityDays" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "cancelReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_skip" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "serviceDate" DATE NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_skip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_pause" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "extensionDays" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumedAt" TIMESTAMP(3),

    CONSTRAINT "subscription_pause_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_adjustment" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "daysDelta" INTEGER,
    "mealsDelta" INTEGER,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_adjustment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscription_plan_messId_idx" ON "subscription_plan"("messId");

-- CreateIndex
CREATE INDEX "subscription_customerId_idx" ON "subscription"("customerId");

-- CreateIndex
CREATE INDEX "subscription_messId_idx" ON "subscription"("messId");

-- CreateIndex
CREATE INDEX "subscription_status_idx" ON "subscription"("status");

-- CreateIndex
CREATE INDEX "subscription_skip_subscriptionId_idx" ON "subscription_skip"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_skip_subscriptionId_serviceDate_key" ON "subscription_skip"("subscriptionId", "serviceDate");

-- CreateIndex
CREATE INDEX "subscription_pause_subscriptionId_idx" ON "subscription_pause"("subscriptionId");

-- CreateIndex
CREATE INDEX "subscription_adjustment_subscriptionId_idx" ON "subscription_adjustment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "payment_subscriptionId_key" ON "payment"("subscriptionId");

-- AddForeignKey
ALTER TABLE "payment" ADD CONSTRAINT "payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan" ADD CONSTRAINT "subscription_plan_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_plan" ADD CONSTRAINT "subscription_plan_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "menu_slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription" ADD CONSTRAINT "subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "subscription_plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_skip" ADD CONSTRAINT "subscription_skip_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_pause" ADD CONSTRAINT "subscription_pause_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscription_adjustment" ADD CONSTRAINT "subscription_adjustment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "subscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;

