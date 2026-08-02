import ExcelJS from "exceljs";
import type { Kasus } from "@prisma/client";
import { INSTANSI_LABEL } from "@/lib/utils";

/**
 * Generator file Excel (.xlsx) untuk rujukan per instansi.
 * Dibuat dengan exceljs — hasilnya file .xlsx asli yang pasti kebuka rapi
 * di Excel/WPS/Sheets (bukan CSV yang delimiter-nya bergantung locale).
 *
 * Styling: header merah PMI (#c8102e) bold putih, semua sel diberi border
 * tipis, kolom auto-width, baris header di-freeze.
 */
export async function kasusToXlsx(rows: Kasus[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "SIGAP AI";
  wb.created = new Date();
  const ws = wb.addWorksheet("Rujukan", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  const HEADER_COLOR = "C8102E";
  const BORDER: Partial<ExcelJS.Borders> = {
    top: { style: "thin", color: { argb: "FFD1D5DB" } },
    left: { style: "thin", color: { argb: "FFD1D5DB" } },
    bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
    right: { style: "thin", color: { argb: "FFD1D5DB" } },
  };

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

  // ── Header ──────────────────────────────────────────────
  ws.columns = header.map((h) => ({ header: h, key: h, width: 16 }));
  const headerRow = ws.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: `FF${HEADER_COLOR}` },
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
    cell.border = BORDER;
  });

  // ── Data ────────────────────────────────────────────────
  const mobilitasLabel: Record<string, string> = {
    mandiri: "Mandiri",
    bantuan: "Bantuan",
    tidak_bisa: "Tidak bisa",
  };

  rows.forEach((k) => {
    const kondisi = Array.isArray(k.kondisiMedisKritis)
      ? (k.kondisiMedisKritis as string[]).join(", ")
      : "";
    const tgl = k.createdAt.toISOString().slice(0, 16).replace("T", " ");
    const values: (string | number)[] = [
      k.kodeUnik,
      k.instansiRujukan ? INSTANSI_LABEL[k.instansiRujukan] ?? k.instansiRujukan : "",
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
    ];

    const row = ws.addRow(values);
    row.eachCell((cell) => {
      cell.border = BORDER;
      cell.alignment = { vertical: "middle" };
    });
    // Warna level: MERAH / KUNING / HIJAU agar mudah dipindai.
    const levelCell = row.getCell(3);
    if (k.levelPrioritas === "MERAH") {
      levelCell.font = { bold: true, color: { argb: "FFDC2626" } };
    } else if (k.levelPrioritas === "KUNING") {
      levelCell.font = { bold: true, color: { argb: "FFD97706" } };
    } else {
      levelCell.font = { bold: true, color: { argb: "FF16A34A" } };
    }
  });

  // Kolom kondisi medis lebih lebar.
  ws.getColumn(7).width = 34;
  ws.getColumn(1).width = 18;

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}
