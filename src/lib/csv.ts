import type { Kasus } from "@prisma/client";
import { INSTANSI_LABEL } from "@/lib/utils";

/** Escape satu sel CSV (RFC 4180). */
function cell(value: unknown): string {
  const s = value === null || value === undefined ? "" : String(value);
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Generate string CSV dari daftar kasus, untuk tombol "Unduh CSV" per instansi.
 * Nama KK disertakan karena CSV ini untuk instansi rujukan resmi (bukan dashboard
 * agregat anonim). Kode unik tetap kolom pertama sebagai ID acuan.
 */
export function kasusToCsv(rows: Kasus[]): string {
  const header = [
    "Kode",
    "Instansi Rujukan",
    "Level",
    "Skor",
    "Nama KK",
    "Usia KK",
    "Kondisi Medis Kritis",
    "Obat Tersedia",
    "Mobilitas",
    "Asal Lokasi",
    "Verifikasi Medis",
    "Status",
    "Dibuat",
  ];

  const lines = rows.map((k) => {
    const kondisi = Array.isArray(k.kondisiMedisKritis)
      ? (k.kondisiMedisKritis as string[]).join("; ")
      : "";
    return [
      k.kodeUnik,
      k.instansiRujukan ? INSTANSI_LABEL[k.instansiRujukan] : "",
      k.levelPrioritas,
      k.skorKerentanan,
      k.namaKK ?? "",
      k.usiaKK ?? "",
      kondisi,
      k.obatTersedia === null ? "" : k.obatTersedia ? "Ya" : "Tidak",
      k.mobilitas ?? "",
      k.asalLokasi ?? "",
      k.statusVerifikasiMedis ? "Sudah" : "Belum",
      k.status,
      k.createdAt.toISOString(),
    ]
      .map(cell)
      .join(",");
  });

  // BOM agar Excel membaca UTF-8 dengan benar.
  return "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
}
