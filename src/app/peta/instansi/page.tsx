import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import MapClient from "@/components/peta/MapClient";

export const metadata: Metadata = {
  title: "Peta Instansi — SIGAP AI",
};

/**
 * LAYER INSTANSI — wajib login ADMIN (validasi di SERVER, bukan UI).
 * Titik GPS presisi posko + breakdown kebutuhan terkonfirmasi.
 * Data pribadi pengungsi TIDAK pernah muncul di layer ini (agregat per posko).
 */
export default async function PetaInstansiPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/peta/instansi");
  if (session.user.role !== "ADMIN") redirect("/intake");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-slate-900">Peta Kebutuhan Lintas-Posko</h1>
          <p className="text-sm text-slate-500">
            Layer instansi — titik presisi & breakdown kebutuhan terkonfirmasi per posko.
            Warna marker = urgensi tertinggi (merah ≥1 kebutuhan MERAH).
          </p>
        </div>
        <a
          href="/peta/admin"
          className="rounded-lg bg-pmi px-3 py-1.5 text-xs font-bold text-white hover:bg-pmi-dark"
        >
          <i className="fa-solid fa-gear mr-1.5" aria-hidden="true"></i>
          Kelola Posko
        </a>
      </div>
      <MapClient mode="instansi" />
      <p className="mt-2 text-xs text-slate-400">
        <i className="fa-solid fa-circle-info mr-1" aria-hidden="true"></i>
        Hanya data berstatus <b>dikonfirmasi</b> yang tampil. Marker abu-abu = posko belum ada
        laporan terkonfirmasi.
      </p>
    </div>
  );
}
