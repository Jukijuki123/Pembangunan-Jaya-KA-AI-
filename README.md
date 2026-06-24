# SIGAP AI

**Sistem Cerdas Asesmen Kerentanan Pengungsi untuk Relawan PMI**
LKS Dikmen Tingkat Nasional 2026 — Ekshibisi Kecerdasan Artifisial · **Studi Kasus 1 (Komunitas)** · Organisasi Inspirasi: **PMI**

> **Pengguna spesifik:** relawan intake KSR/TSR PMI di meja registrasi posko pengungsian, dalam **72 jam pertama** pasca-bencana, saat ratusan keluarga tiba dalam kondisi panik dan belum terdata.
>
> **Prinsip non-negotiable:** *AI membantu, manusia memutuskan.* Setiap output AI dikonfirmasi manusia sebelum tersimpan/dieksekusi/dikirim. **Skor kerentanan dihitung oleh kode (rule engine) yang dapat diaudit — bukan oleh LLM.**

Aplikasi **Next.js 15 production-grade** (App Router, TypeScript) — bukan single-file HTML.

---

## Daftar Isi
1. [Cara Kerja (Alur AI)](#1-cara-kerja-alur-ai)
2. [Tech Stack](#2-tech-stack)
3. [Struktur Folder](#3-struktur-folder)
4. [Setup Lokal (Langkah demi Langkah)](#4-setup-lokal)
5. [Deploy ke Vercel](#5-deploy-ke-vercel)
6. [Akun & Data Demo](#6-akun--data-demo)
7. [Human Oversight 3 Lapis](#7-human-oversight-3-lapis)
8. [Responsible AI](#8-responsible-ai)
9. [Panduan Demo untuk Juri](#9-panduan-demo-untuk-juri)
10. [Pemetaan ke Rubrik Penilaian](#10-pemetaan-ke-rubrik-penilaian)

---

## 1. Cara Kerja (Alur AI)

Inti SIGAP AI memisahkan **penalaran** dari **skoring** — ini yang membuatnya auditable & adil:

```
Teks bebas relawan (ketik/suara)
        │
        ▼
(a) GEMINI 2.5 Flash  ──► ekstraksi + reasoning → JSON terstruktur (responseSchema)
        │                 (HANYA dipanggil dari server; API key tak pernah ke client)
        ▼
(b) RULE ENGINE (TypeScript, deterministik)  ──► skor + level MERAH/KUNING/HIJAU
        │                 (kode yang bisa ditunjukkan baris-per-baris ke juri)
        ▼
(c) KARTU KONFIRMASI  ──► relawan koreksi/konfirmasi tiap field (null = oranye)
        │                 → baru tersimpan (Lapis 1 oversight)
        ▼
Dashboard koordinator (real-time) · Rujukan per instansi · Laporan harian
```

**Formula skor (deterministik, di `src/lib/scoring.ts`):**
```
skor = (usia ≥ 60 ? +2 : 0)
     + (3 × jumlah kondisi medis kritis)
     + (ada balita < 1 th ? +3 : 0)
     + (obat tidak tersedia ? +4 : 0)
     + (mobilitas 'tidak_bisa' ? +2 : 0)

level: 0–4 HIJAU | 5–8 KUNING | 9+ MERAH
```

---

## 2. Tech Stack

| Layer | Pilihan | Catatan |
|---|---|---|
| Framework | **Next.js 15** (App Router) + TypeScript | Server Actions (mutasi) + Route Handlers (AI) |
| Database | **PostgreSQL** via Neon.tech / Supabase (free tier) | connection pooling untuk serverless |
| ORM | **Prisma** | migration + type-safety |
| Auth/RBAC | **Auth.js (NextAuth v5)**, Credentials + JWT | role di JWT; proteksi via `middleware.ts` |
| Styling | **Tailwind CSS** | mobile-first |
| AI Engine | **Gemini** `@google/genai`, `gemini-2.5-flash` (fallback `gemini-2.5-flash-lite`) | hanya dari server, `responseSchema` |
| Realtime | **Polling SWR** (`refreshInterval` 7s) | lebih reliable dari SSE di serverless free-tier |
| Hosting | **Vercel** free tier | env: `DATABASE_URL`, `GEMINI_API_KEY`, `AUTH_SECRET` |

> Semua free-tier. Tidak ada dependensi berbayar.

---

## 3. Struktur Folder

```
SIGAP/
├─ prisma/
│  ├─ schema.prisma          # model: User, Kasus, AuditLog, PoskoConfig, LaporanHarian
│  └─ seed.ts                # akun admin/relawan + posko contoh
├─ src/
│  ├─ env.ts                 # validasi env var saat boot (Zod)
│  ├─ auth.config.ts         # konfigurasi Auth.js edge-safe (untuk middleware)
│  ├─ auth.ts                # Credentials provider (Node runtime, bcrypt + Prisma)
│  ├─ types/next-auth.d.ts   # augmentasi tipe session (role)
│  ├─ lib/
│  │  ├─ prisma.ts           # Prisma client singleton
│  │  ├─ gemini.ts           # panggilan Gemini (ekstraksi + laporan) — SERVER ONLY
│  │  ├─ scoring.ts          # ⭐ RULE ENGINE deterministik (skor & level)
│  │  ├─ synonyms.ts         # peta istilah awam→medis (mitigasi bias)
│  │  ├─ aggregate.ts        # agregat posko (dashboard & laporan)
│  │  ├─ audit.ts            # penulis AuditLog
│  │  ├─ csv.ts              # generator CSV rujukan
│  │  ├─ utils.ts            # haversine, kode unik, label level
│  │  └─ types.ts            # tipe + skema Zod hasil ekstraksi/skor
│  ├─ components/
│  │  ├─ ui.tsx, Toast.tsx, AppHeader.tsx
│  │  └─ admin/              # StatCards, Charts, KasusTable, LaporanPanel, UserPanel, ResetPanel, dto
│  └─ app/
│     ├─ layout.tsx, page.tsx, globals.css
│     ├─ login/              # halaman login
│     ├─ actions/            # Server Actions: kasus, mandiri, laporan, admin
│     ├─ api/
│     │  ├─ auth/[...nextauth]/route.ts
│     │  ├─ agent/extract/route.ts        # ⭐ POST: Gemini → rule engine → Kartu
│     │  ├─ dashboard/route.ts            # GET: sumber polling SWR
│     │  └─ rujukan/[instansi]/csv/route.ts
│     ├─ (relawan)/intake/   # A. Intake relawan (textarea/suara → Kartu Konfirmasi)
│     ├─ mandiri/[kodePosko]/# B. Lapor mandiri (publik, QR, geo anti-spam, kamera)
│     ├─ (admin)/admin/      # C. Dashboard master CRUD + alarm + laporan + user + reset
│     └─ (admin)/rujukan/    # D. Output per instansi + unduh CSV
├─ middleware.ts             # RBAC: lindungi (relawan)/(admin) berdasarkan role JWT
├─ .env.example              # template environment variable
└─ (file Python ML alternatif: 01..04_*.py, README_ML.md — pipeline offline opsional)
```

---

## 4. Setup Lokal

### Prasyarat
- Node.js ≥ 20
- Akun **Neon.tech** (atau Supabase) — gratis
- **Gemini API key** dari https://aistudio.google.com/apikey — gratis

### Langkah

```bash
# 1) Install dependency
npm install

# 2) Siapkan environment
cp .env.example .env
#   lalu isi DATABASE_URL, GEMINI_API_KEY, AUTH_SECRET
#   generate AUTH_SECRET: npx auth secret   (atau: openssl rand -base64 32)

# 3) Buat tabel di database (migration)
npx prisma migrate dev --name init

# 4) Isi data awal (akun + posko contoh)
npm run db:seed

# 5) Jalankan
npm run dev
#   buka http://localhost:3000
```

### Skrip yang tersedia
```bash
npm run dev            # dev server
npm run build          # prisma generate + next build
npm run start          # jalankan hasil build
npm run db:seed        # seed akun + posko
npm run prisma:studio  # GUI lihat/edit DB
npm run prisma:migrate # migrasi dev
npm run prisma:deploy  # migrasi production (CI/Vercel)
```

---

## 5. Deploy ke Vercel

1. Push repo ke GitHub, **Import Project** di Vercel.
2. Tambahkan Environment Variables di Vercel:
   - `DATABASE_URL` — connection string **pooled** dari Neon (host `...-pooler...`)
   - `DIRECT_URL` — *(opsional)* connection string **non-pooled** untuk migrasi
   - `GEMINI_API_KEY`
   - `AUTH_SECRET`
3. **Build Command** sudah benar (`prisma generate && next build`).
4. Setelah deploy pertama, jalankan migrasi + seed sekali:
   ```bash
   # dari lokal, dengan DATABASE_URL production di .env:
   npx prisma migrate deploy
   npm run db:seed
   ```

> Catatan serverless: Prisma client sudah singleton (`src/lib/prisma.ts`) dan rute AI memakai `runtime = "nodejs"`. Middleware memakai config Auth.js edge-safe (tanpa Prisma/bcrypt) sehingga aman di Edge.

---

## 6. Akun & Data Demo

Setelah `npm run db:seed`:

| Role | Username | Password |
|---|---|---|
| ADMIN (koordinator/medis) | `admin` | `admin123` |
| RELAWAN (intake) | `relawan` | `relawan123` |

**Posko contoh:** kode `POSKO01` → halaman mandiri di `/mandiri/POSKO01` (Monas, radius 2 km).

> ⚠ Ganti password default sebelum pemakaian nyata.

**3 contoh kalimat intake** (tombol "Contoh" tersedia di halaman `/intake`):
1. *"Bu Siti, 67 tahun, diabetes, tinggal sendiri, bawa cucu 8 bulan, rumahnya habis kena longsor, tidak bawa obat sama sekali."* → MERAH
2. *"Pak Ahmad 72 tahun, mantan pasien stroke, datang sama istri 68 tahun, bawa cucu 3 bulan. Rumah di Kampung Cikaret tenggelam. Tidak bawa obat pengencer darah."* → MERAH
3. *"Bu Rina, 34 tahun, hamil 8 bulan, datang sama anak 2 tahun. Suami hilang belum ketemu."* → KUNING/MERAH

---

## 7. Human Oversight 3 Lapis

| Lapis | Siapa | Aksi wajib | Tercatat di AuditLog |
|---|---|---|---|
| **1** | Relawan intake | Konfirmasi tiap field di **Kartu Konfirmasi** sebelum kasus tersimpan | `KONFIRMASI_INTAKE` |
| **2** | Admin/medis | Klik **Verifikasi Medis** untuk tiap kasus MERAH. Tanpa verifikasi → diperlakukan sebagai KUNING + catatan "menunggu verifikasi medis" | `VERIFIKASI_MEDIS` |
| **3** | Koordinator | Review & edit draft **Laporan Harian** dari AI sebelum klik **Kirim** — tidak ada laporan terkirim otomatis | `GENERATE/EDIT/KIRIM_LAPORAN` |

Semua aksi yang menyentuh data (konfirmasi, verifikasi, edit, hapus, kirim, reset) ditulis ke **AuditLog**.

---

## 8. Responsible AI

**Risiko 1 — Bias ekstraksi (dialek/istilah lokal).**
Mitigasi: (a) peta sinonim awam→medis disuntik ke prompt (`src/lib/synonyms.ts`); (b) **skor dihitung rule engine deterministik**, bukan LLM; (c) field `null` ditandai **oranye** dan wajib dikonfirmasi relawan.

**Risiko 2 — Privasi data pengungsi.**
Mitigasi: (a) nama tidak ikut ke laporan agregat AI (hanya angka); (b) **kode unik anonim** (`KSS-…`) sebagai ID; (c) **hak hapus** — "Reset Semua Data" admin (konfirmasi 2×); (d) API key AI hanya di server; (e) data mandiri di luar radius posko ditandai `isSpam` dan disembunyikan dari dashboard utama.

**Di mana penilaian manusia berperan:** lihat [Human Oversight 3 Lapis](#7-human-oversight-3-lapis) — sistem **tidak bisa** maju ke tahap berikut tanpa konfirmasi manusia.

---

## 9. Panduan Demo untuk Juri

Alur demo 10 menit yang disarankan:
1. **/intake** — pilih "Contoh 1", klik **Analisis dengan AI** → tunjukkan Kartu Konfirmasi, sorot field oranye & **rincian skor** (tekankan: dihitung kode, bukan AI) → **Konfirmasi & Simpan**.
2. **/admin** — tunjukkan kartu statistik + chart, **alarm MERAH berkedip + beep**, klik **Verifikasi Medis** (Lapis 2).
3. **/admin → Laporan Harian** — **Buat draft dengan AI**, edit sedikit, **Kirim** (Lapis 3).
4. **/rujukan** — tunjukkan tabel per instansi + **Unduh CSV**.
5. **/mandiri/POSKO01** (HP) — isi formulir, **bagikan lokasi**, kirim → tampil **QR Code**.

**Fallback bila internet/AI bermasalah saat demo:**
- Halaman `/intake` punya tombol **"Isi manual"** → Kartu Konfirmasi tetap bisa diisi tanpa AI; skor & alur penyimpanan tetap jalan penuh.
- Gemini sudah ber-fallback otomatis ke `gemini-2.5-flash-lite`.
- 3 contoh kalimat hardcoded selalu tersedia.

---

## 10. Pemetaan ke Rubrik Penilaian

| Kriteria (bobot) | Bagaimana SIGAP AI memenuhinya |
|---|---|
| Pemahaman masalah & relevansi (20%) | Pengguna & momen spesifik (relawan intake, 72 jam pertama); gap nyata vs MRA/SIAMO/InaRISK |
| Kreativitas & inovasi (20%) | Pola **reasoning AI + skoring deterministik** terpisah; intake bahasa natural→data terstruktur; mode mandiri+QR |
| Pemanfaatan AI efektif/berdampak (20%) | Output = **tindakan**: triage, prioritisasi, rujukan instansi, draft laporan |
| **Responsible AI (15%)** | 2 risiko + mitigasi + **3 lapis human oversight** + AuditLog + skor auditable |
| **Fungsionalitas (15%)** | 4 antarmuka berfungsi penuh, build produksi hijau, CRUD + RBAC + realtime |
| Kejelasan presentasi (10%) | README ini + panduan demo + skrip video di `SIGAP_AI_LKS2026_FullPlan.md` |

---

*Catatan: file `01..04_*.py` + `README_ML.md` adalah pipeline alternatif (IndoBERT NER + rule engine) untuk mode 100% offline tanpa API — opsional, sebagai roadmap/fallback teknis.*
