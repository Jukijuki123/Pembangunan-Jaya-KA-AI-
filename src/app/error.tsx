"use client";

/**
 * Error boundary global (App Router) — error render (mis. DB tidak
 * terjangkau) ditampilkan sebagai halaman error yang proper, BUKAN
 * mematikan proses server (mencegah crash berulang saat DB sempat mati).
 */
export default function Error({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
          <i className="fa-solid fa-triangle-exclamation text-xl" aria-hidden="true"></i>
        </div>
        <h1 className="text-base font-bold text-slate-900">Terjadi kesalahan pada server</h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Halaman tidak bisa dimuat. Kemungkinan database sedang tidak terjangkau — coba lagi
          sebentar, atau hubungi koordinator.
        </p>
        <button
          onClick={reset}
          className="mt-4 rounded-lg bg-pmi px-4 py-2 text-sm font-bold text-white hover:bg-pmi-dark"
        >
          <i className="fa-solid fa-rotate-right mr-1.5" aria-hidden="true"></i>
          Coba Lagi
        </button>
      </div>
    </div>
  );
}
