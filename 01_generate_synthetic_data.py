"""
01_generate_synthetic_data.py
==============================
Generator dataset sintetis untuk fine-tuning NER (Named Entity Recognition)
khusus domain intake pengungsi bencana PMI.

IDE UTAMA:
Kita tidak perlu anotasi manual. Karena kalimat dibangun dari template dengan
slot yang kita kontrol sendiri, kita TAHU PASTI di karakter/token mana setiap
entitas berada -> label BIO dibuat otomatis saat generate, bukan dengan
melabeli tangan satu per satu.

ENTITAS YANG DIDETEKSI (tag set):
  PER          -> nama kepala keluarga
  USIA         -> usia kepala keluarga (angka atau kata)
  KONDISI      -> kondisi medis kritis (termasuk sinonim lokal/awam)
  TANGGUNGAN   -> frasa anggota keluarga rentan, mis. "cucu 8 bulan", "istri 68 tahun"
  NEG_OBAT     -> frasa yang menyatakan TIDAK ada obat/tidak bawa obat
  LOKASI       -> asal lokasi/desa/kampung
  MOBILITAS    -> frasa yang menunjukkan keterbatasan gerak (kursi roda, lumpuh, dst)

OUTPUT:
  data/train.jsonl, data/val.jsonl, data/test.jsonl
  Setiap baris: {"tokens": [...], "tags": [...]}  (skema BIO)

CARA PAKAI:
  python 01_generate_synthetic_data.py --n_train 1500 --n_val 250 --n_test 150
"""

import argparse
import json
import os
import random

random.seed(42)

# ---------------------------------------------------------------------------
# 1. KOSAKATA / SINONIM (perluas terus daftar ini — makin banyak makin bagus)
# ---------------------------------------------------------------------------

NAMA_LIST = [
    "Bu Siti", "Pak Ahmad", "Bu Rina", "Pak Slamet", "Bu Maemunah", "Pak Wayan",
    "Bu Aminah", "Pak Hendra", "Bu Yuli", "Pak Dedi", "Bu Tuti", "Pak Joko",
    "Bu Halimah", "Pak Bambang", "Bu Sri Wahyuni", "Pak Sutarjo", "Bu Lastri",
    "Pak Karto", "Bu Marni", "Pak Wagiman", "Bu Nur", "Pak Asep",
]

USIA_KK_TEMPLATES = ["{n} tahun", "umur {n} tahun", "usianya {n} tahun"]
USIA_KK_NUM = list(range(19, 85))

# kondisi medis: istilah baku + sinonim awam/lokal (untuk RISIKO 1 di proposal kalian)
KONDISI_MEDIS = [
    "diabetes", "gula", "kencing manis",
    "hipertensi", "darah tinggi", "tensi tinggi",
    "stroke", "lumpuh mendadak", "riwayat stroke",
    "asma", "sesak napas", "gangguan pernapasan",
    "jantung", "sakit jantung", "riwayat jantung",
    "TBC", "batuk berdarah",
    "epilepsi", "ayan",
    "gagal ginjal", "cuci darah",
    "hamil dengan komplikasi", "tekanan darah tinggi saat hamil",
]

TANGGUNGAN_RELASI = ["anak", "cucu", "istri", "suami", "ibu", "ayah", "adik", "kakak", "nenek", "kakek", "mertua"]
TANGGUNGAN_USIA_BAYI = ["{n} bulan".format(n=n) for n in range(0, 12)]
TANGGUNGAN_USIA_LAIN = ["{n} tahun".format(n=n) for n in list(range(1, 18)) + list(range(60, 90))]

NEG_OBAT_PHRASES = [
    "tidak bawa obat sama sekali", "tidak bawa obat", "tidak ada obat",
    "obatnya ketinggalan di rumah", "obat habis tidak sempat bawa",
    "tidak sempat bawa obat", "kehabisan obat",
]

LOKASI_LIST = [
    "Kampung Cikaret", "Desa Sukamaju", "Kelurahan Cipinang", "Dusun Margasari",
    "Kampung Cilember", "Desa Tanjung Harapan", "Kelurahan Banjarsari",
    "Dusun Sukasari", "Desa Mekar Jaya", "Kampung Pasir Putih",
]

MOBILITAS_PHRASES = [
    "pakai kursi roda", "tidak bisa berjalan sendiri", "harus digotong",
    "jalan dibantu tongkat", "lumpuh separuh badan", "tidak bisa bangun dari tempat tidur",
]

BENCANA_LIST = ["longsor", "banjir", "gempa", "kebakaran", "angin puting beliung", "erupsi"]

# ---------------------------------------------------------------------------
# 2. UTIL: pecah frasa jadi token sederhana (whitespace tokenizer)
#    NOTE: saat fine-tuning, tokenizer BERT akan mem-subword-kan lagi -
#    proses alignment subword dilakukan di 02_train_ner_model.py
# ---------------------------------------------------------------------------

def toks(s):
    return s.split()


