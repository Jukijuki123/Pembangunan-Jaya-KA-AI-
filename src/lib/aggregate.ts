import { prisma } from "@/lib/prisma";
import type { AgregatPosko } from "@/lib/gemini";
import type { AnggotaKeluarga } from "@/lib/types";

/**
 * Hitung agregat posko dari seluruh kasus non-spam terverifikasi.
 * Dipakai dashboard koordinator & generator laporan harian.
 * Tidak memuat nama asli -> aman untuk laporan agregat (mitigasi privasi).
 */
export async function hitungAgregat(): Promise<AgregatPosko> {
  const rows = await prisma.kasus.findMany({
    where: { isSpam: false },
    select: {
      levelPrioritas: true,
      usiaKK: true,
      anggotaKeluarga: true,
      obatTersedia: true,
      instansiRujukan: true,
    },
  });

  const agg: AgregatPosko = {
    totalJiwa: 0,
    totalKK: rows.length,
    merah: 0,
    kuning: 0,
    hijau: 0,
    ibuHamil: 0,
    balita: 0,
    lansia: 0,
    tanpaObat: 0,
    perInstansi: { DINAS_KESEHATAN: 0, DINAS_SOSIAL: 0, BPBD: 0 },
  };

  for (const k of rows) {
    const anggota = (k.anggotaKeluarga as AnggotaKeluarga[] | null) ?? [];
    // total jiwa = kepala keluarga (1) + anggota
    agg.totalJiwa += 1 + anggota.length;

    if (k.levelPrioritas === "MERAH") agg.merah++;
    else if (k.levelPrioritas === "KUNING") agg.kuning++;
    else agg.hijau++;

    if (typeof k.usiaKK === "number" && k.usiaKK >= 60) agg.lansia++;
    if (k.obatTersedia === false) agg.tanpaObat++;

    for (const a of anggota) {
      const hub = (a.hubungan ?? "").toLowerCase();
      const kondisi = (a.kondisiKhusus ?? "").toLowerCase();
      if (hub.includes("hamil") || kondisi.includes("hamil")) agg.ibuHamil++;
      if (typeof a.usia === "number" && a.usia <= 2) agg.balita++;
      if (typeof a.usia === "number" && a.usia >= 60) agg.lansia++;
    }

    if (k.instansiRujukan && k.instansiRujukan in agg.perInstansi) {
      agg.perInstansi[k.instansiRujukan as keyof typeof agg.perInstansi]++;
    }
  }

  return agg;
}
