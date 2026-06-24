# SIGAP AI — Versi Tanpa Ketergantungan LLM (Hybrid DL + Rule Engine)

Paket ini menggantikan panggilan LLM (Claude/Gemini API) di pipeline inti
SIGAP AI dengan kombinasi:

1. **Deep Learning** — IndoBERT fine-tuned untuk Named Entity Recognition (NER),
   menggantikan Prompt 1 (ekstraksi terstruktur).
2. **Rule Engine
 deterministik (kode, bukan ML)** — untuk skor kerentanan
   dan routing card, menggantikan bagian skor/routing di Prompt 2-3.

Hasil: sistem bisa jalan **100% offline** setelah model dilatih, dan setiap
keputusan skor/routing bisa diaudit baris per baris (poin plus untuk kriteria
Responsible AI).

## Kenapa hybrid, bukan full Deep Learning untuk semuanya?

Skor kerentanan dan routing **tidak butuh model** — itu adalah perhitungan
berbobot dan lookup table yang nilainya sudah kalian tentukan sendiri di
proposal awal. Memaksakan model DL untuk tugas ini cuma menambah risiko
gagal tanpa menambah kemampuan apa pun. Bagian yang **benar-benar butuh DL**
hanya satu: mengubah kalimat bebas relawan jadi data terstruktur — karena di
sinilah variasi bahasa (sinonim, urutan kata, dialek) butuh model yang
"mengerti" konteks, bukan cuma regex.

## Urutan jalan

```
01_generate_synthetic_data.py   -> bikin data latih (jalan di laptop manapun, <1 menit)
02_train_ner_model.py           -> fine-tune IndoBERT (WAJIB di Google Colab + GPU)
03_inference_pipeline.py        -> load model, ekstrak teks -> JSON (jalan di laptop biasa)
04_rule_engine_scoring_routing.py -> skor + routing (jalan di laptop manapun, sudah dites di atas)
```

### Langkah 1 — Generate data (di laptop kalian, sekarang juga)

```bash
python 01_generate_synthetic_data.py --n_train 1500 --n_val 250 --n_test 150
```

Sudah saya jalankan dan dicek manual — labelnya benar (lihat contoh output di
chat). **Perluas terus kosakata di bagian atas file** (daftar nama, sinonim
kondisi medis, nama desa) — makin beragam, makin bagus generalisasinya nanti.

### Langkah 2 — Training di Google Colab

1. Buka https://colab.research.google.com, buat notebook baru.
2. Runtime > Change runtime type > **GPU (T4)**.
3. Upload folder `data/` (hasil langkah 1) dan file `02_train_ner_model.py`.
4. Jalankan di cell Colab:
   ```python
   !pip install transformers datasets seqeval evaluate accelerate -q
   !python 02_train_ner_model.py
   ```
5. Tunggu ±5-10 menit. Download folder `model_ner/` hasilnya ke laptop.

### Langkah 3 — Inference

```bash
pip install transformers torch
python 03_inference_pipeline.py
```

Pastikan folder `model_ner/` (hasil download dari Colab) ada di direktori
yang sama.

### Langkah 4 — Sambungkan ke rule engine

```python
from inference_pipeline import ekstrak_profil
from rule_engine_scoring_routing import hitung_skor, buat_routing_card

profil = ekstrak_profil(teks_dari_relawan)
skor = hitung_skor(profil)
routing = buat_routing_card(profil, skor, sumber_daya_posko)
```

Inilah pipeline penuh, tanpa satu pun panggilan API berbayar.

## Timeline 10 hari (revisi dari rencana 12 hari awal)

| Hari | Fokus | Catatan |
|---|---|---|
| 1 | Perluas kosakata generator + generate 1500+ data | Paling krusial — makin lengkap kosakata, makin akurat model |
| 2 | Training pertama di Colab + cek metrik F1 di test set | Target awal: F1 > 0.85 per entitas. Kalau jauh di bawah, biasanya kosakata kurang variatif |
| 3 | Perbaiki entitas yang lemah (tambah variasi kalimat untuk entitas dengan F1 rendah), training ulang | |
| 4 | Sambungkan inference -> rule engine -> tes 20 kasus manual | |
| 5 | Bangun UI intake (form input + tampilan hasil ekstraksi utk konfirmasi) | Bisa pakai HTML/JS sederhana, model dipanggil lewat backend Python kecil (Flask/FastAPI) |
| 6 | Dashboard koordinator (agregat MERAH/KUNING/HIJAU) | |
| 7 | **Fallback plan**: simpan 5-10 hasil ekstraksi yang sudah benar sebagai contoh hardcoded, untuk jaga-jaga kalau demo live model meleset | |
| 8 | Testing menyeluruh dengan skenario edge case (nama tidak terdeteksi, 2 kondisi sekaligus, dst) | |
| 9 | Video demo + proposal | Tonjolkan: "model kami berjalan offline, tidak butuh API key, tidak butuh sinyal internet di posko" |
| 10 | Final review + submit | |

## Yang harus kalian akui jujur ke juri (dan ini justru kredibel, bukan kelemahan)

- Model dilatih dari data **sintetis**, bukan data lapangan asli. Sebutkan ini
  secara terbuka di bagian "Keterbatasan" proposal — juri menghargai kejujuran
  dibanding klaim berlebihan.
- F1 score di data sintetis biasanya tinggi (karena pola kalimatnya mirip data
  latih) — tapi belum tentu sama tingginya untuk kalimat yang benar-benar
  spontan dari relawan asli. Jelaskan ini sebagai roadmap riset selanjutnya:
  "tahap berikut adalah uji coba dengan rekaman intake asli (dengan izin/anonim)".
- Karena modelnya kecil (IndoBERT-base, ~110M parameter) dan task-nya sempit
  (7 jenis entitas, domain spesifik), training di data sintetis + sedikit
  variasi manual biasanya CUKUP untuk demo yang meyakinkan — ini bukan tugas
  open-domain seperti chatbot umum.

## Rencana cadangan (sangat disarankan)

Tetap simpan opsi LLM API (Claude/Gemini) sebagai **fallback** kalau:
- Model NER hasil training kalian belum akurat menjelang hari-H, atau
- Juri bertanya "bagaimana kalau ada kalimat yang model belum pernah lihat?"

Jawaban yang kuat: *"Model utama kami berjalan offline tanpa biaya API. Untuk
kasus tepi yang belum tercakup, sistem bisa fallback ke LLM API hanya saat
ada koneksi internet — tapi inti sistem tidak bergantung padanya."* Ini
menunjukkan kalian paham trade-off teknis, bukan cuma ikut tren.
