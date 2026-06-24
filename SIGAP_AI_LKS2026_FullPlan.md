# SIGAP AI — Rencana Lengkap Kompetisi LKS Dikmen Nasional 2026
**Tim:** Maksimal 5 Siswa SMA | **Durasi:** 12 Hari | **Kasus:** Case 1 — Community

---

## BAGIAN 1: RISET — POLA KEMENANGAN PROYEK AI SEJENIS

### Apa yang Membuat Proyek Menang di Google AI for Good, ITU AI4Good, & Hackathon Pelajar 2023–2026

**Temuan 1 — Pengguna Spesifik, Bukan "Masyarakat Umum"**
Proyek pemenang selalu mendefinisikan pengguna dengan jabatan + situasi + momen kritis. Contoh: *Gurumitra (Google Cloud 2025)* → "guru kelas rangkap di sekolah terpencil, saat menyusun RPP untuk 3 jenjang sekaligus." Bukan "guru Indonesia." Makin spesifik → makin tinggi relevansi di mata juri.

**Temuan 2 — AI Mengintervensi di Titik Kritis, Bukan Sebelum/Sesudah Krisis**
Proyek yang menang menempatkan AI tepat di momen saat keputusan harus dibuat dalam hitungan menit. *RiskWise (Microsoft 2025)* → AI bekerja saat risiko supply chain baru terdeteksi, bukan saat laporan mingguan ditulis. Proyek "dashboard informasi" yang generik tidak menang.

**Temuan 3 — AI Menghasilkan Aksi Nyata, Bukan Hanya Informasi**
Pemenang menghasilkan output berupa tindakan: routing, prioritisasi, referral, saran terstruktur. Bukan sekedar "menampilkan data." Riset Springer (2025) membuktikan AI NLP mencapai 97% akurasi dalam klasifikasi krisis; juri tahu tools yang sudah ada — mereka mencari aplikasi yang menghasilkan *next step* konkret.

**Temuan 4 — Human Oversight = Inti Desain, Bukan Fitur Tambahan**
Proyek Indonesia yang relevan (berdasarkan gap PMI/SIAMO) menunjukkan bahwa sistem yang memaksa manusia mengkonfirmasi output AI *sebelum* data tersimpan mendapat poin lebih tinggi pada kriteria Responsible AI. Oversight bukan checkbox — ia harus mengubah alur kerja.

**Temuan 5 — Data Lokal + Angka Dampak Terverifikasi = Pembeda Utama**
Proyek yang mengutip "45% responden Indonesia tidak bisa membedakan hoaks dari fakta" (Databoks/Statista 2023), "10 bencana/hari rata-rata 2024" (BNPB), dan "8,1 juta orang mengungsi 2024" (BNPB) jauh lebih meyakinkan daripada proyek dengan klaim global abstrak.

---

## BAGIAN 2: REKOMENDASI PROYEK — SIGAP AI

### Judul
**SIGAP AI — Sistem Cerdas Asesmen Kerentanan Pengungsi untuk Relawan PMI**

### Kasus yang Dipilih
**Case 1 — Community** | Target Organisasi: **PMI (Palang Merah Indonesia)**

---

### Pengguna Spesifik (Named User)
**Relawan Intake KSR/TSR PMI** yang berjaga di meja registrasi posko pengungsian, dalam 72 jam pertama setelah bencana, saat ratusan keluarga tiba dalam kondisi panik dan tidak terdata.

*(Bukan "masyarakat umum." Bukan "korban bencana." Relawan intake ini adalah orang yang menentukan apakah seorang ibu hamil 8 bulan langsung diarahkan ke tenda medis, atau masuk antrean umum bersama 400 orang lainnya.)*

---

### Gap yang Belum Ada Solusinya

| Tool yang Ada | Apa yang Bisa Dilakukan | Apa yang TIDAK Bisa Dilakukan |
|---|---|---|
| MRA (PMI) | Laporan kejadian bencana ke pusat | Triage kerentanan pengungsi yang tiba |
| SIAMO (PMI) | Administrasi data relawan | Ekstraksi kebutuhan keluarga saat intake |
| InaRISK (BNPB) | Pemetaan risiko wilayah | Manajemen kebutuhan di posko aktif |
| WhatsApp grup posko | Koordinasi informal | Agregasi data terstruktur |

