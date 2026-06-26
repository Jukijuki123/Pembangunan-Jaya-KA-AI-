"""
01_generate_synthetic_data.py
==============================
Generator dataset sintetis untuk fine-tuning NER (Named Entity Recognition)
khusus domain intake pengungsi bencana PMI (Palang Merah Indonesia).

SIGAP AI — Disaster Relief Refugee Triage System
LKS Nasional AI 2026 Competition

IDE UTAMA:
Kalimat dibangun dari template dengan slot yang dikontrol secara programatik,
sehingga label BIO (Beginning-Inside-Outside) dibuat otomatis saat generate,
tanpa perlu anotasi manual. Dataset dirancang adversarial: typo, sinonim,
noise word, bahasa daerah, urutan klausa acak, dan hard negatives.

ENTITAS YANG DIDETEKSI (tag set — BIO scheme):
  PER          -> nama kepala keluarga
  USIA         -> usia kepala keluarga (angka + kata satuan)
  KONDISI      -> kondisi medis kritis (termasuk sinonim lokal/awam/daerah)
  TANGGUNGAN   -> frasa anggota keluarga rentan, mis. "cucu 8 bulan"
  NEG_OBAT     -> frasa yang menyatakan TIDAK ada obat / tidak bawa obat
  LOKASI       -> asal lokasi / desa / kampung
  MOBILITAS    -> frasa yang menunjukkan keterbatasan gerak

FITUR ADVERSARIAL:
  - inject_typo: swap, drop, repeat karakter
  - synonym_rotate: ganti istilah medis dengan sinonim
  - shuffle_clauses: acak urutan klausa
  - inject_noise_words: sisipkan filler (eh, hmm, gimana ya)
  - bahasa_daerah_mix: campur kata bahasa daerah

CURRICULUM DIFFICULTY:
  easy   -> template bersih, lengkap, tanpa augmentasi
  medium -> beberapa field kosong, reorder klausa
  hard   -> typo, noise, missing fields, bahasa daerah

OUTPUT:
  data/train.jsonl, data/val.jsonl, data/test.jsonl
  Setiap baris: {"tokens": [...], "tags": [...], "difficulty": "easy|medium|hard"}

CARA PAKAI:
  python 01_generate_synthetic_data.py --n_train 5000 --n_val 500 --n_test 300 --out_dir data
"""

from __future__ import annotations

import argparse
import copy
import json
import os
import random
import string
from collections import Counter
from typing import Any, Dict, List, Optional, Tuple

random.seed(42)

# ============================================================================
# 1. KOSAKATA / VOCABULARY — Massively Expanded
# ============================================================================

# ---------------------------------------------------------------------------
# 1a. NAMA KEPALA KELUARGA (60+ entries)
#     Dengan & tanpa honorifik, nama tunggal, panjang, multi-etnis
# ---------------------------------------------------------------------------
NAMA_LIST: List[str] = [
    # === Dengan honorifik ===
    "Bu Siti", "Pak Ahmad", "Bu Rina", "Pak Slamet", "Bu Maemunah",
    "Pak Wayan", "Bu Aminah", "Pak Hendra", "Bu Yuli", "Pak Dedi",
    "Bu Tuti", "Pak Joko", "Bu Halimah", "Pak Bambang", "Bu Sri Wahyuni",
    "Pak Sutarjo", "Bu Lastri", "Pak Karto", "Bu Marni", "Pak Wagiman",
    "Bu Nur", "Pak Asep", "Bapak Sukirman", "Ibu Darmi", "Bapak Rudi Hartono",
    "Ibu Suparni", "Sdr Andi", "Sdr Budi Santoso", "Hj Fatimah", "H Mansur",
    "Ibu Kartini", "Bapak Suroto", "Bu Ngatinem", "Pak Parjo",
    "Ibu Sumiyati", "Bapak Teguh Prasetyo",
    # === Tanpa honorifik (langsung nama) ===
    "Slamet Riyadi", "Aminah", "Sudirman", "Ratna Sari", "Kusuma",
    "Dewi Lestari", "Supriadi", "Nurhaliza", "Bambang Sudrajat",
    # === Nama tunggal ===
    "Sutarjo", "Wagiman", "Suminah", "Ponimin", "Tuminem", "Painem",
    "Suparman", "Ngatiyem", "Karjo", "Ginem", "Mbok Darmo",
    # === Nama panjang ===
    "Sri Wahyuni Rahayu", "Muhammad Rizki Pratama", "Siti Aisyah Maharani",
    "Abdul Karim Harahap", "Ni Ketut Ayu Laksmi", "Dwi Cahyo Nugroho",
    # === Regional: Jawa ===
    "Pak Suryanto", "Bu Ngadinem", "Mbah Kromodiharjo",
    # === Regional: Sunda ===
    "Pak Ujang Suryana", "Bu Eneng Sukaesih", "Kang Asep Hidayat",
    # === Regional: Bali ===
    "Pak Wayan Sudirja", "Bu Ni Made Sukerti", "I Nyoman Darma",
    # === Regional: Batak ===
    "Pak Situmorang", "Bu Simanjuntak", "Sdr Manullang",
    "Bapak Hutapea", "Ibu Sihombing",
    # === Regional: Minang ===
    "Pak Datuak Rajo", "Bu Puti Bungsu", "Sdr Chaniago",
    # === Regional: Bugis ===
    "Pak Andi Mappanyukki", "Bu Tenri Abeng", "Daeng Mattola",
]

# ---------------------------------------------------------------------------
# 1b. USIA KEPALA KELUARGA
# ---------------------------------------------------------------------------
USIA_KK_TEMPLATES: List[str] = [
    "{n} tahun", "umur {n} tahun", "usianya {n} tahun",
    "usia {n} thn", "{n} th", "umur {n}", "usia {n}",
]
USIA_KK_NUM: List[int] = list(range(17, 90))

