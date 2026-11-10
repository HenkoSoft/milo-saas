import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL must be set before Prisma is used.");
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaConstructor?: typeof PrismaClient;
};

// A generated client reload can change its model metadata while Next.js keeps
// globalThis alive. Reuse only the client built by this exact constructor.
// Do not disconnect a replaced client: an in-flight request may still own it.
const cached = process.env.NODE_ENV !== "production" &&
  globalForPrisma.prismaConstructor === PrismaClient ? globalForPrisma.prisma : undefined;

export const prisma =
  cached ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConstructor = PrismaClient;
}
