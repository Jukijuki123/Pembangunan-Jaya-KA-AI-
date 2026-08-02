"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { KATEGORI_LABEL, KATEGORI_LIST } from "@/lib/peta";

// Leaflet butuh window — jangan SSR.
const LeafletMap = dynamic(() => import("@/components/peta/LeafletMap"), {
  ssr: false,
  loading: () => (
    <div className="flex h-56 items-center justify-center text-xs text-slate-400">
      Memuat peta...
    </div>
  ),
});

interface PoskoRow {
  id: string;
  namaPosko: string;
  lat: number;
  lng: number;
  areaPublik: string;
  alamatText: string | null;
  createdAt: string;
  _count: { kebutuhanAgregat: number };
}

/**
 * Panel admin: CRUD titik posko + lapor kebutuhan (AI klasifikasi → pending).
 *  - Tambah posko: input alamat (geocode otomatis Nominatim, cache DB)
 *    ATAU klik langsung di peta (fallback saat geocode gagal).
 *  - Warning posko duplikat <100 m (dari server, bukan blokir).
 */
export default function PoskoAdminPanel() {
  const [posko, setPosko] = useState<PoskoRow[]>([]);
  const [nama, setNama] = useState("");
  const [area, setArea] = useState("");
  const [alamat, setAlamat] = useState("");
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ t: "ok" | "err" | "warn"; s: string } | null>(null);
  // Lapor kebutuhan
  const [poskoId, setPoskoId] = useState("");
  const [teks, setTeks] = useState("");

  const load = useCallback(async () => {
    const r = await fetch("/api/peta/posko");
    if (r.ok) setPosko((await r.json()).posko ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function tambahPosko() {
    setBusy(true);
    setMsg(null);
    try {
      const body: Record<string, unknown> = { namaPosko: nama, areaPublik: area };
      if (alamat.trim()) body.alamatText = alamat.trim();
      if (pin) {
        body.lat = pin.lat;
        body.lng = pin.lng;
      }
      const r = await fetch("/api/peta/posko", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setMsg({ t: "err", s: j.error ?? "Gagal menyimpan" });
        return;
      }
      if (j.warning?.length) {
        setMsg({ t: "warn", s: `Tersimpan, tapi ${j.warning.join(", ")}` });
      } else {
        setMsg({ t: "ok", s: `Posko "${j.posko.namaPosko}" tersimpan` });
      }
      setNama("");
      setArea("");
      setAlamat("");
      setPin(null);
      load();
    } catch {
      setMsg({
        t: "err",
        s: "Gagal terhubung ke server. Cek koneksi & pastikan server menyala, lalu coba lagi.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function hapusPosko(id: string) {
    if (!confirm("Hapus posko ini beserta semua kebutuhan terkait?")) return;
    try {
      const r = await fetch(`/api/peta/posko/${id}`, { method: "DELETE" });
      if (r.ok) load();
      else setMsg({ t: "err", s: "Gagal menghapus posko" });
    } catch {
      setMsg({ t: "err", s: "Gagal terhubung ke server. Coba lagi." });
    }
  }

  async function laporKebutuhan() {
    if (!poskoId || teks.trim().length < 5) return;
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/peta/kebutuhan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ poskoId, teks: teks.trim() }),
      });
      const j = await r.json();
      if (!r.ok || !j.ok) {
        setMsg({ t: "err", s: j.error ?? "Gagal klasifikasi" });
        return;
      }
      setMsg({
        t: "ok",
        s: `Tersimpan: ${KATEGORI_LABEL[j.kebutuhan.kategori as keyof typeof KATEGORI_LABEL]} — ${j.kebutuhan.catatan}`,
      });
      setTeks("");
    } catch {
      setMsg({ t: "err", s: "Gagal terhubung ke server. Coba lagi." });
    } finally {
      setBusy(false);
    }
  }

  const styleInput =
    "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pmi";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ── Tambah / Kelola Posko ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">
          <i className="fa-solid fa-map-pin mr-2 text-pmi" aria-hidden="true"></i>
          Kelola Titik Posko
        </h3>
        <div className="flex flex-col gap-2.5">
          <input className={styleInput} placeholder="Nama posko" value={nama} onChange={(e) => setNama(e.target.value)} />
          <input className={styleInput} placeholder="Area publik (kecamatan/kabupaten)" value={area} onChange={(e) => setArea(e.target.value)} />
          <input className={styleInput} placeholder="Alamat lengkap (untuk geocode otomatis)" value={alamat} onChange={(e) => setAlamat(e.target.value)} />
          <div className="text-xs text-slate-500">
            {pin ? (
              <span className="font-semibold text-pmi">
                <i className="fa-solid fa-location-crosshairs mr-1" aria-hidden="true"></i>
                Pin manual: {pin.lat.toFixed(5)}, {pin.lng.toFixed(5)}
              </span>
            ) : (
              "Klik di peta untuk drop pin manual (fallback bila geocode gagal), atau isi alamat."
            )}
          </div>
          <div className="h-56 overflow-hidden rounded-lg">
            <LeafletMap
              markers={[]}
              center={[-2.5, 118]}
              zoom={5}
              height="220px"
              pin={pin}
              onMapClick={(lat, lng) => setPin({ lat, lng })}
            />
          </div>
          <button
            onClick={tambahPosko}
            disabled={busy || !nama.trim() || !area.trim()}
            className="rounded-lg bg-pmi px-4 py-2 text-sm font-bold text-white hover:bg-pmi-dark disabled:opacity-40"
          >
            <i className="fa-solid fa-plus mr-1.5" aria-hidden="true"></i>
            Simpan Posko
          </button>
        </div>

        <ul className="mt-4 flex max-h-56 flex-col gap-1.5 overflow-y-auto">
          {posko.length === 0 && (
            <li className="py-3 text-center text-xs text-slate-400">Belum ada posko.</li>
          )}
          {posko.map((p) => (
            <li key={p.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
              <div>
                <span className="font-semibold text-slate-800">{p.namaPosko}</span>
                <span className="ml-2 text-xs text-slate-400">
                  {p.areaPublik} • {p._count.kebutuhanAgregat} laporan
                </span>
              </div>
              <button onClick={() => hapusPosko(p.id)} className="text-xs text-red-500 hover:text-red-700">
                <i className="fa-solid fa-trash" aria-hidden="true"></i>
              </button>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Lapor Kebutuhan (AI Klasifikasi → pending) ── */}
      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="mb-3 text-sm font-bold text-slate-900">
          <i className="fa-solid fa-kit-medical mr-2 text-pmi" aria-hidden="true"></i>
          Lapor Kebutuhan Posko
        </h3>
        <div className="flex flex-col gap-2.5">
          <select className={styleInput} value={poskoId} onChange={(e) => setPoskoId(e.target.value)}>
            <option value="">— Pilih posko —</option>
            {posko.map((p) => (
              <option key={p.id} value={p.id}>
                {p.namaPosko} ({p.areaPublik})
              </option>
            ))}
          </select>
          <textarea
            className={styleInput}
            rows={4}
            placeholder="Contoh: 'Di posko ini banyak bayi, stok susu formula tinggal sedikit. Ada juga lansia yang butuh obat darah tinggi rutin, dan air bersih mulai menipis.'"
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
          />
          <button
            onClick={laporKebutuhan}
            disabled={busy || !poskoId || teks.trim().length < 5}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-40"
          >
            <i className="fa-solid fa-wand-magic-sparkles mr-1.5" aria-hidden="true"></i>
            Klasifikasi AI & Simpan (Pending)
          </button>
          <p className="text-[11px] text-slate-400">
            Hasil AI berstatus <b>pending</b> — harus dikonfirmasi tenaga medis/koordinator di panel
            antrean sebelum tampil di peta. AI hanya mengategorikan kebutuhan umum, tidak pernah
            menyebut nama/dosis/merek obat.
          </p>
        </div>
      </section>

      {msg && (
        <div
          className={`lg:col-span-2 rounded-lg border px-4 py-2.5 text-sm ${
            msg.t === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : msg.t === "warn"
                ? "border-amber-200 bg-amber-50 text-amber-800"
                : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {msg.s}
        </div>
      )}
    </div>
  );
}