def tag_span(tokens_so_far_count, span_tokens, label):
    """Buat list tag BIO untuk satu span entitas."""
    tags = []
    for i in range(len(span_tokens)):
        tags.append(("B-" if i == 0 else "I-") + label)
    return tags


# ---------------------------------------------------------------------------
# 3. TEMPLATE KALIMAT
#    Setiap fungsi mengembalikan (list_token, list_tag)
# ---------------------------------------------------------------------------

def build_example():
    tokens = []
    tags = []

    def add_plain(text):
        for t in toks(text):
            tokens.append(t)
            tags.append("O")

    def add_entity(text, label):
        span = toks(text)
        tokens.extend(span)
        tags.extend(tag_span(len(tokens) - len(span), span, label))

    nama = random.choice(NAMA_LIST)
    usia_kk = random.choice(USIA_KK_NUM)
    usia_kk_text = random.choice(USIA_KK_TEMPLATES).format(n=usia_kk)
    bencana = random.choice(BENCANA_LIST)
    lokasi = random.choice(LOKASI_LIST)

    n_kondisi = random.choice([0, 1, 1, 2])
    kondisi_terpilih = random.sample(KONDISI_MEDIS, n_kondisi) if n_kondisi else []

    ada_tanggungan = random.random() < 0.75
    if ada_tanggungan:
        relasi = random.choice(TANGGUNGAN_RELASI)
        if relasi in ("anak", "cucu") and random.random() < 0.5:
            usia_tanggungan = random.choice(TANGGUNGAN_USIA_BAYI)
        else:
            usia_tanggungan = random.choice(TANGGUNGAN_USIA_LAIN)
        tanggungan_text = f"{relasi} {usia_tanggungan}"
    else:
        tanggungan_text = None

    neg_obat = random.random() < 0.55
    mobilitas = random.random() < 0.25

    # --- mulai susun kalimat dengan urutan acak antar-klausa, biar model
    #     tidak hanya menghafal posisi kata, tapi belajar konteks entitas ---

    add_entity(nama, "PER")
    add_plain(",")
    add_entity(usia_kk_text, "USIA")
    add_plain(",")

    clauses = []

    if kondisi_terpilih:
        clauses.append(("kondisi", kondisi_terpilih))
    if tanggungan_text:
        clauses.append(("tanggungan", tanggungan_text))
    if mobilitas:
        clauses.append(("mobilitas", random.choice(MOBILITAS_PHRASES)))

    random.shuffle(clauses)

    for kind, val in clauses:
        if kind == "kondisi":
            for i, k in enumerate(val):
                if i == 0:
                    add_plain(random.choice(["punya riwayat", "ada riwayat", "menderita", "sakit"]))
                else:
                    add_plain("dan")
                add_entity(k, "KONDISI")
            add_plain(".")
        elif kind == "tanggungan":
            add_plain(random.choice(["datang bersama", "bawa", "membawa"]))
            add_entity(val, "TANGGUNGAN")
            add_plain(".")
        elif kind == "mobilitas":
            add_plain(random.choice(["kondisinya", "saat ini"]))
            add_entity(val, "MOBILITAS")
            add_plain(".")

    add_plain("Rumahnya di")
    add_entity(lokasi, "LOKASI")
    add_plain(f"terdampak {bencana} .")

    if neg_obat:
        add_plain(random.choice(["Saat ini", "Sayangnya"]))
        add_entity(random.choice(NEG_OBAT_PHRASES), "NEG_OBAT")
        add_plain(".")

    return tokens, tags


# ---------------------------------------------------------------------------
# 4. GENERATE & SPLIT
# ---------------------------------------------------------------------------

def generate_dataset(n):
    seen = set()
    examples = []
    attempts = 0
    while len(examples) < n and attempts < n * 20:
        attempts += 1
        tokens, tags = build_example()
        key = " ".join(tokens)
        if key in seen:
            continue
        seen.add(key)
        examples.append({"tokens": tokens, "tags": tags})
    return examples


def write_jsonl(path, examples):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        for ex in examples:
            f.write(json.dumps(ex, ensure_ascii=False) + "\n")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--n_train", type=int, default=1500)
    parser.add_argument("--n_val", type=int, default=250)
    parser.add_argument("--n_test", type=int, default=150)
    parser.add_argument("--out_dir", type=str, default="data")
    args = parser.parse_args()

    train = generate_dataset(args.n_train)
    val = generate_dataset(args.n_val)
    test = generate_dataset(args.n_test)

    write_jsonl(os.path.join(args.out_dir, "train.jsonl"), train)
    write_jsonl(os.path.join(args.out_dir, "val.jsonl"), val)
    write_jsonl(os.path.join(args.out_dir, "test.jsonl"), test)

    print(f"Train: {len(train)} | Val: {len(val)} | Test: {len(test)}")
    print("\nContoh 3 data train:")
    for ex in train[:3]:
        print(" ".join(ex["tokens"]))
        print(list(zip(ex["tokens"], ex["tags"])))
        print()


if __name__ == "__main__":
    main()
