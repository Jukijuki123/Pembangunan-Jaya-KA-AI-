import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hitungAgregat } from "@/lib/aggregate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/dashboard
 * Sumber data polling (SWR) untuk dashboard admin.
 * Mengembalikan agregat + daftar kasus (non-spam) + kasus MERAH yang
 * belum diverifikasi medis (untuk alarm berkedip).
 */
export async function GET() {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Akses ditolak" }, { status: 403 });
    }

    const [agregat, kasus] = await Promise.all([
      hitungAgregat(),
      prisma.kasus.findMany({
        where: { isSpam: false },
        orderBy: [{ levelPrioritas: "desc" }, { createdAt: "desc" }],
        take: 500,
      }),
    ]);

    const merahBelumVerifikasi = kasus.filter(
      (k) => k.levelPrioritas === "MERAH" && !k.statusVerifikasiMedis
    );

    return NextResponse.json({
      ok: true,
      agregat,
      kasus,
      merahBelumVerifikasi,
      jumlahMerahAlarm: merahBelumVerifikasi.length,
      ts: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[/api/dashboard]", err);
    return NextResponse.json(
      { ok: false, error: "Gagal memuat dashboard" },
      { status: 500 }
    );
  }
}
