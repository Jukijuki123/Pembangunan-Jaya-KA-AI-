import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KATEGORI_DIPERBOLEHKAN } from "@/lib/klasifikasiKebutuhan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * PATCH /api/peta/kebutuhan/[id] — KONFIRMASI / KOREKSI oleh tenaga
 * medis/koordinator (ADMIN). Hanya status "dikonfirmasi" yang masuk agregat
 * peta. Kategori yang dikoreksi tetap divalidasi terhadap enum di sini.
 */
const CONFIRM_SCHEMA = z.object({
  kategori: z.enum(KATEGORI_DIPERBOLEHKAN).optional(),
  urgensi: z.enum(["HIJAU", "KUNING", "MERAH"]).optional(),
  estimasiJumlah: z.number().int().min(0).max(1_000_000).nullable().optional(),
  status: z.enum(["pending", "dikonfirmasi"]).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user.role === "ADMIN" ? session.user : null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Akses ditolak" }, { status: 403 });
    }
    const { id } = await params;

    const json = await req.json().catch(() => null);
    const parsed = CONFIRM_SCHEMA.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Input tidak valid" }, { status: 400 });
    }
    const d = parsed.data;

    const existing = await prisma.kebutuhanAgregat.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ ok: false, error: "Data tidak ditemukan" }, { status: 404 });
    }

    const kiniDikonfirmasi = (d.status ?? existing.status) === "dikonfirmasi";

    const updated = await prisma.kebutuhanAgregat.update({
      where: { id },
      data: {
        kategori: d.kategori ?? existing.kategori,
        urgensi: d.urgensi ?? existing.urgensi,
        estimasiJumlah: d.estimasiJumlah !== undefined ? d.estimasiJumlah : existing.estimasiJumlah,
        status: d.status ?? existing.status,
        // Simpan siapa yang konfirmasi — hanya saat jadi "dikonfirmasi".
        dikonfirmasiOleh: kiniDikonfirmasi ? admin.id : null,
      },
    });

    return NextResponse.json({
      ok: true,
      kebutuhan: {
        id: updated.id,
        kategori: updated.kategori,
        urgensi: updated.urgensi,
        estimasiJumlah: updated.estimasiJumlah,
        status: updated.status,
        perluKonfirmasiMedis: updated.perluKonfirmasiMedis,
        dikonfirmasiOleh: updated.dikonfirmasiOleh,
      },
    });
  } catch (err) {
    console.error("[/api/peta/kebutuhan PATCH]", err);
    return NextResponse.json({ ok: false, error: "Gagal konfirmasi" }, { status: 500 });
  }
}