**Gap:** Tidak ada satu pun tool yang membantu relawan intake dalam waktu nyata untuk: (1) mengekstrak profil kerentanan keluarga secara cepat, (2) memprioritaskan siapa yang butuh bantuan mendesak, (3) mencocokkan kebutuhan dengan sumber daya yang tersedia di posko, dan (4) menghasilkan rujukan tertulis yang siap dikirim ke koordinator.

---

### Cara AI Bekerja Secara Novel (Bukan Sekadar Chatbot atau Classifier)

**Mekanisme: Structured Extraction → Vulnerability Scoring → Routing Intelligence**

Relawan berbicara/mengetik dalam bahasa natural Indonesia: *"Ini Bu Siti, 67 tahun, diabetes, tinggal sendiri, bawa cucu 8 bulan, rumahnya habis kena longsor, tidak bawa obat sama sekali."*

AI melakukan tiga hal sekaligus:
1. **Ekstraksi Terstruktur**: Mengurai teks menjadi field data: `{nama, usia, kondisi_medis, tanggungan_rentan, asal_bencana, obat_tersedia}`
2. **Skor Kerentanan**: Mengkalkulasi skor berdasarkan standar IFRC/Sphere — lansia + diabetes + bayi bawah 1 tahun + tidak ada obat = **MERAH (Kritis)**
3. **Routing Card**: Menghasilkan kartu referral: *"Arahkan ke: (1) Tenda Medis dalam 10 menit untuk insulin/obat. (2) Area balita untuk susu formula. (3) Tenda psikososial jika tersedia."*

Relawan mengkonfirmasi atau mengoreksi setiap field sebelum data tersimpan. Koordinator posko melihat dashboard real-time: "Saat ini: 12 ibu hamil, 47 lansia, 29 balita < 2 tahun, 8 pasien obat kronis tanpa stok."

**Yang membuat ini novel:** AI tidak sekadar menampilkan informasi — ia menghasilkan tindakan spesifik yang dapat langsung dieksekusi relawan tanpa training khusus, dalam bahasa Indonesia, dalam kondisi chaos, dengan konfirmasi manusia di setiap langkah.

---

### Angka Dampak Terverifikasi (Indonesia)
- **8.136.271 orang** mengungsi/terdampak bencana 2024 (BNPB, Data Bencana 2024)
- **2.107 kejadian bencana** di 2024 = rata-rata **10 bencana/hari** (BNPB, Jan 2025)
- **540 meninggal**, 11.531 luka-luka, 80.304 unit rumah rusak (BNPB 2024)
- PMI memiliki **440+ cabang** kabupaten/kota, setiap bencana menengah-besar membuka posko
- Intake manual saat ini: estimasi 15–20 menit/keluarga → dengan AI: target 3–5 menit
- Bantuan sering tidak tepat sasaran karena data kerentanan tidak tercatat (KPAI/Dinsos, laporan lapangan 2025)

---

### Human Oversight yang Menjadi Inti Desain (Bukan Bolted-On)

Alur kerja SIGAP AI **tidak bisa bergerak ke tahap berikutnya** tanpa konfirmasi manusia:

```
AI ekstrak → Relawan verifikasi SETIAP FIELD → Baru tersimpan
AI flag "MERAH" → Tenaga medis posko konfirmasi → Baru jadi rujukan resmi  
AI generate dashboard → Koordinator PMI review → Baru diteruskan ke pusat
```

Tiga lapis pengawasan:
1. **Relawan intake** — konfirmasi data per keluarga
2. **Tenaga medis/gizi posko** — validasi flag kritis sebelum tindakan
3. **Koordinator PMI cabang** — review agregat harian sebelum laporan dikirim

---

## BAGIAN 3: RENCANA IMPLEMENTASI LENGKAP

---

