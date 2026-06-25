import { PrismaClient } from "@prisma/client";
import "@/env"; // validasi env saat modul prisma pertama kali diimpor
import dns from "dns";

// Fix Node 18+ IPv6 resolution timeout issues when connecting to Supabase Pooler
dns.setDefaultResultOrder("ipv4first");
/**
 * Prisma client singleton.
 * Di serverless (Vercel) / dev hot-reload, hindari membuat banyak koneksi
 * dengan menyimpan instance di globalThis.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
