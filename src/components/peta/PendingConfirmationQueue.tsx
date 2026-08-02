"use client";

import { useCallback, useEffect, useState } from "react";
import { KATEGORI_LABEL, KATEGORI_LIST } from "@/lib/peta";
import { LEVEL_META } from "@/lib/utils";
import type { Level } from "@prisma/client";

interface PendingItem {
  id: string;
  poskoId: string;
  namaPosko: string;
  areaPublik: string;
  kategori: string;
  label: string;
  ringkasanLaporan: string | null;
  urgensi: Level;
  perluKonfirmasiMedis: boolean;
  lastUpdated: string;
}

/**
 * Antrean review tenaga medis/koordinator — konfirmasi data "pending"
 * sebelum masuk agregat peta. Admin bisa mengoreksi kategori/urgensi dan
 * mengisi estimasi jumlah. Hanya status "dikonfirmasi" yang tampil di peta.
 */
export default function PendingConfirmationQueue() {
  const [items, setItems] = useState<PendingItem[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/peta/kebutuhan/pending");
    if (r.ok) setItems((await r.json()).pending ?? []);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function konfirmasi(
    it: PendingItem,
    kategori: string,
    urgensi: Level,
    estimasi: number | null
  ) {
    setBusy(it.id);
    setMsg(null);
    const r = await fetch(`/api/peta/kebutuhan/${it.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kategori, urgensi, estimasiJumlah: estimasi, status: "dikonfirmasi" }),
    });
    const j = await r.json();
    setBusy(null);
    if (!r.ok || !j.ok) {
      setMsg(j.error ?? "Gagal konfirmasi");
      return;
    }
    setMsg(`"${it.namaPosko}" — ${KATEGORI_LABEL[kategori as keyof typeof KATEGORI_LABEL]} dikonfirmasi. Kini tampil di peta.`);
    load();
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="mb-1 text-sm font-bold text-slate-900">
        <i className="fa-solid fa-list-check mr-2 text-pmi" aria-hidden="true"></i>
        Antrean Konfirmasi Kebutuhan
        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
          {items.length} pending
        </span>
      </h3>
      <p className="mb-3 text-[11px] text-slate-400">
        Human oversight — koreksi & konfirmasi sebelum data masuk peta. Data pending tidak pernah tampil.
      </p>

      {msg && <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{msg}</div>}

      {items.length === 0 ? (
        <div className="py-6 text-center text-sm text-slate-400">Tidak ada laporan menunggu konfirmasi.</div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((it) => (
            <PendingRow key={it.id} it={it} busy={busy === it.id} onConfirm={konfirmasi} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PendingRow({
  it,
  busy,
  onConfirm,
}: {
  it: PendingItem;
  busy: boolean;
  onConfirm: (it: PendingItem, k: string, u: Level, e: number | null) => void;
}) {
  const [kategori, setKategori] = useState(it.kategori);
  const [urgensi, setUrgensi] = useState<Level>(it.urgensi);
  const [estimasi, setEstimasi] = useState("");

  const styleSel = "rounded-lg border border-slate-300 px-2 py-1.5 text-xs outline-none focus:border-pmi";

  return (
    <li className="rounded-lg border border-slate-100 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="text-sm font-bold text-slate-800">{it.namaPosko}</span>
          <span className="ml-2 text-xs text-slate-400">{it.areaPublik}</span>
        </div>
        <span
          className="rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
          style={{ background: LEVEL_META[it.urgensi].hex }}
        >
          {it.urgensi}
        </span>
      </div>
      {it.ringkasanLaporan && (
        <p className="mt-1.5 text-xs italic text-slate-500">"{it.ringkasanLaporan}"</p>
      )}
      <div className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <select className={styleSel} value={kategori} onChange={(e) => setKategori(e.target.value)}>
          {KATEGORI_LIST.map((k) => (
            <option key={k} value={k}>
              {KATEGORI_LABEL[k]}
            </option>
          ))}
        </select>
        <select className={styleSel} value={urgensi} onChange={(e) => setUrgensi(e.target.value as Level)}>
          <option value="HIJAU">HIJAU</option>
          <option value="KUNING">KUNING</option>
          <option value="MERAH">MERAH</option>
        </select>
        <input
          className={styleSel}
          type="number"
          min={0}
          placeholder="Estimasi jumlah"
          value={estimasi}
          onChange={(e) => setEstimasi(e.target.value)}
        />
        <button
          onClick={() => onConfirm(it, kategori, urgensi, estimasi === "" ? null : Number(estimasi))}
          disabled={busy}
          className="rounded-lg bg-pmi px-3 py-1.5 text-xs font-bold text-white hover:bg-pmi-dark disabled:opacity-40"
        >
          {busy ? "..." : <><i className="fa-solid fa-check mr-1" aria-hidden="true"></i>Konfirmasi</>}
        </button>
      </div>
    </li>
  );
}
