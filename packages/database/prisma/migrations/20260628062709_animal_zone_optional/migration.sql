-- DropForeignKey
ALTER TABLE "crops" DROP CONSTRAINT "crops_zoneId_fkey";

-- AlterTable
ALTER TABLE "crops" ALTER COLUMN "zoneId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "crops" ADD CONSTRAINT "crops_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "farm_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
