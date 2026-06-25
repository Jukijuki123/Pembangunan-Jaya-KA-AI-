import { z } from "zod";

/**
 * Validasi environment variable saat boot.
 * Jika ada yang hilang/format salah, app langsung gagal dengan pesan jelas
 * (lebih baik gagal saat start daripada error misterius saat runtime).
 *
 * Catatan: file ini diimpor dari kode SERVER saja. GEMINI_API_KEY & AUTH_SECRET
 * tidak pernah bocor ke bundle client karena tidak berawalan NEXT_PUBLIC_.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  DIRECT_URL: z.string().min(1).optional(),
  GEMINI_API_KEY: z.string().min(1, "GEMINI_API_KEY wajib diisi"),
  GROQ_API_KEY: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET wajib diisi"),
  AUTH_URL: z.string().url().optional(),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

// Lewati validasi saat fase build produksi (env asli disuntikkan saat runtime
// di Vercel) atau bila SKIP_ENV_VALIDATION di-set. Tetap validasi saat runtime.
const skipValidation =
  process.env.NEXT_PHASE === "phase-production-build" ||
  process.env.SKIP_ENV_VALIDATION === "1";

const parsed = envSchema.safeParse(process.env);

if (!parsed.success && !skipValidation) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  // Hentikan boot dengan pesan yang bisa dibaca manusia.
  throw new Error(
    `\n[SIGAP AI] Konfigurasi environment tidak valid:\n${issues}\n` +
      `Salin .env.example menjadi .env lalu isi nilainya.\n`
  );
}

// Saat validasi dilewati di build, gunakan nilai mentah (mungkin kosong) —
// runtime akan punya env asli. Saat runtime normal, ini sudah tervalidasi.
export const env = parsed.success
  ? parsed.data
  : (process.env as unknown as z.infer<typeof envSchema>);
