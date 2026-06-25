"use client";

import { useState } from "react";
import { 
  Plus, 
  MapPin, 
  RefreshCw, 
  Search,
  Filter
} from "lucide-react";

interface PengungsiRow {
  id: string;
  namaKK: string;
  usiaKK: number;
  anggota: number;
  posko: string;
  triage: "MERAH" | "KUNING" | "HIJAU";
  kondisi: string;
  waktu: string;
}

const INITIAL_ROWS: PengungsiRow[] = [
  {
    id: "K-084",
    namaKK: "Slamet Riyadi",
    usiaKK: 62,
    anggota: 4,
    posko: "Posko Tenda 1",
    triage: "MERAH",
    kondisi: "Lansia sesak napas, butuh oksigen",
    waktu: "10:24",
  },
  {
    id: "K-083",
    namaKK: "Siti Aminah",
    usiaKK: 28,
    anggota: 3,
    posko: "Posko Lapangan",
    triage: "MERAH",
    kondisi: "Ibu hamil 8 bulan, kontraksi",
    waktu: "10:18",
  },
  {
    id: "K-082",
    namaKK: "Bambang Hermawan",
    usiaKK: 41,
    anggota: 5,
    posko: "Posko Tenda 1",
    triage: "KUNING",
    kondisi: "Luka robek kaki, diabetes",
    waktu: "10:05",
  },
  {
    id: "K-081",
    namaKK: "Joko Susilo",
    usiaKK: 35,
    anggota: 2,
    posko: "Posko Aula Desa",
    triage: "HIJAU",
    kondisi: "Kondisi stabil, butuh selimut",
    waktu: "09:58",
  },
];

const NAMES = ["Rudi Hartono", "Endang Sri", "Dedi Setiadi", "Sri Wahyuni", "M. Yusuf"];
const CONDITIONS: { kondisi: string; triage: "MERAH" | "KUNING" | "HIJAU"; usia: number; anggota: number }[] = [
  { kondisi: "Balita demam tinggi >39°C", triage: "MERAH", usia: 24, anggota: 4 },
  { kondisi: "Lansia lemas, komorbid jantung", triage: "MERAH", usia: 68, anggota: 2 },
  { kondisi: "Cedera bahu terbentur runtuhan", triage: "KUNING", usia: 38, anggota: 3 },
  { kondisi: "Asma kambuh ringan", triage: "KUNING", usia: 42, anggota: 5 },
  { kondisi: "Sehat, membutuhkan makanan bayi", triage: "HIJAU", usia: 31, anggota: 4 },
];

export function InteractiveDashboard() {
  const [rows, setRows] = useState<PengungsiRow[]>(INITIAL_ROWS);
  const [filterTriage, setFilterTriage] = useState<"SEMUA" | "MERAH" | "KUNING" | "HIJAU">("SEMUA");

  const handleSimulate = () => {
    const randomName = NAMES[Math.floor(Math.random() * NAMES.length)];
    const randomCond = CONDITIONS[Math.floor(Math.random() * CONDITIONS.length)];
    const now = new Date();
    const timeStr = now.toTimeString().split(" ")[0].substring(0, 5);

    const newRow: PengungsiRow = {
      id: `K-0${Math.floor(Math.random() * 90) + 10}`,
      namaKK: randomName,
      usiaKK: randomCond.usia,
      anggota: randomCond.anggota,
      posko: Math.random() > 0.5 ? "Posko Tenda 1" : "Posko Lapangan",
      triage: randomCond.triage,
      kondisi: randomCond.kondisi,
      waktu: timeStr,
    };

    setRows(prev => [newRow, ...prev.slice(0, 4)]);
  };

  const filteredRows = rows.filter(r => filterTriage === "SEMUA" || r.triage === filterTriage);

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white shadow-xl overflow-hidden font-sans">
      {/* Chrome Window Header */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-red-400"></span>
          <span className="h-3 w-3 rounded-full bg-yellow-400"></span>
          <span className="h-3 w-3 rounded-full bg-green-400"></span>
          <span className="ml-2 text-xs font-semibold text-slate-400 tracking-wider">PREVIEW PANEL ADMIN</span>
        </div>
        <button
          onClick={handleSimulate}
          className="flex items-center gap-1 rounded bg-slate-200/80 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-350 transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          Simulasi Laporan
        </button>
      </div>

      {/* Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-white p-3">
        {/* Fake Search Input */}
        <div className="relative flex items-center">
          <Search className="absolute left-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            readOnly
            placeholder="Cari kepala keluarga..."
            className="w-40 rounded border border-slate-200 pl-8 pr-2 py-1 text-xs text-slate-400 focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1">
          {(["SEMUA", "MERAH", "KUNING", "HIJAU"] as const).map(t => {
            const isActive = filterTriage === t;
            let activeStyle = "bg-slate-900 text-white";
            if (isActive && t === "MERAH") activeStyle = "bg-red-600 text-white";
            if (isActive && t === "KUNING") activeStyle = "bg-amber-500 text-white";
            if (isActive && t === "HIJAU") activeStyle = "bg-green-600 text-white";

            return (
              <button
                key={t}
                onClick={() => setFilterTriage(t)}
                className={`rounded px-2.5 py-1 text-[10px] font-bold uppercase transition-colors ${
                  isActive ? activeStyle : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* Simplified Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/50 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <th className="p-3">ID</th>
              <th className="p-3">Nama Kepala Keluarga</th>
              <th className="p-3">Triage</th>
              <th className="p-3">Kondisi Medis / Catatan</th>
              <th className="p-3 text-right">Jam</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.map((r) => {
              const isMerah = r.triage === "MERAH";
              const isKuning = r.triage === "KUNING";
              
              let badgeColor = "bg-green-100 text-green-800";
              if (isMerah) badgeColor = "bg-red-100 text-red-800";
              else if (isKuning) badgeColor = "bg-amber-100 text-amber-800";

              return (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-3 font-semibold text-slate-500">{r.id}</td>
                  <td className="p-3">
                    <p className="font-bold text-slate-800">{r.namaKK}</p>
                    <p className="text-[10px] text-slate-400">{r.usiaKK} Th • {r.anggota} Anggota • {r.posko}</p>
                  </td>
                  <td className="p-3">
                    <span className={`inline-block rounded px-2 py-0.5 text-[9px] font-bold tracking-wide uppercase ${badgeColor}`}>
                      {r.triage}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600 max-w-[150px] truncate">{r.kondisi}</td>
                  <td className="p-3 text-right font-medium text-slate-400">{r.waktu}</td>
                </tr>
              );
            })}
            {filteredRows.length === 0 && (
              <tr>
                <td colSpan={5} className="p-6 text-center text-slate-400 italic">
                  Tidak ada laporan triage {filterTriage.toLowerCase()}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Info */}
      <div className="border-t border-slate-100 bg-slate-50/60 p-3 flex justify-between items-center text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3 text-slate-400" /> Aktif: 2 Posko
        </span>
        <span className="font-medium">Total Terdata: {rows.length + 144}</span>
      </div>
    </div>
  );
}
