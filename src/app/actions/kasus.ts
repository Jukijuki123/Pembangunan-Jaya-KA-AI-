"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hitungSkor } from "@/lib/scoring";
import { catatAudit } from "@/lib/audit";
import { generateKodeUnik } from "@/lib/utils";
import type { ProfilKerentanan } from "@/lib/types";

const anggotaSchema = z.object({
  hubungan: z.string().min(1),
  usia: z.number().nullable(),
  kondisiKhusus: z.string().nullable(),
});

const konfirmasiSchema = z.object({
  agentThought: z.string().default(""),
  namaKK: z.string().trim().min(1).nullable(),
  usiaKK: z.number().int().min(0).max(130).nullable(),
  anggotaKeluarga: z.array(anggotaSchema).default([]),
  kondisiMedisKritis: z.array(z.string().trim().min(1)).default([]),
  obatTersedia: z.boolean().nullable(),
  mobilitas: z.enum(["mandiri", "bantuan", "tidak_bisa"]).nullable(),
  asalLokasi: z.string().trim().nullable(),
  instansiRujukan: z.enum(["DINAS_KESEHATAN", "DINAS_SOSIAL", "BPBD"]),
});

export type KonfirmasiInput = z.infer<typeof konfirmasiSchema>;

type ActionResult =
  | { ok: true; kasusId: string; kodeUnik: string; level: string; skor: number }
  | { ok: false; error: string };

/**
 * LAPIS 1 OVERSIGHT: simpan kasus SETELAH relawan mengonfirmasi tiap field.
 * Skor DIHITUNG ULANG di server dari field terkonfirmasi (rule engine),
 * client tidak bisa memalsukan skor/level.
 */
export async function simpanKasusTerkonfirmasi(
  input: KonfirmasiInput
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Tidak terautentikasi" };

    const parsed = konfirmasiSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
    }
    const d = parsed.data;

    const profil: ProfilKerentanan = {
      agentThought: d.agentThought,
      namaKK: d.namaKK,
      usiaKK: d.usiaKK,
      anggotaKeluarga: d.anggotaKeluarga,
      kondisiMedisKritis: d.kondisiMedisKritis,
      obatTersedia: d.obatTersedia,
      mobilitas: d.mobilitas,
      asalLokasi: d.asalLokasi,
      instansiRujukan: d.instansiRujukan,
    };
    const skor = hitungSkor(profil);

    const kasus = await prisma.kasus.create({
      data: {
        kodeUnik: generateKodeUnik(),
        sumberInput: "RELAWAN",
        namaKK: d.namaKK,
        usiaKK: d.usiaKK,
        anggotaKeluarga: d.anggotaKeluarga,
        kondisiMedisKritis: d.kondisiMedisKritis,
        obatTersedia: d.obatTersedia,
        mobilitas: d.mobilitas,
        asalLokasi: d.asalLokasi,
        agentThought: d.agentThought,
        skorKerentanan: skor.skor,
        levelPrioritas: skor.level,
        instansiRujukan: d.instansiRujukan,
        statusVerifikasiMedis: false,
        status: "terverifikasi", // sudah dikonfirmasi relawan (Lapis 1)
        createdById: session.user.id,
      },
    });

    await catatAudit({
      aksi: "KONFIRMASI_INTAKE",
      aktor: session.user.username,
      kasusId: kasus.id,
      detail: { skor: skor.skor, level: skor.level, rincian: skor.rincian },
    });

    revalidatePath("/admin");
    revalidatePath("/rujukan");
    return {
      ok: true,
      kasusId: kasus.id,
      kodeUnik: kasus.kodeUnik,
      level: skor.level,
      skor: skor.skor,
    };
  } catch (err) {
    console.error("[simpanKasusTerkonfirmasi]", err);
    return { ok: false, error: "Gagal menyimpan kasus. Coba lagi." };
  }
}

/**
 * LAPIS 2 OVERSIGHT: ADMIN/medis memverifikasi kasus MERAH.
 * Tanpa ini, kasus MERAH diperlakukan sebagai KUNING + catatan "menunggu verifikasi".
 */
export async function verifikasiMedis(kasusId: string): Promise<ActionResult> {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return { ok: false, error: "Hanya admin/medis yang boleh verifikasi" };
    }

    const kasus = await prisma.kasus.update({
      where: { id: kasusId },
      data: { statusVerifikasiMedis: true },
    });

    await catatAudit({
      aksi: "VERIFIKASI_MEDIS",
      aktor: session.user.username,
      kasusId: kasus.id,
      detail: { kodeUnik: kasus.kodeUnik, level: kasus.levelPrioritas },
    });

    revalidatePath("/admin");
    revalidatePath("/rujukan");
    return {
      ok: true,
      kasusId: kasus.id,
      kodeUnik: kasus.kodeUnik,
      level: kasus.levelPrioritas,
      skor: kasus.skorKerentanan,
    };
  } catch (err) {
    console.error("[verifikasiMedis]", err);
    return { ok: false, error: "Gagal memverifikasi kasus." };
  }
}

const editSchema = konfirmasiSchema.partial().extend({
  isSpam: z.boolean().optional(),
});

