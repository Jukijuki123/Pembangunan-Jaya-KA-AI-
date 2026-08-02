import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { KATEGORI_LABEL, urgensiTertinggi } from "@/lib/peta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/peta/instansi — LAYER INSTANSI (wajib login + role ADMIN).
 *
 * Role check di BACKEND via Auth.js (auth()) — bukan sekadar sembunyi di UI.
 * Tanpa cookie sesi yang valid -> 401; role bukan ADMIN -> 403.
 * (Dapat dites langsung dengan curl tanpa lewat UI.)
 *
 * Mengembalikan: titik GPS presisi tiap posko + breakdown kebutuhan
 * TERKONFIRMASI (kategori, estimasi jumlah, urgensi). Data pending TIDAK
 * pernah keluar dari endpoint ini.
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

    const poskoList = await prisma.posko.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        kebutuhanAgregat: {
          where: { status: "dikonfirmasi" },
          orderBy: { lastUpdated: "desc" },
        },
      },
    });

    const data = poskoList.map((p) => {
      const kebutuhan = p.kebutuhanAgregat.map((k) => ({
        id: k.id,
        kategori: k.kategori,
        label: KATEGORI_LABEL[k.kategori],
        estimasiJumlah: k.estimasiJumlah,
        urgensi: k.urgensi,
        lastUpdated: k.lastUpdated.toISOString(),
      }));
      const tertinggi = urgensiTertinggi(p.kebutuhanAgregat);
      return {
        id: p.id,
        namaPosko: p.namaPosko,
        lat: p.lat,
        lng: p.lng,
        areaPublik: p.areaPublik,
        alamatText: p.alamatText,
        kebutuhan,
        urgensiTertinggi: tertinggi, // null = belum ada laporan (marker netral)
      };
    });

    return NextResponse.json({ ok: true, posko: data });
  } catch (err) {
    console.error("[/api/peta/instansi]", err);
    return NextResponse.json({ ok: false, error: "Gagal memuat data instansi" }, { status: 500 });
  }
}
