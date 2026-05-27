-- CreateEnum
CREATE TYPE "Vendor" AS ENUM ('AMD', 'INTEL', 'NVIDIA');

-- CreateEnum
CREATE TYPE "ComponentTier" AS ENUM ('ENTRY', 'MID', 'HIGH', 'ULTRA', 'ENTHUSIAST');

-- CreateTable
CREATE TABLE "Cpu" (
    "id" TEXT NOT NULL,
    "vendor" "Vendor" NOT NULL,
    "modelName" TEXT NOT NULL,
    "cores" INTEGER NOT NULL,
    "threads" INTEGER NOT NULL,
    "baseClockGhz" DOUBLE PRECISION NOT NULL,
    "boostClockGhz" DOUBLE PRECISION NOT NULL,
    "socket" TEXT,
    "tier" "ComponentTier" NOT NULL,
    "singleCoreScore" INTEGER,
    "multiCoreScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cpu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Gpu" (
    "id" TEXT NOT NULL,
    "vendor" "Vendor" NOT NULL,
    "modelName" TEXT NOT NULL,
    "vramGb" INTEGER NOT NULL,
    "memoryType" TEXT,
    "architecture" TEXT,
    "tier" "ComponentTier" NOT NULL,
    "rasterScore" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Gpu_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetailLink" (
    "id" TEXT NOT NULL,
    "asin" TEXT NOT NULL,
    "retailTitle" TEXT NOT NULL,
    "currentPrice" DOUBLE PRECISION,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "cpuId" TEXT,
    "gpuId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetailLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Cpu_modelName_key" ON "Cpu"("modelName");

-- CreateIndex
CREATE UNIQUE INDEX "Gpu_modelName_key" ON "Gpu"("modelName");

-- CreateIndex
CREATE UNIQUE INDEX "RetailLink_asin_key" ON "RetailLink"("asin");

-- CreateIndex
CREATE INDEX "RetailLink_cpuId_idx" ON "RetailLink"("cpuId");

-- CreateIndex
CREATE INDEX "RetailLink_gpuId_idx" ON "RetailLink"("gpuId");

-- AddForeignKey
ALTER TABLE "RetailLink" ADD CONSTRAINT "RetailLink_cpuId_fkey" FOREIGN KEY ("cpuId") REFERENCES "Cpu"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RetailLink" ADD CONSTRAINT "RetailLink_gpuId_fkey" FOREIGN KEY ("gpuId") REFERENCES "Gpu"("id") ON DELETE CASCADE ON UPDATE CASCADE;
