import fs from "node:fs";
import path from "node:path";

import { PrismaLibSql } from "@prisma/adapter-libsql";
import { PrismaClient } from "@prisma/client";

const dataDir = path.join(process.cwd(), "data");
const databasePath = path.join(dataDir, "dinner-decider.sqlite");
fs.mkdirSync(dataDir, { recursive: true });

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

const adapter = new PrismaLibSql({
  url: `file:${databasePath.replace(/\\/g, "/")}`,
});

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
