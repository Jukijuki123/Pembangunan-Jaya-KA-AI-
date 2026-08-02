import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { KATEGORI_LABEL } from "@/lib/peta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/peta/publik — LAYER PUBLIK (tanpa login).
 *
 * Hanya data AGREGAT per area (kecamatan/kabupaten):
 *  - Posisi = centroid (rata-rata) posko di area itu, BUKAN titik GPS presisi.
 *  - Hanya kategori kebutuhan umum yang dikonfirmasi (tanpa angka jumlah,
 *    tanpa level urgensi, tanpa nama posko).
 *  - Tidak ada nama/usia/kondisi individu di layer ini.
 */
export async function GET() {
  try {
    const rows = await prisma.kebutuhanAgregat.findMany({
      where: { status: "dikonfirmasi" },
      select: {
        kategori: true,
        posko: { select: { lat: true, lng: true, areaPublik: true } },
      },
    });

    // Agregat per areaPublik.
    const perArea = new Map<
      string,
      { latSum: number; lngSum: number; n: number; kategori: Set<string> }
    >();

    for (const r of rows) {
      const area = r.posko.areaPublik;
      const cur =
        perArea.get(area) ?? { latSum: 0, lngSum: 0, n: 0, kategori: new Set() };
      cur.latSum += r.posko.lat;
      cur.lngSum += r.posko.lng;
      cur.n += 1;
      cur.kategori.add(KATEGORI_LABEL[r.kategori]);
      perArea.set(area, cur);
    }

    const areas = [...perArea.entries()].map(([nama, v]) => ({
      areaPublik: nama,
      lat: +(v.latSum / v.n).toFixed(5), // centroid — bukan titik presisi posko
      lng: +(v.lngSum / v.n).toFixed(5),
      jumlahPosko: v.n,
      kategori: [...v.kategori], // hanya nama kategori umum, TANPA angka/urgensi
    }));

    return NextResponse.json({ ok: true, areas });
  } catch (err) {
    console.error("[/api/peta/publik]", err);
    return NextResponse.json({ ok: false, error: "Gagal memuat peta publik" }, { status: 500 });
  }
}
