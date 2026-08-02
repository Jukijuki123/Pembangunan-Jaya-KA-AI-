import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UPDATE_SCHEMA = z.object({
  namaPosko: z.string().trim().min(2).max(120).optional(),
  areaPublik: z.string().trim().min(2).max(120).optional(),
  alamatText: z.string().trim().max(300).nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  return session.user.role === "ADMIN" ? session.user : null;
}

/** PATCH /api/peta/posko/[id] — edit posko (ADMIN). */
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
    const parsed = UPDATE_SCHEMA.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: "Input tidak valid" }, { status: 400 });
    }

    const posko = await prisma.posko.update({ where: { id }, data: parsed.data });
    return NextResponse.json({ ok: true, posko });
  } catch (err) {
    console.error("[/api/peta/posko PATCH]", err);
    return NextResponse.json({ ok: false, error: "Gagal mengubah posko" }, { status: 500 });
  }
}

/** DELETE /api/peta/posko/[id] — hapus posko + kebutuhan terkait (ADMIN). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    if (!admin) {
      return NextResponse.json({ ok: false, error: "Akses ditolak" }, { status: 403 });
    }
    const { id } = await params;
    await prisma.posko.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/peta/posko DELETE]", err);
    return NextResponse.json({ ok: false, error: "Gagal menghapus posko" }, { status: 500 });
  }
}
