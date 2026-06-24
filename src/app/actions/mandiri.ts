"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hitungSkor } from "@/lib/scoring";
import { catatAudit } from "@/lib/audit";
import { generateKodeUnik, jarakMeter } from "@/lib/utils";
import { normalisasiKondisi } from "@/lib/synonyms";
import type { ProfilKerentanan } from "@/lib/types";

/**
 * Mode MANDIRI (publik, tanpa login).
 * Korban mengisi formulir pilihan ganda (sudah terstruktur -> tidak perlu LLM).
 * Validasi geolokasi terhadap PoskoConfig: di luar radius -> isSpam=true
 * (tetap disimpan, tapi disembunyikan dari dashboard utama).
 * Mengembalikan kodeUnik untuk dirender jadi QR.
 */
const mandiriSchema = z.object({
  kodePosko: z.string().min(1),
  namaKK: z.string().trim().min(1).max(120).nullable(),
  usiaKK: z.number().int().min(0).max(130).nullable(),
  jumlahAnggota: z.number().int().min(0).max(30).default(0),
  punyaBalita: z.boolean().default(false),
  punyaIbuHamil: z.boolean().default(false),
  punyaLansiaLain: z.boolean().default(false),
  kondisiMedisKritis: z.array(z.string().trim().min(1)).default([]),
  obatTersedia: z.boolean().nullable(),
  mobilitas: z.enum(["mandiri", "bantuan", "tidak_bisa"]).nullable(),
  asalLokasi: z.string().trim().max(200).nullable(),
  geoLat: z.number().nullable(),
  geoLng: z.number().nullable(),
  fotoUrl: z.string().max(2_000_000).nullable(), // data URL foto bukti (opsional)
});

export type MandiriInput = z.infer<typeof mandiriSchema>;

export async function submitMandiri(
  input: MandiriInput
): Promise<
  | { ok: true; kodeUnik: string; level: string; skor: number; isSpam: boolean }
  | { ok: false; error: string }
> {
  try {
    const parsed = mandiriSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
    }
    const d = parsed.data;

    const posko = await prisma.poskoConfig.findUnique({
      where: { kodePosko: d.kodePosko },
    });
    if (!posko) return { ok: false, error: "Kode posko tidak dikenal" };

    // Validasi anti-spam berbasis jarak.
    let isSpam = false;
    if (typeof d.geoLat === "number" && typeof d.geoLng === "number") {
      const jarak = jarakMeter(d.geoLat, d.geoLng, posko.lat, posko.lng);
      if (jarak > posko.radiusMeter) isSpam = true;
    } else {
      // Tidak memberi izin lokasi -> tandai spam (tetap disimpan untuk audit).
      isSpam = true;
    }

    // Susun anggota keluarga dari jawaban pilihan ganda.
    const anggota: ProfilKerentanan["anggotaKeluarga"] = [];
    if (d.punyaBalita) anggota.push({ hubungan: "anak", usia: 0, kondisiKhusus: "balita" });
    if (d.punyaIbuHamil)
      anggota.push({ hubungan: "anggota", usia: null, kondisiKhusus: "ibu hamil" });
    if (d.punyaLansiaLain)
      anggota.push({ hubungan: "anggota", usia: 65, kondisiKhusus: "lansia" });
    // Sisanya sebagai anggota umum agar total jiwa benar.
    const sisa = Math.max(0, d.jumlahAnggota - anggota.length);
    for (let i = 0; i < sisa; i++)
      anggota.push({ hubungan: "anggota", usia: null, kondisiKhusus: null });

    const kondisi = d.kondisiMedisKritis.map(normalisasiKondisi);

    const profil: ProfilKerentanan = {
      agentThought: "Input mandiri korban (formulir pilihan ganda).",
      namaKK: d.namaKK,
      usiaKK: d.usiaKK,
      anggotaKeluarga: anggota,
      kondisiMedisKritis: kondisi,
      obatTersedia: d.obatTersedia,
      mobilitas: d.mobilitas,
      asalLokasi: d.asalLokasi,
      instansiRujukan: kondisi.length > 0 ? "DINAS_KESEHATAN" : "DINAS_SOSIAL",
    };
    const skor = hitungSkor(profil);

    const kasus = await prisma.kasus.create({
      data: {
        kodeUnik: generateKodeUnik("MND"),
        sumberInput: "MANDIRI",
        namaKK: d.namaKK,
        usiaKK: d.usiaKK,
        anggotaKeluarga: anggota,
        kondisiMedisKritis: kondisi,
        obatTersedia: d.obatTersedia,
        mobilitas: d.mobilitas,
        asalLokasi: d.asalLokasi,
        agentThought: profil.agentThought,
        skorKerentanan: skor.skor,
        levelPrioritas: skor.level,
        instansiRujukan: profil.instansiRujukan,
        statusVerifikasiMedis: false,
        status: "pending", // mandiri perlu ditinjau relawan/admin -> tetap pending
        geoLat: d.geoLat,
        geoLng: d.geoLng,
        isSpam,
        fotoUrl: d.fotoUrl,
      },
    });

    await catatAudit({
      aksi: "SUBMIT_MANDIRI",
      aktor: `publik:${d.kodePosko}`,
      kasusId: kasus.id,
      detail: { isSpam, level: skor.level, skor: skor.skor },
    });

    if (!isSpam) revalidatePath("/admin");
    return {
      ok: true,
      kodeUnik: kasus.kodeUnik,
      level: skor.level,
      skor: skor.skor,
      isSpam,
    };
  } catch (err) {
    console.error("[submitMandiri]", err);
    return { ok: false, error: "Gagal mengirim data. Coba lagi." };
  }
}
