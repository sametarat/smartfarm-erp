-- DropForeignKey
ALTER TABLE "farm_zones" DROP CONSTRAINT "farm_zones_farmId_fkey";

-- AlterTable
ALTER TABLE "farm_zones" ALTER COLUMN "farmId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "farm_zones" ADD CONSTRAINT "farm_zones_farmId_fkey" FOREIGN KEY ("farmId") REFERENCES "farms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
