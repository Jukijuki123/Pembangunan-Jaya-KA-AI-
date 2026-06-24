import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";

/** Beranda: arahkan user yang sudah login ke beranda role-nya. */
export default async function Home() {
  const session = await auth();
  if (session?.user) {
    redirect(session.user.role === "ADMIN" ? "/admin" : "/intake");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-pmi text-2xl font-black text-white">
          ＋
        </div>
        <h1 className="text-2xl font-black text-slate-900">SIGAP AI</h1>
        <p className="mt-1 text-sm text-slate-600">
          Sistem Cerdas Asesmen Kerentanan Pengungsi untuk Relawan PMI
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
        <p className="font-semibold text-slate-800">AI membantu, manusia memutuskan.</p>
        <p className="mt-2">
          Membantu relawan intake mendata keluarga pengungsi dengan cepat di 72 jam
          pertama pasca-bencana — setiap hasil AI dikonfirmasi manusia sebelum
          tersimpan.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <Link
          href="/login"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-pmi px-4 text-sm font-semibold text-white hover:bg-pmi-dark"
        >
          Masuk (Relawan / Admin)
        </Link>
        <Link
          href="/mandiri/POSKO01"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Lapor Mandiri (Korban) — contoh POSKO01
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        LKS Nasional AI 2026 · Studi Kasus 1 — Komunitas · Organisasi: PMI
      </p>
    </main>
  );
}
