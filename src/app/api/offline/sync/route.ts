import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { simpanKasusIntake } from "@/lib/simpanKasus";
import { konfirmasiSchema } from "@/lib/kasusSchema";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/offline/sync
 * Dipanggil oleh Service Worker (Background Sync) untuk mengirim antrian
 * intake yang direkam saat offline (IndexedDB). Sesi relawan diambil dari
 * cookie sesi yang sama (same-origin fetch menyertakan cookie otomatis).
 *
 * Body: { items: [{ id: string(lokal), kasus: KonfirmasiInput }] }
 * Return: { ok, saved: [{id, kodeUnik}], failed: [{id, error}] }
 */
const bodySchema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      kasus: z.unknown(),
    })
  ),
});

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Tidak terautentikasi" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success || parsed.data.items.length === 0) {
      return NextResponse.json({ ok: false, error: "Body tidak valid" }, { status: 400 });
    }

    const saved: { id: string; kodeUnik: string }[] = [];
    const failed: { id: string; error: string }[] = [];

    // Proses berurutan agar kode unik & skor konsisten; satu item gagal
    // tidak menggagalkan item lain.
    for (const item of parsed.data.items) {
      try {
        const kasus = konfirmasiSchema.parse(item.kasus);
        const hasil = await simpanKasusIntake(
          kasus,
          session.user.id,
          session.user.username
        );
        saved.push({ id: item.id, kodeUnik: hasil.kodeUnik });
      } catch (e) {
        failed.push({
          id: item.id,
          error: e instanceof Error ? e.message : "gagal simpan",
        });
      }
    }

    return NextResponse.json({
      ok: true,
      saved,
      failed,
      jumlah: saved.length,
    });
  } catch (err) {
    console.error("[/api/offline/sync]", err);
    return NextResponse.json({ ok: false, error: "Gagal sinkronisasi" }, { status: 500 });
  }
}
