import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { kasusToXlsx } from "@/lib/xlsx";
import type { Instansi } from "@prisma/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VALID: Instansi[] = ["DINAS_KESEHATAN", "DINAS_SOSIAL", "BPBD"];

/**
 * GET /api/rujukan/[instansi]/xlsx
 * Unduh file Excel (.xlsx) kasus per instansi rujukan — header berwarna,
 * border rapi, kolom auto-width. Hanya ADMIN.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ instansi: string }> }
) {
  try {
    const session = await auth();
    if (session?.user?.role !== "ADMIN") {
      return NextResponse.json({ ok: false, error: "Akses ditolak" }, { status: 403 });
    }

    const { instansi } = await params;
    const inst = instansi.toUpperCase() as Instansi;
    if (!VALID.includes(inst)) {
      return NextResponse.json({ ok: false, error: "Instansi tidak valid" }, { status: 400 });
    }

    const rows = await prisma.kasus.findMany({
      where: { instansiRujukan: inst, isSpam: false },
      orderBy: [{ levelPrioritas: "desc" }, { createdAt: "desc" }],
    });

    const buf = await kasusToXlsx(rows);
    const tgl = new Date().toISOString().slice(0, 10);

    return new NextResponse(new Uint8Array(buf), {
      status: 200,
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="rujukan_${inst.toLowerCase()}_${tgl}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[/api/rujukan/xlsx]", err);
    return NextResponse.json({ ok: false, error: "Gagal membuat Excel" }, { status: 500 });
  }
}
