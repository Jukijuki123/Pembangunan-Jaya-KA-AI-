import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { geocodeAlamat } from "@/lib/geocode";
import { jarakMeter } from "@/lib/peta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const POSKO_SCHEMA = z.object({
  namaPosko: z.string().trim().min(2).max(120),
  areaPublik: z.string().trim().min(2).max(120), // kecamatan/kabupaten
  alamatText: z.string().trim().max(300).optional().default(""),
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),
});

/** Wajib admin — dipakai semua route CRUD posko. */
async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return { err: NextResponse.json({ ok: false, error: "Tidak terautentikasi" }, { status: 401 }) };
  if (session.user.role !== "ADMIN") return { err: NextResponse.json({ ok: false, error: "Akses ditolak" }, { status: 403 }) };
  return { user: session.user };
}

/**
 * GET /api/peta/posko — daftar posko (untuk panel admin). ADMIN only.
 */
export async function GET() {
  const admin = await requireAdmin();
  if ("err" in admin) return admin.err;

  const posko = await prisma.posko.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      namaPosko: true,
      lat: true,
      lng: true,
      areaPublik: true,
      alamatText: true,
      createdAt: true,
      _count: { select: { kebutuhanAgregat: true } },
    },
  });

  return NextResponse.json({ ok: true, posko });
}

/**
 * POST /api/peta/posko — tambah posko. ADMIN only.
 *  - Koordinat bisa dari klik peta (lat/lng) ATAU geocode otomatis dari alamat.
 *  - Geocoding gagal -> admin jatuh ke pin manual (lat/lng wajib saat itu).
 *  - Duplikat <100 m -> warning (tetap disimpan, bukan blokir).
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if ("err" in admin) return admin.err;

  const json = await req.json().catch(() => null);
  const parsed = POSKO_SCHEMA.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
  }
  const d = parsed.data;

  let lat = d.lat ?? null;
  let lng = d.lng ?? null;

  // Geocode otomatis dari alamat jika koordinat tidak diberikan (klik peta).
  if ((lat === null || lng === null) && d.alamatText) {
    const hasil = await geocodeAlamat(d.alamatText);
    if (hasil) {
      lat = hasil.lat;
      lng = hasil.lng;
    }
  }

  if (lat === null || lng === null) {
    return NextResponse.json(
      { ok: false, error: "Koordinat tidak ditemukan. Klik peta untuk drop pin manual." },
      { status: 422 }
    );
  }

  // Cek duplikat <100 m -> warning, bukan blokir.
  const existing = await prisma.posko.findMany({ select: { id: true, namaPosko: true, lat: true, lng: true } });
  const warning = existing
    .filter((p) => jarakMeter(lat!, lng!, p.lat, p.lng) < 100)
    .map((p) => `${p.namaPosko} (jarak <100 m)`);

  const posko = await prisma.posko.create({
    data: {
      namaPosko: d.namaPosko,
      lat,
      lng,
      areaPublik: d.areaPublik,
      alamatText: d.alamatText || null,
      adminId: admin.user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    posko: { id: posko.id, namaPosko: posko.namaPosko, lat, lng, areaPublik: posko.areaPublik },
    warning: warning.length ? warning : undefined,
  });
}