# ---------------------------------------------------------------------------
# 1c. KONDISI MEDIS (55+ entries, multi-kategori)
# ---------------------------------------------------------------------------
KONDISI_MEDIS: List[str] = [
    # Standard medical
    "diabetes", "hipertensi", "stroke", "asma", "TBC", "epilepsi",
    "gagal ginjal", "jantung koroner", "sakit jantung", "kanker",
    "pneumonia", "anemia", "osteoporosis", "vertigo", "migrain",
    "riwayat jantung", "gangguan pernapasan",
    # Folk / slang / awam
    "gula", "kencing manis", "darah tinggi", "tensi tinggi", "ayan",
    "sesak", "ampek", "step", "cuci darah", "lumpuh mendadak",
    "sesak napas", "batuk berdarah", "kolesterol tinggi",
    # Skin / tropical
    "demam berdarah", "malaria", "kusta", "kudis", "gatal-gatal parah",
    "chikungunya", "tifus", "demam tinggi",
    # Digestive
    "maag kronis", "usus buntu", "liver", "hepatitis", "diare kronis",
    "radang usus",
    # Reproductive
    "hamil tua", "hamil dengan komplikasi", "tekanan darah tinggi saat hamil",
    "hamil 8 bulan", "hamil risiko tinggi",
    # Mental health
    "gangguan jiwa", "ODGJ", "depresi berat", "skizofrenia", "trauma berat",
    # Disability
    "buta", "tuli", "bisu", "lumpuh", "cacat fisik", "difabel",
    # Typo variants (untuk hard examples)
    "diabtes", "hipertnsi", "asthma", "diabetis", "hipertenzi",
    "epilepci", "tuberkulosiz",
    # Regional: Jawa
    "lara gula", "gerah", "weteng lara",
    # Regional: Sunda
    "nyeri dada", "sesek", "gering",
]

# Sinonim medis: mapping istilah -> daftar sinonimnya
KONDISI_SYNONYMS: Dict[str, List[str]] = {
    "diabetes": ["gula", "kencing manis", "diabtes", "diabetis", "lara gula"],
    "hipertensi": ["darah tinggi", "tensi tinggi", "hipertnsi", "hipertenzi"],
    "stroke": ["lumpuh mendadak"],
    "asma": ["sesak napas", "sesak", "sesek", "ampek", "asthma", "gangguan pernapasan"],
    "epilepsi": ["ayan", "step", "epilepci"],
    "gagal ginjal": ["cuci darah"],
    "TBC": ["batuk berdarah", "tuberkulosiz"],
    "jantung koroner": ["sakit jantung", "riwayat jantung", "nyeri dada"],
    "gangguan jiwa": ["ODGJ", "depresi berat", "skizofrenia"],
}

# ---------------------------------------------------------------------------
# 1d. TANGGUNGAN (relasi keluarga, diperluas)
# ---------------------------------------------------------------------------
TANGGUNGAN_RELASI: List[str] = [
    "anak", "cucu", "istri", "suami", "ibu", "ayah", "adik", "kakak",
    "nenek", "kakek", "mertua", "keponakan", "sepupu", "anak tiri",
    "ibu mertua", "ayah mertua", "menantu", "anak angkat",
    "cucu perempuan", "cucu laki-laki",
]
TANGGUNGAN_USIA_BAYI: List[str] = [f"{n} bulan" for n in range(1, 12)]
TANGGUNGAN_USIA_ANAK: List[str] = [f"{n} tahun" for n in range(1, 18)]
TANGGUNGAN_USIA_LANSIA: List[str] = [f"{n} tahun" for n in range(60, 95)]
TANGGUNGAN_DESCRIPTORS: List[str] = [
    "balita", "bayi", "lansia", "lanjut usia", "masih kecil",
    "belum sekolah", "masih SD", "masih SMP",
]

# ---------------------------------------------------------------------------
# 1e. NEG OBAT (15+ frasa)
# ---------------------------------------------------------------------------
NEG_OBAT_PHRASES: List[str] = [
    "tidak bawa obat sama sekali",
    "tidak bawa obat",
    "tidak ada obat",
    "obatnya ketinggalan di rumah",
    "obat habis tidak sempat bawa",
    "tidak sempat bawa obat",
    "kehabisan obat",
    "obatnya hilang saat evakuasi",
    "obatnya hanyut terbawa banjir",
    "obat terbakar",
    "tidak punya obat",
    "stok obat sudah habis",
    "obatnya tertimbun reruntuhan",
    "lupa bawa obat waktu mengungsi",
    "obat tidak tersedia di posko",
    "butuh obat tapi tidak ada",
]

# ---------------------------------------------------------------------------
# 1f. LOKASI (45+ entries, multi-etnis, prefiks bervariasi)
# ---------------------------------------------------------------------------
LOKASI_LIST: List[str] = [
    # Jawa
    "Kampung Cikaret", "Desa Sukamaju", "Kelurahan Banjarsari",
    "Dusun Margasari", "Desa Sumberejo", "Kampung Margomulyo",
    "Desa Gondanglegi", "Kelurahan Karanganyar", "Dusun Wonosari",
    "Kampung Tegalrejo", "Desa Sidoharjo", "Kelurahan Purwodadi",
    "Dusun Ngaglik", "Kampung Kranggan", "RT 03 RW 07 Sumberagung",
    "Desa Kedungwuni",
    # Sunda
    "Desa Cibadak", "Kampung Cipinang", "Kelurahan Cisarua",
    "Desa Cianjur", "Kampung Cileunyi", "Desa Cikembar",
    "Kelurahan Cimanggis", "Dusun Cibeureum", "Kampung Cidahu",
    # Sumatra
    "Kelurahan Padang Panjang", "Desa Bukittinggi", "Kampung Tanjung Balai",
    "Desa Lubuk Linggau", "Kelurahan Pematang Siantar",
    "Dusun Rantau Prapat", "Kampung Muara Bungo",
    "Desa Tanjung Pinang", "Kelurahan Solok Selatan",
    # Kalimantan
    "Desa Palangkaraya Hilir", "Kampung Banjar Baru",
    "Dusun Tenggarong", "Kelurahan Muara Teweh",
    # Sulawesi / NTT / Bali
    "Desa Makale", "Kampung Waingapu", "Dusun Bajawa",
    "Kelurahan Manado Tua", "Desa Klungkung", "Kampung Karangasem",
    "Desa Tabanan",
]

