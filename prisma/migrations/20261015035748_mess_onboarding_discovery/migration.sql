-- CreateEnum
CREATE TYPE "MessVerificationStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateTable
CREATE TABLE "mess" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "phone" TEXT NOT NULL,
    "line1" TEXT NOT NULL,
    "locality" TEXT NOT NULL,
    "city" TEXT NOT NULL DEFAULT 'Pune',
    "state" TEXT NOT NULL DEFAULT 'Maharashtra',
    "pincode" TEXT NOT NULL,
    "vegType" TEXT NOT NULL DEFAULT 'BOTH',
    "pickupAllowed" BOOLEAN NOT NULL DEFAULT true,
    "deliveryAllowed" BOOLEAN NOT NULL DEFAULT true,
    "deliveryNote" TEXT,
    "serviceAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operatingDays" TEXT[] DEFAULT ARRAY['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']::TEXT[],
    "opensAt" TEXT NOT NULL DEFAULT '07:00',
    "closesAt" TEXT NOT NULL DEFAULT '21:00',
    "verificationStatus" "MessVerificationStatus" NOT NULL DEFAULT 'DRAFT',
    "published" BOOLEAN NOT NULL DEFAULT false,
    "verificationReason" TEXT,
    "submittedAt" TIMESTAMP(3),
    "decidedAt" TIMESTAMP(3),
    "decidedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_staff" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mess_verification_event" (
    "id" TEXT NOT NULL,
    "messId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "from" "MessVerificationStatus" NOT NULL,
    "to" "MessVerificationStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mess_verification_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "mess_slug_key" ON "mess"("slug");

-- CreateIndex
CREATE INDEX "mess_ownerId_idx" ON "mess"("ownerId");

-- CreateIndex
CREATE INDEX "mess_city_idx" ON "mess"("city");

-- CreateIndex
CREATE INDEX "mess_verificationStatus_idx" ON "mess"("verificationStatus");

-- CreateIndex
CREATE INDEX "mess_staff_userId_idx" ON "mess_staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "mess_staff_messId_userId_key" ON "mess_staff"("messId", "userId");

-- CreateIndex
CREATE INDEX "mess_verification_event_messId_idx" ON "mess_verification_event"("messId");

-- AddForeignKey
ALTER TABLE "mess" ADD CONSTRAINT "mess_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_staff" ADD CONSTRAINT "mess_staff_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_staff" ADD CONSTRAINT "mess_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mess_verification_event" ADD CONSTRAINT "mess_verification_event_messId_fkey" FOREIGN KEY ("messId") REFERENCES "mess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
