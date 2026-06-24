-- CreateEnum
CREATE TYPE "Role" AS ENUM ('RELAWAN', 'ADMIN');

-- CreateEnum
CREATE TYPE "SumberInput" AS ENUM ('RELAWAN', 'MANDIRI');

-- CreateEnum
CREATE TYPE "Level" AS ENUM ('HIJAU', 'KUNING', 'MERAH');

-- CreateEnum
CREATE TYPE "Instansi" AS ENUM ('DINAS_KESEHATAN', 'DINAS_SOSIAL', 'BPBD');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Kasus" (
    "id" TEXT NOT NULL,
    "kodeUnik" TEXT NOT NULL,
    "sumberInput" "SumberInput" NOT NULL,
    "namaKK" TEXT,
    "usiaKK" INTEGER,
    "anggotaKeluarga" JSONB,
    "kondisiMedisKritis" JSONB,
    "obatTersedia" BOOLEAN,
    "mobilitas" TEXT,
    "asalLokasi" TEXT,
    "agentThought" TEXT,
    "skorKerentanan" INTEGER NOT NULL DEFAULT 0,
    "levelPrioritas" "Level" NOT NULL DEFAULT 'HIJAU',
    "instansiRujukan" "Instansi",
    "statusVerifikasiMedis" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "geoLat" DOUBLE PRECISION,
    "geoLng" DOUBLE PRECISION,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "fotoUrl" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Kasus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "aksi" TEXT NOT NULL,
    "aktor" TEXT NOT NULL,
    "kasusId" TEXT,
    "detail" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoskoConfig" (
    "id" TEXT NOT NULL,
    "kodePosko" TEXT NOT NULL,
    "nama" TEXT NOT NULL DEFAULT 'Posko Pengungsian',
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "radiusMeter" INTEGER NOT NULL DEFAULT 2000,

    CONSTRAINT "PoskoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LaporanHarian" (
    "id" TEXT NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ringkasanAI" TEXT NOT NULL,
    "ringkasanFinal" TEXT,
    "dikirimOleh" TEXT,
    "terkirim" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LaporanHarian_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Kasus_kodeUnik_key" ON "Kasus"("kodeUnik");

-- CreateIndex
CREATE INDEX "Kasus_levelPrioritas_idx" ON "Kasus"("levelPrioritas");

-- CreateIndex
CREATE INDEX "Kasus_status_idx" ON "Kasus"("status");

-- CreateIndex
CREATE INDEX "Kasus_isSpam_idx" ON "Kasus"("isSpam");

-- CreateIndex
CREATE INDEX "Kasus_instansiRujukan_idx" ON "Kasus"("instansiRujukan");

-- CreateIndex
CREATE INDEX "Kasus_createdById_idx" ON "Kasus"("createdById");

-- CreateIndex
CREATE INDEX "AuditLog_kasusId_idx" ON "AuditLog"("kasusId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PoskoConfig_kodePosko_key" ON "PoskoConfig"("kodePosko");

-- AddForeignKey
ALTER TABLE "Kasus" ADD CONSTRAINT "Kasus_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