### 3.1 TECH STACK — Tool + Alasan + Konfirmasi Free Tier

| Komponen | Tool | Alasan Dipilih | Status Free Tier |
|---|---|---|---|
| **Frontend/UI** | React (di dalam Artifact Claude) atau HTML/JS | Tidak perlu server, deploy instan, responsive mobile | Gratis penuh |
| **AI Engine** | Claude API (`claude-sonnet-4-6`) | Terbaik untuk structured extraction + Bahasa Indonesia, 5 juta token/bulan free tier | Gratis (Anthropic free tier) |
| **AI Backup** | Google Gemini 1.5 Flash | 1,5 juta token/hari gratis, fallback jika quota habis | Gratis (Google AI Studio) |
| **Database Demo** | Browser localStorage + JSON | Tidak perlu backend, data tetap antara sesi, cukup untuk demo | Gratis penuh |
| **Database Produksi** | Supabase Free Tier | PostgreSQL gratis, 500MB, REST API otomatis | Gratis (500MB, 50K req/hari) |
| **Hosting Prototype** | Vercel / GitHub Pages | Deploy dari GitHub, HTTPS otomatis | Gratis |
| **Desain UI** | Tailwind CSS (CDN) | Tidak perlu build process, responsive by default | Gratis |
| **Offline Support** | Service Worker (bawaan browser) | Posko sering sinyal buruk — data buffered saat offline | Gratis |

**Catatan:** Seluruh stack berjalan tanpa biaya. Tidak ada dependensi berbayar.

---

### 3.2 SUMBER DATA — Nama + URL + Metode Generasi Sintetis

**Data Nyata (Public/Open):**

| Dataset | URL | Kegunaan dalam SIGAP |
|---|---|---|
| Data Kejadian Bencana BNPB 2024 | `data.bnpb.go.id/dataset/kompilasi-data-jumlah-dan-dampak-kejadian-bencana-2024` | Konteks jumlah korban, proporsi jenis bencana |
| Portal Satu Data BNPB | `data.bnpb.go.id` | Data historis bencana per provinsi |
| Standar Sphere (IFRC) | `spherestandards.org/handbook` | Kriteria kerentanan: kalori/hari ibu hamil, jarak air bersih, rasio toilet |
| Panduan Penilaian Kebutuhan PMI | `pmi.or.id` (dokumen teknis) | Kategori kerentanan resmi PMI Indonesia |

**Data Sintetis untuk Demo (Tim Buat Sendiri):**

Buat 200 profil keluarga pengungsi fiktif dalam format JSON menggunakan prompt:

```
Buat 200 profil JSON keluarga pengungsi bencana banjir di Jawa Barat.
Setiap profil berisi: nama_kk, usia_kk, jenis_kelamin, jumlah_anggota,
kondisi_medis_kritis (list), tanggungan_rentan (ibu_hamil/balita/lansia/difabel),
kebutuhan_mendesak (list), obat_tersedia (boolean), asal_desa.
Distribusi: 40% normal, 30% rentan sedang, 20% rentan tinggi, 10% kritis.
Output: array JSON valid, tidak ada teks lain.
```

Gunakan data sintetis ini untuk demo dan testing scoring algorithm.

---

### 3.3 ALUR AI — Input → Proses → Output

