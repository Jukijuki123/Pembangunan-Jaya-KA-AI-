import type { KategoriKebutuhan, Level } from "@prisma/client";

/** Label Indonesia untuk setiap kategori kebutuhan (dipakai UI). */
export const KATEGORI_LABEL: Record<KategoriKebutuhan, string> = {
  obat_demam_analgesik: "Obat demam / analgesik",
  obat_kronis: "Obat kronis",
  kebutuhan_bayi: "Kebutuhan bayi",
  kebutuhan_ibu_hamil: "Kebutuhan ibu hamil",
  air_bersih: "Air bersih",
  makanan_pokok: "Makanan pokok",
  selimut_pakaian: "Selimut & pakaian",
  tenaga_medis: "Tenaga medis",
  lainnya: "Lainnya",
};

export const KATEGORI_LIST = Object.keys(KATEGORI_LABEL) as KategoriKebutuhan[];

/** Warna marker mengikuti urgensi tertinggi di posko. */
export const URGENSI_WARNA: Record<Level, string> = {
  MERAH: "#dc2626",
  KUNING: "#d97706",
  HIJAU: "#16a34a",
};

/** Warna marker dari level urgensi (null = netral/belum ada laporan). */
export function warnaUrgensi(level: Level | null): string | null {
  return level ? URGENSI_WARNA[level] : null;
}

/** Urutan prioritas urgensi (MERAH > KUNING > HIJAU). */
const RANK: Record<Level, number> = { HIJAU: 0, KUNING: 1, MERAH: 2 };

export function urgensiTertinggi(items: { urgensi: Level }[]): Level | null {
  if (!items.length) return null;
  return items.reduce((a, b) => (RANK[b.urgensi] > RANK[a.urgensi] ? b : a)).urgensi;
}

/** Jarak antar koordinat (meter) — haversine, duplikat dari lib/utils. */
export function jarakMeter(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}
