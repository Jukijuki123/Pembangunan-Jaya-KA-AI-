import { Logo } from "@/components/Logo";
import { prisma } from "@/lib/prisma";
import MandiriForm from "./MandiriForm";

export const dynamic = "force-dynamic";

export default async function MandiriPage({
  params,
}: {
  params: Promise<{ kodePosko: string }>;
}) {
  const { kodePosko } = await params;
  const posko = await prisma.poskoConfig.findUnique({ where: { kodePosko } });

  if (!posko) {
    return (
      <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-200 text-2xl">
          ❓
        </div>
        <h1 className="text-lg font-bold text-slate-800">Kode posko tidak dikenal</h1>
        <p className="text-sm text-slate-500">
          Pastikan Anda memindai QR resmi di posko ini. Kode: <b>{kodePosko}</b>
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-md px-5 py-8">
      <div className="mb-5 text-center">
        <div className="mx-auto mb-3 flex justify-center">
          <Logo size={42} withWordmark />
        </div>
        <h1 className="text-lg font-black text-slate-900">Lapor Mandiri</h1>
        <p className="text-sm text-slate-500">{posko.nama}</p>
      </div>
      <MandiriForm
        kodePosko={posko.kodePosko}
        poskoLat={posko.lat}
        poskoLng={posko.lng}
      />
    </main>
  );
}