```
INPUT:   Teks bebas relawan dalam Bahasa Indonesia (ketik atau suara-to-text)
         Contoh: "Pak Ahmad 72 tahun, mantan pasien stroke, datang sama istri 
         68 tahun, bawa cucu 3 bulan. Rumah di Kampung Cikaret tenggelam. 
         Tidak bawa obat pengencer darah."

PROSES 1 [Ekstraksi Terstruktur - Claude API]:
         Input teks → JSON terstruktur:
         { nama: "Ahmad", usia: 72, kondisi: ["riwayat stroke", "antikoagulan"],
           tanggungan: [{usia:68}, {usia:0.25}], obat_tersedia: false,
           bencana_jenis: "banjir", lokasi_asal: "Kampung Cikaret" }

PROSES 2 [Vulnerability Scoring - Rule Engine]:
         Skor = Σ(bobot_faktor × ada/tidak)
         Faktor: usia>60 (+2), kondisi_medis_kritis (+3/kondisi),
         balita<1th (+3), obat_kritis_absen (+4), difabel (+2)
         Skor 0-4 = HIJAU | 5-8 = KUNING | 9+ = MERAH

PROSES 3 [Routing Intelligence - Claude API]:
         Skor + profil → Routing card Bahasa Indonesia:
         Prioritas 1: Tenda Medis (obat antikoagulan + monitoring)
         Prioritas 2: Area Bayi (susu formula usia <6 bulan)
         Catatan: Pasangan lansia — jangan pisahkan lokasi tidur

OUTPUT:  (A) Kartu profil terstruktur untuk konfirmasi relawan
         (B) Routing card untuk tindakan langsung
         (C) Penambahan otomatis ke dashboard agregat koordinator
         (D) Alert real-time jika flag MERAH: bunyi + highlight merah di layar koordinator
```

---

### 3.4 TEMPLATE PROMPT LLM — SIAP PAKAI (Copy-Paste)

**Prompt 1: Ekstraksi Terstruktur**

```
Kamu adalah asisten intake relawan PMI di posko pengungsian bencana Indonesia.

TUGAS: Ekstrak informasi dari teks bebas relawan menjadi JSON terstruktur.

ATURAN WAJIB:
- Hanya kembalikan JSON valid, tidak ada teks lain, tidak ada markdown
- Jika informasi tidak disebutkan, gunakan null (bukan asumsi)
- Pertahankan nama asli apa adanya
- Usia dalam angka (tahun); bayi <1 tahun tulis 0
- kondisi_medis: hanya kondisi yang EKSPLISIT disebutkan
- obat_tersedia: true/false/null

FORMAT OUTPUT WAJIB:
{
  "nama_kk": string,
  "usia_kk": number,
  "jenis_kelamin": "L"|"P"|null,
  "anggota_keluarga": [{"hubungan": string, "usia": number, "kondisi_khusus": string|null}],
  "kondisi_medis_kritis": [string],
  "obat_tersedia": boolean|null,
  "mobilitas": "mandiri"|"bantuan"|"tidak_bisa"|null,
  "asal_lokasi": string|null,
  "informasi_tambahan": string|null
}

TEKS RELAWAN:
{{TEKS_INPUT_RELAWAN}}
```

**Prompt 2: Vulnerability Assessment + Routing**

```
Kamu adalah sistem triage kerentanan pengungsi bencana berstandar IFRC/Sphere.

TUGAS: Berikan penilaian kerentanan dan kartu routing untuk profil berikut.

PROFIL PENGUNGSI:
{{JSON_PROFIL_DARI_PROMPT_1}}

SUMBER DAYA TERSEDIA DI POSKO INI:
{{JSON_SUMBER_DAYA_POSKO}}
Contoh: {"tenda_medis": true, "dokter": false, "perawat": 2, "susu_formula": true, 
"obat_diabetes": false, "kursi_roda": 1, "area_ibu_hamil": true}

ATURAN PENILAIAN (IKUTI KETAT):
MERAH (skor 9+): Ancaman jiwa dalam 24 jam tanpa intervensi
KUNING (5-8): Kebutuhan khusus dalam 72 jam  
HIJAU (0-4): Kebutuhan dasar standar

OUTPUT WAJIB (JSON valid, tidak ada teks lain):
{
  "skor_kerentanan": number,
  "level_prioritas": "MERAH"|"KUNING"|"HIJAU",
  "alasan_utama": string (1 kalimat, Bahasa Indonesia),
  "tindakan_segera": [{"prioritas": 1..3, "aksi": string, "alasan": string, "tersedia_di_posko": boolean}],
  "catatan_relawan": string,
  "perlu_konfirmasi_medis": boolean
}
```

**Prompt 3: Daily Summary untuk Koordinator**

