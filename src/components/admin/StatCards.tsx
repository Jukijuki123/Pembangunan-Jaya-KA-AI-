"use client";

import type { AgregatDTO } from "./dto";

function Stat({
  label,
  value,
  accent = "text-slate-900",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-black ${accent}`}>{value}</p>
    </div>
  );
}

export function StatCards({ a }: { a: AgregatDTO }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Total Jiwa" value={a.totalJiwa} accent="text-pmi" />
      <Stat label="Kepala Keluarga" value={a.totalKK} />
      <Stat label="Kasus MERAH" value={a.merah} accent="text-merah" />
      <Stat label="Kasus KUNING" value={a.kuning} accent="text-kuning" />
      <Stat label="Ibu Hamil" value={a.ibuHamil} />
      <Stat label="Balita ≤2 th" value={a.balita} />
      <Stat label="Lansia ≥60 th" value={a.lansia} />
      <Stat label="Tanpa Obat Kritis" value={a.tanpaObat} accent="text-merah" />
    </div>
  );
}
