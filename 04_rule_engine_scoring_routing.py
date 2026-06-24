"""
04_rule_engine_scoring_routing.py
====================================
Mesin skor kerentanan + routing card -- 100% deterministik, TANPA LLM
dan TANPA model ML/DL sama sekali. Murni rule engine berbasis kode.

Ini menggantikan bagian skor di Prompt 2 (LLM) pada rencana awal kalian.
Justru ini SESUAI dengan prinsip Responsible AI yang sudah ditulis di
proposal kalian sendiri (3.6): "Skor dihitung oleh rule engine
deterministik, bukan langsung oleh LLM -- LLM hanya mengekstrak teks,
skor dihitung oleh kode yang dapat diaudit."

INPUT : profil JSON hasil ekstraksi (dari 03_inference_pipeline.py ATAU
        dari LLM kalau LLM masih dipakai sebagai fallback)
OUTPUT: skor, level prioritas (MERAH/KUNING/HIJAU), dan routing card

Tidak butuh dependency eksternal -- pure Python, bisa jalan di mana saja.
"""

# ---------------------------------------------------------------------------
# 1. BOBOT SKOR (sesuai dokumen 3.4 Prompt 2 kalian, hanya dipindah ke kode)
# ---------------------------------------------------------------------------

BOBOT = {
    "usia_lansia": 2,          # usia > 60 tahun
    "per_kondisi_medis": 3,    # per kondisi medis kritis yang terdeteksi
    "balita_bawah_1th": 3,     # ada tanggungan usia < 1 tahun
    "obat_kritis_absen": 4,    # obat_tersedia == False
    "difabel_mobilitas": 2,    # mobilitas != 'mandiri'
}

BATAS_MERAH = 9
BATAS_KUNING = 5


def hitung_skor(profil, sumber_daya_posko=None):
    """
    profil: dict dengan field nama_kk, usia_kk, anggota_keluarga,
            kondisi_medis_kritis, obat_tersedia, mobilitas
    """
    skor = 0
    alasan = []

    usia_kk = profil.get("usia_kk")
    if usia_kk is not None and usia_kk > 60:
        skor += BOBOT["usia_lansia"]
        alasan.append(f"Kepala keluarga lansia ({usia_kk:.0f} tahun)")

    n_kondisi = len(profil.get("kondisi_medis_kritis") or [])
    if n_kondisi:
        skor += BOBOT["per_kondisi_medis"] * n_kondisi
        alasan.append(f"{n_kondisi} kondisi medis kritis: {', '.join(profil['kondisi_medis_kritis'])}")

    for anggota in profil.get("anggota_keluarga") or []:
        usia = anggota.get("usia")
        if usia is not None and usia < 1:
            skor += BOBOT["balita_bawah_1th"]
            alasan.append(f"Ada {anggota.get('hubungan', 'tanggungan')} balita di bawah 1 tahun")
            break  # hitung sekali saja walau ada lebih dari satu balita

    if profil.get("obat_tersedia") is False:
        skor += BOBOT["obat_kritis_absen"]
        alasan.append("Tidak ada obat kritis tersedia")

    if profil.get("mobilitas") not in (None, "mandiri"):
        skor += BOBOT["difabel_mobilitas"]
        alasan.append(f"Keterbatasan mobilitas ({profil.get('mobilitas')})")

    if skor >= BATAS_MERAH:
        level = "MERAH"
    elif skor >= BATAS_KUNING:
        level = "KUNING"
    else:
        level = "HIJAU"

    return {
        "skor_kerentanan": skor,
        "level_prioritas": level,
        "alasan": alasan if alasan else ["Tidak ditemukan faktor risiko signifikan dari data yang tersedia"],
        "perlu_konfirmasi_medis": level == "MERAH",
    }


# ---------------------------------------------------------------------------
# 2. ROUTING TEMPLATE — lookup table, bukan generative text.
#    Setiap baris: (kondisi_pemicu, fungsi_cek, template_aksi)
#    Mudah ditambah tanpa sentuh kode lain -> mudah dikembangkan tim lain.
# ---------------------------------------------------------------------------

