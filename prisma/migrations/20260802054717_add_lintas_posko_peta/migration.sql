-- CreateEnum
CREATE TYPE "KategoriKebutuhan" AS ENUM ('obat_demam_analgesik', 'obat_kronis', 'kebutuhan_bayi', 'kebutuhan_ibu_hamil', 'air_bersih', 'makanan_pokok', 'selimut_pakaian', 'tenaga_medis', 'lainnya');

-- CreateEnum
CREATE TYPE "StatusKebutuhan" AS ENUM ('pending', 'dikonfirmasi');

-- CreateTable
CREATE TABLE "Posko" (
    "id" TEXT NOT NULL,
    "namaPosko" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "areaPublik" TEXT NOT NULL,
    "alamatText" TEXT,
    "adminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Posko_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KebutuhanAgregat" (
    "id" TEXT NOT NULL,
    "poskoId" TEXT NOT NULL,
    "kategori" "KategoriKebutuhan" NOT NULL,
    "ringkasanLaporan" TEXT,
    "estimasiJumlah" INTEGER,
    "urgensi" "Level" NOT NULL,
    "perluKonfirmasiMedis" BOOLEAN NOT NULL DEFAULT true,
    "status" "StatusKebutuhan" NOT NULL DEFAULT 'pending',
    "dikonfirmasiOleh" TEXT,
    "lastUpdated" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KebutuhanAgregat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeocodeCache" (
    "id" TEXT NOT NULL,
    "alamat" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeocodeCache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Posko_areaPublik_idx" ON "Posko"("areaPublik");

-- CreateIndex
CREATE INDEX "KebutuhanAgregat_poskoId_idx" ON "KebutuhanAgregat"("poskoId");

-- CreateIndex
CREATE INDEX "KebutuhanAgregat_status_idx" ON "KebutuhanAgregat"("status");

-- CreateIndex
CREATE UNIQUE INDEX "GeocodeCache_alamat_key" ON "GeocodeCache"("alamat");

-- AddForeignKey
ALTER TABLE "Posko" ADD CONSTRAINT "Posko_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KebutuhanAgregat" ADD CONSTRAINT "KebutuhanAgregat_poskoId_fkey" FOREIGN KEY ("poskoId") REFERENCES "Posko"("id") ON DELETE CASCADE ON UPDATE CASCADE;
