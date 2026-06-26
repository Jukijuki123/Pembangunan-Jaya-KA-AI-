import type { ProfilKerentanan, AnggotaKeluarga } from "@/lib/types";
import { fuzzyMatchKondisi } from "@/lib/synonyms";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL ?? "https://daffaadityp-prana.hf.space";

interface GlinerEntity {
  label: string;
  text: string;
  confidence: number;
}

interface GlinerResponse {
  entities: GlinerEntity[];
  latency_ms: number;
}

/**
 * Memanggil FastAPI GLiNER (Zero-Shot NER) yang di-hosting di Hugging Face Spaces
 */
export async function runZeroShotExtraction(teks: string): Promise<{
  profil: Partial<ProfilKerentanan>;
  fieldConfidence: Record<string, number>;
  rawEntities: GlinerEntity[];
}> {
  try {
    const res = await fetch(`${ML_SERVICE_URL}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teks }),
      // Toleransi timeout agak besar karena ini cloud service gratisan
      signal: AbortSignal.timeout(15000), 
    });

    if (!res.ok) {
      throw new Error(`ML service error: ${res.status}`);
    }

    const data = (await res.json()) as GlinerResponse;
    const entities = data.entities;

    const profil: Partial<ProfilKerentanan> = {
      kondisiMedisKritis: [],
      anggotaKeluarga: [],
    };
    const fieldConfidence: Record<string, number> = {};

    for (const ent of entities) {
      const label = ent.label.toLowerCase();
      
      if (label === "nama") {
        if (!profil.namaKK || ent.confidence > (fieldConfidence.namaKK || 0)) {
          profil.namaKK = ent.text;
          fieldConfidence.namaKK = ent.confidence;
        }
      } 
      else if (label === "usia") {
        const usiaMatch = ent.text.match(/\d+/);
        if (usiaMatch) {
          profil.usiaKK = parseInt(usiaMatch[0], 10);
          fieldConfidence.usiaKK = ent.confidence;
        }
      }
      else if (label === "kondisi medis") {
        const normalized = fuzzyMatchKondisi(ent.text) || ent.text;
        if (!profil.kondisiMedisKritis!.includes(normalized)) {
          profil.kondisiMedisKritis!.push(normalized);
        }
        fieldConfidence.kondisiMedisKritis = Math.max(fieldConfidence.kondisiMedisKritis || 0, ent.confidence);
      }
      else if (label === "anggota keluarga") {
        const match = ent.text.match(/([a-zA-Z]+)(?:\s+(\d+)\s*(?:tahun|th|bulan|bln))?/i);
        if (match) {
          const relasi = match[1].toLowerCase();
          const umur = match[2] ? parseInt(match[2], 10) : null;
          profil.anggotaKeluarga!.push({ hubungan: relasi, usia: umur, kondisiKhusus: null });
          fieldConfidence.anggotaKeluarga = Math.max(fieldConfidence.anggotaKeluarga || 0, ent.confidence);
        }
      }
      else if (label === "asal lokasi") {
        if (!profil.asalLokasi || ent.confidence > (fieldConfidence.asalLokasi || 0)) {
          profil.asalLokasi = ent.text;
          fieldConfidence.asalLokasi = ent.confidence;
        }
      }
      else if (label === "keterbatasan mobilitas") {
        profil.mobilitas = ent.text.toLowerCase().includes("mandiri") ? "mandiri" : "bantuan";
        fieldConfidence.mobilitas = ent.confidence;
      }
      else if (label === "ketiadaan obat") {
        profil.obatTersedia = false;
        fieldConfidence.obatTersedia = ent.confidence;
      }
    }

    return {
      profil,
      fieldConfidence,
      rawEntities: entities,
    };
  } catch (err) {
    console.error("Gliner Extraction Error:", err);
    throw err;
  }
}
