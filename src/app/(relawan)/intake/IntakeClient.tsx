"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card, LevelBadge, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { hitungSkor } from "@/lib/scoring";
import type { ProfilKerentanan } from "@/lib/types";
import {
  simpanKasusTerkonfirmasi,
  type KonfirmasiInput,
} from "@/app/actions/kasus";

// Skenario hardcoded — fallback bila koneksi/AI bermasalah saat demo live.
const CONTOH = [
  "Bu Siti, 67 tahun, diabetes, tinggal sendiri, bawa cucu 8 bulan, rumahnya habis kena longsor, tidak bawa obat sama sekali.",
  "Pak Ahmad 72 tahun, mantan pasien stroke, datang sama istri 68 tahun, bawa cucu 3 bulan. Rumah di Kampung Cikaret tenggelam. Tidak bawa obat pengencer darah.",
  "Bu Rina, 34 tahun, hamil 8 bulan, datang sama anak 2 tahun. Suami hilang belum ketemu. Tidak bawa apa-apa dari rumah.",
];

const KOSONG: ProfilKerentanan = {
  agentThought: "",
  namaKK: null,
  usiaKK: null,
  anggotaKeluarga: [],
  kondisiMedisKritis: [],
  obatTersedia: null,
  mobilitas: null,
  asalLokasi: null,
  instansiRujukan: "DINAS_SOSIAL",
};

// Highlight oranye untuk field null (wajib dikonfirmasi relawan).
const nullCls =
  "border-kuning bg-kuning-soft focus:border-kuning";
const okCls = "border-slate-300 focus:border-pmi";

