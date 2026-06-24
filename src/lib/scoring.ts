import type { ProfilKerentanan, HasilSkor, RincianSkor } from "@/lib/types";

/**
 * RULE ENGINE SKORING KERENTANAN — DETERMINISTIK.
 *
 * PRINSIP NON-NEGOTIABLE: LLM TIDAK menghitung skor. Skor dihitung di sini,
 * dengan kode TypeScript biasa yang bisa diaudit baris-per-baris oleh juri.
 * Diadaptasi dari pendekatan triase IFRC/Sphere (faktor kerentanan berbobot).
 *
 * Formula (sesuai spesifikasi):
 *   skor = (usia >= 60 ? +2 : 0)
 *        + (3 * jumlah kondisi medis kritis)
 *        + (ada anggota balita < 1 th ? +3 : 0)
 *        + (obat_tersedia === false ? +4 : 0)
 *        + (mobilitas === 'tidak_bisa' ? +2 : 0)
 *
 *   level: 0-4 -> HIJAU | 5-8 -> KUNING | 9+ -> MERAH
 *
 * Mengembalikan rincian per faktor agar UI bisa menampilkan "kenapa skornya
 * sekian" — transparansi penuh, bukan kotak hitam.
 */

export const BOBOT = {
  lansia: 2, // usia KK >= 60
  perKondisiMedis: 3, // per kondisi medis kritis
  balitaBawah1: 3, // ada anggota balita < 1 tahun
  obatTidakTersedia: 4, // obat kritis tidak tersedia
  mobilitasTidakBisa: 2, // tidak bisa bergerak mandiri
} as const;

export function hitungSkor(profil: ProfilKerentanan): HasilSkor {
  const rincian: RincianSkor[] = [];

  // 1) Lansia (KK >= 60 tahun)
  if (typeof profil.usiaKK === "number" && profil.usiaKK >= 60) {
    rincian.push({
      label: `Kepala keluarga lansia (${profil.usiaKK} th, ≥60)`,
      poin: BOBOT.lansia,
    });
  }

  // 2) Kondisi medis kritis (3 poin per kondisi)
  const jumlahKondisi = profil.kondisiMedisKritis?.length ?? 0;
  if (jumlahKondisi > 0) {
    rincian.push({
      label: `${jumlahKondisi} kondisi medis kritis (${profil.kondisiMedisKritis.join(
        ", "
      )})`,
      poin: BOBOT.perKondisiMedis * jumlahKondisi,
    });
  }

  // 3) Balita < 1 tahun di antara anggota keluarga
  const adaBalita = (profil.anggotaKeluarga ?? []).some(
    (a) => typeof a.usia === "number" && a.usia < 1
  );
  if (adaBalita) {
    rincian.push({
      label: "Ada bayi/balita < 1 tahun",
      poin: BOBOT.balitaBawah1,
    });
  }

  // 4) Obat tidak tersedia (hanya jika eksplisit false)
  if (profil.obatTersedia === false) {
    rincian.push({
      label: "Obat untuk kondisi kronis tidak tersedia",
      poin: BOBOT.obatTidakTersedia,
    });
  }

  // 5) Mobilitas tidak bisa (butuh evakuasi/bantuan total)
  if (profil.mobilitas === "tidak_bisa") {
    rincian.push({
      label: "Tidak bisa bergerak mandiri (perlu bantuan penuh)",
      poin: BOBOT.mobilitasTidakBisa,
    });
  }

  const skor = rincian.reduce((acc, r) => acc + r.poin, 0);
  const level = tentukanLevel(skor);

  return {
    skor,
    level,
    rincian,
    // Setiap kasus MERAH WAJIB diverifikasi tenaga medis (Lapis 2 oversight).
    perluVerifikasiMedis: level === "MERAH",
  };
}

export function tentukanLevel(skor: number): HasilSkor["level"] {
  if (skor >= 9) return "MERAH";
  if (skor >= 5) return "KUNING";
  return "HIJAU";
}
