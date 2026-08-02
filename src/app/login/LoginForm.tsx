"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { User, Lock, ArrowRight, ShieldCheck, UserCheck } from "lucide-react";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { show } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await signIn("credentials", {
        username,
        password,
        redirect: false,
      });
      if (res?.error) {
        show("Username atau password salah", "error");
        return;
      }
      show("Berhasil masuk. Mengarahkan...", "success");
      // Hard navigation (bukan router.replace) — memaksa reload penuh agar
      // state client & router cache sesi lama (relawan) benar-benar bersih.
      // Middleware akan mengarahkan ke beranda sesuai role.
      const callback = params.get("callbackUrl") || "/";
      window.location.assign(callback);
    } catch {
      show("Gagal masuk. Coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleQuickLogin = (user: string, pass: string) => {
    setUsername(user);
    setPassword(pass);
    show(`Mengisi kredensial ${user.toUpperCase()}`, "info");
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {/* Input Username */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Username
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400">
              <User className="h-4.5 w-4.5" />
            </span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
              placeholder="Masukkan username Anda"
              className="w-full rounded-xl border border-slate-200/80 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-pmi focus:ring-2 focus:ring-pmi/10"
            />
          </div>
        </div>

        {/* Input Password */}
        <div className="space-y-1">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Password
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-3.5 text-slate-400">
              <Lock className="h-4.5 w-4.5" />
            </span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-200/80 bg-white pl-11 pr-4 py-3 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-pmi focus:ring-2 focus:ring-pmi/10"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          loading={loading} 
          className="mt-2 w-full rounded-xl bg-pmi py-3 text-sm font-bold text-white shadow-lg shadow-pmi/25 transition-all hover:bg-pmi-dark hover:scale-[1.01] active:scale-98"
        >
          Masuk Sesi
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </form>

      {/* Quick Login Section */}
      <div className="rounded-2xl border border-slate-200/60 bg-slate-50/70 p-4">
        <div className="mb-3 flex items-center gap-1.5 text-slate-500">
          <UserCheck className="h-4 w-4 text-pmi/80" />
          <span className="text-xs font-bold uppercase tracking-wider">Demo Quick Login</span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleQuickLogin("admin", "admin123")}
            className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100/50 hover:border-slate-300 active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-red-500" />
            Koordinator (Admin)
          </button>
          
          <button
            type="button"
            onClick={() => handleQuickLogin("relawan", "relawan123")}
            className="flex items-center gap-1 rounded-full bg-white border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-100/50 hover:border-slate-300 active:scale-95"
          >
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            Relawan PMI (Lapangan)
          </button>
        </div>
      </div>
    </div>
  );
}
