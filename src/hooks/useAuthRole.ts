"use client";

import { useEffect, useState } from "react";

/**
 * Hook role dari backend (Auth.js session endpoint).
 * Dipakai client untuk memilih query API yang dikirim — bukan sekadar
 * menyembunyikan elemen UI. Keamanan TETAP dijaga oleh validasi role di
 * route handler (curl tanpa token tetap ditolak).
 */
export function useAuthRole(): {
  role: "ADMIN" | "RELAWAN" | null;
  loading: boolean;
} {
  const [role, setRole] = useState<"ADMIN" | "RELAWAN" | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => {
        setRole(s?.user?.role ?? null);
      })
      .catch(() => setRole(null))
      .finally(() => setLoading(false));
  }, []);

  return { role, loading };
}
