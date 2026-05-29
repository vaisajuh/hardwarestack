import { PrismaClient } from "@/lib/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as { _prisma: PrismaClient };

function getClient(): PrismaClient {
  if (!globalForPrisma._prisma) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("DATABASE_URL is not set");
    globalForPrisma._prisma = new PrismaClient({
      adapter: new PrismaPg(connectionString),
    });
  }
  return globalForPrisma._prisma;
}

// Proxy defers client instantiation until the first method call,
// so the build succeeds even without DATABASE_URL in the environment.
export const prisma = new Proxy({} as PrismaClient, {
  get(_, prop) {
    return Reflect.get(getClient(), prop);
  },
});
