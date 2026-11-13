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

// HMR may retain a constructor while its cached client's delegates still use
// older generated metadata. Check current administrative models as well.
// Do not disconnect a replaced client: an in-flight request may still own it.
const cached = process.env.NODE_ENV !== "production" &&
  globalForPrisma.prismaConstructor === PrismaClient &&
  ["customer", "customerCounter", "supplier", "supplierCounter", "purchase", "purchaseCounter", "purchaseLine"].every(
    model => typeof globalForPrisma.prisma?.[model as "customer" | "customerCounter" | "supplier" | "supplierCounter" | "purchase" | "purchaseCounter" | "purchaseLine"]?.findMany === "function",
  ) ? globalForPrisma.prisma : undefined;

export const prisma =
  cached ??
  new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaConstructor = PrismaClient;
}
