import { GoogleGenAI, Type } from "@google/genai";
import { env } from "@/env";
import { sinonimUntukPrompt } from "@/lib/synonyms";
import {
  geminiExtractionSchema,
  toProfil,
  type ProfilKerentanan,
} from "@/lib/types";

/**
 * Klien Gemini — HANYA dipanggil dari server (Route Handler / Server Action).
 * API key tidak pernah dikirim ke client.
 *
 * Model: gemini-2.5-flash (fallback: gemini-2.5-flash-lite).
 * gemini-2.0-flash sudah deprecated/shutdown -> tidak dipakai.
 */
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL_UTAMA = "gemini-2.5-flash";
const MODEL_FALLBACK = "gemini-2.5-flash-lite";

/**
 * System instruction: peran AI HANYA reasoning + ekstraksi. AI TIDAK
 * menghitung skor (itu tugas rule engine). Wajib kembalikan JSON murni.
 */
function buildSystemInstruction(): string {
  return [
    "Kamu adalah asisten intake relawan PMI di meja registrasi posko pengungsian bencana di Indonesia.",
    "TUGAS: membaca teks bebas relawan (bahasa Indonesia informal/dialek) dan mengekstraknya menjadi data terstruktur untuk asesmen kerentanan keluarga pengungsi.",
    "",
    "ATURAN WAJIB:",
    "- Kembalikan HANYA JSON sesuai skema. Tidak ada teks lain, tidak ada markdown.",
    "- Jika sebuah informasi TIDAK disebutkan, isi null. JANGAN berasumsi atau mengarang.",
    "- Pertahankan nama asli apa adanya.",
    "- Usia dalam angka tahun. Bayi < 1 tahun tulis 0.",
    "- kondisi_medis_kritis: HANYA kondisi yang eksplisit disebutkan, ditulis dalam istilah medis baku.",
    "- obat_tersedia: true / false / null (null bila tidak disinggung).",
    "- mobilitas: salah satu dari 'mandiri' | 'bantuan' | 'tidak_bisa' | null.",
    "- instansi_rujukan_sementara: tebakan awal instansi yang paling relevan.",
    "    DINAS_KESEHATAN bila ada kondisi medis/obat/ibu hamil/lansia sakit;",
    "    DINAS_SOSIAL bila isu utama tempat tinggal/logistik/anak terpisah/lansia sendiri;",
    "    BPBD bila isu utama evakuasi/lokasi bencana/kerusakan rumah.",
    "    (Ini hanya sementara — keputusan final tetap di tangan manusia.)",
    "- agent_thought: 1-2 kalimat penalaranmu atas kasus ini (untuk audit), bahasa Indonesia.",
    "",
    "PETAKAN istilah awam/dialek ke istilah medis baku berikut saat mengekstrak kondisi_medis_kritis:",
    sinonimUntukPrompt(),
  ].join("\n");
}

/**
 * responseSchema untuk memaksa output terstruktur dari Gemini.
 * Lihat geminiExtractionSchema (Zod) untuk validasi kedua di server.
 */
const responseSchema = {
  type: Type.OBJECT,
  properties: {
    agent_thought: { type: Type.STRING },
    nama_kk: { type: Type.STRING, nullable: true },
    usia_kk: { type: Type.NUMBER, nullable: true },
    anggota_keluarga: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          hubungan: { type: Type.STRING },
          usia: { type: Type.NUMBER, nullable: true },
          kondisi_khusus: { type: Type.STRING, nullable: true },
        },
        required: ["hubungan"],
      },
    },
    kondisi_medis_kritis: { type: Type.ARRAY, items: { type: Type.STRING } },
    obat_tersedia: { type: Type.BOOLEAN, nullable: true },
    mobilitas: {
      type: Type.STRING,
      enum: ["mandiri", "bantuan", "tidak_bisa"],
      nullable: true,
    },
    asal_lokasi: { type: Type.STRING, nullable: true },
    instansi_rujukan_sementara: {
      type: Type.STRING,
      enum: ["DINAS_KESEHATAN", "DINAS_SOSIAL", "BPBD"],
    },
  },
  required: ["agent_thought", "instansi_rujukan_sementara"],
};

async function callModel(model: string, teks: string): Promise<string> {
  const res = await ai.models.generateContent({
    model,
    contents: `TEKS RELAWAN:\n"""${teks}"""`,
    config: {
      systemInstruction: buildSystemInstruction(),
      responseMimeType: "application/json",
      responseSchema,
      temperature: 0, // deterministik untuk ekstraksi
    },
  });
  const text = res.text;
  if (!text) throw new Error("Respons Gemini kosong");
  return text;
}

/**
 * Ekstrak teks bebas -> ProfilKerentanan tervalidasi.
 * Mencoba model utama, lalu fallback. Memvalidasi dengan Zod (jaminan bentuk).
 */
export async function ekstrakProfil(teks: string): Promise<ProfilKerentanan> {
  let raw: string;
  try {
    raw = await callModel(MODEL_UTAMA, teks);
  } catch (err) {
    // Fallback ke model lebih ringan bila utama gagal (quota/limit).
    console.warn(
      `[gemini] model utama gagal, fallback ke ${MODEL_FALLBACK}:`,
      (err as Error).message
    );
    raw = await callModel(MODEL_FALLBACK, teks);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error("Output AI bukan JSON valid");
  }

  const parsed = geminiExtractionSchema.safeParse(json);
  if (!parsed.success) {
    throw new Error(
      "Struktur output AI tidak sesuai skema: " + parsed.error.message
    );
  }

  return toProfil(parsed.data);
}

export interface AgregatPosko {
  totalJiwa: number;
  totalKK: number;
  merah: number;
  kuning: number;
  hijau: number;
  ibuHamil: number;
  balita: number;
  lansia: number;
  tanpaObat: number;
  perInstansi: { DINAS_KESEHATAN: number; DINAS_SOSIAL: number; BPBD: number };
}

/**
 * Buat DRAFT ringkasan laporan harian untuk koordinator (Lapis 3 oversight).
 * Output teks formal Indonesia, maksimal ~150 kata. Ini hanya DRAFT —
 * admin wajib mereview & klik kirim. Tidak ada laporan terkirim otomatis.
 */
export async function buatRingkasanHarian(
  agregat: AgregatPosko
): Promise<string> {
  const sys = [
    "Kamu asisten koordinator posko pengungsian PMI.",
    "Buat draft laporan ringkas (maksimal 150 kata) untuk dikirim ke PMI Cabang.",
    "Bahasa Indonesia formal sesuai format laporan PMI.",
    "Sertakan: total jiwa, breakdown kategori kerentanan (MERAH/KUNING/HIJAU),",
    "dan 3 gap/kebutuhan kritis terbesar berdasarkan data.",
    "Kembalikan teks biasa (bukan JSON, bukan markdown).",
  ].join("\n");

  const prompt = `DATA AGREGAT POSKO HARI INI (JSON):\n${JSON.stringify(
    agregat
  )}`;

  const run = async (model: string) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction: sys, temperature: 0.4 },
    });
    if (!res.text) throw new Error("Respons Gemini kosong");
    return res.text.trim();
  };

  try {
    return await run(MODEL_UTAMA);
  } catch (err) {
    console.warn(
      `[gemini] laporan: fallback ke ${MODEL_FALLBACK}:`,
      (err as Error).message
    );
    return await run(MODEL_FALLBACK);
  }
}
