/**
 * Pemetaan istilah awam/dialek/daerah -> istilah medis baku.
 *
 * Dipakai di 3 tempat:
 *  1. Disuntikkan ke system instruction Gemini supaya ekstraksi akurat untuk
 *     bahasa informal ("gula" -> diabetes, "darah tinggi" -> hipertensi).
 *  2. Normalisasi cadangan di server (jika LLM tetap mengembalikan istilah awam).
 *  3. PRANA Local Rule Reflex — gazetteer matching di prana.ts.
 *
 * CATATAN PENTING:
 *  - Daftar ini adalah GAZETTEER — makin lengkap, makin presisi sistem.
 *  - Setiap koreksi manusia (human override) di lapangan idealnya otomatis
 *    menambah entri baru ke daftar ini (Active Learning, PRANA Layer 3).
 *  - Urutan: metabolik → kardiovaskular → pernapasan → ginjal → saraf →
 *    jiwa/disabilitas → kulit/tropis → pencernaan → reproduksi → ortopedi →
 *    bahasa daerah → typo umum
 */
export const SINONIM_MEDIS: Record<string, string> = {
  // ─── METABOLIK ───────────────────────────────────────────────
  gula: "diabetes",
  "kencing manis": "diabetes",
  "sakit gula": "diabetes",
  "penyakit gula": "diabetes",
  diabetes: "diabetes",
  diabetis: "diabetes",       // typo umum
  diabtes: "diabetes",        // typo umum
  "gula darah tinggi": "diabetes",
  "gula darah": "diabetes",
  kolesterol: "kolesterol tinggi",
  "kolest": "kolesterol tinggi",   // singkatan slang
  "kolesterol tinggi": "kolesterol tinggi",
  "lemak darah": "kolesterol tinggi",
  "asam urat": "asam urat",
  "encok": "asam urat",       // istilah awam

  // ─── KARDIOVASKULAR ──────────────────────────────────────────
  "darah tinggi": "hipertensi",
  "tekanan darah tinggi": "hipertensi",
  "tensi tinggi": "hipertensi",
  tensi: "hipertensi",         // singkatan slang
  hipertensi: "hipertensi",
  hipertnsi: "hipertensi",     // typo umum
  hipertenzi: "hipertensi",    // typo umum
  "darah rendah": "hipotensi",
  hipotensi: "hipotensi",
  jantung: "penyakit jantung",
  "sakit jantung": "penyakit jantung",
  "penyakit jantung": "penyakit jantung",
  "jantung koroner": "penyakit jantung koroner",
  "jantung lemah": "gagal jantung",
  "gagal jantung": "gagal jantung",
  stroke: "riwayat stroke",
  "lumpuh mendadak": "riwayat stroke",
  "riwayat stroke": "riwayat stroke",
  "serangan jantung": "riwayat serangan jantung",

  // ─── PERNAPASAN ──────────────────────────────────────────────
  sesak: "gangguan pernapasan",
  "sesak napas": "gangguan pernapasan",
  "sesak nafas": "gangguan pernapasan",
  "susah napas": "gangguan pernapasan",
  "susah nafas": "gangguan pernapasan",
  asma: "asma",
  asthma: "asma",              // ejaan Inggris yang sering dipakai
  ampek: "asma",               // istilah Melayu/Betawi
  bengek: "asma",              // istilah Jawa
  tbc: "tuberkulosis",
  "batuk darah": "tuberkulosis",
  "batuk berdarah": "tuberkulosis",
  tuberkulosis: "tuberkulosis",
  "tb paru": "tuberkulosis",
  "paru-paru basah": "pneumonia",
  pneumonia: "pneumonia",
  ispa: "infeksi saluran pernapasan",

  // ─── GINJAL ──────────────────────────────────────────────────
  "cuci darah": "gagal ginjal",
  dialisis: "gagal ginjal",
  ginjal: "penyakit ginjal",
  "sakit ginjal": "penyakit ginjal",
  "gagal ginjal": "gagal ginjal",
  "batu ginjal": "batu ginjal",

  // ─── SARAF / NEUROLOGI ───────────────────────────────────────
  ayan: "epilepsi",
  step: "epilepsi",
  kejang: "epilepsi",
  epilepsi: "epilepsi",
  "kejang demam": "epilepsi",
  "parkinson": "penyakit parkinson",
  "pikun": "demensia",
  "alzheimer": "demensia",
  demensia: "demensia",

  // ─── KESEHATAN JIWA / DISABILITAS ────────────────────────────
  "gangguan jiwa": "gangguan kesehatan jiwa",
  odgj: "gangguan kesehatan jiwa",
  "sakit jiwa": "gangguan kesehatan jiwa",
  skizofrenia: "gangguan kesehatan jiwa",
  "depresi berat": "depresi",
  depresi: "depresi",
  "stress berat": "gangguan kecemasan",
  buta: "disabilitas penglihatan",
  "tidak bisa melihat": "disabilitas penglihatan",
  "gangguan penglihatan": "disabilitas penglihatan",
  tuli: "disabilitas pendengaran",
  "tidak bisa dengar": "disabilitas pendengaran",
  "gangguan pendengaran": "disabilitas pendengaran",
  bisu: "disabilitas wicara",
  "tidak bisa bicara": "disabilitas wicara",
  lumpuh: "disabilitas fisik",
  "cacat fisik": "disabilitas fisik",
  difabel: "disabilitas",
  cacat: "disabilitas",
  "tuna netra": "disabilitas penglihatan",
  "tuna rungu": "disabilitas pendengaran",
  "tuna wicara": "disabilitas wicara",
  "tuna daksa": "disabilitas fisik",

  // ─── KULIT / PENYAKIT TROPIS ─────────────────────────────────
  "demam berdarah": "demam berdarah dengue",
  dbd: "demam berdarah dengue",
  dengue: "demam berdarah dengue",
  malaria: "malaria",
  "demam malaria": "malaria",
  kusta: "kusta",
  lepra: "kusta",
  kudis: "skabies",
  "gatal-gatal parah": "dermatitis",
  "gatal parah": "dermatitis",
  "eksim": "dermatitis",
  "penyakit kulit": "dermatitis",
  "kulit melepuh": "luka bakar",
  "luka bakar": "luka bakar",
  "chikungunya": "chikungunya",
  "sakit tulang": "chikungunya",

  // ─── PENCERNAAN ──────────────────────────────────────────────
  "maag kronis": "gastritis kronis",
  "sakit maag": "gastritis",
  maag: "gastritis",
  "usus buntu": "apendisitis",
  liver: "penyakit hati",
  hepatitis: "hepatitis",
  "sakit kuning": "hepatitis",
  "liver kronis": "sirosis hati",
  diare: "diare",
  "mencret parah": "diare",
  "muntaber": "gastroenteritis",
  "tipes": "demam tifoid",
  typhus: "demam tifoid",

  // ─── KESEHATAN REPRODUKSI ────────────────────────────────────
  "hamil tua": "kehamilan trimester 3",
  "hamil muda": "kehamilan trimester 1",
  "hamil dengan komplikasi": "kehamilan risiko tinggi",
  "hamil risiko tinggi": "kehamilan risiko tinggi",
  "tekanan darah tinggi saat hamil": "preeklampsia",
  preeklampsia: "preeklampsia",
  "hamil kembar": "kehamilan kembar",
  "baru melahirkan": "nifas",
  "habis melahirkan": "nifas",

  // ─── ORTOPEDI / TRAUMA ───────────────────────────────────────
  patah: "fraktur",
  "patah tulang": "fraktur",
  "tulang retak": "fraktur",
  fraktur: "fraktur",
  "terjepit reruntuhan": "crush injury",
  "kaki terjepit": "crush injury",
  "tangan patah": "fraktur ekstremitas atas",
  "kaki patah": "fraktur ekstremitas bawah",
  "cedera kepala": "trauma kepala",
  "kepala bocor": "trauma kepala",
  "luka dalam": "cedera internal",

  // ─── BAHASA DAERAH: JAWA ─────────────────────────────────────
  "lara gula": "diabetes",           // Jawa: sakit gula
  "gerah": "demam",                  // Jawa: panas/demam
  "weteng lara": "gangguan pencernaan", // Jawa: sakit perut
  "mumet": "vertigo",                // Jawa: pusing
  "ngelu": "migrain",                // Jawa: sakit kepala
  "sawan": "epilepsi",               // Jawa: kejang/epilepsi
  "kecethit": "keseleo",             // Jawa: terkilir
  "masuk angin": "common cold",      // umum tapi sering disebut
  "pegel linu": "nyeri sendi",       // Jawa

  // ─── BAHASA DAERAH: SUNDA ────────────────────────────────────
  "nyeri dada": "nyeri dada / angina",
  "sesek": "gangguan pernapasan",     // Sunda: sesak
  "gering": "demam / sakit umum",     // Sunda: sakit
  "udel": "infeksi tali pusat",       // Sunda: pusar (konteks bayi)
  "budeg": "disabilitas pendengaran", // Sunda: tuli

  // ─── BAHASA DAERAH: BETAWI ───────────────────────────────────
  "ayan mendadak": "epilepsi",
  "encok parah": "asam urat kronis",

  // ─── BAHASA DAERAH: MINANG ───────────────────────────────────
  "sakik kapalo": "migrain",          // Minang: sakit kepala
  "sakik paruik": "gangguan pencernaan", // Minang: sakit perut

  // ─── BAHASA DAERAH: BATAK ────────────────────────────────────
  "marsahit": "sakit umum",           // Batak: sakit

  // ─── UMUM / LAINNYA ─────────────────────────────────────────
  "kanker": "kanker",
  "tumor": "tumor",
  hiv: "HIV/AIDS",
  aids: "HIV/AIDS",
  "infeksi": "infeksi",
  "luka infeksi": "luka terinfeksi",
  "luka terbuka": "luka terbuka",
  "alergi obat": "alergi obat",
  "alergi parah": "anafilaksis",
  "koma": "koma",
  "tidak sadarkan diri": "penurunan kesadaran",
  "pingsan": "sinkop",
  "demam tinggi": "demam tinggi",
};

