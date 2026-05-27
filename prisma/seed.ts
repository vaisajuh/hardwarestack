import "dotenv/config";
import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg(process.env.DATABASE_URL!);
const prisma = new PrismaClient({ adapter });

// Scores are calibrated so that a balanced 1080p system has cpuScore ≈ gpuScore.
// GPU rasterScore is the 1080p baseline; resolution scaling is applied at runtime.
const cpus = [
  // ENTHUSIAST
  { vendor: "INTEL" as const, modelName: "Intel Core i9-14900K", cores: 24, threads: 32, baseClockGhz: 3.2, boostClockGhz: 6.0, socket: "LGA1700", tier: "ENTHUSIAST" as const, singleCoreScore: 2400, multiCoreScore: 42000 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 9 7950X",    cores: 16, threads: 32, baseClockGhz: 4.5, boostClockGhz: 5.7, socket: "AM5",     tier: "ENTHUSIAST" as const, singleCoreScore: 2100, multiCoreScore: 38000 },
  // ULTRA
  { vendor: "INTEL" as const, modelName: "Intel Core i9-13900K", cores: 24, threads: 32, baseClockGhz: 3.0, boostClockGhz: 5.8, socket: "LGA1700", tier: "ULTRA" as const,       singleCoreScore: 2350, multiCoreScore: 40000 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 9 7900X",    cores: 12, threads: 24, baseClockGhz: 4.7, boostClockGhz: 5.6, socket: "AM5",     tier: "ULTRA" as const,       singleCoreScore: 2050, multiCoreScore: 28000 },
  // HIGH
  { vendor: "INTEL" as const, modelName: "Intel Core i7-14700K", cores: 20, threads: 28, baseClockGhz: 3.4, boostClockGhz: 5.6, socket: "LGA1700", tier: "HIGH" as const,        singleCoreScore: 2200, multiCoreScore: 34000 },
  { vendor: "INTEL" as const, modelName: "Intel Core i7-13700K", cores: 16, threads: 24, baseClockGhz: 3.4, boostClockGhz: 5.4, socket: "LGA1700", tier: "HIGH" as const,        singleCoreScore: 2150, multiCoreScore: 30000 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 7 7700X",    cores: 8,  threads: 16, baseClockGhz: 4.5, boostClockGhz: 5.4, socket: "AM5",     tier: "HIGH" as const,        singleCoreScore: 2000, multiCoreScore: 19000 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 7 5800X3D",  cores: 8,  threads: 16, baseClockGhz: 3.4, boostClockGhz: 4.5, socket: "AM4",     tier: "HIGH" as const,        singleCoreScore: 1850, multiCoreScore: 17500 },
  // MID
  { vendor: "INTEL" as const, modelName: "Intel Core i5-14600K", cores: 14, threads: 20, baseClockGhz: 3.5, boostClockGhz: 5.3, socket: "LGA1700", tier: "MID" as const,         singleCoreScore: 2000, multiCoreScore: 24000 },
  { vendor: "INTEL" as const, modelName: "Intel Core i5-13600K", cores: 14, threads: 20, baseClockGhz: 3.5, boostClockGhz: 5.1, socket: "LGA1700", tier: "MID" as const,         singleCoreScore: 1950, multiCoreScore: 23500 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 5 7600X",    cores: 6,  threads: 12, baseClockGhz: 4.7, boostClockGhz: 5.3, socket: "AM5",     tier: "MID" as const,         singleCoreScore: 1950, multiCoreScore: 14500 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 9 5900X",    cores: 12, threads: 24, baseClockGhz: 3.7, boostClockGhz: 4.8, socket: "AM4",     tier: "MID" as const,         singleCoreScore: 1750, multiCoreScore: 26000 },
  { vendor: "INTEL" as const, modelName: "Intel Core i7-12700K", cores: 12, threads: 20, baseClockGhz: 3.6, boostClockGhz: 5.0, socket: "LGA1700", tier: "MID" as const,         singleCoreScore: 1900, multiCoreScore: 22000 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 7 5800X",    cores: 8,  threads: 16, baseClockGhz: 3.8, boostClockGhz: 4.7, socket: "AM4",     tier: "MID" as const,         singleCoreScore: 1700, multiCoreScore: 16000 },
  // ENTRY
  { vendor: "INTEL" as const, modelName: "Intel Core i5-12600K", cores: 10, threads: 16, baseClockGhz: 3.7, boostClockGhz: 4.9, socket: "LGA1700", tier: "ENTRY" as const,       singleCoreScore: 1800, multiCoreScore: 18000 },
  { vendor: "INTEL" as const, modelName: "Intel Core i5-12400",  cores: 6,  threads: 12, baseClockGhz: 2.5, boostClockGhz: 4.4, socket: "LGA1700", tier: "ENTRY" as const,       singleCoreScore: 1700, multiCoreScore: 13000 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 5 5600X",    cores: 6,  threads: 12, baseClockGhz: 3.7, boostClockGhz: 4.6, socket: "AM4",     tier: "ENTRY" as const,       singleCoreScore: 1650, multiCoreScore: 12500 },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 5 5600",     cores: 6,  threads: 12, baseClockGhz: 3.5, boostClockGhz: 4.4, socket: "AM4",     tier: "ENTRY" as const,       singleCoreScore: 1620, multiCoreScore: 12000 },
  { vendor: "INTEL" as const, modelName: "Intel Core i3-13100",  cores: 4,  threads: 8,  baseClockGhz: 3.4, boostClockGhz: 4.5, socket: "LGA1700", tier: "ENTRY" as const,       singleCoreScore: 1600, multiCoreScore: 9000  },
  { vendor: "AMD" as const,   modelName: "AMD Ryzen 5 7600",     cores: 6,  threads: 12, baseClockGhz: 3.8, boostClockGhz: 5.1, socket: "AM5",     tier: "ENTRY" as const,       singleCoreScore: 1900, multiCoreScore: 13800 },
];

const gpus = [
  // ENTHUSIAST
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4090",    vramGb: 24, memoryType: "GDDR6X", architecture: "Ada Lovelace",  tier: "ENTHUSIAST" as const, rasterScore: 18000 },
  { vendor: "AMD" as const,    modelName: "AMD Radeon RX 7900 XTX",     vramGb: 24, memoryType: "GDDR6",  architecture: "RDNA 3",        tier: "ENTHUSIAST" as const, rasterScore: 16000 },
  // ULTRA
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4080 Super", vramGb: 16, memoryType: "GDDR6X", architecture: "Ada Lovelace", tier: "ULTRA" as const, rasterScore: 15000 },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4080",    vramGb: 16, memoryType: "GDDR6X", architecture: "Ada Lovelace",  tier: "ULTRA" as const,       rasterScore: 14000 },
  { vendor: "AMD" as const,    modelName: "AMD Radeon RX 7900 XT",      vramGb: 20, memoryType: "GDDR6",  architecture: "RDNA 3",        tier: "ULTRA" as const,       rasterScore: 13500 },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4070 Ti Super", vramGb: 16, memoryType: "GDDR6X", architecture: "Ada Lovelace", tier: "ULTRA" as const, rasterScore: 13000 },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 3090",    vramGb: 24, memoryType: "GDDR6X", architecture: "Ampere",        tier: "ULTRA" as const,       rasterScore: 11000 },
  // HIGH
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4070 Super", vramGb: 12, memoryType: "GDDR6X", architecture: "Ada Lovelace", tier: "HIGH" as const, rasterScore: 11000 },
  { vendor: "AMD" as const,    modelName: "AMD Radeon RX 7800 XT",      vramGb: 16, memoryType: "GDDR6",  architecture: "RDNA 3",        tier: "HIGH" as const,        rasterScore: 9000  },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4070",    vramGb: 12, memoryType: "GDDR6X", architecture: "Ada Lovelace",  tier: "HIGH" as const,        rasterScore: 9500  },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 3080 Ti", vramGb: 12, memoryType: "GDDR6X", architecture: "Ampere",        tier: "HIGH" as const,        rasterScore: 10500 },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 3080",    vramGb: 10, memoryType: "GDDR6X", architecture: "Ampere",        tier: "HIGH" as const,        rasterScore: 9500  },
  { vendor: "AMD" as const,    modelName: "AMD Radeon RX 6800 XT",      vramGb: 16, memoryType: "GDDR6",  architecture: "RDNA 2",        tier: "HIGH" as const,        rasterScore: 9000  },
  // MID
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4060 Ti", vramGb: 8,  memoryType: "GDDR6",  architecture: "Ada Lovelace",  tier: "MID" as const,         rasterScore: 7500  },
  { vendor: "AMD" as const,    modelName: "AMD Radeon RX 7700 XT",      vramGb: 12, memoryType: "GDDR6",  architecture: "RDNA 3",        tier: "MID" as const,         rasterScore: 7500  },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 3070 Ti", vramGb: 8,  memoryType: "GDDR6X", architecture: "Ampere",        tier: "MID" as const,         rasterScore: 8000  },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 3070",    vramGb: 8,  memoryType: "GDDR6",  architecture: "Ampere",        tier: "MID" as const,         rasterScore: 7500  },
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 3060 Ti", vramGb: 8,  memoryType: "GDDR6",  architecture: "Ampere",        tier: "MID" as const,         rasterScore: 6500  },
  // ENTRY
  { vendor: "NVIDIA" as const, modelName: "NVIDIA GeForce RTX 4060",    vramGb: 8,  memoryType: "GDDR6",  architecture: "Ada Lovelace",  tier: "ENTRY" as const,       rasterScore: 6000  },
  { vendor: "AMD" as const,    modelName: "AMD Radeon RX 7600",         vramGb: 8,  memoryType: "GDDR6",  architecture: "RDNA 3",        tier: "ENTRY" as const,       rasterScore: 5500  },
];

