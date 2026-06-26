"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { StatCards } from "@/components/admin/StatCards";
import { Charts } from "@/components/admin/Charts";
import { KasusTable } from "@/components/admin/KasusTable";
import { LaporanPanel } from "@/components/admin/LaporanPanel";
import { UserPanel, type UserRow } from "@/components/admin/UserPanel";
import { ResetPanel } from "@/components/admin/ResetPanel";
import { Spinner } from "@/components/ui";
import type { DashboardResponse, KasusDTO } from "@/components/admin/dto";

const fetcher = (url: string) =>
  fetch(url).then((r) => {
    if (!r.ok) throw new Error("gagal");
    return r.json() as Promise<DashboardResponse>;
  });

/** Beep pendek via WebAudio (tanpa file aset). */
function beep() {
  try {
    const Ctx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = "square";
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
    osc.onended = () => ctx.close();
  } catch {
    /* abaikan bila browser memblokir audio */
  }
}

export default function AdminClient({ users }: { users: UserRow[] }) {
  // Polling ringan 7 detik (lebih reliable dari SSE di serverless free-tier).
  const { data, isLoading, mutate } = useSWR("/api/dashboard", fetcher, {
    refreshInterval: 7000,
    revalidateOnFocus: true,
  });

  const prevAlarm = useRef(0);
  const [filter, setFilter] = useState<"SEMUA" | "MERAH" | "KUNING" | "HIJAU">(
    "SEMUA"
  );

  // Bunyikan beep saat ada kasus MERAH baru yang belum diverifikasi.
  useEffect(() => {
    const n = data?.jumlahMerahAlarm ?? 0;
    if (n > prevAlarm.current) beep();
    prevAlarm.current = n;
  }, [data?.jumlahMerahAlarm]);

  const agregat = data?.agregat;
  const kasus: KasusDTO[] = data?.kasus ?? [];
  const alarm = data?.jumlahMerahAlarm ?? 0;

  const kasusTampil =
    filter === "SEMUA" ? kasus : kasus.filter((k) => k.levelPrioritas === filter);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black text-slate-900">Dashboard Koordinator</h1>
          <p className="text-xs text-slate-500">
            Pembaruan otomatis tiap 7 detik {data?.ts ? `· ${new Date(data.ts).toLocaleTimeString("id-ID")}` : ""}
          </p>
        </div>
        {isLoading && <Spinner className="text-pmi" />}
      </div>

      {/* Alarm MERAH */}
      {alarm > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-merah-border bg-merah-soft px-4 py-3 animate-blinkRed relative z-10">
          <p className="text-sm font-bold text-merah">
            🚨 {alarm} kasus MERAH menunggu verifikasi medis
          </p>
          <button
            onClick={() => {
              setFilter("MERAH");
              document.getElementById("tabel-kasus")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="rounded-lg bg-merah px-3 py-1.5 text-xs font-semibold text-white cursor-pointer relative z-20 shrink-0 ml-3"
          >
            Lihat
          </button>
        </div>
      )}

      {agregat && <StatCards a={agregat} />}
      {agregat && <Charts a={agregat} />}

      {/* Filter + tabel */}
      <div id="tabel-kasus" className="scroll-mt-24 relative z-0">
        <div className="mb-2 flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">Daftar Kasus</h2>
          <div className="ml-auto flex gap-1">
            {(["SEMUA", "MERAH", "KUNING", "HIJAU"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium ${
                  filter === f
                    ? "bg-pmi text-white"
                    : "bg-white text-slate-500 border border-slate-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        <KasusTable kasus={kasusTampil} onChanged={() => mutate()} />
      </div>

      <LaporanPanel />
      <UserPanel users={users} />
      <ResetPanel onDone={() => mutate()} />
    </div>
  );
}
