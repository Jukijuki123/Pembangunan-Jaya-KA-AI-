import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import PoskoAdminPanel from "@/components/peta/PoskoAdminPanel";
import PendingConfirmationQueue from "@/components/peta/PendingConfirmationQueue";

export const metadata: Metadata = {
  title: "Kelola Peta Posko — SIGAP AI",
};

/**
 * Panel admin lintas-posko — ADMIN only (validasi server).
 * 1) CRUD posko (geocode / drop pin manual).
 * 2) Lapor kebutuhan (AI klasifikasi → pending).
 * 3) Antrean konfirmasi tenaga medis/koordinator.
 */
export default async function PetaAdminPage() {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/peta/admin");
  if (session.user.role !== "ADMIN") redirect("/intake");

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-black text-slate-900">Kelola Peta Lintas-Posko</h1>
          <p className="text-sm text-slate-500">
            Tambah posko, lapor kebutuhan, dan konfirmasi data sebelum tampil di peta.
          </p>
        </div>
        <a
          href="/peta/instansi"
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
        >
          <i className="fa-solid fa-map mr-1.5" aria-hidden="true"></i>
          Lihat Peta
        </a>
      </div>

      <div className="flex flex-col gap-6">
        <PoskoAdminPanel />
        <PendingConfirmationQueue />
      </div>
    </div>
  );
}
