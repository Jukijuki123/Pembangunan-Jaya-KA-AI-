import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppHeader } from "@/components/AppHeader";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/intake");

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader username={session.user.username} role={session.user.role} />
      <div className="mx-auto max-w-5xl px-4 py-5">{children}</div>
    </div>
  );
}
