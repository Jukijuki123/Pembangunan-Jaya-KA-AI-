/**
 * Pemetaan istilah awam/dialek -> istilah medis baku.
 *
 * Dipakai dua tempat:
 *  1. Disuntikkan ke system instruction Gemini supaya ekstraksi akurat untuk
 *     bahasa informal ("gula" -> diabetes, "darah tinggi" -> hipertensi).
 *  2. Normalisasi cadangan di server (jika LLM tetap mengembalikan istilah awam).
 *
 * Ini bagian dari mitigasi RISIKO BIAS: model tidak boleh salah menilai
 * kerentanan hanya karena warga memakai istilah lokal.
 */
export const SINONIM_MEDIS: Record<string, string> = {
  // metabolik
  gula: "diabetes",
  "kencing manis": "diabetes",
  "sakit gula": "diabetes",
  // kardiovaskular
  "darah tinggi": "hipertensi",
  "tekanan darah tinggi": "hipertensi",
  hipertensi: "hipertensi",
  "darah rendah": "hipotensi",
  jantung: "penyakit jantung",
  "sakit jantung": "penyakit jantung",
  stroke: "riwayat stroke",
  "lumpuh mendadak": "riwayat stroke",
  // pernapasan
  sesak: "gangguan pernapasan",
  "sesak napas": "gangguan pernapasan",
  asma: "asma",
  "ampek": "asma",
  tbc: "tuberkulosis",
  "batuk darah": "tuberkulosis",
  // ginjal & lainnya
  "cuci darah": "gagal ginjal",
  ginjal: "penyakit ginjal",
  ayan: "epilepsi",
  "step": "epilepsi",
  kejang: "epilepsi",
  // kesehatan jiwa / disabilitas
  "gangguan jiwa": "gangguan kesehatan jiwa",
  odgj: "gangguan kesehatan jiwa",
  buta: "disabilitas penglihatan",
  tuli: "disabilitas pendengaran",
  bisu: "disabilitas wicara",
  lumpuh: "disabilitas fisik",
  difabel: "disabilitas",
  cacat: "disabilitas",
};

/** Daftar string untuk disisipkan ke prompt Gemini. */
export function sinonimUntukPrompt(): string {
  return Object.entries(SINONIM_MEDIS)
    .map(([awam, baku]) => `"${awam}" -> ${baku}`)
    .join(", ");
}

/** Normalisasi satu istilah medis ke bentuk baku (fallback server-side). */
export function normalisasiKondisi(istilah: string): string {
  const key = istilah.trim().toLowerCase();
  return SINONIM_MEDIS[key] ?? istilah.trim();
}
