import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

const BASE_URL = "https://www.hardwarestack.dev";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [cpus, gpus] = await Promise.all([
    prisma.cpu.findMany({ select: { modelName: true } }),
    prisma.gpu.findMany({ select: { modelName: true } }),
  ]);

  const cpuUrls: MetadataRoute.Sitemap = cpus.map((cpu) => ({
    url: `${BASE_URL}/cpu/${toSlug(cpu.modelName)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const gpuUrls: MetadataRoute.Sitemap = gpus.map((gpu) => ({
    url: `${BASE_URL}/gpu/${toSlug(gpu.modelName)}`,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [
    { url: BASE_URL, changeFrequency: "weekly", priority: 1.0 },
    { url: `${BASE_URL}/cpus`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${BASE_URL}/gpus`, changeFrequency: "weekly", priority: 0.8 },
    ...cpuUrls,
    ...gpuUrls,
  ];
}
