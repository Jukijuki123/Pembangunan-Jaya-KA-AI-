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
 * Fallback chain:
 *   1. gemini-2.5-flash (Google)
 *   2. gemini-2.5-flash-lite (Google)
 *   3. qwen/qwen3.6-27b via Groq API (saat Gemini 503 / high demand)
 */
const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

const MODEL_UTAMA = "gemini-2.5-flash";
const MODEL_FALLBACK = "gemini-2.5-flash-lite";
const GROQ_MODEL = "qwen/qwen3.6-27b";

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
    "",
    "SKEMA JSON yang WAJIB dikembalikan:",
    JSON.stringify({
      agent_thought: "string",
      nama_kk: "string|null",
      usia_kk: "number|null",
      anggota_keluarga: [{ hubungan: "string", usia: "number|null", kondisi_khusus: "string|null" }],
      kondisi_medis_kritis: ["string"],
      obat_tersedia: "boolean|null",
      mobilitas: "mandiri|bantuan|tidak_bisa|null",
      asal_lokasi: "string|null",
      instansi_rujukan_sementara: "DINAS_KESEHATAN|DINAS_SOSIAL|BPBD",
    }),
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

async function callGemini(model: string, teks: string): Promise<string> {
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
 * Strip <think>...</think> tags dari respons model yang memiliki
 * fitur "thinking" bawaan (e.g. Qwen via Groq).
 * Tag dan isinya dihapus di server-side sehingga client tidak pernah melihatnya.
 */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

/**
 * Fallback ke Groq API (qwen/qwen3.6-27b) saat Gemini tidak tersedia.
 * Response berupa OpenAI-compatible chat completion.
 */
async function callGroq(teks: string): Promise<string> {
  const apiKey = env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY tidak dikonfigurasi");

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        { role: "system", content: buildSystemInstruction() },
        { role: "user", content: `TEKS RELAWAN:\n"""${teks}"""` },
      ],
      temperature: 0.1,
      max_completion_tokens: 4096,
      top_p: 0.95,
      stream: false,
      reasoning_effort: "default",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text().catch(() => "unknown error");
    throw new Error(`Groq API error ${res.status}: ${errBody}`);
  }

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error("Respons Groq kosong");

  // Strip <think>...</think> tags dari respons Qwen (server-side only)
  const cleaned = stripThinkTags(content);
  return cleaned;
}

/**
 * Ekstrak teks bebas -> ProfilKerentanan tervalidasi.
 * Fallback chain: Gemini utama -> Gemini lite -> Groq (Qwen).
 * Memvalidasi dengan Zod (jaminan bentuk).
 */
export async function ekstrakProfil(teks: string): Promise<ProfilKerentanan> {
  let raw: string;
  try {
    raw = await callGemini(MODEL_UTAMA, teks);
  } catch (err) {
    console.warn(
      `[gemini] model utama gagal, fallback ke ${MODEL_FALLBACK}:`,
      (err as Error).message
    );
    try {
      raw = await callGemini(MODEL_FALLBACK, teks);
    } catch (err2) {
      // Kedua model Gemini gagal -> fallback ke Groq
      console.warn(
        `[gemini] fallback juga gagal, beralih ke Groq (${GROQ_MODEL}):`,
        (err2 as Error).message
      );
      raw = await callGroq(teks);
    }
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

  // Gemini attempt
  const runGemini = async (model: string) => {
    const res = await ai.models.generateContent({
      model,
      contents: prompt,
      config: { systemInstruction: sys, temperature: 0.4 },
    });
    if (!res.text) throw new Error("Respons Gemini kosong");
    return res.text.trim();
  };

  // Groq attempt
  const runGroq = async () => {
    const apiKey = env.GROQ_API_KEY;
    if (!apiKey) throw new Error("GROQ_API_KEY tidak dikonfigurasi");

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: sys },
          { role: "user", content: prompt },
        ],
        temperature: 0.4,
        max_completion_tokens: 2048,
        stream: false,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "unknown");
      throw new Error(`Groq API error ${res.status}: ${errBody}`);
    }

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) throw new Error("Respons Groq kosong");
    return stripThinkTags(content);
  };

  try {
    return await runGemini(MODEL_UTAMA);
  } catch (err) {
    console.warn(
      `[gemini] laporan: fallback ke ${MODEL_FALLBACK}:`,
      (err as Error).message
    );
    try {
      return await runGemini(MODEL_FALLBACK);
    } catch (err2) {
      console.warn(
        `[gemini] laporan: fallback Groq (${GROQ_MODEL}):`,
        (err2 as Error).message
      );
      return await runGroq();
    }
  }
}
