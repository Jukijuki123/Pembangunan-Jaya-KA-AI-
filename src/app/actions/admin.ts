"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { catatAudit } from "@/lib/audit";

async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "ADMIN") return null;
  return session.user;
}

/**
 * "Reset Semua Data" (admin-only). UI mewajibkan konfirmasi 2x.
 * Truncate Kasus + AuditLog + LaporanHarian. Tidak menghapus User & PoskoConfig.
 */
export async function resetSemuaData(
  konfirmasi: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Hanya admin" };

    // Lapis pengaman tambahan: frasa konfirmasi harus tepat.
    if (konfirmasi !== "HAPUS SEMUA") {
      return { ok: false, error: "Frasa konfirmasi tidak cocok" };
    }

    await prisma.kasus.deleteMany({});
    await prisma.laporanHarian.deleteMany({});
    // Catat audit reset SEBELUM menghapus audit lama, lalu bersihkan.
    await catatAudit({ aksi: "RESET_SEMUA_DATA", aktor: admin.username });
    await prisma.auditLog.deleteMany({
      where: { aksi: { not: "RESET_SEMUA_DATA" } },
    });

    revalidatePath("/admin");
    revalidatePath("/rujukan");
    return { ok: true };
  } catch (err) {
    console.error("[resetSemuaData]", err);
    return { ok: false, error: "Gagal mereset data." };
  }
}

const userSchema = z.object({
  username: z.string().trim().min(3).max(40),
  password: z.string().min(6).max(100),
  role: z.enum(["RELAWAN", "ADMIN"]),
});

export async function buatUser(
  input: z.infer<typeof userSchema>
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Hanya admin" };

    const parsed = userSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" };
    }

    const exists = await prisma.user.findUnique({
      where: { username: parsed.data.username },
    });
    if (exists) return { ok: false, error: "Username sudah dipakai" };

    const passwordHash = await bcrypt.hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        username: parsed.data.username,
        passwordHash,
        role: parsed.data.role,
      },
    });

    await catatAudit({
      aksi: "BUAT_USER",
      aktor: admin.username,
      detail: { username: user.username, role: user.role },
    });

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("[buatUser]", err);
    return { ok: false, error: "Gagal membuat akun." };
  }
}

export async function hapusUser(
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const admin = await requireAdmin();
    if (!admin) return { ok: false, error: "Hanya admin" };
    if (admin.id === userId)
      return { ok: false, error: "Tidak bisa menghapus akun sendiri" };

    const target = await prisma.user.findUnique({ where: { id: userId } });
    if (!target) return { ok: false, error: "User tidak ditemukan" };

    // Cegah menghapus admin terakhir.
    if (target.role === "ADMIN") {
      const jumlahAdmin = await prisma.user.count({ where: { role: "ADMIN" } });
      if (jumlahAdmin <= 1)
        return { ok: false, error: "Tidak boleh menghapus admin terakhir" };
    }

    await prisma.user.delete({ where: { id: userId } });
    await catatAudit({
      aksi: "HAPUS_USER",
      aktor: admin.username,
      detail: { username: target.username },
    });

    revalidatePath("/admin");
    return { ok: true };
  } catch (err) {
    console.error("[hapusUser]", err);
    return { ok: false, error: "Gagal menghapus akun." };
  }
}
