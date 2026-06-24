/**
 * Seed data awal SIGAP AI.
 * Jalankan: npm run db:seed
 *
 * Membuat:
 *  - 1 akun ADMIN  (admin / admin123)
 *  - 1 akun RELAWAN (relawan / relawan123)
 *  - 1 PoskoConfig contoh (kode "POSKO01") untuk mode mandiri/QR
 *
 * GANTI password default ini sebelum dipakai di lingkungan nyata.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminPass = await bcrypt.hash("admin123", 10);
  const relawanPass = await bcrypt.hash("relawan123", 10);

  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: { username: "admin", passwordHash: adminPass, role: "ADMIN" },
  });

  await prisma.user.upsert({
    where: { username: "relawan" },
    update: {},
    create: { username: "relawan", passwordHash: relawanPass, role: "RELAWAN" },
  });

  // Posko contoh — Monas, Jakarta. Radius 2 km untuk validasi anti-spam.
  await prisma.poskoConfig.upsert({
    where: { kodePosko: "POSKO01" },
    update: {},
    create: {
      kodePosko: "POSKO01",
      nama: "Posko Pengungsian Lapangan Monas",
      lat: -6.1754,
      lng: 106.8272,
      radiusMeter: 2000,
    },
  });

  console.log("✅ Seed selesai:");
  console.log("   ADMIN   -> username: admin   | password: admin123");
  console.log("   RELAWAN -> username: relawan | password: relawan123");
  console.log("   POSKO   -> kode: POSKO01 (/mandiri/POSKO01)");
}

main()
  .catch((e) => {
    console.error("❌ Seed gagal:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
