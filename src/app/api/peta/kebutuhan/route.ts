import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { klasifikasiKebutuhan } from "@/lib/klasifikasiKebutuhan";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/peta/kebutuhan — relawan/admin melapor kebutuhan posko.
 *
 * Alur (Human Oversight):
 *  1. Teks laporan bebas -> AI klasifikasi (Groq qwen -> Gemini flash-lite).
 *  2. Hasil AI masuk tabel kebutuhan_agregat dengan status = "pending".
 *  3. Data pending TIDAK tampil di peta mana pun.
 *  4. Tenaga medis/koordinator konfirmasi dulu (endpoint terpisah).
 *
 * AI TIDAK pernah menghasilkan nama obat/dosis/merek; kategori di luar enum
 * dipaksa "lainnya" oleh backend (lib/klasifikasiKebutuhan.ts).
 * JSON AI gagal parse -> error dikembalikan, relawan diarahkan input ulang
 * (tidak membuat request lain gagal).
 */
const BODY = z.object({
  poskoId: z.string().min(1),
  teks: z.string().trim().min(5).max(2000),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Tidak terautentikasi" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = BODY.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
    }
    const { poskoId, teks } = parsed.data;

    const posko = await prisma.posko.findUnique({ where: { id: poskoId } });
    if (!posko) {
      return NextResponse.json({ ok: false, error: "Posko tidak ditemukan" }, { status: 404 });
    }

    // AI klasifikasi — kegagalan tidak boleh membuat request crash.
    let hasil;
    try {
      hasil = await klasifikasiKebutuhan(teks);
    } catch (err) {
      console.error("[peta/kebutuhan] AI klasifikasi gagal:", (err as Error).message);
      return NextResponse.json(
        { ok: false, error: "Klasifikasi AI gagal. Silakan ulangi atau review manual." },
        { status: 502 }
      );
    }

    const kebutuhan = await prisma.kebutuhanAgregat.create({
      data: {
        poskoId,
        kategori: hasil.kategori, // sudah dipaksa ke enum oleh backend
        ringkasanLaporan: hasil.ringkasanLaporan,
        urgensi: hasil.urgensi,
        perluKonfirmasiMedis: true, // SELALU true untuk output AI
        status: "pending",
      },
    });

    return NextResponse.json({
      ok: true,
      kebutuhan: {
        id: kebutuhan.id,
        kategori: kebutuhan.kategori,
        urgensi: kebutuhan.urgensi,
        perluKonfirmasiMedis: kebutuhan.perluKonfirmasiMedis,
        status: kebutuhan.status,
        catatan: "Menunggu konfirmasi tenaga medis/koordinator sebelum tampil di peta.",
      },
    });
  } catch (err) {
    console.error("[/api/peta/kebutuhan POST]", err);
    return NextResponse.json({ ok: false, error: "Gagal menyimpan laporan" }, { status: 500 });
  }
}