// speedMhz × channels gives the effective bandwidth score used in calculateBottleneck.
// RAM_REFERENCE_SCORE = 7200 (DDR4-3600 dual) = no penalty, no bonus.
const rams = [
  // ENTHUSIAST
  { modelName: "G.Skill Trident Z5 RGB DDR5-7200 CL34 2×16GB",    type: "DDR5" as const, speedMhz: 7200, capacityGb: 32, channels: 2, latencyCl: 34, tier: "ENTHUSIAST" as const },
  { modelName: "Corsair Dominator Titanium DDR5-6600 CL32 2×16GB", type: "DDR5" as const, speedMhz: 6600, capacityGb: 32, channels: 2, latencyCl: 32, tier: "ENTHUSIAST" as const },
  // ULTRA
  { modelName: "Corsair Vengeance DDR5-6000 CL30 2×16GB",          type: "DDR5" as const, speedMhz: 6000, capacityGb: 32, channels: 2, latencyCl: 30, tier: "ULTRA" as const },
  { modelName: "G.Skill Trident Z5 DDR5-6400 CL32 2×16GB",         type: "DDR5" as const, speedMhz: 6400, capacityGb: 32, channels: 2, latencyCl: 32, tier: "ULTRA" as const },
  // HIGH
  { modelName: "Kingston Fury Beast DDR5-5600 CL36 2×16GB",        type: "DDR5" as const, speedMhz: 5600, capacityGb: 32, channels: 2, latencyCl: 36, tier: "HIGH" as const },
  { modelName: "G.Skill Ripjaws V DDR4-3600 CL16 2×16GB",          type: "DDR4" as const, speedMhz: 3600, capacityGb: 32, channels: 2, latencyCl: 16, tier: "HIGH" as const },
  // MID
  { modelName: "Corsair Vengeance LPX DDR4-3200 CL16 2×8GB",       type: "DDR4" as const, speedMhz: 3200, capacityGb: 16, channels: 2, latencyCl: 16, tier: "MID" as const },
  { modelName: "Kingston Fury Beast DDR5-4800 CL38 2×8GB",         type: "DDR5" as const, speedMhz: 4800, capacityGb: 16, channels: 2, latencyCl: 38, tier: "MID" as const },
  // ENTRY
  { modelName: "Kingston HyperX Fury DDR4-2666 CL16 2×8GB",        type: "DDR4" as const, speedMhz: 2666, capacityGb: 16, channels: 2, latencyCl: 16, tier: "ENTRY" as const },
  { modelName: "Crucial DDR4-2400 CL17 2×4GB",                     type: "DDR4" as const, speedMhz: 2400, capacityGb: 8,  channels: 2, latencyCl: 17, tier: "ENTRY" as const },
  // Single-channel configs — significant bottleneck for many users
  { modelName: "Crucial DDR4-3200 CL22 1×16GB (Single Channel)",   type: "DDR4" as const, speedMhz: 3200, capacityGb: 16, channels: 1, latencyCl: 22, tier: "ENTRY" as const },
  { modelName: "Samsung DDR4-2666 1×8GB (Single Channel)",         type: "DDR4" as const, speedMhz: 2666, capacityGb: 8,  channels: 1, latencyCl: 19, tier: "ENTRY" as const },
];

async function main() {
  console.log("Seeding hardware data...");

  for (const cpu of cpus) {
    await prisma.cpu.upsert({
      where: { modelName: cpu.modelName },
      update: {},
      create: cpu,
    });
  }
  console.log(`Seeded ${cpus.length} CPUs`);

  for (const gpu of gpus) {
    await prisma.gpu.upsert({
      where: { modelName: gpu.modelName },
      update: {},
      create: gpu,
    });
  }
  console.log(`Seeded ${gpus.length} GPUs`);

  for (const ram of rams) {
    await prisma.ram.upsert({
      where: { modelName: ram.modelName },
      update: {},
      create: ram,
    });
  }
  console.log(`Seeded ${rams.length} RAM kits`);

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
