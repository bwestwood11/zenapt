/*
  Warnings:

  - You are about to drop the column `basPrice` on the `AddOn` table. All the data in the column will be lost.
  - Added the required column `basePrice` to the `AddOn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `incrementalDuration` to the `AddOn` table without a default value. This is not possible if the table is not empty.
  - Added the required column `serviceTermId` to the `AddOn` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."AddOn" DROP COLUMN "basPrice",
ADD COLUMN     "basePrice" INTEGER NOT NULL,
ADD COLUMN     "incrementalDuration" INTEGER NOT NULL,
ADD COLUMN     "serviceTermId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "public"."_AddOnToEmployeeService" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_AddOnToEmployeeService_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_AddOnToEmployeeService_B_index" ON "public"."_AddOnToEmployeeService"("B");

-- AddForeignKey
ALTER TABLE "public"."AddOn" ADD CONSTRAINT "AddOn_serviceTermId_fkey" FOREIGN KEY ("serviceTermId") REFERENCES "public"."ServiceTerms"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AddOnToEmployeeService" ADD CONSTRAINT "_AddOnToEmployeeService_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."AddOn"("_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_AddOnToEmployeeService" ADD CONSTRAINT "_AddOnToEmployeeService_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."EmployeeService"("_id") ON DELETE CASCADE ON UPDATE CASCADE;
