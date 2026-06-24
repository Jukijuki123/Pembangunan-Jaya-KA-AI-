"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { resetSemuaData } from "@/app/actions/admin";

/**
 * "Reset Semua Data" — admin only, konfirmasi 2x:
 *  1) buka panel bahaya, 2) ketik frasa "HAPUS SEMUA".
 * (Mitigasi privasi: hak hapus data setelah status darurat berakhir.)
 */
export function ResetPanel({ onDone }: { onDone: () => void }) {
  const { show } = useToast();
  const [buka, setBuka] = useState(false);
  const [frasa, setFrasa] = useState("");
  const [loading, setLoading] = useState(false);

  async function reset() {
    setLoading(true);
    const res = await resetSemuaData(frasa);
    setLoading(false);
    if (res.ok) {
      show("Semua data kasus & audit dihapus", "success");
      setBuka(false);
      setFrasa("");
      onDone();
    } else show(res.error ?? "Gagal", "error");
  }

  return (
    <Card className="border-merah-border bg-merah-soft">
      <h2 className="text-base font-bold text-merah">Zona Berbahaya</h2>
      <p className="mt-1 text-sm text-slate-600">
        Menghapus seluruh data kasus, laporan, dan audit. Akun & konfigurasi posko
        tetap ada. Gunakan setelah status darurat berakhir.
      </p>
      {!buka ? (
        <Button variant="danger" className="mt-3" onClick={() => setBuka(true)}>
          Reset Semua Data
        </Button>
      ) : (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-sm font-medium text-merah">
            Ketik <b>HAPUS SEMUA</b> untuk konfirmasi:
          </p>
          <input
            value={frasa}
            onChange={(e) => setFrasa(e.target.value)}
            placeholder="HAPUS SEMUA"
            className="rounded-lg border border-merah-border px-3 py-2 text-sm outline-none"
          />
          <div className="flex gap-2">
            <Button
              variant="danger"
              loading={loading}
              disabled={frasa !== "HAPUS SEMUA"}
              onClick={reset}
            >
              Ya, hapus permanen
            </Button>
            <Button variant="ghost" onClick={() => setBuka(false)}>
              Batal
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
