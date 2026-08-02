import type { Kasus } from "@prisma/client";
import { INSTANSI_LABEL } from "@/lib/utils";

/**
 * Escape satu sel CSV.
 * Delimiter pakai SEMICOLON (";") karena Excel Indonesia (locale id-ID)
 * default-nya membaca semicolon sebagai pemisah kolom — koma malah bikin
 * seluruh baris jadi satu kolom.
 */
const DELIM = ";";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Kutip ganda di-escape; bungkus bila ada delimiter, kutip, newline,
  // atau spasi di awal/akhir.
  if (/[";,\r\n]/.test(s) || /^\s|\s$/.test(s)) {
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
      ? (k.kondisiMedisKritis as string[]).join(", ")
      : "";
    const mobilitasLabel: Record<string, string> = {
      mandiri: "Mandiri",
      bantuan: "Bantuan",
      tidak_bisa: "Tidak bisa",
    };
    const tgl = k.createdAt.toISOString().slice(0, 16).replace("T", " ");
    return [
      k.kodeUnik,
      k.instansiRujukan ? INSTANSI_LABEL[k.instansiRujukan] : "",
      k.levelPrioritas,
      k.skorKerentanan,
      k.namaKK ?? "",
      k.usiaKK ?? "",
      kondisi,
      k.obatTersedia === null ? "" : k.obatTersedia ? "Ya" : "Tidak",
      k.mobilitas ? mobilitasLabel[k.mobilitas] ?? k.mobilitas : "",
      k.asalLokasi ?? "",
      k.statusVerifikasiMedis ? "Sudah" : "Belum",
      k.status,
      tgl,
    ]
      .map(cell)
      .join(DELIM);
  });

  // Baris pertama "sep=;" memberitahu Microsoft Excel/WPS (locale id-ID)
  // bahwa delimiter adalah semicolon — tanpa ini, Excel kadang tetap
  // membaca seluruh baris sebagai satu kolom.
  // \uFEFF = Byte Order Mark agar Excel membaca UTF-8 dengan benar.
  return (
    "\uFEFFsep=;\r\n" +
    [header.map(cell).join(DELIM), ...lines].join("\r\n")
  );
}