def _ada_balita(profil):
    return any((a.get("usia") or 99) < 1 for a in (profil.get("anggota_keluarga") or []))


def _ada_lansia_tanggungan(profil):
    return any((a.get("usia") or 0) >= 60 for a in (profil.get("anggota_keluarga") or []))


def _ada_ibu_hamil_dalam_teks(profil):
    teks = " ".join(profil.get("kondisi_medis_kritis") or []).lower()
    return "hamil" in teks


ATURAN_ROUTING = [
    {
        "cek": lambda p: p.get("obat_tersedia") is False and (p.get("kondisi_medis_kritis")),
        "aksi": "Tenda Medis",
        "alasan": "Butuh obat pengganti/monitoring kondisi kronis secepatnya",
        "kunci_sumber_daya": "tenda_medis",
    },
    {
        "cek": _ada_balita,
        "aksi": "Area Bayi/Balita",
        "alasan": "Ada tanggungan balita di bawah 1 tahun, butuh susu formula & pemantauan gizi",
        "kunci_sumber_daya": "susu_formula",
    },
    {
        "cek": _ada_ibu_hamil_dalam_teks,
        "aksi": "Area Ibu Hamil / Konsultasi Bidan",
        "alasan": "Terindikasi kondisi kehamilan, prioritas tempat istirahat & tenaga kesehatan",
        "kunci_sumber_daya": "area_ibu_hamil",
    },
    {
        "cek": lambda p: p.get("mobilitas") not in (None, "mandiri"),
        "aksi": "Area Akses Mudah / Kursi Roda",
        "alasan": "Keterbatasan mobilitas, hindari penempatan jauh dari akses utama",
        "kunci_sumber_daya": "kursi_roda",
    },
    {
        "cek": _ada_lansia_tanggungan,
        "aksi": "Jangan Dipisah dari Keluarga",
        "alasan": "Ada anggota keluarga lansia, hindari memisahkan lokasi tidur",
        "kunci_sumber_daya": None,
    },
]


def buat_routing_card(profil, hasil_skor, sumber_daya_posko=None):
    sumber_daya_posko = sumber_daya_posko or {}
    tindakan = []
    for aturan in ATURAN_ROUTING:
        if aturan["cek"](profil):
            kunci = aturan["kunci_sumber_daya"]
            tersedia = sumber_daya_posko.get(kunci, None) if kunci else None
            tindakan.append({
                "aksi": aturan["aksi"],
                "alasan": aturan["alasan"],
                "tersedia_di_posko": tersedia,
            })

    if not tindakan:
        tindakan.append({
            "aksi": "Antrean Umum",
            "alasan": "Tidak ditemukan kebutuhan khusus dari data saat ini",
            "tersedia_di_posko": None,
        })

    for i, t in enumerate(tindakan, start=1):
        t["prioritas"] = i

    return {
        "nama_kk": profil.get("nama_kk"),
        "level_prioritas": hasil_skor["level_prioritas"],
        "tindakan_segera": tindakan,
        "catatan_relawan": "; ".join(hasil_skor["alasan"]),
    }


# ---------------------------------------------------------------------------
# 3. CONTOH PAKAI (langsung bisa dijalankan: python 04_rule_engine_scoring_routing.py)
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import json

    profil_contoh = {
        "nama_kk": "Bu Siti",
        "usia_kk": 67,
        "anggota_keluarga": [{"hubungan": "cucu", "usia": 0.67}],
        "kondisi_medis_kritis": ["diabetes"],
        "obat_tersedia": False,
        "mobilitas": "mandiri",
        "asal_lokasi": "Kampung Cikaret",
    }

    sumber_daya_posko = {
        "tenda_medis": True,
        "susu_formula": True,
        "area_ibu_hamil": True,
        "kursi_roda": False,
    }

    hasil_skor = hitung_skor(profil_contoh)
    routing = buat_routing_card(profil_contoh, hasil_skor, sumber_daya_posko)

    print("=== HASIL SKOR ===")
    print(json.dumps(hasil_skor, indent=2, ensure_ascii=False))
    print("\n=== ROUTING CARD ===")
    print(json.dumps(routing, indent=2, ensure_ascii=False))
