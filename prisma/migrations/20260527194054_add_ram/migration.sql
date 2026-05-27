-- CreateEnum
CREATE TYPE "RamType" AS ENUM ('DDR4', 'DDR5');

-- AlterTable
ALTER TABLE "RetailLink" ADD COLUMN     "ramId" TEXT;

-- CreateTable
CREATE TABLE "Ram" (
    "id" TEXT NOT NULL,
    "modelName" TEXT NOT NULL,
    "type" "RamType" NOT NULL,
    "speedMhz" INTEGER NOT NULL,
    "capacityGb" INTEGER NOT NULL,
    "channels" INTEGER NOT NULL DEFAULT 2,
    "latencyCl" INTEGER,
    "tier" "ComponentTier" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Ram_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Ram_modelName_key" ON "Ram"("modelName");

-- CreateIndex
CREATE INDEX "RetailLink_ramId_idx" ON "RetailLink"("ramId");

-- AddForeignKey
ALTER TABLE "RetailLink" ADD CONSTRAINT "RetailLink_ramId_fkey" FOREIGN KEY ("ramId") REFERENCES "Ram"("id") ON DELETE CASCADE ON UPDATE CASCADE;
