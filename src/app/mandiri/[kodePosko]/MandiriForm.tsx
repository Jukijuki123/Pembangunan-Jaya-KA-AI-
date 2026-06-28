"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { Button, Card, LevelBadge } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { submitMandiri, type MandiriInput } from "@/app/actions/mandiri";

const KONDISI_PILIHAN = [
  "diabetes",
  "hipertensi",
  "penyakit jantung",
  "asma",
  "gangguan pernapasan",
  "riwayat stroke",
  "gagal ginjal",
  "epilepsi",
  "disabilitas",
];

export default function MandiriForm({
  kodePosko,
  poskoLat,
  poskoLng,
}: {
  kodePosko: string;
  poskoLat: number;
  poskoLng: number;
}) {
  const { show } = useToast();
  const [namaKK, setNamaKK] = useState("");
  const [usiaKK, setUsiaKK] = useState("");
  const [jumlahAnggota, setJumlahAnggota] = useState("0");
  const [anggotaKeluarga, setAnggotaKeluarga] = useState<{ hubungan: string; usia: number | null; kondisiKhusus: string | null }[]>([]);
  const [kondisi, setKondisi] = useState<string[]>([]);
  const [kondisiInput, setKondisiInput] = useState("");
  const [obat, setObat] = useState<"" | "ya" | "tidak">("");
  const [mobilitas, setMobilitas] = useState("");
  const [asalLokasi, setAsalLokasi] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [geo, setGeo] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "ok" | "error">(
    "idle"
  );
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<{
    kode: string;
    level: string;
    skor: number;
    isSpam: boolean;
    qr: string;
  } | null>(null);

  function toggleKondisi(k: string) {
    setKondisi((prev) =>
      prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]
    );
  }

  function ambilLokasi() {
    if (!("geolocation" in navigator)) {
      show("Perangkat tidak mendukung lokasi", "error");
      setGeoStatus("error");
      return;
    }
    setGeoStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeo({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGeoStatus("ok");
        show("Lokasi terdeteksi", "success");
      },
      () => {
        setGeoStatus("error");
        show("Gagal mengambil lokasi — data tetap bisa dikirim", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function onFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1_800_000) {
      show("Foto terlalu besar (maks ~1.8MB)", "error");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFoto(reader.result as string);
    reader.readAsDataURL(file);
  }

  async function kirim() {
    setLoading(true);
    try {
      const payload: MandiriInput = {
        kodePosko,
        namaKK: namaKK.trim() || null,
        usiaKK: usiaKK === "" ? null : Number(usiaKK),
        jumlahAnggota: Number(jumlahAnggota) || 0,
        anggotaKeluarga,
        kondisiMedisKritis: kondisi,
        obatTersedia: obat === "" ? null : obat === "ya",
        mobilitas: (mobilitas || null) as MandiriInput["mobilitas"],
        asalLokasi: asalLokasi.trim() || null,
        geoLat: geo?.lat ?? null,
        geoLng: geo?.lng ?? null,
        fotoUrl: foto,
      };
      const res = await submitMandiri(payload);
      if (!res.ok) {
        show(res.error, "error");
        return;
      }
      const qr = await QRCode.toDataURL(res.qrPayload || res.kodeUnik, { width: 240, margin: 1 });
      setHasil({
        kode: res.kodeUnik,
        level: res.level,
        skor: res.skor,
        isSpam: res.isSpam,
        qr,
      });
      if (res.isSpam) {
        show("Data terkirim, tapi lokasi di luar radius posko — perlu verifikasi", "info");
      } else {
        show("Data berhasil dikirim ke posko", "success");
      }
    } finally {
      setLoading(false);
    }
  }

  // ====== HASIL (QR) ======
  if (hasil) {
    return (
      <Card className="flex flex-col items-center gap-3 text-center">
        <h2 className="text-base font-bold text-slate-900">Data Terkirim</h2>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hasil.qr} alt="QR kode kasus" className="h-48 w-48" />
        <p className="text-sm text-slate-600">
          Tunjukkan kode ini ke relawan posko:
        </p>
        <p className="text-lg font-black tracking-wide text-slate-900">{hasil.kode}</p>
        <div className="flex items-center gap-2">
          <LevelBadge level={hasil.level as "MERAH" | "KUNING" | "HIJAU"} />
          <span className="text-sm text-slate-500">Skor {hasil.skor}</span>
        </div>
        {hasil.isSpam && (
          <p className="rounded-lg bg-kuning-soft p-2 text-xs text-kuning">
            Lokasi Anda di luar radius posko. Data tetap tersimpan namun akan
            diverifikasi relawan dulu.
          </p>
        )}
        <p className="text-xs text-slate-400">
          Simpan/foto layar ini. Petugas akan memprioritaskan sesuai tingkat
          kebutuhan.
        </p>
      </Card>
    );
  }

  // ====== FORM ======
  return (
    <div className="flex flex-col gap-4">
      <Card>
        <p className="mb-3 text-sm text-slate-600">
          Isi data keluarga Anda. Semua pertanyaan pilihan — cukup ketuk.
        </p>

        <L label="Nama kepala keluarga">
          <input
            value={namaKK}
            onChange={(e) => setNamaKK(e.target.value)}
            className="inp"
            placeholder="Nama"
          />
        </L>
        <div className="grid grid-cols-2 gap-3">
          <L label="Usia kepala keluarga">
            <input
              type="number"
              value={usiaKK}
              onChange={(e) => setUsiaKK(e.target.value)}
              className="inp"
              placeholder="tahun"
            />
          </L>
          <L label="Jumlah anggota ikut">
            <input
              type="number"
              value={jumlahAnggota}
              onChange={(e) => setJumlahAnggota(e.target.value)}
              className="inp"
              min={0}
            />
          </L>
        </div>

        <p className="mb-1 mt-2 text-sm font-medium text-slate-600">
          Rincian Anggota Keluarga (Opsional)
        </p>
        <div className="flex flex-col gap-2">
          {anggotaKeluarga.map((a, i) => (
            <div key={i} className="flex flex-col gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex gap-2">
                <input
                  value={a.hubungan}
                  onChange={(e) => {
                    const arr = [...anggotaKeluarga];
                    arr[i] = { ...a, hubungan: e.target.value };
                    setAnggotaKeluarga(arr);
                  }}
                  placeholder="Hubungan (anak/istri)"
                  className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-pmi outline-none"
                />
                <input
                  type="number"
                  value={a.usia ?? ""}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : null;
                    const arr = [...anggotaKeluarga];
                    arr[i] = { ...a, usia: val };
                    setAnggotaKeluarga(arr);
                  }}
                  placeholder="Usia"
                  className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-pmi outline-none"
                />
                <button
                  onClick={() => setAnggotaKeluarga(anggotaKeluarga.filter((_, j) => j !== i))}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                >
                  ✕
                </button>
              </div>
              <input
                value={a.kondisiKhusus ?? ""}
                onChange={(e) => {
                  const arr = [...anggotaKeluarga];
                  arr[i] = { ...a, kondisiKhusus: e.target.value };
                  setAnggotaKeluarga(arr);
                }}
                placeholder="Kondisi khusus (hamil/bayi/dll)"
                className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm focus:border-pmi outline-none"
              />
            </div>
          ))}
          <button
            onClick={() => setAnggotaKeluarga([...anggotaKeluarga, { hubungan: "", usia: null, kondisiKhusus: null }])}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 text-left"
          >
            + Tambah Rincian Anggota
          </button>
        </div>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-slate-600">
          Kondisi medis dalam keluarga (boleh lebih dari satu)
        </p>
        <div className="flex flex-wrap gap-2 mb-3">
          {kondisi.map((k, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full border border-merah bg-merah px-3 py-1.5 text-sm text-white"
            >
              {k}
              <button
                onClick={() => setKondisi(kondisi.filter((_, j) => j !== i))}
                className="ml-1 font-bold text-white hover:text-slate-200"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <p className="mb-2 text-sm text-slate-500">Pilih dari saran, atau ketik sendiri di bawah:</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {KONDISI_PILIHAN.filter((k) => !kondisi.includes(k)).map((k) => (
            <button
              key={k}
              onClick={() => toggleKondisi(k)}
              className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600"
            >
              + {k}
            </button>
          ))}
        </div>
        <input
          value={kondisiInput}
          onChange={(e) => setKondisiInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && kondisiInput.trim()) {
              e.preventDefault();
              if (!kondisi.includes(kondisiInput.trim())) {
                setKondisi([...kondisi, kondisiInput.trim()]);
              }
              setKondisiInput("");
            }
          }}
          placeholder="Ketik kondisi lain, tekan Enter"
          className="inp"
        />

        <div className="mt-3 grid grid-cols-2 gap-3">
          <L label="Obat tersedia?">
            <select value={obat} onChange={(e) => setObat(e.target.value as "" | "ya" | "tidak")} className="inp">
              <option value="">Tidak yakin</option>
              <option value="ya">Ya</option>
              <option value="tidak">Tidak</option>
            </select>
          </L>
          <L label="Bisa bergerak sendiri?">
            <select value={mobilitas} onChange={(e) => setMobilitas(e.target.value)} className="inp">
              <option value="">Tidak yakin</option>
              <option value="mandiri">Bisa sendiri</option>
              <option value="bantuan">Perlu bantuan</option>
              <option value="tidak_bisa">Tidak bisa</option>
            </select>
          </L>
        </div>
        <L label="Asal lokasi/desa" className="mt-1">
          <input value={asalLokasi} onChange={(e) => setAsalLokasi(e.target.value)} className="inp" placeholder="Kampung/desa asal" />
        </L>
      </Card>

      <Card>
        <p className="mb-2 text-sm font-medium text-slate-600">Verifikasi lokasi & bukti</p>
        <Button variant="ghost" onClick={ambilLokasi} className="w-full">
          {geoStatus === "loading"
            ? "Mengambil lokasi…"
            : geoStatus === "ok"
            ? "✓ Lokasi terdeteksi"
            : "📍 Bagikan lokasi saya"}
        </Button>
        <p className="mt-1 text-xs text-slate-400">
          Lokasi dipakai memastikan Anda berada di sekitar posko (anti-spam).
        </p>

        <label className="mt-3 block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Foto bukti lokasi (opsional)
          </span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFoto}
            className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm"
          />
        </label>
        {foto && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto} alt="bukti" className="mt-2 h-32 w-full rounded-lg object-cover" />
        )}
      </Card>

      <Button onClick={kirim} loading={loading} className="w-full">
        Kirim ke Posko
      </Button>

      {/* utility classes via globals — inline style helper */}
      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid #cbd5e1;
          padding: 0.5rem 0.75rem;
          font-size: 1rem;
          outline: none;
        }
        :global(.inp:focus) {
          border-color: #c8102e;
        }
      `}</style>
    </div>
  );
}

function L({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`mb-2 block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}

function Check({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 text-left text-sm ${
        checked ? "border-pmi bg-pmi/5 text-slate-800" : "border-slate-300 text-slate-600"
      }`}
    >
      <span
        className={`flex h-5 w-5 items-center justify-center rounded border ${
          checked ? "border-pmi bg-pmi text-white" : "border-slate-300"
        }`}
      >
        {checked ? "✓" : ""}
      </span>
      {label}
    </button>
  );
}
