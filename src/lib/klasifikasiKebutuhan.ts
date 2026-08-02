import { z } from "zod";
import { GoogleGenAI } from "@google/genai";
import { env } from "@/env";

/**
 * AI Klasifikasi Kebutuhan Logistik — backend only.
 *
 * ATURAN NON-NEGOTIABLE (lihat dokumentasi fitur Peta Lintas-Posko):
 *  - AI TIDAK boleh generate nama obat spesifik/dosis/merek.
 *  - AI TIDAK mendiagnosis penyakit — hanya mengategorikan kebutuhan logistik.
 *  - Kategori WAJIB dari enum — output di luar enum DIPAKSA menjadi "lainnya".
 *  - perlu_konfirmasi_medis SELALU true.
 *
 * Model chain (aturan 6): Groq (qwen3.6-27b) -> fallback Gemini 3.5 flash-lite.
 */
export const KATEGORI_DIPERBOLEHKAN = [
  "obat_demam_analgesik",
  "obat_kronis",
  "kebutuhan_bayi",
  "kebutuhan_ibu_hamil",
  "air_bersih",
  "makanan_pokok",
  "selimut_pakaian",
  "tenaga_medis",
  "lainnya",
] as const;
export type KategoriKebutuhan = (typeof KATEGORI_DIPERBOLEHKAN)[number];

const OUTPUT_SCHEMA = z.object({
  kategori: z.string(),
  ringkasan_laporan: z.string(),
  urgensi_awal: z.enum(["HIJAU", "KUNING", "MERAH"]),
  perlu_konfirmasi_medis: z.boolean(),
});

export interface KlasifikasiKebutuhan {
  kategori: KategoriKebutuhan;
  ringkasanLaporan: string;
  urgensi: "HIJAU" | "KUNING" | "MERAH";
  perluKonfirmasiMedis: boolean;
}

const SYSTEM_PROMPT = `Kamu adalah asisten klasifikasi kebutuhan logistik posko pengungsian bencana Indonesia.

TUGAS: Klasifikasikan teks laporan relawan menjadi KATEGORI KEBUTUHAN LOGISTIK UMUM.

ATURAN KETAT (WAJIB DIPATUHI):
- JANGAN PERNAH menyebut nama obat spesifik, dosis, atau merek dagang.
- JANGAN mendiagnosis penyakit apa pun. Kamu hanya mengategorikan kebutuhan logistik, bukan kondisi medis.
- Kategori HARUSS salah satu dari daftar berikut, tidak boleh membuat kategori baru:
  obat_demam_analgesik, obat_kronis, kebutuhan_bayi, kebutuhan_ibu_hamil,
  air_bersih, makanan_pokok, selimut_pakaian, tenaga_medis, lainnya
- Jika tidak yakin kategori mana yang cocok, gunakan "lainnya".
- perlu_konfirmasi_medis SELALU true, tanpa terkecuali.
- Kembalikan HANYA JSON valid, tidak ada teks lain, tidak ada markdown.

FORMAT OUTPUT WAJIB:
{
  "kategori": string,
  "ringkasan_laporan": string (ringkas apa adanya, tanpa interpretasi medis),
  "urgensi_awal": "HIJAU" | "KUNING" | "MERAH",
  "perlu_konfirmasi_medis": true
}`;

function enforce(raw: string): KategoriKebutuhan {
  const v = raw.toLowerCase().replace(/\s+/g, "_");
  return KATEGORI_DIPERBOLEHKAN.includes(v as KategoriKebutuhan)
    ? (v as KategoriKebutuhan)
    : "lainnya";
}

// ── Groq (Qwen 3.6-27b) ─────────────────────────────────
async function callGroq(teks: string): Promise<Record<string, unknown>> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "qwen/qwen3.6-27b",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `TEKS LAPORAN RELAWAN:\n${teks}` },
      ],
      temperature: 0.1,
      max_completion_tokens: 512,
      stream: false,
    }),
  });
  if (!res.ok) {
    throw new Error(`Groq API error ${res.status}`);
  }
  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Respons Groq kosong");
  return parseJson(content);
}

// ── Gemini 3.5 flash-lite (fallback) ───────────────────
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
async function callGeminiLite(teks: string): Promise<Record<string, unknown>> {
  const res = await ai.models.generateContent({
    model: "gemini-3.5-flash-lite",
    contents: `TEKS LAPORAN RELAWAN:\n${teks}`,
    config: { systemInstruction: SYSTEM_PROMPT, temperature: 0.1 },
  });
  if (!res.text) throw new Error("Respons Gemini kosong");
  return parseJson(res.text);
}

function parseJson(text: string): Record<string, unknown> {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("Tidak menemukan JSON dalam respons");
  return JSON.parse(match[0]);
}

/**
 * Klasifikasikan laporan kebutuhan. Nilai kategori di luar enum dipaksa
 * menjadi "lainnya" SEBELUM dikembalikan (backend memegang kendali).
 */
export async function klasifikasiKebutuhan(teks: string): Promise<KlasifikasiKebutuhan> {
  let raw: Record<string, unknown>;
  try {
    raw = await callGroq(teks);
  } catch (err) {
    console.warn("[klasifikasi] Groq gagal, fallback Gemini:", (err as Error).message);
    raw = await callGeminiLite(teks);
  }

  const parsed = OUTPUT_SCHEMA.safeParse(raw);
  if (!parsed.success) {
    throw new Error("Output AI klasifikasi tidak valid: " + parsed.error.message);
  }

  return {
    kategori: enforce(parsed.data.kategori), // backend memaksa ke enum
    ringkasanLaporan: parsed.data.ringkasan_laporan,
    urgensi: parsed.data.urgensi_awal,
    perluKonfirmasiMedis: true, // SELALU true
  };
}