```
Kamu adalah asisten koordinator posko pengungsian PMI.

DATA AGREGAT POSKO HARI INI:
{{JSON_AGREGAT_SEMUA_KELUARGA}}

TUGAS: Buat laporan ringkas untuk dikirim ke PMI Cabang. Maksimal 150 kata.
Format: Paragraf singkat + daftar kebutuhan kritis yang belum terpenuhi.
Bahasa: Formal Indonesia, sesuai format laporan PMI.
Sertakan: jumlah total jiwa, breakdown kategori kerentanan, 3 gap kebutuhan terbesar.
```

---

### 3.5 JADWAL 12 HARI — DELIVERABLE HARIAN

| Hari | Fokus | Deliverable Konkret | PIC |
|---|---|---|---|
| **1** | Riset + Desain Sistem | Dokumen kebutuhan 2 halaman: user flow, 5 skenario kasus edge, wireframe tangan | Semua |
| **2** | Setup & Prototyping Awal | Repo GitHub aktif, HTML skeleton dengan 3 halaman (intake, konfirmasi, dashboard), Tailwind installed | Dev 1 |
| **3** | Integrasi Claude API | API call berhasil: teks input → JSON output di console browser | Dev 1+2 |
| **4** | Form Intake + Konfirmasi UI | Halaman intake berfungsi: relawan ketik → AI ekstrak → tampil untuk dikonfirmasi | Dev 1+2 |
| **5** | Vulnerability Scoring Engine | Rule engine selesai: JSON profil → skor + level MERAH/KUNING/HIJAU | Dev 2 |
| **6** | Routing Card + Alert | Routing card muncul dengan tindakan spesifik; alert merah untuk kasus kritis | Dev 1+2 |
| **7** | Dashboard Koordinator | Dashboard real-time: grafik breakdown kerentanan, counter per kategori, list MERAH aktif | Dev 2+3 |
| **8** | Data Sintetis + Testing | 50 profil sintetis diuji; edge cases: tidak ada nama, kondisi ganda, lansia + balita | Dev 3 |
| **9** | Polish UI + Offline Mode | UI responsif mobile, service worker untuk offline buffering, loading state | Dev 1 |
| **10** | Responsible AI Implementation | Audit log tersimpan, uncertainty flag di output AI, disclaimer tampil, human confirmation wajib | Semua |
| **11** | Video Demo + Proposal | Video 3 menit selesai (di-record), draft proposal 4 halaman selesai ditulis | Presentasi 1+2 |
| **12** | Final Review + Submit | Bug fix terakhir, proposal difinalisasi, repo README lengkap, submit | Semua |

**Pembagian Peran Tim (5 Orang):**
- Dev 1: Frontend React/HTML + API integration
- Dev 2: Scoring engine + dashboard logic
- Dev 3: Data sintetis + testing + bug fix
- Presentasi 1: Proposal + narasi penelitian
- Presentasi 2: Demo video + desain visual

---

### 3.6 RESPONSIBLE AI — 2 RISIKO + MITIGASI + HUMAN OVERSIGHT

---

**RISIKO 1: Bias dalam Penilaian Kerentanan**

*Deskripsi:* Model bahasa dapat memberi skor kerentanan tidak akurat jika teks input mengandung dialek daerah, pengucapan tidak baku, atau kondisi medis yang dideskripsikan dengan istilah lokal (misalnya: "darah tinggi" bukan "hipertensi"). Ini dapat menyebabkan keluarga berisiko tinggi terklasifikasi lebih rendah dari seharusnya (false negative), atau keluarga sehat dikirim ke tenda medis (false positive).

*Mitigasi:*
1. **Prompt mencantumkan daftar sinonim lokal** — "gula" = diabetes, "stroke" = "lumpuh mendadak", "sesak" = gangguan pernapasan.
2. **Skor dihitung oleh rule engine deterministik**, bukan langsung oleh LLM — LLM hanya mengekstrak teks, skor dihitung oleh kode yang dapat diaudit.
3. **Field yang tidak terdeteksi ditampilkan sebagai `null` dengan warna oranye** — relawan diminta konfirmasi manual sebelum data disimpan.
4. **Testing dengan 50+ kasus sintetis** mencakup representasi dari Jawa, Sumatera, Sulawesi, NTT sebelum demo.

