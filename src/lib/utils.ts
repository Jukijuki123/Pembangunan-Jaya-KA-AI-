/**
 * Helper umum tanpa dependensi berat.
 */

/** Hitung jarak dua titik koordinat (meter) — formula haversine. */
export function jarakMeter(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6_371_000; // radius bumi (m)
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/**
 * Generate kode unik untuk kasus (dipakai di QR mode mandiri & sebagai ID
 * anonim di dashboard). Format: KSS-YYMMDD-XXXX (tanpa nama asli).
 * Catatan: tidak memakai Math.random murni agar tabrakan kecil — gabung waktu + acak.
 */
export function generateKodeUnik(prefix = "KSS"): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const rand = crypto.randomUUID().split("-")[0].toUpperCase();
  return `${prefix}-${yy}${mm}${dd}-${rand}`;
}

/** Label & warna untuk level prioritas (dipakai konsisten di UI). */
export const LEVEL_META = {
  MERAH: { label: "MERAH — Kritis", cls: "merah", hex: "#dc2626" },
  KUNING: { label: "KUNING — Perhatian", cls: "kuning", hex: "#d97706" },
  HIJAU: { label: "HIJAU — Standar", cls: "hijau", hex: "#16a34a" },
} as const;

export const INSTANSI_LABEL: Record<string, string> = {
  DINAS_KESEHATAN: "Dinas Kesehatan",
  DINAS_SOSIAL: "Dinas Sosial",
  BPBD: "BPBD",
};
