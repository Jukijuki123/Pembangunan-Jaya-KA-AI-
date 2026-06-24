import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center gap-6 px-6 py-12">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-pmi text-2xl font-black text-white">
          ＋
        </div>
        <h1 className="text-xl font-black text-slate-900">Masuk SIGAP AI</h1>
        <p className="text-sm text-slate-500">Relawan KSR/TSR & Koordinator PMI</p>
      </div>
      <Suspense>
        <LoginForm />
      </Suspense>
      <div className="rounded-lg bg-slate-100 p-3 text-xs text-slate-500">
        <p className="font-semibold">Akun demo (dari seed):</p>
        <p>admin / admin123 — relawan / relawan123</p>
      </div>
    </main>
  );
}
