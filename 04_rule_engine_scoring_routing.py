"""
04_rule_engine_scoring_routing.py
====================================
Mesin skor kerentanan + routing card -- 100% deterministik, TANPA LLM
Diupgrade dengan:
- Confidence-weighted scoring (Layer 5 & 6)
- Uncertainty propagation
"""

BOBOT = {
    "usia_lansia": 2,          
    "per_kondisi_medis": 3,    
    "balita_bawah_1th": 3,     
    "obat_kritis_absen": 4,    
    "difabel_mobilitas": 2,    
}

BATAS_MERAH = 9
BATAS_KUNING = 5

def hitung_skor(profil, field_confidence=None, sumber_daya_posko=None):
    skor = 0
    alasan = []
    
    if field_confidence is None:
        field_confidence = profil.get('_field_confidence', {})

    def get_conf_multiplier(field_name):
        # Jika confidence rendah (< 0.7), bobot dikurangi setengah
        conf = field_confidence.get(field_name, {}).get('confidence', 1.0)
        return 0.5 if conf < 0.7 else 1.0

    usia_kk = profil.get("usia_kk")
    if usia_kk is not None and usia_kk > 60:
        mult = get_conf_multiplier("usia_kk")
        skor += BOBOT["usia_lansia"] * mult
        if mult < 1.0:
            alasan.append(f"Kepala keluarga lansia ({usia_kk:.0f} tahun) [⚠ Low Confidence]")
        else:
            alasan.append(f"Kepala keluarga lansia ({usia_kk:.0f} tahun)")

    kondisi_kritis = profil.get("kondisi_medis_kritis") or []
    n_kondisi = len(kondisi_kritis)
    if n_kondisi:
        mult = get_conf_multiplier("kondisi_medis_kritis")
        skor += (BOBOT["per_kondisi_medis"] * n_kondisi) * mult
        if mult < 1.0:
            alasan.append(f"{n_kondisi} kondisi medis kritis: {', '.join(kondisi_kritis)} [⚠ Low Confidence]")
        else:
            alasan.append(f"{n_kondisi} kondisi medis kritis: {', '.join(kondisi_kritis)}")

    for anggota in (profil.get("anggota_keluarga") or []):
        usia = anggota.get("usia")
        if usia is not None and usia < 1:
            mult = get_conf_multiplier("anggota_keluarga")
            skor += BOBOT["balita_bawah_1th"] * mult
            alasan.append(f"Ada {anggota.get('hubungan', 'tanggungan')} balita di bawah 1 tahun" + (" [⚠ Low Conf]" if mult < 1.0 else ""))
            break 

    if profil.get("obat_tersedia") is False:
        mult = get_conf_multiplier("obat_tersedia")
        skor += BOBOT["obat_kritis_absen"] * mult
        alasan.append("Tidak ada obat kritis tersedia" + (" [⚠ Low Conf]" if mult < 1.0 else ""))

    if profil.get("mobilitas") not in (None, "mandiri"):
        mult = get_conf_multiplier("mobilitas")
        skor += BOBOT["difabel_mobilitas"] * mult
        alasan.append(f"Keterbatasan mobilitas ({profil.get('mobilitas')})" + (" [⚠ Low Conf]" if mult < 1.0 else ""))

    if skor >= BATAS_MERAH:
        level = "MERAH"
    elif skor >= BATAS_KUNING:
        level = "KUNING"
    else:
        level = "HIJAU"

    # Overall confidence assessment
    needs_verif = profil.get('_needs_verification', [])
    avg_conf = np_mean_safe([v.get('confidence', 1.0) for v in field_confidence.values()]) if field_confidence else 1.0
    
    if len(needs_verif) > 1 or avg_conf < 0.7:
        recommendation = "low_confidence"
    elif len(needs_verif) == 1 or avg_conf < 0.85:
        recommendation = "needs_review"
    else:
        recommendation = "high_confidence"

    return {
        "skor_kerentanan": skor,
        "level_prioritas": level,
        "alasan": alasan if alasan else ["Tidak ditemukan faktor risiko signifikan dari data yang tersedia"],
        "perlu_konfirmasi_medis": level == "MERAH" or recommendation == "low_confidence",
        "confidence_assessment": {
            "overall": float(avg_conf),
            "uncertain_fields": needs_verif,
            "recommendation": recommendation
        }
    }

def np_mean_safe(lst):
    return sum(lst) / len(lst) if lst else 1.0

# --- ROUTING TEMPLATE ---

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
        "confidence_assessment": hasil_skor.get("confidence_assessment")
    }

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
        "_field_confidence": {
            "usia_kk": {"confidence": 0.5},
            "kondisi_medis_kritis": {"confidence": 0.9}
        },
        "_needs_verification": ["usia_kk"]
    }
    hasil_skor = hitung_skor(profil_contoh)
    routing = buat_routing_card(profil_contoh, hasil_skor, {})
    
    print("=== HASIL SKOR ===")
    print(json.dumps(hasil_skor, indent=2, ensure_ascii=False))
    print("\n=== ROUTING CARD ===")
    print(json.dumps(routing, indent=2, ensure_ascii=False))