# ---------------------------------------------------------------------------
# 1g. MOBILITAS (18+ frasa)
# ---------------------------------------------------------------------------
MOBILITAS_PHRASES: List[str] = [
    "pakai kursi roda", "tidak bisa berjalan sendiri", "harus digotong",
    "jalan dibantu tongkat", "lumpuh separuh badan",
    "tidak bisa bangun dari tempat tidur", "butuh tandu untuk evakuasi",
    "berjalan sangat lambat", "harus dipapah", "memakai kruk",
    "tidak mampu berdiri", "kakinya patah", "harus ditandu",
    "perlu bantuan untuk bergerak", "duduk di kursi roda sejak 5 tahun lalu",
    "berjalan timpang", "menggunakan alat bantu jalan",
    "tidak bisa naik tangga",
]

# ---------------------------------------------------------------------------
# 1h. BENCANA (12+ jenis)
# ---------------------------------------------------------------------------
BENCANA_LIST: List[str] = [
    "longsor", "banjir", "gempa", "kebakaran", "angin puting beliung",
    "erupsi", "tsunami", "banjir bandang", "tanah longsor",
    "gunung meletus", "rob", "kekeringan",
]

# ---------------------------------------------------------------------------
# 1i. NOISE / FILLER WORDS
# ---------------------------------------------------------------------------
FILLER_WORDS: List[str] = [
    "eh", "hmm", "gimana ya", "jadi gini", "ya", "anu", "gitu",
    "emm", "nah", "jadi", "begini", "trus", "terus", "pokoknya",
    "sebenarnya", "kayaknya", "kira-kira", "tau gak",
]

# Kata-kata bahasa daerah pengganti kata Indonesia
REGIONAL_SUBSTITUTIONS: Dict[str, List[str]] = {
    "datang": ["teko", "dateng", "sumping"],
    "bersama": ["bareng", "sareng", "karo"],
    "rumah": ["omah", "imah", "bale"],
    "sakit": ["lara", "udur", "gering"],
    "berjalan": ["mlaku", "leumpang", "majeng"],
    "membawa": ["nggawa", "mawa", "nyandak"],
    "anak": ["bocah", "budak", "rare"],
    "tua": ["tuwo", "sepuh", "kolot"],
    "tidak": ["ora", "teu", "ten"],
    "bisa": ["iso", "tiasa", "saged"],
}


# ============================================================================
# 2. UTIL FUNCTIONS
# ============================================================================

def toks(s: str) -> List[str]:
    """Pecah string jadi token (whitespace tokenizer sederhana)."""
    return s.split()


def tag_span(span_tokens: List[str], label: str) -> List[str]:
    """Buat list tag BIO untuk satu span entitas."""
    return [("B-" if i == 0 else "I-") + label for i in range(len(span_tokens))]


def validate_bio(tags: List[str]) -> List[str]:
    """
    Pastikan semua BIO tag valid:
    - Tidak ada I-X tanpa B-X sebelumnya pada tipe yang sama
    - Perbaiki jika ditemukan pelanggaran
    """
    corrected: List[str] = []
    prev_entity: Optional[str] = None
    for tag in tags:
        if tag == "O":
            prev_entity = None
            corrected.append(tag)
        elif tag.startswith("B-"):
            prev_entity = tag[2:]
            corrected.append(tag)
        elif tag.startswith("I-"):
            current_entity = tag[2:]
            if prev_entity != current_entity:
                # Fix: I-X tanpa B-X -> ubah jadi B-X
                corrected.append("B-" + current_entity)
                prev_entity = current_entity
            else:
                corrected.append(tag)
        else:
            corrected.append("O")
            prev_entity = None
    return corrected


# ============================================================================
# 3. ADVERSARIAL DATA AUGMENTATION
# ============================================================================

def inject_typo(text: str, prob: float = 0.1) -> str:
    """
    Randomly introduce typos ke teks:
    - Swap 2 karakter bersebelahan
    - Drop 1 karakter
    - Repeat 1 karakter
    Hanya diterapkan pada kata dengan len >= 4 untuk menghindari
    merusak kata pendek yang penting.
    """
    words = text.split()
    result: List[str] = []
    for word in words:
        if len(word) >= 4 and random.random() < prob:
            chars = list(word)
            action = random.choice(["swap", "drop", "repeat"])
            idx = random.randint(1, len(chars) - 2)  # hindari awal/akhir
            if action == "swap" and idx < len(chars) - 1:
                chars[idx], chars[idx + 1] = chars[idx + 1], chars[idx]
            elif action == "drop":
                chars.pop(idx)
            elif action == "repeat":
                chars.insert(idx, chars[idx])
            result.append("".join(chars))
        else:
            result.append(word)
    return " ".join(result)


def synonym_rotate(text: str, synonyms: Dict[str, List[str]]) -> str:
    """
    Replace istilah medis dengan sinonim acak dari mapping.
    Iterasi semua key di synonyms, jika ditemukan di text, ganti
    dengan salah satu sinonimnya.
    """
    for canonical, syns in synonyms.items():
        all_forms = [canonical] + syns
        for form in all_forms:
            if form in text:
                replacement = random.choice(all_forms)
                text = text.replace(form, replacement, 1)
                break  # satu penggantian per canonical group
    return text


def shuffle_clauses(clauses: List[Tuple]) -> List[Tuple]:
    """Randomly reorder clauses in the sentence."""
    shuffled = clauses.copy()
    random.shuffle(shuffled)
    return shuffled


def inject_noise_words(
    tokens: List[str], tags: List[str], prob: float = 0.05
) -> Tuple[List[str], List[str]]:
    """
    Insert irrelevant filler words (eh, hmm, gimana ya, jadi gini)
    ke posisi acak di antara token. Filler mendapat tag 'O'.
    Hanya sisipkan di batas antar-entitas atau di posisi O.
    """
    new_tokens: List[str] = []
    new_tags: List[str] = []

    for i, (tok, tag) in enumerate(zip(tokens, tags)):
        # Sisipkan noise SEBELUM token ini, tapi hanya jika posisi aman
        if random.random() < prob and (tag == "O" or tag.startswith("B-")):
            filler = random.choice(FILLER_WORDS)
            filler_toks = filler.split()
            new_tokens.extend(filler_toks)
            new_tags.extend(["O"] * len(filler_toks))
        new_tokens.append(tok)
        new_tags.append(tag)

    return new_tokens, new_tags


