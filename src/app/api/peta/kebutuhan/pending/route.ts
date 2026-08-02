import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KATEGORI_LABEL } from "@/lib/peta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/peta/kebutuhan/pending — antrean review untuk tenaga
 * medis/koordinator (ADMIN). Hanya data pending yang belum dikonfirmasi.
 * Data ini TIDAK pernah tampil di peta.
 */
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Tidak terautentikasi" }, { status: 401 });
    }
    if (session.user.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Akses ditolak" }, { status: 403 });
    }

    const pending = await prisma.kebutuhanAgregat.findMany({
      where: { status: "pending" },
      orderBy: { lastUpdated: "desc" },
      include: { posko: { select: { id: true, namaPosko: true, areaPublik: true } } },
    });

    return NextResponse.json({
      ok: true,
      pending: pending.map((k) => ({
        id: k.id,
        poskoId: k.poskoId,
        namaPosko: k.posko.namaPosko,
        areaPublik: k.posko.areaPublik,
        kategori: k.kategori,
        label: KATEGORI_LABEL[k.kategori],
        ringkasanLaporan: k.ringkasanLaporan,
        urgensi: k.urgensi,
        perluKonfirmasiMedis: k.perluKonfirmasiMedis,
        lastUpdated: k.lastUpdated.toISOString(),
      })),
    });
  } catch (err) {
    console.error("[/api/peta/kebutuhan/pending]", err);
    return NextResponse.json({ ok: false, error: "Gagal memuat antrean" }, { status: 500 });
  }
}
