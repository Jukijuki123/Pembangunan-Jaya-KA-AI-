"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";
import { useToast } from "@/components/Toast";
import {
  generateDraftLaporan,
  simpanEditLaporan,
  kirimLaporan,
} from "@/app/actions/laporan";

/**
 * LAPIS 3 — Laporan harian. AI buat draft -> admin edit -> admin kirim.
 * Tidak ada laporan terkirim otomatis.
 */
export function LaporanPanel() {
  const { show } = useToast();
  const [id, setId] = useState<string | null>(null);
  const [teks, setTeks] = useState("");
  const [loading, setLoading] = useState(false);
  const [terkirim, setTerkirim] = useState(false);

  async function generate() {
    setLoading(true);
    setTerkirim(false);
    const res = await generateDraftLaporan();
    setLoading(false);
    if (res.ok) {
      setId(res.id);
      setTeks(res.ringkasanAI);
      show("Draft laporan dibuat AI — silakan tinjau & edit", "info");
    } else show(res.error, "error");
  }

  async function simpan() {
    if (!id) return;
    setLoading(true);
    const res = await simpanEditLaporan({ id, ringkasanFinal: teks });
    setLoading(false);
    if (res.ok) show("Editan tersimpan", "success");
    else show(res.error ?? "Gagal", "error");
  }

  async function kirim() {
    if (!id) return;
    if (!confirm("Kirim laporan ini ke PMI Cabang?")) return;
    setLoading(true);
    // Simpan dulu editan terbaru, baru kirim.
    await simpanEditLaporan({ id, ringkasanFinal: teks });
    const res = await kirimLaporan(id);
    setLoading(false);
    if (res.ok) {
      setTerkirim(true);
      show("Laporan terkirim ke PMI Cabang", "success");
    } else show(res.error ?? "Gagal", "error");
  }

  return (
    <Card>
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900">Laporan Harian</h2>
        <span className="text-xs text-slate-400">Lapis 3 — review koordinator</span>
      </div>

      {!id ? (
        <div className="text-sm text-slate-500">
          <p className="mb-3">
            AI menyusun draft ringkasan agregat (tanpa nama korban). Anda meninjau &
            mengedit sebelum mengirim — tidak ada yang terkirim otomatis.
          </p>
          <Button onClick={generate} loading={loading}>
            Buat draft dengan AI
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <textarea
            value={teks}
            onChange={(e) => setTeks(e.target.value)}
            rows={7}
            disabled={terkirim}
            className="w-full rounded-lg border border-slate-300 p-3 text-sm outline-none focus:border-pmi disabled:bg-slate-50"
          />
          {terkirim ? (
            <p className="rounded-lg bg-hijau-soft p-2 text-sm font-medium text-hijau">
              ✅ Laporan sudah terkirim ke PMI Cabang.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" onClick={simpan} loading={loading}>
                Simpan editan
              </Button>
              <Button variant="success" onClick={kirim} loading={loading}>
                Kirim ke PMI Cabang
              </Button>
              <Button variant="ghost" onClick={generate} loading={loading}>
                Buat ulang draft
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
