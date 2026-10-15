-- CreateTable
CREATE TABLE "fulfillment" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'PICKUP',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "assigneeType" TEXT,
    "assigneeId" TEXT,
    "readyAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3),
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "fulfillment_attempt" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "fulfillment_attempt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "fulfillment_orderId_key" ON "fulfillment"("orderId");

-- CreateIndex
CREATE INDEX "fulfillment_messId_idx" ON "fulfillment"("messId");

-- CreateIndex
CREATE INDEX "fulfillment_assigneeId_idx" ON "fulfillment"("assigneeId");

-- CreateIndex
CREATE INDEX "fulfillment_status_idx" ON "fulfillment"("status");

-- CreateIndex
CREATE INDEX "fulfillment_attempt_fulfillmentId_idx" ON "fulfillment_attempt"("fulfillmentId");

-- AddForeignKey
ALTER TABLE "fulfillment" ADD CONSTRAINT "fulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment" ADD CONSTRAINT "fulfillment_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment" ADD CONSTRAINT "fulfillment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "fulfillment_attempt" ADD CONSTRAINT "fulfillment_attempt_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

