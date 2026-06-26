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

export interface FieldMetadata {
  value: any;
  source: "rule" | "neural" | "human" | "default";
  sourceDetail: string;
  confidence: number;
}

export type ProvenanceMap = Record<string, FieldMetadata>;

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
  provenance?: ProvenanceMap; // PRANA metadata
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
  const p: ProfilKerentanan = {
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

  // Inisialisasi provenance untuk ekstraksi LLM (neural)
  p.provenance = {
    namaKK: { value: p.namaKK, source: "neural", sourceDetail: "gemini-extraction", confidence: p.namaKK ? 0.85 : 1.0 },
    usiaKK: { value: p.usiaKK, source: "neural", sourceDetail: "gemini-extraction", confidence: p.usiaKK !== null ? 0.85 : 1.0 },
    anggotaKeluarga: { value: p.anggotaKeluarga, source: "neural", sourceDetail: "gemini-extraction", confidence: p.anggotaKeluarga.length > 0 ? 0.85 : 1.0 },
    kondisiMedisKritis: { value: p.kondisiMedisKritis, source: "neural", sourceDetail: "gemini-extraction", confidence: p.kondisiMedisKritis.length > 0 ? 0.85 : 1.0 },
    obatTersedia: { value: p.obatTersedia, source: "neural", sourceDetail: "gemini-extraction", confidence: p.obatTersedia !== null ? 0.85 : 1.0 },
    mobilitas: { value: p.mobilitas, source: "neural", sourceDetail: "gemini-extraction", confidence: p.mobilitas ? 0.85 : 1.0 },
    asalLokasi: { value: p.asalLokasi, source: "neural", sourceDetail: "gemini-extraction", confidence: p.asalLokasi ? 0.85 : 1.0 },
    instansiRujukan: { value: p.instansiRujukan, source: "neural", sourceDetail: "gemini-extraction", confidence: 0.8 },
  };

  return p;
}