/** Daftar string untuk disisipkan ke prompt Gemini. */
export function sinonimUntukPrompt(): string {
  return Object.entries(SINONIM_MEDIS)
    .map(([awam, baku]) => `"${awam}" -> ${baku}`)
    .join(", ");
}

/** Normalisasi satu istilah medis ke bentuk baku (fallback server-side). */
export function normalisasiKondisi(istilah: string): string {
  const key = istilah.trim().toLowerCase();
  return SINONIM_MEDIS[key] ?? istilah.trim();
}

/**
 * Fuzzy match: cari istilah medis meskipun ada typo minor.
 * Menggunakan Levenshtein distance sederhana — jika distance ≤ 2,
 * dianggap cocok. Ini Layer 7 (Adversarial Robustness) dari PRANA.
 */
export function fuzzyMatchKondisi(istilah: string): string | null {
  const key = istilah.trim().toLowerCase();

  // Exact match dulu (paling cepat)
  if (SINONIM_MEDIS[key]) return SINONIM_MEDIS[key];

  // Fuzzy match — hanya untuk kata >= 4 huruf (avoid false positives)
  if (key.length < 4) return null;

  let bestMatch: string | null = null;
  let bestDist = 3; // threshold: max distance 2

  for (const candidate of Object.keys(SINONIM_MEDIS)) {
    if (Math.abs(candidate.length - key.length) > 2) continue; // quick skip
    const dist = levenshtein(key, candidate);
    if (dist < bestDist) {
      bestDist = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch ? SINONIM_MEDIS[bestMatch] : null;
}

/**
 * Levenshtein distance — O(n*m) dynamic programming.
 * Diimplementasi manual agar tidak ada dependency eksternal.
 */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];

  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
    for (let j = 1; j <= n; j++) {
      dp[i][j] = i === 0 ? j : 0;
    }
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}
