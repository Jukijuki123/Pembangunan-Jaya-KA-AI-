import { Suspense } from "react";
import Link from "next/link";
import LoginForm from "./LoginForm";
import { Logo } from "@/components/Logo";
import { ChevronLeft } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="min-h-screen w-full flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-950 to-pmi-dark relative overflow-hidden selection:bg-pmi selection:text-white">
      
      {/* Subtle grid overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:3rem_3rem]" />
      
      {/* Soft red radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(200,16,46,0.12),transparent_70%)]" />

      {/* Floating Back Link */}
      <Link
        href="/"
        className="absolute left-4 top-4 z-50 flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3.5 py-1.5 text-xs font-bold text-slate-300 shadow-sm backdrop-blur-sm transition-all hover:bg-white/15 hover:text-white sm:left-8 sm:top-8"
      >
        <ChevronLeft className="h-4 w-4" />
        Kembali
      </Link>

      {/* Centered Login Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl border border-white/5 bg-white/95 p-6 shadow-2xl shadow-black/50 backdrop-blur-md sm:p-10">
        
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex w-fit items-center justify-center">
            <Logo size={48} />
          </div>
          <h2 className="text-2xl font-black text-slate-900">Masuk Aplikasi</h2>
          <p className="mt-1.5 text-sm text-slate-500">
            Sistem Asesmen Kerentanan Pengungsi
          </p>
        </div>

        {/* Form */}
        <Suspense fallback={<div className="h-[250px] animate-pulse rounded-xl bg-slate-100" />}>
          <LoginForm />
        </Suspense>

        {/* Notice */}
        <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-400">
          Aplikasi ini dilindungi oleh otentikasi aman Auth.js. Sesi Anda akan dienkripsi untuk menjaga keamanan data korban bencana.
        </p>
      </div>

    </main>
  );
}
