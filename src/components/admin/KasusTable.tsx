"use client";

import { useState } from "react";
import { Button, LevelBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { INSTANSI_LABEL } from "@/lib/utils";
import { verifikasiMedis, hapusKasus, updateKasus } from "@/app/actions/kasus";
import type { KasusDTO } from "./dto";

export function KasusTable({
  kasus,
  onChanged,
}: {
  kasus: KasusDTO[];
  onChanged: () => void;
}) {
  const { show } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [edit, setEdit] = useState<KasusDTO | null>(null);

  async function verif(k: KasusDTO) {
    setBusy(k.id);
    const res = await verifikasiMedis(k.id);
    setBusy(null);
    if (res.ok) {
      show(`Kasus ${k.kodeUnik} terverifikasi medis`, "success");
      onChanged();
    } else show(res.error ?? "Gagal", "error");
  }

  async function hapus(k: KasusDTO) {
    if (!confirm(`Hapus kasus ${k.kodeUnik}? Tindakan ini tidak bisa dibatalkan.`))
      return;
    setBusy(k.id);
    const res = await hapusKasus(k.id);
    setBusy(null);
    if (res.ok) {
      show("Kasus dihapus", "success");
      onChanged();
    } else show(res.error ?? "Gagal", "error");
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Kode</th>
            <th className="px-3 py-2">Level</th>
            <th className="px-3 py-2">Skor</th>
            <th className="px-3 py-2">Nama KK</th>
            <th className="px-3 py-2">Kondisi</th>
            <th className="px-3 py-2">Instansi</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2 text-right">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {kasus.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-slate-400">
                Belum ada kasus.
              </td>
            </tr>
          )}
          {kasus.map((k) => {
            const alarm = k.levelPrioritas === "MERAH" && !k.statusVerifikasiMedis;
            return (
              <tr
                key={k.id}
                className={`border-t border-slate-100 ${
                  alarm ? "animate-blinkRed" : ""
                }`}
              >
                <td className="px-3 py-2 font-mono text-xs">{k.kodeUnik}</td>
                <td className="px-3 py-2">
                  <LevelBadge level={k.levelPrioritas} />
                  {alarm && (
                    <span className="ml-1 text-[10px] font-bold text-merah">
                      ⚠ belum diverifikasi
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 font-semibold">{k.skorKerentanan}</td>
                <td className="px-3 py-2">{k.namaKK ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {(k.kondisiMedisKritis ?? []).join(", ") || "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {k.instansiRujukan ? INSTANSI_LABEL[k.instansiRujukan] : "—"}
                </td>
                <td className="px-3 py-2 text-xs">
                  {k.statusVerifikasiMedis ? (
                    <span className="text-hijau">✓ verif medis</span>
                  ) : (
                    <span className="text-slate-400">{k.status}</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    {alarm && (
                      <Button
                        variant="success"
                        loading={busy === k.id}
                        onClick={() => verif(k)}
                        className="!min-h-[32px] !px-2 !py-1 text-xs"
                      >
                        Verifikasi Medis
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={() => setEdit(k)}
                      className="!min-h-[32px] !px-2 !py-1 text-xs"
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      loading={busy === k.id}
                      onClick={() => hapus(k)}
                      className="!min-h-[32px] !px-2 !py-1 text-xs"
                    >
                      Hapus
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {edit && (
        <EditModal
          k={edit}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function EditModal({
  k,
  onClose,
  onSaved,
}: {
  k: KasusDTO;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { show } = useToast();
  const [namaKK, setNamaKK] = useState(k.namaKK ?? "");
  const [usiaKK, setUsiaKK] = useState(k.usiaKK?.toString() ?? "");
  const [kondisi, setKondisi] = useState((k.kondisiMedisKritis ?? []).join(", "));
  const [obat, setObat] = useState(
    k.obatTersedia === null ? "" : k.obatTersedia ? "ya" : "tidak"
  );
  const [mobilitas, setMobilitas] = useState(k.mobilitas ?? "");
  const [instansi, setInstansi] = useState<string>(
    k.instansiRujukan ?? "DINAS_SOSIAL"
  );
  const [saving, setSaving] = useState(false);

  async function simpan() {
    setSaving(true);
    const res = await updateKasus(k.id, {
      namaKK: namaKK.trim() || null,
      usiaKK: usiaKK === "" ? null : Number(usiaKK),
      kondisiMedisKritis: kondisi
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      obatTersedia: obat === "" ? null : obat === "ya",
      mobilitas: (mobilitas || null) as "mandiri" | "bantuan" | "tidak_bisa" | null,
      instansiRujukan: instansi as "DINAS_KESEHATAN" | "DINAS_SOSIAL" | "BPBD",
    });
    setSaving(false);
    if (res.ok) {
      show(`Kasus diperbarui — skor ${res.skor} (${res.level})`, "success");
      onSaved();
    } else show(res.error ?? "Gagal", "error");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl">
        <h3 className="mb-3 text-base font-bold text-slate-900">
          Edit Kasus {k.kodeUnik}
        </h3>
        <div className="flex flex-col gap-3">
          <Inp label="Nama KK" value={namaKK} onChange={setNamaKK} />
          <Inp label="Usia KK" value={usiaKK} onChange={setUsiaKK} type="number" />
          <Inp
            label="Kondisi medis (pisah koma)"
            value={kondisi}
            onChange={setKondisi}
          />
          <div className="grid grid-cols-2 gap-3">
            <Sel label="Obat tersedia" value={obat} onChange={setObat} options={[["", "Belum tahu"], ["ya", "Ya"], ["tidak", "Tidak"]]} />
            <Sel label="Mobilitas" value={mobilitas} onChange={setMobilitas} options={[["", "Belum tahu"], ["mandiri", "Mandiri"], ["bantuan", "Bantuan"], ["tidak_bisa", "Tidak bisa"]]} />
          </div>
          <Sel
            label="Instansi rujukan"
            value={instansi}
            onChange={setInstansi}
            options={[
              ["DINAS_KESEHATAN", "Dinas Kesehatan"],
              ["DINAS_SOSIAL", "Dinas Sosial"],
              ["BPBD", "BPBD"],
            ]}
          />
        </div>
        <p className="mt-2 text-xs text-slate-400">
          Skor & level dihitung ulang otomatis oleh rule engine saat disimpan.
        </p>
        <div className="mt-4 flex gap-2">
          <Button onClick={simpan} loading={saving} variant="success" className="flex-1">
            Simpan
          </Button>
          <Button variant="ghost" onClick={onClose}>
            Batal
          </Button>
        </div>
      </div>
    </div>
  );
}

function Inp({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-pmi"
      />
    </label>
  );
}

function Sel({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:border-pmi"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
