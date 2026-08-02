/**
 * Instrumentation hook (Next.js 15) — dijalankan sekali saat server boot.
 *
 * Safety net: error async yang tidak tertangani (late rejection dari SDK AI,
 * timeout, koneksi putus) TIDAK boleh mematikan proses server. Alih-alih crash,
 * kita log dan biarkan server tetap melayani request berikutnya.
 */
export async function register() {
  process.on("unhandledRejection", (reason) => {
    console.error("[guard] unhandledRejection ditelan (server tetap jalan):", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[guard] uncaughtException ditelan (server tetap jalan):", err);
  });
}