def bahasa_daerah_mix(tokens: List[str], tags: List[str]) -> Tuple[List[str], List[str]]:
    """
    Randomly replace beberapa kata Indonesia yang ber-tag 'O' dengan
    padanan bahasa daerah (Jawa/Sunda/Bali).
    """
    new_tokens: List[str] = []
    new_tags: List[str] = []

    for tok, tag in zip(tokens, tags):
        if tag == "O" and tok.lower() in REGIONAL_SUBSTITUTIONS and random.random() < 0.3:
            replacement = random.choice(REGIONAL_SUBSTITUTIONS[tok.lower()])
            new_tokens.append(replacement)
        else:
            new_tokens.append(tok)
        new_tags.append(tag)

    return new_tokens, new_tags


# ============================================================================
# 4. BUILDER HELPERS — shared add_plain / add_entity
# ============================================================================

class SentenceBuilder:
    """Helper class untuk membangun pasangan (tokens, tags) secara incremental."""

    def __init__(self) -> None:
        self.tokens: List[str] = []
        self.tags: List[str] = []

    def add_plain(self, text: str) -> None:
        """Tambahkan teks biasa (tag O)."""
        for t in toks(text):
            self.tokens.append(t)
            self.tags.append("O")

    def add_entity(self, text: str, label: str) -> None:
        """Tambahkan span entitas dengan tag BIO."""
        span = toks(text)
        self.tokens.extend(span)
        self.tags.extend(tag_span(span, label))

    def get(self) -> Tuple[List[str], List[str]]:
        return self.tokens, self.tags


# ============================================================================
# 5. BUILDING BLOCK: pick random slot values
# ============================================================================

def pick_nama() -> str:
    return random.choice(NAMA_LIST)


def pick_usia() -> str:
    n = random.choice(USIA_KK_NUM)
    return random.choice(USIA_KK_TEMPLATES).format(n=n)


def pick_kondisi(n: Optional[int] = None) -> List[str]:
    if n is None:
        n = random.choice([0, 1, 1, 1, 2, 2])
    return random.sample(KONDISI_MEDIS, min(n, len(KONDISI_MEDIS)))


def pick_tanggungan() -> Optional[str]:
    if random.random() < 0.2:
        return None
    relasi = random.choice(TANGGUNGAN_RELASI)
    if relasi in ("anak", "cucu", "keponakan", "anak angkat") and random.random() < 0.4:
        usia = random.choice(TANGGUNGAN_USIA_BAYI)
    elif relasi in ("nenek", "kakek", "mertua", "ibu mertua", "ayah mertua"):
        usia = random.choice(TANGGUNGAN_USIA_LANSIA)
    elif random.random() < 0.15:
        usia = random.choice(TANGGUNGAN_DESCRIPTORS)
    else:
        usia = random.choice(TANGGUNGAN_USIA_ANAK + TANGGUNGAN_USIA_LANSIA)
    return f"{relasi} {usia}"


def pick_tanggungan_multiple() -> List[str]:
    """Kadang satu KK punya >1 tanggungan."""
    count = random.choices([0, 1, 2, 3], weights=[0.15, 0.50, 0.25, 0.10])[0]
    results: List[str] = []
    for _ in range(count):
        t = pick_tanggungan()
        if t:
            results.append(t)
    return results


def pick_lokasi() -> str:
    return random.choice(LOKASI_LIST)


def pick_mobilitas() -> Optional[str]:
    if random.random() < 0.70:
        return None
    return random.choice(MOBILITAS_PHRASES)


def pick_neg_obat() -> Optional[str]:
    if random.random() < 0.40:
        return None
    return random.choice(NEG_OBAT_PHRASES)


def pick_bencana() -> str:
    return random.choice(BENCANA_LIST)


# ============================================================================
# 6. TEMPLATE PATTERNS (15+ variasi)
# ============================================================================

def build_formal() -> Tuple[List[str], List[str]]:
    """Template 1: Laporan formal relawan — structured report style."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    mobilitas = pick_mobilitas()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(random.choice(["Laporan:", "Data pengungsi:", "Tercatat:"]))
    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(",")

    if kondisi_list:
        sb.add_plain("riwayat penyakit")
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("dan")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    for t in tanggungan_list:
        sb.add_plain(random.choice(["membawa", "bersama"]))
        sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    if mobilitas:
        sb.add_plain("Kondisi mobilitas:")
        sb.add_entity(mobilitas, "MOBILITAS")
        sb.add_plain(".")

    sb.add_plain("Asal")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"terdampak {bencana} .")

    if neg_obat:
        sb.add_plain("Catatan:")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_informal() -> Tuple[List[str], List[str]]:
    """Template 2: Casual speech — bahasa sehari-hari relawan."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(random.choice(["Ini ada", "Ada", "Datang"]))
    sb.add_entity(nama, "PER")
    sb.add_plain(random.choice([", katanya", ", bilangnya", ","]))
    sb.add_entity(usia, "USIA")
    sb.add_plain(".")

    if kondisi_list:
        sb.add_plain(random.choice(["Dia kena", "Katanya sakit", "Punya sakit"]))
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain(random.choice(["sama", "juga"]))
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    if tanggungan_list:
        sb.add_plain(random.choice(["Bawa", "Sama"]))
        for i, t in enumerate(tanggungan_list):
            if i > 0:
                sb.add_plain("sama")
            sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    sb.add_plain(random.choice(["Dari", "Asalnya dari", "Rumahnya di"]))
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"kena {bencana} .")

    if neg_obat:
        sb.add_plain(random.choice(["Sayangnya", "Masalahnya"]))
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_abbreviated() -> Tuple[List[str], List[str]]:
    """Template 3: Shorthand notes — catatan singkat."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi(random.choice([1, 2]))
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()

    sb.add_entity(nama, "PER")
    sb.add_plain("/")
    sb.add_entity(usia, "USIA")
    sb.add_plain("/")

    for k in kondisi_list:
        sb.add_entity(k, "KONDISI")
        sb.add_plain("/")

    sb.add_plain("asal")
    sb.add_entity(lokasi, "LOKASI")

    if neg_obat:
        sb.add_plain("/")
        sb.add_entity(neg_obat, "NEG_OBAT")

    return sb.get()


def build_with_context() -> Tuple[List[str], List[str]]:
    """Template 4: Includes disaster context dulu baru data."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    mobilitas = pick_mobilitas()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(f"Pasca {bencana} di")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(",")
    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", mengungsi ke posko .")

    if kondisi_list:
        sb.add_plain(random.choice(["Memiliki riwayat", "Ada riwayat"]))
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("dan")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    for t in tanggungan_list:
        sb.add_plain("Bersama")
        sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    if mobilitas:
        sb.add_plain("Saat ini")
        sb.add_entity(mobilitas, "MOBILITAS")
        sb.add_plain(".")

    if neg_obat:
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_minimal() -> Tuple[List[str], List[str]]:
    """Template 5: Very sparse info — hanya nama dan 1-2 field lain."""
    sb = SentenceBuilder()
    nama = pick_nama()

    sb.add_entity(nama, "PER")

    # Randomly include hanya 1-2 field
    fields = ["usia", "kondisi", "lokasi"]
    chosen = random.sample(fields, random.randint(1, 2))

    for field in chosen:
        if field == "usia":
            sb.add_plain(",")
            sb.add_entity(pick_usia(), "USIA")
        elif field == "kondisi":
            sb.add_plain(", sakit")
            sb.add_entity(random.choice(KONDISI_MEDIS), "KONDISI")
        elif field == "lokasi":
            sb.add_plain(", dari")
            sb.add_entity(pick_lokasi(), "LOKASI")

    sb.add_plain(".")
    return sb.get()


