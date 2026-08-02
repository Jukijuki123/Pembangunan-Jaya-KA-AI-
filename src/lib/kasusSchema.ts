import { z } from "zod";

/**
 * Skema kasus terkonfirmasi (dipakai server action intake + endpoint
 * Background Sync /api/offline/sync + validasi client-side offline queue).
 * Dipindah ke lib agar tidak ada circular import antara actions & route.
 */
export const anggotaSchema = z.object({
  hubungan: z.string().min(1),
  usia: z.number().nullable(),
  kondisiKhusus: z.string().nullable(),
});

export const konfirmasiSchema = z.object({
  agentThought: z.string().default(""),
  namaKK: z
    .string()
    .trim()
    .nullable()
    .transform((v) => (v === "" ? null : v))
    .default(null),
  usiaKK: z.number().int().min(0).max(130).nullable().optional().default(null),
  anggotaKeluarga: z.array(anggotaSchema).default([]),
  kondisiMedisKritis: z.array(z.string().trim().min(1)).default([]),
  obatTersedia: z.boolean().nullable().optional().default(null),
  mobilitas: z
    .enum(["mandiri", "bantuan", "tidak_bisa"])
    .nullable()
    .optional()
    .default(null),
  asalLokasi: z.string().trim().nullable().optional().default(null),
  instansiRujukan: z.enum(["DINAS_KESEHATAN", "DINAS_SOSIAL", "BPBD"]),
  provenance: z.record(z.any()).optional(),
});

export type KonfirmasiInput = z.infer<typeof konfirmasiSchema>;
