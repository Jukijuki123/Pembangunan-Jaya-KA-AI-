"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui";
import { useToast } from "@/components/Toast";

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
      // Middleware akan mengarahkan ke beranda sesuai role.
      const callback = params.get("callbackUrl") || "/";
      router.replace(callback);
      router.refresh();
    } catch {
      show("Gagal masuk. Coba lagi.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-sm font-medium text-slate-700">
        Username
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-pmi"
        />
      </label>
      <label className="text-sm font-medium text-slate-700">
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base outline-none focus:border-pmi"
        />
      </label>
      <Button type="submit" loading={loading} className="mt-2 w-full">
        Masuk
      </Button>
    </form>
  );
}
