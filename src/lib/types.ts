import { z } from "zod";

/**
 * Tipe bersama untuk hasil ekstraksi AI dan profil kerentanan.
 * Skema Zod dipakai untuk memvalidasi output Gemini di server sebelum dipercaya.
 */

export const anggotaKeluargaSchema = z.object({
  hubungan: z.string(),
  usia: z.number().nullable(),
  kondisiKhusus: z.string().nullable(),
});
export type AnggotaKeluarga = z.infer<typeof anggotaKeluargaSchema>;

export const mobilitasEnum = z.enum(["mandiri", "bantuan", "tidak_bisa"]);

export const instansiEnum = z.enum([
  "DINAS_KESEHATAN",
  "DINAS_SOSIAL",
  "BPBD",
]);

/**
 * Bentuk JSON yang DIMINTA dari Gemini (snake_case, sesuai system instruction).
 * Semua field boleh null bila tidak disebutkan relawan — TIDAK boleh berasumsi.
 */
export const geminiExtractionSchema = z.object({
  agent_thought: z.string(),
  nama_kk: z.string().nullable().optional().default(null),
  usia_kk: z.number().nullable().optional().default(null),
  anggota_keluarga: z
    .array(
      z.object({
        hubungan: z.string(),
        usia: z.number().nullable().optional().default(null),
        kondisi_khusus: z.string().nullable().optional().default(null),
      })
    )
    .default([]),
  kondisi_medis_kritis: z.array(z.string()).default([]),
  obat_tersedia: z.boolean().nullable().optional().default(null),
  mobilitas: mobilitasEnum.nullable().optional().default(null),
  asal_lokasi: z.string().nullable().optional().default(null),
  instansi_rujukan_sementara: instansiEnum.optional().default("DINAS_SOSIAL"),
});
export type GeminiExtraction = z.infer<typeof geminiExtractionSchema>;

/**
 * Profil ternormalisasi (camelCase) yang dipakai rule engine & UI.
 */
export interface ProfilKerentanan {
  agentThought: string;
  namaKK: string | null;
  usiaKK: number | null;
  anggotaKeluarga: AnggotaKeluarga[];
  kondisiMedisKritis: string[];
  obatTersedia: boolean | null;
  mobilitas: z.infer<typeof mobilitasEnum> | null;
  asalLokasi: string | null;
  instansiRujukan: z.infer<typeof instansiEnum>;
}

// type alias (bukan interface) agar kompatibel sebagai Prisma JSON value.
export type RincianSkor = {
  label: string;
  poin: number;
};

export type HasilSkor = {
  skor: number;
  level: "HIJAU" | "KUNING" | "MERAH";
  rincian: RincianSkor[];
  perluVerifikasiMedis: boolean;
};

/** Ubah output Gemini (snake_case) menjadi profil internal (camelCase). */
export function toProfil(e: GeminiExtraction): ProfilKerentanan {
  return {
    agentThought: e.agent_thought,
    namaKK: e.nama_kk,
    usiaKK: e.usia_kk,
    anggotaKeluarga: e.anggota_keluarga.map((a) => ({
      hubungan: a.hubungan,
      usia: a.usia,
      kondisiKhusus: a.kondisi_khusus,
    })),
    kondisiMedisKritis: e.kondisi_medis_kritis,
    obatTersedia: e.obat_tersedia,
    mobilitas: e.mobilitas,
    asalLokasi: e.asal_lokasi,
    instansiRujukan: e.instansi_rujukan_sementara,
  };
}
