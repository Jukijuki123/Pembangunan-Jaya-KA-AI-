import { prisma } from "@/lib/prisma";
import AdminClient from "./AdminClient";
import type { UserRow } from "@/components/admin/UserPanel";

export const metadata = { title: "Dashboard — SIGAP AI" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: { id: true, username: true, role: true, createdAt: true },
  });

  const userRows: UserRow[] = users.map((u) => ({
    id: u.id,
    username: u.username,
    role: u.role,
    createdAt: u.createdAt.toISOString(),
  }));

  return <AdminClient users={userRows} />;
}
