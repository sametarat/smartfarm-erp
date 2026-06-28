-- DropForeignKey
ALTER TABLE "animals" DROP CONSTRAINT "animals_zoneId_fkey";

-- AlterTable
ALTER TABLE "animals" ALTER COLUMN "zoneId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "animals" ADD CONSTRAINT "animals_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "farm_zones"("id") ON DELETE SET NULL ON UPDATE CASCADE;
