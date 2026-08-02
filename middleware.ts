import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

// Middleware memakai config edge-safe (tanpa Prisma). Cek role dari JWT.
const { auth } = NextAuth(authConfig);

/**
 * RBAC:
 *  - /admin/*, /rujukan/*           -> hanya ADMIN
 *  - /intake/*                      -> RELAWAN atau ADMIN (admin boleh lihat semua)
 *  - /login                         -> publik; jika sudah login, redirect ke beranda role
 *  - /mandiri/*, /, /api/auth/*     -> publik (mode korban mandiri tanpa login)
 */
export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth;
  const role = session?.user?.role;
  const isLoggedIn = !!session?.user;
  const path = nextUrl.pathname;

  const isAdminArea =
    path.startsWith("/admin") ||
    path.startsWith("/rujukan") ||
    path.startsWith("/peta/instansi") ||
    path.startsWith("/peta/admin");
  const isRelawanArea = path.startsWith("/intake");
  const isLogin = path === "/login";

  // Sudah login tapi membuka /login → arahkan ke beranda sesuai role.
  if (isLogin && isLoggedIn) {
    const home = role === "ADMIN" ? "/admin" : "/intake";
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  // Sudah login & membuka halaman publik "/" → arahkan ke beranda role
  // (hindari landing page membingungkan setelah login ulang).
  if (path === "/" && isLoggedIn) {
    const home = role === "ADMIN" ? "/admin" : "/intake";
    return NextResponse.redirect(new URL(home, nextUrl));
  }

  // Area terproteksi tapi belum login → ke /login (+ callback).
  if ((isAdminArea || isRelawanArea) && !isLoggedIn) {
    const url = new URL("/login", nextUrl);
    url.searchParams.set("callbackUrl", path);
    return NextResponse.redirect(url);
  }

  // Area admin diakses non-admin → tolak ke beranda relawan.
  if (isAdminArea && role !== "ADMIN") {
    return NextResponse.redirect(new URL("/intake", nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  // Jalankan middleware di semua route kecuali aset statis & internal Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp)$).*)"],
};
