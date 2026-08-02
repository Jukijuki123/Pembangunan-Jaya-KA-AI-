"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { KATEGORI_LABEL } from "@/lib/peta";
import { LEVEL_META } from "@/lib/utils";
import type { Level } from "@prisma/client";

// Leaflet butuh window — jangan SSR (dynamic import, client-only).
const LeafletMap = dynamic(() => import("@/components/peta/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center text-sm text-slate-400">
      <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true"></i>
      Memuat peta...
    </div>
  ),
});
import type { MapMarker } from "@/components/peta/LeafletMap";
import { warnaUrgensi } from "@/lib/peta";

interface PublikArea {
  areaPublik: string;
  lat: number;
  lng: number;
  jumlahPosko: number;
  kategori: string[];
}

interface InstansiKebutuhan {
  id: string;
  kategori: string;
  label: string;
  estimasiJumlah: number | null;
  urgensi: Level;
}

interface InstansiPosko {
  id: string;
  namaPosko: string;
  lat: number;
  lng: number;
  areaPublik: string;
  alamatText: string | null;
  kebutuhan: InstansiKebutuhan[];
  urgensiTertinggi: Level | null;
}

/**
 * Peta kebutuhan lintas-posko.
 * mode="publik"  -> layer publik (tanpa login): centroid area, kategori umum
 *                   TANPA angka & TANPA urgensi. Tidak ada data personal.
 * mode="instansi"-> layer instansi (login ADMIN): titik presisi + breakdown
 *                   lengkap (kategori, jumlah, urgensi) — hanya data dikonfirmasi.
 */
export default function MapClient({ mode }: { mode: "publik" | "instansi" }) {
  const [data, setData] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(mode === "publik" ? "/api/peta/publik" : "/api/peta/instansi")
      .then(async (r) => {
        if (r.status === 401) throw new Error("401");
        if (r.status === 403) throw new Error("403");
        if (!r.ok) throw new Error("gagal");
        return r.json();
      })
      .then((j) => setData(j))
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [mode]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-400">
        <i className="fa-solid fa-circle-notch fa-spin mr-2" aria-hidden="true"></i>
        Memuat peta...
      </div>
    );
  }

  if (error === "401" || error === "403") {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
        <i className="fa-solid fa-lock mr-2" aria-hidden="true"></i>
        Layer instansi memerlukan login sebagai koordinator/admin.{" "}
        <a href="/login?callbackUrl=/peta/instansi" className="font-bold underline">
          Masuk
        </a>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        Gagal memuat data peta. Coba lagi.
      </div>
    );
  }

  const markers: MapMarker[] = [];
  if (mode === "publik") {
    const areas = (data as { areas: PublikArea[] }).areas;
    for (const a of areas) {
      const badges = a.kategori.length
        ? a.kategori
            .map((k) => `<span style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:999px;padding:2px 9px;font-size:11px;color:#475569">${k}</span>`)
            .join(" ")
        : "";
      markers.push({
        id: a.areaPublik,
        lat: a.lat,
        lng: a.lng,
        title: a.areaPublik,
        warna: "#c8102e",
        iconFa: "fa-tents",
        popupHtml: `<div>
          <div class="peta-pop-title">${a.areaPublik}</div>
          <div class="peta-pop-sub">${a.jumlahPosko} posko terdata · kategori kebutuhan umum</div>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px">${badges || '<span style="color:#94a3b8;font-size:11px">belum ada kebutuhan terkonfirmasi</span>'}</div>
        </div>`,
      });
    }
  } else {
    const posko = (data as { posko: InstansiPosko[] }).posko;
    for (const p of posko) {
      const rows = p.kebutuhan.length
        ? p.kebutuhan
            .map((k) => {
              const meta = LEVEL_META[k.urgensi];
              return `<div class="peta-pop-row">
                <span>${k.label}</span>
                <span style="display:flex;align-items:center;gap:6px">
                  <span class="peta-pop-badge" style="background:${meta.hex}">${k.urgensi}</span>
                  <b style="min-width:20px;text-align:right">${k.estimasiJumlah ?? "?"}</b>
                </span>
              </div>`;
            })
            .join("")
        : '<span style="color:#94a3b8;font-size:12px">Belum ada laporan kebutuhan</span>';
      markers.push({
        id: p.id,
        lat: p.lat,
        lng: p.lng,
        title: p.namaPosko,
        warna: warnaUrgensi(p.urgensiTertinggi),
        iconFa: "fa-kit-medical",
        popupHtml: `<div>
          <div class="peta-pop-title">${p.namaPosko}</div>
          <div class="peta-pop-sub">${p.areaPublik}${p.alamatText ? " • " + p.alamatText : ""}</div>
          <div style="margin-top:6px">${rows}</div>
        </div>`,
      });
    }
  }

  return (
    <div className="relative">
      {mode === "instansi" && (
        <div className="mb-3 grid grid-cols-3 gap-3">
          {(() => {
            const p = (data as { posko: InstansiPosko[] }).posko;
            if (p.length === 0) {
              return (
                <div className="col-span-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  <i className="fa-solid fa-map-pin mr-2" aria-hidden="true"></i>
                  Belum ada posko terdaftar. Tambahkan lewat panel{" "}
                  <a href="/peta/admin" className="font-semibold text-pmi hover:underline">
                    Kelola Peta
                  </a>
                  .
                </div>
              );
            }
            const kritis = p.filter((x) => x.urgensiTertinggi === "MERAH").length;
            const totalKeb = p.reduce((a, x) => a + x.kebutuhan.length, 0);
            return (
              <>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                  <i className="fa-solid fa-tents text-pmi" aria-hidden="true"></i>
                  <div>
                    <div className="text-xl font-black text-slate-900 leading-none">{p.length}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">Posko terdata</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                  <i className="fa-solid fa-triangle-exclamation text-red-600" aria-hidden="true"></i>
                  <div>
                    <div className="text-xl font-black text-red-600 leading-none">{kritis}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">Posko kritis (MERAH)</div>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
                  <i className="fa-solid fa-kit-medical text-slate-500" aria-hidden="true"></i>
                  <div>
                    <div className="text-xl font-black text-slate-900 leading-none">{totalKeb}</div>
                    <div className="mt-0.5 text-[11px] text-slate-500">Kebutuhan terkonfirmasi</div>
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}
      <LeafletMap markers={markers} center={[-2.5, 118]} zoom={5} height="62vh" />
      {mode === "instansi" && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-600">Urgensi:</span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#dc2626" }} /> MERAH
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#d97706" }} /> KUNING
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#16a34a" }} /> HIJAU
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full border border-slate-300" style={{ background: "#94a3b8" }} /> Belum ada laporan
          </span>
        </div>
      )}
      {mode === "publik" && (
        <p className="mt-2 text-xs text-slate-400">
          <i className="fa-solid fa-circle-info mr-1" aria-hidden="true"></i>
          Layer publik menampilkan area terdampak level kecamatan/kabupaten + kategori kebutuhan umum. Data agregat, tanpa detail lokasi presisi maupun jumlah.
        </p>
      )}
    </div>
  );
}

/** Export ulang label kategori utk dipakai komponen lain. */
export { KATEGORI_LABEL };
