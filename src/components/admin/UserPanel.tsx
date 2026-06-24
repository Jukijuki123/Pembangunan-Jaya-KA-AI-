"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { buatUser, hapusUser } from "@/app/actions/admin";

export interface UserRow {
  id: string;
  username: string;
  role: "ADMIN" | "RELAWAN";
  createdAt: string;
}

export function UserPanel({ users }: { users: UserRow[] }) {
  const { show } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"RELAWAN" | "ADMIN">("RELAWAN");
  const [loading, setLoading] = useState(false);

  async function tambah() {
    setLoading(true);
    const res = await buatUser({ username, password, role });
    setLoading(false);
    if (res.ok) {
      show("Akun dibuat", "success");
      setUsername("");
      setPassword("");
    } else show(res.error ?? "Gagal", "error");
  }

  async function hapus(u: UserRow) {
    if (!confirm(`Hapus akun ${u.username}?`)) return;
    const res = await hapusUser(u.id);
    if (res.ok) show("Akun dihapus", "success");
    else show(res.error ?? "Gagal", "error");
  }

  return (
    <Card>
      <h2 className="mb-3 text-base font-bold text-slate-900">Kelola Akun</h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="username"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pmi"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="password (min 6)"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pmi"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "RELAWAN" | "ADMIN")}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pmi"
        >
          <option value="RELAWAN">RELAWAN</option>
          <option value="ADMIN">ADMIN</option>
        </select>
        <Button onClick={tambah} loading={loading}>
          Tambah Akun
        </Button>
      </div>

      <ul className="mt-3 divide-y divide-slate-100">
        {users.map((u) => (
          <li key={u.id} className="flex items-center justify-between py-2 text-sm">
            <span>
              <b>{u.username}</b>{" "}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {u.role}
              </span>
            </span>
            <Button
              variant="ghost"
              onClick={() => hapus(u)}
              className="!min-h-[32px] !px-2 !py-1 text-xs"
            >
              Hapus
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