def build_verbose() -> Tuple[List[str], List[str]]:
    """Template 6: Lots of extra info — kalimat panjang dengan detail."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi(random.choice([2, 3]))
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    mobilitas = pick_mobilitas()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain("Relawan melaporkan bahwa")
    sb.add_entity(nama, "PER")
    sb.add_plain(f"yang berusia")
    sb.add_entity(usia, "USIA")
    sb.add_plain(f"tiba di posko pengungsian pada hari ini setelah rumahnya di")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"terkena dampak {bencana} yang cukup parah .")

    if kondisi_list:
        sb.add_plain("Yang bersangkutan diketahui memiliki riwayat penyakit")
        for i, k in enumerate(kondisi_list):
            if i > 0:
                connector = random.choice(["dan juga", "serta", "dan"])
                sb.add_plain(connector)
            sb.add_entity(k, "KONDISI")
        sb.add_plain("yang memerlukan penanganan khusus .")

    for t in tanggungan_list:
        sb.add_plain(random.choice(
            ["Beliau datang bersama", "Turut dibawa serta",
             "Ikut mengungsi bersama beliau"]
        ))
        sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    if mobilitas:
        sb.add_plain("Untuk kondisi mobilitas , saat ini beliau")
        sb.add_entity(mobilitas, "MOBILITAS")
        sb.add_plain("sehingga memerlukan bantuan tambahan .")

    if neg_obat:
        sb.add_plain("Perlu dicatat bahwa saat ini")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain("sehingga sangat membutuhkan bantuan medis .")

    return sb.get()


def build_with_dialogue() -> Tuple[List[str], List[str]]:
    """Template 7: Relawan quoting what refugee said."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(random.choice([
        "Pengungsi bilang :", "Kata pengungsi :", "Warga bilang :"
    ]))
    sb.add_plain(random.choice(['"Nama saya', '"Saya']))
    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(".")

    if kondisi_list:
        sb.add_plain(random.choice(["Saya punya sakit", "Saya kena"]))
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("dan")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    sb.add_plain(random.choice(["Rumah saya di", "Saya dari"]))
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f'kena {bencana} "')

    if neg_obat:
        sb.add_plain(". Kata beliau ,")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_reversed_order() -> Tuple[List[str], List[str]]:
    """Template 8: Location first, then name — urutan terbalik."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    mobilitas = pick_mobilitas()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(f"Dari")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"yang terdampak {bencana} ,")
    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", datang ke posko .")

    if kondisi_list:
        sb.add_plain("Riwayat penyakit :")
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain(",")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    for t in tanggungan_list:
        sb.add_plain("Membawa")
        sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    if mobilitas:
        sb.add_plain("Kondisi:")
        sb.add_entity(mobilitas, "MOBILITAS")
        sb.add_plain(".")

    if neg_obat:
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_with_filler() -> Tuple[List[str], List[str]]:
    """Template 9: Lots of filler words / hesitation."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain("Jadi gini ,")
    sb.add_plain(random.choice(["ada", "ini"]))
    sb.add_entity(nama, "PER")
    sb.add_plain(", eh")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", hmm")

    if kondisi_list:
        sb.add_plain(random.choice(["sakitnya itu", "penyakitnya anu"]))
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("terus")
            sb.add_entity(k, "KONDISI")
        sb.add_plain("gitu .")

    sb.add_plain("nah rumahnya di")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"kena {bencana} .")

    if neg_obat:
        sb.add_plain("ya pokoknya")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_enumerated() -> Tuple[List[str], List[str]]:
    """Template 10: Enumerated list style — penomoran data."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()

    sb.add_plain("1.")
    sb.add_plain("Nama :")
    sb.add_entity(nama, "PER")
    sb.add_plain("2.")
    sb.add_plain("Usia :")
    sb.add_entity(usia, "USIA")

    if kondisi_list:
        sb.add_plain("3.")
        sb.add_plain("Penyakit :")
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain(",")
            sb.add_entity(k, "KONDISI")

    if tanggungan_list:
        sb.add_plain(f"{4 if kondisi_list else 3}.")
        sb.add_plain("Tanggungan :")
        for i, t in enumerate(tanggungan_list):
            if i > 0:
                sb.add_plain(",")
            sb.add_entity(t, "TANGGUNGAN")

    idx = 4 + (1 if kondisi_list else 0) + (1 if tanggungan_list else 0) - 1
    sb.add_plain(f"{idx}.")
    sb.add_plain("Asal :")
    sb.add_entity(lokasi, "LOKASI")

    if neg_obat:
        sb.add_plain(f"{idx + 1}.")
        sb.add_plain("Obat :")
        sb.add_entity(neg_obat, "NEG_OBAT")

    return sb.get()


def build_telegram_style() -> Tuple[List[str], List[str]]:
    """Template 11: Telegram / radio report style — singkat padat."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi(random.choice([0, 1]))
    lokasi = pick_lokasi()
    bencana = pick_bencana()

    sb.add_plain("LAPOR :")
    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(f", korban {bencana}")
    sb.add_entity(lokasi, "LOKASI")

    if kondisi_list:
        sb.add_plain(", kondisi")
        for k in kondisi_list:
            sb.add_entity(k, "KONDISI")

    sb.add_plain(". SELESAI")
    return sb.get()


