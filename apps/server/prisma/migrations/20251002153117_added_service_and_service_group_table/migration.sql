-- CreateTable
CREATE TABLE "public"."ServiceTerms" (
    "_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serviceGroupId" TEXT,
    "description" TEXT,
    "minimumPrice" INTEGER NOT NULL,
    "organizationId" TEXT NOT NULL,

    CONSTRAINT "ServiceTerms_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."ServiceGroup" (
    "_id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "ServiceGroup_pkey" PRIMARY KEY ("_id")
);

-- CreateTable
CREATE TABLE "public"."Service" (
    "_id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "duration" INTEGER NOT NULL,
    "locationEmployeeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Service_pkey" PRIMARY KEY ("_id")
);

-- AddForeignKey
ALTER TABLE "public"."ServiceTerms" ADD CONSTRAINT "ServiceTerms_serviceGroupId_fkey" FOREIGN KEY ("serviceGroupId") REFERENCES "public"."ServiceGroup"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceTerms" ADD CONSTRAINT "ServiceTerms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ServiceGroup" ADD CONSTRAINT "ServiceGroup_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "public"."ServiceTerms"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "public"."Location"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Service" ADD CONSTRAINT "Service_locationEmployeeId_fkey" FOREIGN KEY ("locationEmployeeId") REFERENCES "public"."LocationEmployee"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