*Indikator Keberhasilan:* Tingkat konfirmasi relawan ≥ 90% tanpa koreksi field (uji pada data sintetis).

---

**RISIKO 2: Penyalahgunaan Data Pribadi Pengungsi**

*Deskripsi:* Data yang dikumpulkan (nama, usia, kondisi medis, lokasi asal) adalah data sensitif. Jika bocor, dapat digunakan untuk diskriminasi, penargetan, atau mempermalukan korban. Dalam konteks posko yang ramai, perangkat dapat ditinggal terbuka.

*Mitigasi:*
1. **Tidak ada data yang dikirim ke server pihak ketiga** — demo berjalan sepenuhnya di browser (localStorage), tidak ada cloud sync pada prototype.
2. **Otentikasi PIN** — perangkat terkunci setelah 5 menit tidak aktif, membutuhkan PIN 4 digit untuk membuka.
3. **Anonimisasi di dashboard koordinator** — nama diganti ID kasus (misal: "KSS-2024-0047"), hanya nomor kasus yang tampil di agregat.
4. **Hak hapus data** — koordinator PMI dapat menghapus semua data posko setelah status darurat berakhir, satu klik.
5. **Tidak menyimpan percakapan ke server AI** — Claude API tidak menyimpan conversation history (confirmed per ToS Anthropic).

*Indikator Keberhasilan:* Tidak ada nama asli terlihat di dashboard agregat; data terhapus bersih dalam <1 menit setelah perintah koordinator.

---

**MEKANISME HUMAN OVERSIGHT — TIGA LAPIS**

```
LAPIS 1 — RELAWAN INTAKE (konfirmasi per keluarga):
Setiap output AI ditampilkan dalam mode "pending konfirmasi."
Tidak ada data tersimpan tanpa klik KONFIRMASI dari relawan.
Tombol KOREKSI tersedia untuk setiap field dengan nilai null atau 
meragukan (ditandai warna oranye).
Waktu konfirmasi tercatat dalam audit log.

LAPIS 2 — TENAGA MEDIS POSKO (validasi kasus MERAH):
Setiap flag MERAH menghasilkan alert di perangkat koordinator.
Tenaga medis harus mengklik VERIFIKASI MEDIS atau TURUNKAN KE KUNING
sebelum kasus masuk antrian tindakan.
Jika tidak ada tenaga medis, flag otomatis ke KUNING dengan catatan
"menunggu verifikasi medis — tangani dengan protokol Kuning dulu."

LAPIS 3 — KOORDINATOR PMI (laporan harian):
AI menghasilkan draft laporan agregat harian.
Koordinator review, edit jika diperlukan, lalu klik KIRIM KE PMI CABANG.
Tidak ada laporan terkirim otomatis tanpa persetujuan koordinator.
Semua riwayat edit laporan tersimpan.
```

---

### 3.7 SKRIP VIDEO DEMO (3 MENIT)

---

**[00:00–00:30] HOOK 30 DETIK — MASALAH**

```
[Visual: footage footage banjir/longsor, keluarga mengungsi, antrean panjang di posko]

NARATOR (voice-over, tenang):
"Tahun 2024. Indonesia. Rata-rata 10 bencana setiap hari.
Delapan juta orang mengungsi.

[Potong ke: relawan duduk di meja intake, tumpukan formulir kertas]

Di posko ini, satu relawan harus mendaftarkan 200 keluarga.
Setiap keluarga, 15–20 menit mengisi formulir manual.

[Potong ke: ibu hamil besar duduk di antrean, kelelahan]

Tanpa sistem yang membantu, siapa yang paling rentan
sering justru yang paling lama menunggu."
```

---

**[00:30–02:30] DEMO LANGSUNG 2 MENIT**

