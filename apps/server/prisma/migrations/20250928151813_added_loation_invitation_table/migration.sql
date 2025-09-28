-- CreateTable
CREATE TABLE "public"."LocationInvitation" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "encryptedPassword" TEXT NOT NULL,
    "role" "public"."EmployeeRole" NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "locationId" TEXT NOT NULL,
    "expAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocationInvitation_pkey" PRIMARY KEY ("_id")
);

-- CreateIndex
CREATE INDEX "LocationInvitation_locationId_idx" ON "public"."LocationInvitation"("locationId");

-- CreateIndex
CREATE INDEX "LocationInvitation_email_idx" ON "public"."LocationInvitation"("email");

-- CreateIndex
CREATE UNIQUE INDEX "LocationInvitation_email_status_key" ON "public"."LocationInvitation"("email", "status");

-- AddForeignKey
ALTER TABLE "public"."LocationInvitation" ADD CONSTRAINT "LocationInvitation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