def build_narrative() -> Tuple[List[str], List[str]]:
    """Template 12: Narrative — cerita panjang bergaya narasi."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    mobilitas = pick_mobilitas()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(random.choice([
        "Siang tadi tiba di posko seorang warga bernama",
        "Malam ini datang pengungsi bernama",
        "Pagi ini dievakuasi seorang warga bernama",
    ]))
    sb.add_entity(nama, "PER")
    sb.add_plain(random.choice(["yang berusia", "berumur", ", usia"]))
    sb.add_entity(usia, "USIA")
    sb.add_plain(".")

    sb.add_plain(random.choice([
        "Beliau berasal dari", "Warga tersebut berasal dari",
        "Asalnya dari",
    ]))
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"yang terkena {bencana} .")

    if kondisi_list:
        sb.add_plain(random.choice([
            "Menurut keterangannya , beliau menderita",
            "Diketahui mempunyai riwayat",
        ]))
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("dan")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    for t in tanggungan_list:
        sb.add_plain(random.choice([
            "Beliau datang membawa",
            "Turut serta",
            "Ikut mengungsi bersama beliau ,",
        ]))
        sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    if mobilitas:
        sb.add_plain("Kondisi fisiknya saat ini")
        sb.add_entity(mobilitas, "MOBILITAS")
        sb.add_plain(".")

    if neg_obat:
        sb.add_plain("Yang menjadi kendala ,")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_question_answer() -> Tuple[List[str], List[str]]:
    """Template 13: Q&A format — relawan tanya, pengungsi jawab."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()

    sb.add_plain("Nama ?")
    sb.add_entity(nama, "PER")
    sb.add_plain(". Usia ?")
    sb.add_entity(usia, "USIA")
    sb.add_plain(". Asal ?")
    sb.add_entity(lokasi, "LOKASI")

    if kondisi_list:
        sb.add_plain(". Penyakit ?")
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain(",")
            sb.add_entity(k, "KONDISI")

    if neg_obat:
        sb.add_plain(". Obat ?")
        sb.add_entity(neg_obat, "NEG_OBAT")

    sb.add_plain(".")
    return sb.get()


def build_multi_kondisi() -> Tuple[List[str], List[str]]:
    """Template 14: Multiple conditions — fokus pada banyak kondisi medis."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi(random.choice([2, 3, 4]))
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()

    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", memiliki banyak riwayat penyakit :")

    for i, k in enumerate(kondisi_list):
        if i > 0:
            sb.add_plain(",")
        sb.add_entity(k, "KONDISI")
    sb.add_plain(".")

    sb.add_plain("Berasal dari")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(".")

    if neg_obat:
        sb.add_plain("Saat ini")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_mobilitas_focus() -> Tuple[List[str], List[str]]:
    """Template 15: Focus on mobility — kondisi mobilitas sebagai fokus."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    lokasi = pick_lokasi()
    mobilitas = random.choice(MOBILITAS_PHRASES)  # selalu ada
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain("Perlu perhatian khusus :")
    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", saat ini kondisinya")
    sb.add_entity(mobilitas, "MOBILITAS")
    sb.add_plain(".")

    if kondisi_list:
        sb.add_plain("Ada riwayat")
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("dan")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    sb.add_plain("Asal dari")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(f"pasca {bencana} .")

    if neg_obat:
        sb.add_plain("Selain itu ,")
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(".")

    return sb.get()


def build_whatsapp_style() -> Tuple[List[str], List[str]]:
    """Template 16: WhatsApp message style — pesan chat relawan."""
    sb = SentenceBuilder()
    nama = pick_nama()
    usia = pick_usia()
    kondisi_list = pick_kondisi()
    tanggungan_list = pick_tanggungan_multiple()
    lokasi = pick_lokasi()
    neg_obat = pick_neg_obat()
    bencana = pick_bencana()

    sb.add_plain(random.choice([
        "Mas , ini ada warga", "Kak , ada pengungsi baru",
        "Pak koordinator , ada warga",
    ]))
    sb.add_entity(nama, "PER")
    sb.add_entity(usia, "USIA")
    sb.add_plain(f"korban {bencana} dari")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(".")

    if kondisi_list:
        sb.add_plain(random.choice(["Sakitnya", "Kondisinya"]))
        for i, k in enumerate(kondisi_list):
            if i > 0:
                sb.add_plain("sm")
            sb.add_entity(k, "KONDISI")
        sb.add_plain(".")

    if tanggungan_list:
        sb.add_plain("Bawa")
        for i, t in enumerate(tanggungan_list):
            if i > 0:
                sb.add_plain("sm")
            sb.add_entity(t, "TANGGUNGAN")
        sb.add_plain(".")

    if neg_obat:
        sb.add_entity(neg_obat, "NEG_OBAT")
        sb.add_plain(". Tlg segera ya .")

    return sb.get()