```
[Layar laptop/HP menampilkan antarmuka SIGAP AI]

PRESENTER (sambil demo):
"Ini SIGAP AI. Alat untuk relawan intake PMI.

[Ketik di kolom input:]
'Bu Rina, 34 tahun, hamil 8 bulan, datang sama anak 2 tahun.
Suami hilang belum ketemu. Tidak bawa apa-apa dari rumah.'

[Tekan ANALISIS — loading 2 detik — hasil muncul]

AI langsung mengekstrak: ibu hamil trimester 3, balita 2 tahun,
kepala keluarga perempuan, suami tidak diketahui.
Skor kerentanan: 11 poin — MERAH.

[Tampilkan routing card]

Sistem langsung memberi arahan: 
Satu — Area ibu hamil, prioritas tidur bukan lantai.
Dua — Konsultasi bidan dalam 2 jam.
Tiga — Daftar ke pencarian orang hilang PMI.

[Klik KONFIRMASI — data tersimpan]

Relawan klik konfirmasi. Tiga klik. Tiga menit.
Data masuk ke dashboard koordinator secara real-time.

[Pindah ke tab Dashboard]

Koordinator posko melihat: 47 jiwa MERAH saat ini.
12 ibu hamil. 23 balita di bawah 2 tahun. 8 pasien tanpa obat kritis.

Dari data ini, koordinator tahu persis:
berapa susu formula dibutuhkan malam ini,
dan apakah perlu minta bidan tambahan dari PMI Cabang.

AI tidak memutuskan sendiri. Setiap aksi dikonfirmasi manusia.
Data tidak pernah meninggalkan perangkat tanpa izin koordinator."
```

---

**[02:30–03:00] CLOSE 30 DETIK — DAMPAK**

```
[Visual: grafik sederhana — waktu intake sebelum vs sesudah]

NARATOR:
"SIGAP AI tidak menggantikan relawan.
Ia membuat relawan bisa fokus pada hal yang paling penting:
manusianya, bukan formulirnya.

Jika digunakan di seluruh posko PMI Indonesia —
440 cabang, ribuan bencana setiap tahun —
jutaan jiwa rentan bisa terdata dan tertangani
lebih cepat, lebih tepat, lebih manusiawi.

SIGAP AI. Sistem Cerdas Asesmen Pengungsi.
Dibangun oleh pelajar Indonesia, untuk Indonesia."

[Logo tim + nama anggota]
```

---

### 3.8 OUTLINE PROPOSAL 4 HALAMAN

---

**HALAMAN 1: IDENTIFIKASI MASALAH & SOLUSI**

*Heading 1:* Konteks Kebencanaan Indonesia
- Angka: 2.107 bencana 2024, 8,1 juta terdampak, 10 bencana/hari (sumber: BNPB)
- Narasi: Indonesia = negara paling rawan tsunami, longsor, erupsi di dunia (UN-ISDR)
- Gap spesifik: bantuan sering tidak tepat sasaran karena data kerentanan tidak tercatat (kutip lapangan 2025)

*Heading 2:* Pengguna yang Kami Dukung
- Profil: Relawan intake KSR/TSR PMI, perempuan/laki-laki 18–35 tahun, terlatih pertolongan pertama namun tidak punya sistem digital saat ini
- Momen kritis: 72 jam pertama setelah bencana, ratusan keluarga datang sekaligus
- Pain point: formulir kertas, tidak ada triage, keputusan berdasarkan insting bukan data

*Heading 3:* Tool yang Ada dan Mengapa Tidak Cukup
- Tabel perbandingan: MRA vs SIAMO vs InaRISK vs SIGAP AI
- Kesimpulan gap: tidak ada tool yang mengintegrasikan intake + triage + routing + agregat

---

**HALAMAN 2: DESAIN SOLUSI SIGAP AI**

*Heading 1:* Arsitektur Sistem
- Diagram alur: Teks Input → Ekstraksi AI → Konfirmasi Relawan → Scoring → Routing → Dashboard
- Penjelasan tiap komponen dalam 2–3 kalimat masing-masing
- Penekanan: manusia ada di setiap titik keputusan

*Heading 2:* Teknologi yang Digunakan
- Tabel tech stack (dari 3.1) dengan justifikasi singkat per baris
- Catatan: seluruh stack gratis, open, tidak ada vendor lock-in

