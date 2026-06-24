"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { hitungAgregat } from "@/lib/aggregate";
import { buatRingkasanHarian } from "@/lib/gemini";

/**
 * LAPIS 3 OVERSIGHT — Laporan harian.
 * 1) AI membuat DRAFT (generateDraftLaporan)
 * 2) Admin mengedit (simpanEditLaporan)
 * 3) Admin klik kirim (kirimLaporan) — tidak ada yang terkirim otomatis.
 */

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session.user;
}

export async function generateDraftLaporan(): Promise<
  { ok: true; id: string; ringkasanAI: string } | { ok: false; error: string }
> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Hanya admin" };

    const agregat = await hitungAgregat();
    const ringkasanAI = await buatRingkasanHarian(agregat);

    const laporan = await prisma.laporanHarian.create({
      data: { ringkasanAI, terkirim: false },
    });

    await catatAudit({
      aksi: "GENERATE_DRAFT_LAPORAN",
      aktor: admin.username,
      detail: { laporanId: laporan.id },
    });

    revalidatePath("/admin");
    return { ok: true, id: laporan.id, ringkasanAI };
  } catch (err) {
    console.error("[generateDraftLaporan]", err);
    return { ok: false, error: "Gagal membuat draft laporan (AI)." };
  }
}

const editSchema = z.object({
  id: z.string().min(1),
  ringkasanFinal: z.string().min(1).max(5000),
});

export async function simpanEditLaporan(
  input: z.infer<typeof editSchema>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Hanya admin" };

    const parsed = editSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Input tidak valid" };

    await prisma.laporanHarian.update({
      where: { id: parsed.data.id },
      data: { ringkasanFinal: parsed.data.ringkasanFinal },
    });

    await catatAudit({
      aksi: "EDIT_LAPORAN",
      aktor: admin.username,
      detail: { laporanId: parsed.data.id },
    });

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("[simpanEditLaporan]", err);
    return { ok: false, error: "Gagal menyimpan editan laporan." };
  }
}

export async function kirimLaporan(
  id: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Hanya admin" };

    const laporan = await prisma.laporanHarian.findUnique({ where: { id } });
    if (!laporan) return { ok: false, error: "Laporan tidak ditemukan" };
    if (laporan.terkirim) return { ok: false, error: "Laporan sudah terkirim" };

    await prisma.laporanHarian.update({
      where: { id },
      data: {
        terkirim: true,
        dikirimOleh: admin.username,
        // Jika admin tak mengedit, pakai draft AI sebagai final.
        ringkasanFinal: laporan.ringkasanFinal ?? laporan.ringkasanAI,
      },
    });

    await catatAudit({
      aksi: "KIRIM_LAPORAN",
      aktor: admin.username,
      detail: { laporanId: id },
    });

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("[kirimLaporan]", err);
    return { ok: false, error: "Gagal mengirim laporan." };
  }
}
