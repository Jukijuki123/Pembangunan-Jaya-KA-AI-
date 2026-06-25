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
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-2 px-4 py-2.5">
        <Link href="/" className="hover:opacity-80 transition-opacity">
          <Logo size={28} withWordmark />
        </Link>

        <nav className="flex items-center gap-1">
          {links.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium ${
                  active ? "bg-pmi text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {l.icon && <QrCode className="h-4 w-4" />}
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
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
      </div>
    </header>
  );
}