# Registry semua template builders
TEMPLATE_BUILDERS = [
    build_formal,
    build_informal,
    build_abbreviated,
    build_with_context,
    build_minimal,
    build_verbose,
    build_with_dialogue,
    build_reversed_order,
    build_with_filler,
    build_enumerated,
    build_telegram_style,
    build_narrative,
    build_question_answer,
    build_multi_kondisi,
    build_mobilitas_focus,
    build_whatsapp_style,
]


# ============================================================================
# 7. HARD NEGATIVE EXAMPLES
# ============================================================================

def build_hard_negative_name_like_condition() -> Tuple[List[str], List[str]]:
    """
    Hard negative: nama yang mirip kondisi medis.
    Misal: 'Pak Sehat', 'Bu Mawar' (mawar bisa ditafsirkan bukan nama).
    Model harus belajar membedakan dari konteks.
    """
    sb = SentenceBuilder()
    tricky_names = [
        "Pak Sehat", "Bu Demam", "Pak Jantung Suryadi",
        "Bu Gula Ratna", "Pak Darah Santoso", "Ibu Obat Mulyani",
        "Sdr Stroke Hadi", "Bu Lumpuh Wati",
    ]
    nama = random.choice(tricky_names)
    usia = pick_usia()
    lokasi = pick_lokasi()

    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", asal")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(".")
    return sb.get()


def build_hard_negative_ambiguous_number() -> Tuple[List[str], List[str]]:
    """
    Hard negative: angka yang bisa berarti usia atau jumlah tanggungan.
    """
    sb = SentenceBuilder()
    nama = pick_nama()

    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(pick_usia(), "USIA")
    sb.add_plain(", membawa")
    sb.add_entity(random.choice(TANGGUNGAN_RELASI) + " "
                  + random.choice(TANGGUNGAN_USIA_ANAK), "TANGGUNGAN")
    sb.add_plain(".")
    return sb.get()


def build_hard_negative_location_like_name() -> Tuple[List[str], List[str]]:
    """
    Hard negative: nama lokasi yang mirip nama orang.
    """
    sb = SentenceBuilder()
    tricky_locations = [
        "Desa Slamet", "Kampung Ahmad", "Kelurahan Budi",
        "Dusun Kartini", "Kampung Siti Rahayu",
    ]
    nama = pick_nama()
    lokasi = random.choice(tricky_locations)
    usia = pick_usia()

    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", berasal dari")
    sb.add_entity(lokasi, "LOKASI")
    sb.add_plain(".")
    return sb.get()


def build_hard_negative_ambiguous_relation() -> Tuple[List[str], List[str]]:
    """
    Hard negative: kata relasi yang bisa jadi bagian nama atau konteks.
    """
    sb = SentenceBuilder()
    # Nama yang mengandung kata relasi
    tricky_names = [
        "Pak Anak Agung", "Bu Ibu Ketut", "Sdr Kakak Wahyu",
    ]
    nama = random.choice(tricky_names)
    usia = pick_usia()
    lokasi = pick_lokasi()

    sb.add_entity(nama, "PER")
    sb.add_plain(",")
    sb.add_entity(usia, "USIA")
    sb.add_plain(", dari")
    sb.add_entity(lokasi, "LOKASI")

    tanggungan = pick_tanggungan()
    if tanggungan:
        sb.add_plain(", datang bersama")
        sb.add_entity(tanggungan, "TANGGUNGAN")

    sb.add_plain(".")
    return sb.get()


HARD_NEGATIVE_BUILDERS = [
    build_hard_negative_name_like_condition,
    build_hard_negative_ambiguous_number,
    build_hard_negative_location_like_name,
    build_hard_negative_ambiguous_relation,
]


# ============================================================================
# 8. CURRICULUM DIFFICULTY ENGINE
# ============================================================================

def generate_easy() -> Dict[str, Any]:
    """Easy: template bersih, lengkap, tanpa augmentasi."""
    builder = random.choice(TEMPLATE_BUILDERS)
    tokens, tags = builder()
    tags = validate_bio(tags)
    return {"tokens": tokens, "tags": tags, "difficulty": "easy"}


def generate_medium() -> Dict[str, Any]:
    """Medium: some fields missing, reorder klausa, kadang sinonim."""
    builder = random.choice(TEMPLATE_BUILDERS)
    tokens, tags = builder()

    # Synonym rotation (pada token yang merupakan entitas KONDISI)
    if random.random() < 0.4:
        text = " ".join(tokens)
        text = synonym_rotate(text, KONDISI_SYNONYMS)
        new_tokens = text.split()
        # Jika panjang berubah karena sinonim multi-kata, fallback
        if len(new_tokens) == len(tokens):
            tokens = new_tokens

    tags = validate_bio(tags)
    return {"tokens": tokens, "tags": tags, "difficulty": "medium"}


def generate_hard() -> Dict[str, Any]:
    """Hard: typo, noise, missing fields, bahasa daerah, hard negatives."""
    # 30% chance hard negative, 70% augmented normal template
    if random.random() < 0.3:
        builder = random.choice(HARD_NEGATIVE_BUILDERS)
    else:
        builder = random.choice(TEMPLATE_BUILDERS)

    tokens, tags = builder()

    # Inject typos pada token O (non-entity)
    if random.random() < 0.5:
        new_tokens: List[str] = []
        for tok, tag in zip(tokens, tags):
            if tag == "O" and len(tok) >= 4 and random.random() < 0.15:
                new_tokens.append(inject_typo(tok, prob=1.0))
            else:
                new_tokens.append(tok)
        tokens = new_tokens

    # Inject noise words
    if random.random() < 0.5:
        tokens, tags = inject_noise_words(tokens, tags, prob=0.08)

    # Bahasa daerah mixing
    if random.random() < 0.4:
        tokens, tags = bahasa_daerah_mix(tokens, tags)

    tags = validate_bio(tags)
    return {"tokens": tokens, "tags": tags, "difficulty": "hard"}


# ============================================================================
# 9. DATASET GENERATION
# ============================================================================

