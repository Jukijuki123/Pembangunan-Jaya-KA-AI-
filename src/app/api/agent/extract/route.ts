import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { ekstrakProfil } from "@/lib/gemini";
import { hitungSkor } from "@/lib/scoring";
import { runZeroShotExtraction } from "@/lib/gliner";
import type { ProfilKerentanan, ProvenanceMap } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  teks: z.string().min(3, "Teks terlalu pendek").max(4000),
  mode: z.enum(["auto", "deberta", "llm"]).default("auto"),
});

function createFullProvenance(
  profil: Partial<ProfilKerentanan>,
  source: "neural",
  sourceDetail: string,
  baseConfidence: number,
  fieldConfidenceOverrides?: Record<string, number>
): ProvenanceMap {
  const prov: any = {};
  const fields = ["namaKK", "usiaKK", "anggotaKeluarga", "kondisiMedisKritis", "obatTersedia", "mobilitas", "asalLokasi", "instansiRujukan"];
  
  for (const f of fields) {
    prov[f] = {
      value: (profil as any)[f] || null,
      source,
      sourceDetail,
      confidence: fieldConfidenceOverrides?.[f] ?? baseConfidence,
    };
  }
  return prov as ProvenanceMap;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ ok: false, error: "Tidak terautentikasi" }, { status: 401 });
    }

    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.issues[0]?.message ?? "Input tidak valid" }, { status: 400 });
    }

    const { teks, mode } = parsed.data;

    let finalProfil: Partial<ProfilKerentanan> = {};
    let finalProvenance: ProvenanceMap | null = null;
    let uncertainFields: string[] = [];

    if (mode === "llm" || mode === "auto") {
      // MODE 1 & 3: LLM Murni (Gemini/Groq)
      const neural = await ekstrakProfil(teks);
      finalProfil = { ...neural, agentThought: "LLM: Ekstraksi komprehensif menggunakan kecerdasan LLM murni." };
      finalProvenance = createFullProvenance(finalProfil, "neural", "llm-gemini", 0.95);
    } 
    else if (mode === "deberta") {
      // MODE 2: DeBERTa v3 murni (GLiNER)
      const glinerResult = await runZeroShotExtraction(teks);
      finalProfil = { ...glinerResult.profil, agentThought: "DeBERTa v3: Zero-Shot NER dieksekusi dengan sangat cepat via Hugging Face Spaces." };
      finalProvenance = createFullProvenance(finalProfil, "neural", "gliner-onnx", 0.8, glinerResult.fieldConfidence);
      uncertainFields = Object.keys(glinerResult.fieldConfidence).filter(k => glinerResult.fieldConfidence[k] < 0.7);
    }

    finalProfil.provenance = finalProvenance;
    
    // Pastikan array tidak undefined
    if (!finalProfil.kondisiMedisKritis) finalProfil.kondisiMedisKritis = [];
    if (!finalProfil.anggotaKeluarga) finalProfil.anggotaKeluarga = [];
    
    const skor = hitungSkor(finalProfil as ProfilKerentanan);

    return NextResponse.json({
      ok: true,
      profil: finalProfil,
      skor,
      isBypassed: false, // AI selalu dipakai karena PRANA sudah dihapus
      consistencyWarnings: [], // Dihapus bersama PRANA
      ensembleAgreement: mode === "deberta" ? 0.7 : 0.95,
      uncertainFields,
    });
  } catch (err) {
    console.error("[/api/agent/extract] error:", err);
    return NextResponse.json(
      { ok: false, error: "Gagal memproses dengan AI. Coba lagi, atau isi data manual di Kartu Konfirmasi." },
      { status: 500 }
    );
  }
}
