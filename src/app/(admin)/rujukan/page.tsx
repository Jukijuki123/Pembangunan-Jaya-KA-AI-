import { prisma } from "@/lib/prisma";
import { INSTANSI_LABEL } from "@/lib/utils";
import { LevelBadge } from "@/components/ui";
import type { Instansi } from "@prisma/client";

export const metadata = { title: "Rujukan Instansi — SIGAP AI" };
export const dynamic = "force-dynamic";

const INSTANSI_LIST: Instansi[] = ["DINAS_KESEHATAN", "DINAS_SOSIAL", "BPBD"];

export default async function RujukanPage() {
  const kasus = await prisma.kasus.findMany({
    where: { isSpam: false, instansiRujukan: { not: null } },
    orderBy: [{ levelPrioritas: "desc" }, { createdAt: "desc" }],
  });

  const grouped = INSTANSI_LIST.map((inst) => ({
    inst,
    rows: kasus.filter((k) => k.instansiRujukan === inst),
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-lg font-black text-slate-900">Rujukan per Instansi</h1>
        <p className="text-sm text-slate-500">
          Daftar kasus otomatis dipisah per instansi tujuan. Unduh CSV untuk
          diserahkan ke masing-masing instansi.
        </p>
      </div>

      {grouped.map(({ inst, rows }) => (
        <section
          key={inst}
          className="rounded-xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
            <h2 className="text-base font-bold text-slate-900">
              {INSTANSI_LABEL[inst]}{" "}
              <span className="text-sm font-normal text-slate-400">
                ({rows.length} kasus)
              </span>
            </h2>
            <a
              href={`/api/rujukan/${inst.toLowerCase()}/csv`}
              className="rounded-lg bg-pmi px-3 py-1.5 text-xs font-semibold text-white hover:bg-pmi-dark"
            >
              ⬇ Unduh CSV
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-3 py-2">Kode</th>
                  <th className="px-3 py-2">Level</th>
                  <th className="px-3 py-2">Skor</th>
                  <th className="px-3 py-2">Nama KK</th>
                  <th className="px-3 py-2">Kondisi</th>
                  <th className="px-3 py-2">Asal</th>
                  <th className="px-3 py-2">Verif Medis</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-6 text-center text-slate-400">
                      Belum ada kasus untuk instansi ini.
                    </td>
                  </tr>
                ) : (
                  rows.map((k) => (
                    <tr key={k.id} className="border-t border-slate-100">
                      <td className="px-3 py-2 font-mono text-xs">{k.kodeUnik}</td>
                      <td className="px-3 py-2">
                        <LevelBadge level={k.levelPrioritas} />
                      </td>
                      <td className="px-3 py-2 font-semibold">{k.skorKerentanan}</td>
                      <td className="px-3 py-2">{k.namaKK ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-slate-500">
                        {Array.isArray(k.kondisiMedisKritis)
                          ? (k.kondisiMedisKritis as string[]).join(", ") || "—"
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs">{k.asalLokasi ?? "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {k.statusVerifikasiMedis ? (
                          <span className="text-hijau">✓</span>
                        ) : k.levelPrioritas === "MERAH" ? (
                          <span className="text-merah">belum</span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