def generate_dataset(n: int) -> List[Dict[str, Any]]:
    """
    Generate n examples dengan distribusi difficulty:
    - 30% easy
    - 40% medium
    - 30% hard
    Deduplicate berdasarkan token string.
    """
    seen: set = set()
    examples: List[Dict[str, Any]] = []
    attempts = 0
    max_attempts = n * 30  # lebih banyak attempt karena vocabulary lebih besar

    # Distribusi target
    n_easy = int(n * 0.30)
    n_medium = int(n * 0.40)
    n_hard = n - n_easy - n_medium

    generators = (
        [("easy", generate_easy)] * n_easy
        + [("medium", generate_medium)] * n_medium
        + [("hard", generate_hard)] * n_hard
    )
    random.shuffle(generators)

    gen_idx = 0
    while len(examples) < n and attempts < max_attempts:
        attempts += 1

        if gen_idx < len(generators):
            _, gen_fn = generators[gen_idx]
        else:
            # Fallback jika kita sudah melewati generators list
            gen_fn = random.choice([generate_easy, generate_medium, generate_hard])

        example = gen_fn()

        # Validasi: tokens dan tags harus sama panjang
        if len(example["tokens"]) != len(example["tags"]):
            continue

        # Validasi: minimal ada 1 token
        if len(example["tokens"]) == 0:
            continue

        # Deduplicate
        key = " ".join(example["tokens"])
        if key in seen:
            continue
        seen.add(key)

        examples.append(example)
        gen_idx += 1

    return examples


def write_jsonl(path: str, examples: List[Dict[str, Any]]) -> None:
    """Write list of dicts ke file JSONL."""
    os.makedirs(os.path.dirname(path) if os.path.dirname(path) else ".", exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")


def compute_statistics(
    examples: List[Dict[str, Any]], split_name: str
) -> Dict[str, Any]:
    """
    Hitung statistik: distribusi difficulty, distribusi entity type,
    rata-rata panjang token.
    """
    difficulty_counts: Counter = Counter()
    entity_counts: Counter = Counter()
    total_tokens = 0

    for ex in examples:
        difficulty_counts[ex["difficulty"]] += 1
        total_tokens += len(ex["tokens"])
        for tag in ex["tags"]:
            if tag.startswith("B-"):
                entity_counts[tag[2:]] += 1

    stats = {
        "split": split_name,
        "total_examples": len(examples),
        "avg_tokens": round(total_tokens / max(len(examples), 1), 1),
        "difficulty_distribution": dict(difficulty_counts),
        "entity_distribution": dict(entity_counts),
    }
    return stats


def print_statistics(all_stats: List[Dict[str, Any]]) -> None:
    """Print statistik dataset ke stdout."""
    print("\n" + "=" * 72)
    print("SIGAP AI — Synthetic NER Dataset Statistics")
    print("=" * 72)

    grand_total = 0
    for stats in all_stats:
        split = stats["split"]
        total = stats["total_examples"]
        grand_total += total
        avg_tok = stats["avg_tokens"]

        print(f"\n{'─' * 40}")
        print(f"  Split: {split.upper()} | Total: {total} | Avg tokens/example: {avg_tok}")
        print(f"{'─' * 40}")

        print("  Difficulty distribution:")
        for diff in ["easy", "medium", "hard"]:
            count = stats["difficulty_distribution"].get(diff, 0)
            pct = count / max(total, 1) * 100
            bar = "█" * int(pct / 2)
            print(f"    {diff:8s}: {count:5d} ({pct:5.1f}%) {bar}")

        print("  Entity type distribution:")
        sorted_entities = sorted(
            stats["entity_distribution"].items(),
            key=lambda x: x[1],
            reverse=True,
        )
        for entity, count in sorted_entities:
            print(f"    {entity:12s}: {count:5d}")

    print(f"\n{'=' * 72}")
    print(f"  GRAND TOTAL: {grand_total} examples")
    print(f"{'=' * 72}\n")


# ============================================================================
# 10. MAIN / CLI
# ============================================================================

def main() -> None:
    parser = argparse.ArgumentParser(
        description="SIGAP AI — Synthetic NER Dataset Generator for disaster refugee intake",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--n_train", type=int, default=5000,
                        help="Jumlah contoh training")
    parser.add_argument("--n_val", type=int, default=500,
                        help="Jumlah contoh validation")
    parser.add_argument("--n_test", type=int, default=300,
                        help="Jumlah contoh test")
    parser.add_argument("--out_dir", type=str, default="data",
                        help="Direktori output")
    parser.add_argument("--seed", type=int, default=42,
                        help="Random seed untuk reprodusibilitas")
    args = parser.parse_args()

    # Set seed
    random.seed(args.seed)

    print(f"Generating synthetic NER data (seed={args.seed})...")
    print(f"  Templates available: {len(TEMPLATE_BUILDERS)} regular + "
          f"{len(HARD_NEGATIVE_BUILDERS)} hard negative")
    print(f"  Vocabulary: {len(NAMA_LIST)} names, {len(KONDISI_MEDIS)} conditions, "
          f"{len(LOKASI_LIST)} locations")
    print(f"  Target: train={args.n_train}, val={args.n_val}, test={args.n_test}")

    train = generate_dataset(args.n_train)
    val = generate_dataset(args.n_val)
    test = generate_dataset(args.n_test)

    train_path = os.path.join(args.out_dir, "train.jsonl")
    val_path = os.path.join(args.out_dir, "val.jsonl")
    test_path = os.path.join(args.out_dir, "test.jsonl")

    write_jsonl(train_path, train)
    write_jsonl(val_path, val)
    write_jsonl(test_path, test)

    print(f"\nFiles written:")
    print(f"  {train_path}")
    print(f"  {val_path}")
    print(f"  {test_path}")

    # Statistik
    all_stats = [
        compute_statistics(train, "train"),
        compute_statistics(val, "val"),
        compute_statistics(test, "test"),
    ]
    print_statistics(all_stats)

    # Contoh data
    print("Contoh 3 data train:")
    for i, ex in enumerate(train[:3]):
        print(f"\n  [{i+1}] difficulty={ex['difficulty']}")
        print(f"  Tokens: {' '.join(ex['tokens'])}")
        pairs = [(t, tag) for t, tag in zip(ex["tokens"], ex["tags"]) if tag != "O"]
        print(f"  Entities: {pairs}")


if __name__ == "__main__":
    main()
