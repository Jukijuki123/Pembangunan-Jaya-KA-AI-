"""
03_inference_pipeline.py
==========================
Memuat model NER hasil fine-tuning (folder model_ner/) dan mengubah teks
bebas relawan jadi JSON terstruktur -- pengganti langsung Prompt 1 (LLM)
di rencana awal, sekarang 100% lokal/offline.

Field output JSON dibuat SAMA dengan rencana awal (lihat dokumen 3.4)
supaya rule engine skor & routing (file 04) tidak perlu diubah:
  nama_kk, usia_kk, anggota_keluarga, kondisi_medis_kritis,
  obat_tersedia, mobilitas, asal_lokasi

CARA PAKAI:
  from inference_pipeline import ekstrak_profil
  hasil = ekstrak_profil("Bu Siti, 67 tahun, diabetes, ...")
"""

import re
from transformers import pipeline, AutoTokenizer, AutoModelForTokenClassification

MODEL_DIR = "model_ner"

_ner_pipeline = None


def _load_pipeline():
    global _ner_pipeline
    if _ner_pipeline is None:
        tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR)
        model = AutoModelForTokenClassification.from_pretrained(MODEL_DIR)
        _ner_pipeline = pipeline(
            "token-classification",
            model=model,
            tokenizer=tokenizer,
            aggregation_strategy="simple",  # otomatis gabungkan B-/I- jadi satu span
        )
    return _ner_pipeline


# ---------------------------------------------------------------------------
# Helper: ubah teks usia ("8 bulan", "67 tahun") -> angka tahun (0.67 utk bayi
# 8 bulan, 67.0 utk lansia). Ini logika RULE BASED, bukan ML -- transparan
# dan mudah diaudit, sesuai prinsip Responsible AI di proposal kalian.
# ---------------------------------------------------------------------------

def parse_usia_ke_tahun(teks_usia):
    teks_usia = teks_usia.lower()
    m_bulan = re.search(r"(\d+)\s*bulan", teks_usia)
    if m_bulan:
        return round(int(m_bulan.group(1)) / 12, 2)
    m_tahun = re.search(r"(\d+)\s*tahun", teks_usia)
    if m_tahun:
        return float(m_tahun.group(1))
    m_angka = re.search(r"(\d+)", teks_usia)
    if m_angka:
        return float(m_angka.group(1))
    return None


def parse_tanggungan(teks_tanggungan):
    """'cucu 8 bulan' -> {'hubungan': 'cucu', 'usia': 0.67}"""
    parts = teks_tanggungan.split(maxsplit=1)
    hubungan = parts[0] if parts else None
    usia = parse_usia_ke_tahun(teks_tanggungan) if len(parts) > 1 else None
    return {"hubungan": hubungan, "usia": usia}


def ekstrak_profil(teks_input):
    """
    Input: teks bebas Bahasa Indonesia dari relawan.
    Output: dict JSON terstruktur, field sama dengan rencana awal (3.4).
    """
    ner = _load_pipeline()
    entities = ner(teks_input)

    profil = {
        "nama_kk": None,
        "usia_kk": None,
        "anggota_keluarga": [],
        "kondisi_medis_kritis": [],
        "obat_tersedia": None,
        "mobilitas": "mandiri",
        "asal_lokasi": None,
        "_entitas_mentah": [],  # disimpan untuk keperluan audit/debug oleh relawan
    }

    for ent in entities:
        label = ent["entity_group"]
        text = ent["word"].strip()
        profil["_entitas_mentah"].append(
            {"label": label, "teks": text, "skor_confidence": round(float(ent["score"]), 3)}
        )

        if label == "PER" and profil["nama_kk"] is None:
            profil["nama_kk"] = text
        elif label == "USIA" and profil["usia_kk"] is None:
            profil["usia_kk"] = parse_usia_ke_tahun(text)
        elif label == "KONDISI":
            profil["kondisi_medis_kritis"].append(text)
        elif label == "TANGGUNGAN":
            profil["anggota_keluarga"].append(parse_tanggungan(text))
        elif label == "NEG_OBAT":
            profil["obat_tersedia"] = False
        elif label == "MOBILITAS":
            profil["mobilitas"] = (
                "bantuan" if "kursi" in text.lower() or "tongkat" in text.lower() else "tidak_bisa"
            )
        elif label == "LOKASI":
            profil["asal_lokasi"] = text

    # Jika tidak ada sinyal NEG_OBAT terdeteksi, tetap None (bukan otomatis True)
    # -- relawan WAJIB konfirmasi manual, sesuai prinsip human-in-the-loop kalian.

    return profil


if __name__ == "__main__":
    contoh = [
        "Bu Siti, 67 tahun, diabetes, tinggal sendiri, bawa cucu 8 bulan, "
        "rumahnya habis kena longsor, tidak bawa obat sama sekali.",
        "Pak Ahmad 72 tahun, mantan pasien stroke, datang sama istri 68 tahun, "
        "bawa cucu 3 bulan. Rumah di Kampung Cikaret tenggelam. "
        "Tidak bawa obat pengencer darah.",
    ]
    for teks in contoh:
        print("INPUT :", teks)
        print("OUTPUT:", ekstrak_profil(teks))
        print()