export default function IntakeClient() {
  const { show } = useToast();
  const [teks, setTeks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profil, setProfil] = useState<ProfilKerentanan | null>(null);
  const [kondisiInput, setKondisiInput] = useState("");
  const [tersimpan, setTersimpan] = useState<{ kode: string; level: string } | null>(
    null
  );
  const recogRef = useRef<unknown>(null);
  const [listening, setListening] = useState(false);

  const skor = useMemo(
    () => (profil ? hitungSkor(profil) : null),
    [profil]
  );

  async function analisis() {
    if (teks.trim().length < 3) {
      show("Tulis dulu kondisi keluarga", "error");
      return;
    }
    setLoading(true);
    setTersimpan(null);
    try {
      const res = await fetch("/api/agent/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teks }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        show(data.error ?? "Gagal menganalisis", "error");
        // Tetap buka kartu kosong agar relawan bisa isi manual.
        setProfil({ ...KOSONG });
        return;
      }
      setProfil(data.profil as ProfilKerentanan);
      show("AI selesai mengekstrak — silakan konfirmasi tiap field", "info");
    } catch {
      show("Tidak ada koneksi. Isi kartu manual.", "error");
      setProfil({ ...KOSONG });
    } finally {
      setLoading(false);
    }
  }

  function isiManual() {
    setProfil({ ...KOSONG });
    setTersimpan(null);
  }

  // Web Speech API (suara -> teks), bahasa Indonesia.
  function toggleVoice() {
    const SR =
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition ||
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition;
    if (!SR) {
      show("Browser tidak mendukung input suara", "error");
      return;
    }
    if (listening) {
      (recogRef.current as { stop: () => void } | null)?.stop();
      setListening(false);
      return;
    }
    const recog = new SR() as {
      lang: string;
      interimResults: boolean;
      continuous: boolean;
      onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
      onend: () => void;
      start: () => void;
      stop: () => void;
    };
    recog.lang = "id-ID";
    recog.interimResults = false;
    recog.continuous = false;
    recog.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
      setTeks((prev) => (prev ? prev + " " : "") + t);
    };
    recog.onend = () => setListening(false);
    recogRef.current = recog;
    recog.start();
    setListening(true);
  }

  function patch(p: Partial<ProfilKerentanan>) {
    setProfil((prev) => (prev ? { ...prev, ...p } : prev));
  }

  async function simpan() {
    if (!profil) return;
    // Validasi minimal: nama & usia KK wajib dikonfirmasi (tidak boleh null).
    if (!profil.namaKK || profil.namaKK.trim() === "") {
      show("Nama kepala keluarga wajib diisi", "error");
      return;
    }
    if (profil.usiaKK === null) {
      show("Usia kepala keluarga wajib diisi", "error");
      return;
    }
    setSaving(true);
    try {
      const payload: KonfirmasiInput = {
        agentThought: profil.agentThought,
        namaKK: profil.namaKK,
        usiaKK: profil.usiaKK,
        anggotaKeluarga: profil.anggotaKeluarga,
        kondisiMedisKritis: profil.kondisiMedisKritis,
        obatTersedia: profil.obatTersedia,
        mobilitas: profil.mobilitas,
        asalLokasi: profil.asalLokasi,
        instansiRujukan: profil.instansiRujukan,
      };
      const res = await simpanKasusTerkonfirmasi(payload);
      if (!res.ok) {
        show(res.error, "error");
        return;
      }
      setTersimpan({ kode: res.kodeUnik, level: res.level });
      show(`Tersimpan: ${res.kodeUnik} (${res.level})`, "success");
      setProfil(null);
      setTeks("");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* ====== INPUT ====== */}
      <Card>
        <div className="flex flex-wrap gap-2">
          {CONTOH.map((c, i) => (
            <button
              key={i}
              onClick={() => setTeks(c)}
              className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs text-slate-600 hover:bg-slate-100"
            >
              Contoh {i + 1}
            </button>
          ))}
        </div>
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={4}
          placeholder="Contoh: Bu Siti, 67 tahun, diabetes, bawa cucu 8 bulan, tidak bawa obat…"
          className="mt-3 w-full rounded-lg border border-slate-300 p-3 text-base outline-none focus:border-pmi"
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <Button onClick={analisis} loading={loading} className="flex-1">
            {loading ? "Menganalisis…" : "Analisis dengan AI"}
          </Button>
          <Button variant="ghost" onClick={toggleVoice}>
            {listening ? "⏹ Stop" : "🎤 Suara"}
          </Button>
          <Button variant="ghost" onClick={isiManual}>
            Isi manual
          </Button>
        </div>
      </Card>

      {/* ====== KARTU KONFIRMASI ====== */}
      {profil && skor && (
        <Card className="border-pmi/30">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Kartu Konfirmasi</h2>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-600">
                Skor {skor.skor}
              </span>
              <LevelBadge level={skor.level} />
            </div>
          </div>

          {/* Reasoning AI (audit, read-only) */}
          {profil.agentThought && (
            <p className="mb-3 rounded-lg bg-slate-50 p-2 text-xs italic text-slate-500">
              🧠 {profil.agentThought}
            </p>
          )}

          <p className="mb-3 rounded-lg bg-kuning-soft p-2 text-xs text-kuning">
            Field berwarna oranye belum terisi AI — wajib Anda konfirmasi/koreksi.
          </p>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Nama Kepala Keluarga">
              <input
                value={profil.namaKK ?? ""}
                onChange={(e) => patch({ namaKK: e.target.value || null })}
                className={`w-full rounded-lg border px-3 py-2 text-base outline-none ${
                  profil.namaKK ? okCls : nullCls
                }`}
              />
            </Field>
            <Field label="Usia KK">
              <input
                type="number"
                value={profil.usiaKK ?? ""}
                onChange={(e) =>
                  patch({ usiaKK: e.target.value === "" ? null : Number(e.target.value) })
                }
                className={`w-full rounded-lg border px-3 py-2 text-base outline-none ${
                  profil.usiaKK === null ? nullCls : okCls
                }`}
              />
            </Field>

            <Field label="Obat tersedia?">
              <select
                value={
                  profil.obatTersedia === null ? "" : profil.obatTersedia ? "ya" : "tidak"
                }
                onChange={(e) =>
                  patch({
                    obatTersedia:
                      e.target.value === "" ? null : e.target.value === "ya",
                  })
                }
                className={`w-full rounded-lg border px-3 py-2 text-base outline-none ${
                  profil.obatTersedia === null ? nullCls : okCls
                }`}
              >
                <option value="">Belum tahu</option>
                <option value="ya">Ya, ada</option>
                <option value="tidak">Tidak ada</option>
              </select>
            </Field>

            <Field label="Mobilitas">
              <select
                value={profil.mobilitas ?? ""}
                onChange={(e) =>
                  patch({
                    mobilitas: (e.target.value || null) as ProfilKerentanan["mobilitas"],
                  })
                }
                className={`w-full rounded-lg border px-3 py-2 text-base outline-none ${
                  profil.mobilitas === null ? nullCls : okCls
                }`}
              >
                <option value="">Belum tahu</option>
                <option value="mandiri">Mandiri</option>
                <option value="bantuan">Perlu bantuan</option>
                <option value="tidak_bisa">Tidak bisa bergerak</option>
              </select>
            </Field>

            <Field label="Asal lokasi">
              <input
                value={profil.asalLokasi ?? ""}
                onChange={(e) => patch({ asalLokasi: e.target.value || null })}
                className={`w-full rounded-lg border px-3 py-2 text-base outline-none ${
                  profil.asalLokasi ? okCls : nullCls
                }`}
              />
            </Field>

            <Field label="Instansi rujukan (sementara)">
              <select
                value={profil.instansiRujukan}
                onChange={(e) =>
                  patch({
                    instansiRujukan: e.target
                      .value as ProfilKerentanan["instansiRujukan"],
                  })
                }
                className={`w-full rounded-lg border px-3 py-2 text-base outline-none ${okCls}`}
              >
                <option value="DINAS_KESEHATAN">Dinas Kesehatan</option>
                <option value="DINAS_SOSIAL">Dinas Sosial</option>
                <option value="BPBD">BPBD</option>
              </select>
            </Field>
          </div>

          {/* Kondisi medis kritis (tags) */}
          <Field label="Kondisi medis kritis" className="mt-3">
            <div className="flex flex-wrap gap-2">
              {profil.kondisiMedisKritis.map((k, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 rounded-full bg-merah-soft px-2.5 py-1 text-xs font-medium text-merah"
                >
                  {k}
                  <button
                    onClick={() =>
                      patch({
                        kondisiMedisKritis: profil.kondisiMedisKritis.filter(
                          (_, j) => j !== i
                        ),
                      })
                    }
                    className="ml-0.5 text-merah/70 hover:text-merah"
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={kondisiInput}
                onChange={(e) => setKondisiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kondisiInput.trim()) {
                    e.preventDefault();
                    patch({
                      kondisiMedisKritis: [
                        ...profil.kondisiMedisKritis,
                        kondisiInput.trim(),
                      ],
                    });
                    setKondisiInput("");
                  }
                }}
                placeholder="Tambah kondisi, tekan Enter"
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-pmi"
              />
            </div>
          </Field>

          {/* Anggota keluarga */}
          <Field label="Anggota keluarga" className="mt-3">
            <div className="flex flex-col gap-2">
              {profil.anggotaKeluarga.map((a, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <input
                    value={a.hubungan}
                    onChange={(e) => {
                      const arr = [...profil.anggotaKeluarga];
                      arr[i] = { ...a, hubungan: e.target.value };
                      patch({ anggotaKeluarga: arr });
                    }}
                    placeholder="hubungan"
                    className="w-28 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    type="number"
                    value={a.usia ?? ""}
                    onChange={(e) => {
                      const arr = [...profil.anggotaKeluarga];
                      arr[i] = {
                        ...a,
                        usia: e.target.value === "" ? null : Number(e.target.value),
                      };
                      patch({ anggotaKeluarga: arr });
                    }}
                    placeholder="usia"
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <input
                    value={a.kondisiKhusus ?? ""}
                    onChange={(e) => {
                      const arr = [...profil.anggotaKeluarga];
                      arr[i] = { ...a, kondisiKhusus: e.target.value || null };
                      patch({ anggotaKeluarga: arr });
                    }}
                    placeholder="kondisi khusus"
                    className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                  />
                  <button
                    onClick={() =>
                      patch({
                        anggotaKeluarga: profil.anggotaKeluarga.filter(
                          (_, j) => j !== i
                        ),
                      })
                    }
                    className="text-slate-400 hover:text-merah"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() =>
                  patch({
                    anggotaKeluarga: [
                      ...profil.anggotaKeluarga,
                      { hubungan: "", usia: null, kondisiKhusus: null },
                    ],
                  })
                }
                className="self-start rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-500 hover:bg-slate-50"
              >
                + Tambah anggota
              </button>
            </div>
          </Field>

          {/* Rincian skor (transparansi rule engine) */}
          <div className="mt-4 rounded-lg bg-slate-50 p-3">
            <p className="mb-1 text-xs font-semibold text-slate-500">
              Rincian skor (dihitung rule engine, bukan AI):
            </p>
            {skor.rincian.length === 0 ? (
              <p className="text-xs text-slate-400">Tidak ada faktor risiko terhitung.</p>
            ) : (
              <ul className="text-xs text-slate-600">
                {skor.rincian.map((r, i) => (
                  <li key={i} className="flex justify-between">
                    <span>{r.label}</span>
                    <span className="font-semibold">+{r.poin}</span>
                  </li>
                ))}
                <li className="mt-1 flex justify-between border-t border-slate-200 pt-1 font-bold">
                  <span>Total</span>
                  <span>{skor.skor}</span>
                </li>
              </ul>
            )}
            {skor.level === "MERAH" && (
              <p className="mt-2 text-xs font-medium text-merah">
                ⚠ Kasus MERAH — perlu verifikasi tenaga medis (Lapis 2). Sebelum
                diverifikasi, diperlakukan sebagai KUNING.
              </p>
            )}
          </div>

          <div className="mt-4 flex gap-2">
            <Button onClick={simpan} loading={saving} variant="success" className="flex-1">
              Konfirmasi & Simpan
            </Button>
            <Button variant="ghost" onClick={() => setProfil(null)}>
              Batal
            </Button>
          </div>
        </Card>
      )}

      {tersimpan && (
        <Card className="border-hijau-border bg-hijau-soft">
          <p className="text-sm font-semibold text-hijau">
            ✅ Data tersimpan — Kode {tersimpan.kode} · Level {tersimpan.level}
          </p>
          <p className="text-xs text-slate-500">
            Masuk ke dashboard koordinator secara real-time.
          </p>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-4 text-sm text-slate-500">
          <Spinner /> AI sedang membaca…
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block text-sm ${className}`}>
      <span className="mb-1 block font-medium text-slate-600">{label}</span>
      {children}
    </label>
  );
}
