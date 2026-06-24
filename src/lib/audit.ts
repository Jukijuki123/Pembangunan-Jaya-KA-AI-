import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Tulis satu baris ke AuditLog.
 * Dipanggil pada SETIAP aksi yang menyentuh data: konfirmasi, verifikasi,
 * kirim laporan, edit, hapus, reset. Ini bukti jejak human-in-the-loop.
 */
export async function catatAudit(params: {
  aksi: string;
  aktor: string;
  kasusId?: string | null;
  detail?: Prisma.InputJsonValue;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        aksi: params.aksi,
        aktor: params.aktor,
        kasusId: params.kasusId ?? null,
        detail: params.detail ?? undefined,
      },
    });
  } catch (e) {
    // Audit gagal tidak boleh menggagalkan aksi utama, tapi tetap dicatat ke log server.
    console.error("[audit] gagal mencatat:", e);
  }
}
