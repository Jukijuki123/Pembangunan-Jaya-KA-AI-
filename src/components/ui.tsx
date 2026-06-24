"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

/** Spinner kecil untuk loading saat panggil AI/DB. */
export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

type Variant = "primary" | "danger" | "ghost" | "success";
const VARIANTS: Record<Variant, string> = {
  primary: "bg-pmi text-white hover:bg-pmi-dark disabled:opacity-50",
  danger: "bg-merah text-white hover:bg-red-700 disabled:opacity-50",
  success: "bg-hijau text-white hover:bg-green-700 disabled:opacity-50",
  ghost: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 disabled:opacity-50",
};

export function Button({
  variant = "primary",
  loading = false,
  children,
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
}) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || loading}
      className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition active:scale-[0.98] ${VARIANTS[variant]} ${className}`}
    >
      {loading && <Spinner />}
      {children}
    </button>
  );
}

/** Badge level prioritas dengan warna konsisten. */
export function LevelBadge({ level }: { level: "MERAH" | "KUNING" | "HIJAU" }) {
  const map = {
    MERAH: "bg-merah text-white",
    KUNING: "bg-kuning text-white",
    HIJAU: "bg-hijau text-white",
  } as const;
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ${map[level]}`}>
      {level}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
