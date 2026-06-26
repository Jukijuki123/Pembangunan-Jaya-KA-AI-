"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { QrCode } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui";

/** Header dengan navigasi role-aware + tombol logout. */
export function AppHeader({
  username,
  role,
}: {
  username: string;
  role: "ADMIN" | "RELAWAN";
}) {
  const pathname = usePathname();

  const links =
    role === "ADMIN"
      ? [
          { href: "/admin", label: "Dashboard" },
          { href: "/rujukan", label: "Rujukan" },
          { href: "/intake", label: "Intake" },
          { href: "/admin/scan", label: "Scan QR", icon: true },
        ]
      : [{ href: "/intake", label: "Intake" }];

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-2 gap-y-3 px-4 py-2.5">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo size={28} withWordmark />
        </Link>

        <div className="flex items-center gap-2 sm:order-3">
          <span className="hidden text-xs text-slate-500 sm:inline">
            {username} · {role}
          </span>
          <Button
            variant="ghost"
            className="!min-h-[36px] !px-3 !py-1.5 text-xs"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Keluar
          </Button>
        </div>

        <nav className="flex w-full items-center gap-1 overflow-x-auto whitespace-nowrap sm:w-auto sm:order-2 hide-scrollbar pb-1 sm:pb-0">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium shrink-0 ${
                  active ? "bg-pmi text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.icon && <QrCode className="h-4 w-4 shrink-0" />}
                {l.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