*Heading 3:* Inovasi Utama
- Apa yang baru: Natural language intake dalam Bahasa Indonesia informal → structured vulnerability data
- Apa yang membedakan dari chatbot biasa: deterministik scoring + contextual routing + human-in-loop architecture
- Kenapa relevan untuk PMI: sesuai alur kerja KSR/TSR yang sudah ada, bukan mengganti

---

**HALAMAN 3: RESPONSIBLE AI & DAMPAK**

*Heading 1:* Risiko dan Mitigasi (Ringkasan dari 3.6)
- Risiko 1: Bias ekstraksi → mitigasi: sinonim lokal + rule engine deterministik + null flagging
- Risiko 2: Privasi data → mitigasi: local-first, anonimisasi, hak hapus, no-server prototype

*Heading 2:* Mekanisme Human Oversight
- Diagram tiga lapis (relawan → medis → koordinator)
- Penekanan: tidak ada data tersimpan, tidak ada aksi diambil, tidak ada laporan terkirim tanpa konfirmasi manusia

*Heading 3:* Proyeksi Dampak
- Jangka pendek: Posko uji coba → waktu intake turun 75%, error klasifikasi kerentanan turun
- Jangka menengah: Integrasi dengan MRA/SIAMO PMI yang sudah ada
- Jangka panjang: Model dapat diadaptasi untuk KPAI (anak terpisah dari orang tua saat bencana), Komnas HAM (kelompok rentan di konflik)
- Angka: jika dipakai 10% posko PMI aktif/tahun → ~50.000 keluarga rentan terdata lebih cepat

---

**HALAMAN 4: RENCANA PENGEMBANGAN & PENUTUP**

*Heading 1:* Prototype yang Dibangun (12 Hari)
- Screenshot atau mockup antarmuka utama
- Fitur yang sudah berfungsi: intake form, AI ekstraksi, konfirmasi, scoring, routing card, dashboard
- Fitur yang belum (roadmap): integrasi WhatsApp/SIAMO, audio input (suara ke teks), multi-bahasa daerah

*Heading 2:* Rencana Kolaborasi dengan PMI
- Langkah konkret: ajukan ke PMI Cabang terdekat untuk uji coba terbatas di 1 posko simulasi bencana
- Data yang dibutuhkan: feedback form dari 5–10 relawan KSR/TSR
- Tidak perlu dana besar — prototype berjalan di smartphone standar, tidak butuh server berbayar

*Heading 3:* Keterbatasan yang Kami Akui
- Belum diuji di lapangan nyata (hanya data sintetis)
- Akurasi AI pada dialek daerah belum terukur secara sistematis
- Membutuhkan smartphone dengan koneksi sesekali — tidak ideal untuk daerah sangat terpencil

*Heading 4:* Penutup
- Kalimat kunci: SIGAP AI dibangun bukan karena masalahnya mudah, tapi karena terlalu penting untuk dibiarkan tanpa solusi
- Visi: setiap relawan PMI di Indonesia memiliki asisten digital yang bekerja secepat krisis berlangsung

---

## CATATAN AKHIR UNTUK TIM

**Prioritas mutlak hari 1–3:** Pastikan Claude API berjalan dengan prompt Ekstraksi (3.4) menghasilkan JSON valid. Ini adalah inti sistem. Segalanya bergantung padanya.

**Jika quota API habis:** Gunakan Gemini 1.5 Flash sebagai backup dengan prompt yang sama — strukturnya kompatibel.

**Untuk demo:** Siapkan 3 skenario yang sudah di-hardcode sebagai fallback jika demo live gagal (koneksi internet buruk di tempat lomba).

**Kalimat kunci untuk presentasi jika ditanya juri tentang Responsible AI:**
*"Kami tidak membangun AI yang memutuskan siapa yang diselamatkan. Kami membangun AI yang membantu relawan membuat keputusan itu lebih cepat dan lebih berdasarkan data — tetapi keputusan final selalu ada di tangan manusia."*
