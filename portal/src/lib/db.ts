import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  prismaWalEnabled: boolean | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// Enable WAL mode once per process (idempotent across HMR reloads).
if (!globalForPrisma.prismaWalEnabled) {
  (async () => {
    try {
      await prisma.$queryRawUnsafe("PRAGMA journal_mode=WAL");
      await prisma.$queryRawUnsafe("PRAGMA busy_timeout=5000");
      globalForPrisma.prismaWalEnabled = true;
    } catch (err) {
      console.error("[db] Failed to configure SQLite:", err);
    }
  })();
}