/**
 * Edit kasus.
 * - ADMIN: boleh edit semua field; skor dihitung ulang bila field skor berubah.
 * - RELAWAN: hanya kasus miliknya & TIDAK boleh mengedit yang sudah 'terverifikasi'.
 */
export async function updateKasus(
  kasusId: string,
  input: z.infer<typeof editSchema>
): Promise<ActionResult> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Tidak terautentikasi" };

    const existing = await prisma.kasus.findUnique({ where: { id: kasusId } });
    if (!existing) return { ok: false, error: "Kasus tidak ditemukan" };

    const isAdmin = session.user.role === "ADMIN";
    if (!isAdmin) {
      if (existing.createdById !== session.user.id) {
        return { ok: false, error: "Bukan kasus milik Anda" };
      }
      if (existing.status === "terverifikasi") {
        return {
          ok: false,
          error: "Kasus terverifikasi tidak bisa diedit relawan",
        };
      }
    }

    const parsed = editSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
    }
    const d = parsed.data;

    // Gabungkan nilai lama + baru untuk menghitung ulang skor.
    const merged: ProfilKerentanan = {
      agentThought: existing.agentThought ?? "",
      namaKK: d.namaKK !== undefined ? d.namaKK : existing.namaKK,
      usiaKK: d.usiaKK !== undefined ? d.usiaKK : existing.usiaKK,
      anggotaKeluarga:
        d.anggotaKeluarga !== undefined
          ? d.anggotaKeluarga
          : ((existing.anggotaKeluarga as ProfilKerentanan["anggotaKeluarga"]) ?? []),
      kondisiMedisKritis:
        d.kondisiMedisKritis !== undefined
          ? d.kondisiMedisKritis
          : ((existing.kondisiMedisKritis as string[]) ?? []),
      obatTersedia: d.obatTersedia !== undefined ? d.obatTersedia : existing.obatTersedia,
      mobilitas:
        d.mobilitas !== undefined ? d.mobilitas : (existing.mobilitas as ProfilKerentanan["mobilitas"]),
      asalLokasi: d.asalLokasi !== undefined ? d.asalLokasi : existing.asalLokasi,
      instansiRujukan:
        d.instansiRujukan !== undefined
          ? d.instansiRujukan
          : (existing.instansiRujukan as ProfilKerentanan["instansiRujukan"]) ?? "DINAS_SOSIAL",
    };
    const skor = hitungSkor(merged);

    const kasus = await prisma.kasus.update({
      where: { id: kasusId },
      data: {
        namaKK: merged.namaKK,
        usiaKK: merged.usiaKK,
        anggotaKeluarga: merged.anggotaKeluarga,
        kondisiMedisKritis: merged.kondisiMedisKritis,
        obatTersedia: merged.obatTersedia,
        mobilitas: merged.mobilitas,
        asalLokasi: merged.asalLokasi,
        instansiRujukan: merged.instansiRujukan,
        skorKerentanan: skor.skor,
        levelPrioritas: skor.level,
        ...(typeof d.isSpam === "boolean" ? { isSpam: d.isSpam } : {}),
        // Skor berubah level -> reset verifikasi medis bila tak lagi MERAH.
        ...(skor.level !== "MERAH" ? { statusVerifikasiMedis: false } : {}),
      },
    });

    await catatAudit({
      aksi: "EDIT_KASUS",
      aktor: session.user.username,
      kasusId: kasus.id,
      detail: { skorBaru: skor.skor, levelBaru: skor.level },
    });

    revalidatePath("/admin");
    revalidatePath("/rujukan");
    return {
      ok: true,
      kasusId: kasus.id,
      kodeUnik: kasus.kodeUnik,
      level: skor.level,
      skor: skor.skor,
    };
  } catch (err) {
    console.error("[updateKasus]", err);
    return { ok: false, error: "Gagal mengubah kasus." };
  }
}

/** Hapus kasus. RELAWAN hanya boleh hapus miliknya yang belum terverifikasi. */
export async function hapusKasus(
  kasusId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const session = await auth();
    if (!session?.user) return { ok: false, error: "Tidak terautentikasi" };

    const existing = await prisma.kasus.findUnique({ where: { id: kasusId } });
    if (!existing) return { ok: false, error: "Kasus tidak ditemukan" };

    if (session.user.role !== "ADMIN") {
      if (existing.createdById !== session.user.id) {
        return { ok: false, error: "Bukan kasus milik Anda" };
      }
      if (existing.status === "terverifikasi") {
        return { ok: false, error: "Kasus terverifikasi tidak bisa dihapus relawan" };
      }
    }

    await prisma.kasus.delete({ where: { id: kasusId } });
    await catatAudit({
      aksi: "HAPUS_KASUS",
      aktor: session.user.username,
      kasusId,
      detail: { kodeUnik: existing.kodeUnik },
    });

    revalidatePath("/admin");
    revalidatePath("/rujukan");
    return { ok: true };
  } catch (err) {
    console.error("[hapusKasus]", err);
    return { ok: false, error: "Gagal menghapus kasus." };
  }
}
