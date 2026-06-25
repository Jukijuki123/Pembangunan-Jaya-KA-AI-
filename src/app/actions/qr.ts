"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";

export async function confirmImportKasus(kasusId: string) {
  try {
    const session = await auth();
    if (!session || !session.user || !["ADMIN", "RELAWAN"].includes(session.user.role)) {
      return { ok: false, error: "Unauthorized" };
    }

    const kasus = await prisma.kasus.findUnique({
      where: { id: kasusId },
      select: { status: true, id: true, kodeUnik: true },
    });

    if (!kasus) {
      return { ok: false, error: "Kasus tidak ditemukan." };
    }

    if (kasus.status === "terverifikasi") {
      return { ok: false, error: "Kasus sudah diverifikasi/diimpor sebelumnya." };
    }

    // Lakukan update status dan catat audit di dalam satu transaction
    await prisma.$transaction(async (tx) => {
      await tx.kasus.update({
        where: { id: kasusId },
        data: { status: "terverifikasi", isSpam: false },
      });

      await tx.auditLog.create({
        data: {
          aksi: "QR_IMPORT",
          aktor: `${session.user.role}:${session.user.username}`,
          kasusId: kasusId,
          detail: { result: "SUCCESS" },
        },
      });
    });

    revalidatePath("/admin");
    revalidatePath("/admin/scan");

    return { ok: true };
  } catch (err) {
    console.error("[confirmImportKasus]", err);

    // Catat log error bila memungkinkan
    try {
      const session = await auth();
      if (session?.user) {
         await catatAudit({
          aksi: "QR_IMPORT",
          aktor: `${session.user.role}:${session.user.username}`,
          kasusId: kasusId,
          detail: { result: "FAILED", error: (err as Error).message },
        });
      }
    } catch (_) {}

    return { ok: false, error: "Gagal menyimpan import QR. Silakan coba lagi." };
  }
}
