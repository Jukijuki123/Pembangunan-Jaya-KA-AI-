import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ekstrakProfil } from "@/lib/gemini";
import { hitungSkor } from "@/lib/scoring";

export const runtime = "nodejs"; // Gemini SDK + env butuh Node runtime
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  teks: z.string().min(3, "Teks terlalu pendek").max(4000),
});

/**
 * POST /api/agent/extract
 * Body: { teks: string }
 *
 * Alur 2 tahap (inti SIGAP AI):
 *  (a) Gemini -> ekstraksi + reasoning (JSON terstruktur)
 *  (b) Rule engine deterministik -> skor + level (BUKAN LLM)
 *
 * Output = bahan "Kartu Konfirmasi". Belum disimpan ke DB — relawan wajib
 * mengonfirmasi dulu lewat Server Action (Lapis 1 human oversight).
 *
 * Diproteksi: hanya user login (RELAWAN/ADMIN).
 */
export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json(
        { ok: false, error: "Tidak terautentikasi" },
        { status: 401 }
      );
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" },
        { status: 400 }
      );
    }

    // (a) Ekstraksi AI
    const profil = await ekstrakProfil(parsed.data.teks);

    // (b) Skoring deterministik
    const skor = hitungSkor(profil);

    return NextResponse.json({ ok: true, profil, skor });
  } catch (err) {
    console.error("[/api/agent/extract] error:", err);
    return NextResponse.json(
      {
        ok: false,
        error:
          "Gagal memproses dengan AI. Coba lagi, atau isi data manual di Kartu Konfirmasi.",
      },
      { status: 500 }
    );
  }
}
