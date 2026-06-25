import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { verifyQrPayload } from "@/lib/qr";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const payloadStr = searchParams.get("payload");

    if (!payloadStr) {
      return NextResponse.json({ error: "Payload tidak ditemukan" }, { status: 400 });
    }

    const { valid, id, error } = verifyQrPayload(payloadStr);

    if (!valid || !id) {
      return NextResponse.json({ error: error || "QR Code tidak valid" }, { status: 400 });
    }

    const kasus = await prisma.kasus.findUnique({
      where: { id },
      include: {
        createdBy: { select: { username: true, role: true } },
      },
    });

    if (!kasus) {
      return NextResponse.json({ error: "Data kasus tidak ditemukan di database" }, { status: 404 });
    }

    // Cek apakah sudah diverifikasi/diimport sebelumnya
    if (kasus.status === "terverifikasi") {
      return NextResponse.json({ error: "Kasus ini sudah diimpor/diverifikasi sebelumnya.", alreadyImported: true, data: kasus }, { status: 200 });
    }

    return NextResponse.json({ success: true, data: kasus });
  } catch (err) {
    console.error("[GET /api/qr/import]", err);
    return NextResponse.json({ error: "Terjadi kesalahan server" }, { status: 500 });
  }
}
