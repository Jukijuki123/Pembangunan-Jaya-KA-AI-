import type { Metadata } from "next";
import MapClient from "@/components/peta/MapClient";

export const metadata: Metadata = {
  title: "Peta Kebutuhan Area Terdampak — SIGAP AI",
};

/**
 * LAYER PUBLIK — tanpa login.
 * Hanya area kecamatan/kabupaten + kategori kebutuhan umum. Tanpa titik GPS
 * presisi, tanpa angka jumlah, tanpa urgensi. Data agregat, bukan individu.
 */
export default function PetaPublikPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <h1 className="text-lg font-black text-slate-900">Peta Kebutuhan Area Terdampak</h1>
        <p className="text-sm text-slate-500">
          Gambaran kebutuhan umum per wilayah untuk mengarahkan bantuan. Untuk detail
          per posko (jumlah & urgensi), koordinator dapat masuk ke{" "}
          <a href="/peta/instansi" className="font-semibold text-pmi hover:underline">
            layer instansi
          </a>
          .
        </p>
      </div>
      <MapClient mode="publik" />
    </div>
  );
}
