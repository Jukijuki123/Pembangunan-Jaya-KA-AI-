import IntakeClient from "./IntakeClient";

export const metadata = { title: "Intake — SIGAP AI" };

export default function IntakePage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-lg font-black text-slate-900">Intake Keluarga Pengungsi</h1>
        <p className="text-sm text-slate-500">
          Ketik/ucapkan kondisi keluarga dengan bahasa biasa. AI mengekstrak, Anda
          mengonfirmasi tiap field sebelum tersimpan.
        </p>
      </div>
      <IntakeClient />
    </div>
  );
}
