"use client";

import { useMemo, useRef, useState } from "react";
import { Button, Card, LevelBadge, Spinner } from "@/components/ui";
import { useToast } from "@/components/Toast";
import { hitungSkor } from "@/lib/scoring";
import type { ProfilKerentanan, FieldMetadata, ProvenanceMap } from "@/lib/types";
import { 
  Zap, 
  Cpu, 
  UserCheck, 
  AlertTriangle, 
  HelpCircle, 
  Database,
  Volume2,
  FileText
} from "lucide-react";
import {
  simpanKasusTerkonfirmasi,
  type KonfirmasiInput,
} from "@/app/actions/kasus";

const CONTOH = [
  "Bapak Slamet Riyadi, usia 64 tahun, asal Kampung Cibadak. Mengalami sakit gula. Kaki lemas tidak bisa jalan. Tidak bawa obat.",
  "Bu Siti, 67 tahun, diabetes, tinggal sendiri, bawa cucu 8 bulan, rumahnya habis kena longsor, tidak bawa obat sama sekali.",
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

const KOSONG_PROVENANCE = (): ProvenanceMap => ({
  namaKK: { value: null, source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  usiaKK: { value: null, source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  anggotaKeluarga: { value: [], source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  kondisiMedisKritis: { value: [], source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  obatTersedia: { value: null, source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  mobilitas: { value: null, source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  asalLokasi: { value: null, source: "default", sourceDetail: "input-manual", confidence: 0.0 },
  instansiRujukan: { value: "DINAS_SOSIAL", source: "default", sourceDetail: "input-manual", confidence: 0.0 },
});

// Highlight oranye untuk field null atau confidence rendah (wajib dikonfirmasi relawan).
const nullCls = "border-kuning bg-amber-50/50 focus:border-kuning focus:ring-2 focus:ring-amber-500/10";
const okCls = "border-slate-200 bg-white focus:border-pmi focus:ring-2 focus:ring-pmi/10";

export default function IntakeClient() {
  const { show } = useToast();
  const [teks, setTeks] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profil, setProfil] = useState<ProfilKerentanan | null>(null);
  const [kondisiInput, setKondisiInput] = useState("");
  const [tersimpan, setTersimpan] = useState<{ kode: string; level: string } | null>(null);
  const [listening, setListening] = useState(false);
  const [modelMode, setModelMode] = useState<"auto" | "deberta" | "llm">("auto");
  const recogRef = useRef<any>(null);

  const skor = useMemo(() => (profil ? hitungSkor(profil) : null), [profil]);

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
        body: JSON.stringify({ teks, mode: modelMode }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        show(data.error ?? "Gagal menganalisis", "error");
        // Tetap buka kartu kosong agar relawan bisa isi manual.
        const k = { ...KOSONG };
        k.provenance = KOSONG_PROVENANCE();
        setProfil(k);
        return;
      }
      setProfil(data.profil as ProfilKerentanan);
      show("AI selesai mengekstrak data profil", "success");
    } catch {
      show("Tidak ada koneksi. Isi kartu manual.", "error");
      const k = { ...KOSONG };
      k.provenance = KOSONG_PROVENANCE();
      setProfil(k);
    } finally {
      setLoading(false);
    }
  }

  function isiManual() {
    const k = { ...KOSONG };
    k.provenance = KOSONG_PROVENANCE();
    setProfil(k);
    setTersimpan(null);
  }

  function toggleVoice() {
    const SR =
      (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      show("Browser tidak mendukung input suara", "error");
      return;
    }
    if (listening) {
      recogRef.current?.stop();
      setListening(false);
      return;
    }
    const recog = new SR();
    recog.lang = "id-ID";
    recog.interimResults = false;
    recog.continuous = false;
    recog.onresult = (e: any) => {
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
    setProfil((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...p };
      
      // Update metadata provenance ke human-override
      const newProv = { ...(prev.provenance || KOSONG_PROVENANCE()) };
      Object.keys(p).forEach((key) => {
        newProv[key] = {
          value: (p as any)[key],
          source: "human",
          sourceDetail: "human-override (relawan)",
          confidence: 1.0,
        };
      });
      updated.provenance = newProv;
      return updated;
    });
  }

  async function simpan() {
    if (!profil) return;
    setSaving(true);
    try {
      const payload: KonfirmasiInput = {
        agentThought: profil.agentThought,
        namaKK: profil.namaKK?.trim() || null,
        usiaKK: profil.usiaKK,
        anggotaKeluarga: profil.anggotaKeluarga,
        kondisiMedisKritis: profil.kondisiMedisKritis,
        obatTersedia: profil.obatTersedia,
        mobilitas: profil.mobilitas,
        asalLokasi: profil.asalLokasi,
        instansiRujukan: profil.instansiRujukan,
        provenance: profil.provenance,
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
    <div className="flex flex-col gap-6 font-sans">
      {/* ====== INPUT ====== */}
      <Card className="border-slate-200/80 shadow-md">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
            Input Keluhan / Kondisi Pengungsi
          </h2>
          <span className="text-[10px] bg-slate-100 text-slate-500 font-semibold px-2 py-0.5 rounded-full">
            72h Golden Hour Mode
          </span>
        </div>

        <div className="flex flex-wrap gap-2">
          {CONTOH.map((c, i) => (
            <button
              key={i}
              onClick={() => setTeks(c)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 active:scale-95 transition-all"
            >
              Contoh Kasus {i + 1}
            </button>
          ))}
        </div>
        <textarea
          value={teks}
          onChange={(e) => setTeks(e.target.value)}
          rows={4}
          placeholder="Tulis kondisi lengkap keluarga korban bencana di sini..."
          className="mt-4 w-full rounded-xl border border-slate-200 p-3.5 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-pmi focus:ring-2 focus:ring-pmi/10"
        />
        
        {/* MODEL SELECTOR UI */}
        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">
            Pilih Engine Ekstraksi AI
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-sm transition-all ${modelMode === 'auto' ? 'border-pmi bg-pmi/5 ring-1 ring-pmi/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <input type="radio" name="modelMode" value="auto" checked={modelMode === 'auto'} onChange={(e) => setModelMode(e.target.value as any)} className="text-pmi focus:ring-pmi" />
                Auto (LLM)
              </div>
              <p className="mt-1 text-xs text-slate-500 ml-5">Default mode. Secara otomatis memproses menggunakan kecerdasan komprehensif LLM.</p>
            </label>
            <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-sm transition-all ${modelMode === 'deberta' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <input type="radio" name="modelMode" value="deberta" checked={modelMode === 'deberta'} onChange={(e) => setModelMode(e.target.value as any)} className="text-blue-500 focus:ring-blue-500" />
                DeBERTa v3 (Cepat)
              </div>
              <p className="mt-1 text-xs text-slate-500 ml-5">Zero-Shot NER super cepat. Direkomendasikan untuk bahasa laporan standar.</p>
            </label>
            <label className={`flex-1 cursor-pointer rounded-lg border p-3 text-sm transition-all ${modelMode === 'llm' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500/20' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <input type="radio" name="modelMode" value="llm" checked={modelMode === 'llm'} onChange={(e) => setModelMode(e.target.value as any)} className="text-purple-500 focus:ring-purple-500" />
                LLM (Akurat)
              </div>
              <p className="mt-1 text-xs text-slate-500 ml-5">Akurasi maksimal dan penalaran komprehensif, cocok untuk kalimat sangat berantakan.</p>
            </label>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <Button 
            onClick={analisis} 
            loading={loading} 
            className="flex-1 rounded-xl bg-pmi text-white font-bold hover:bg-pmi-dark py-3"
          >
            {loading ? "Memproses Data..." : "Ekstrak Data (AI)"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={toggleVoice}
            className={`rounded-xl border border-slate-200 ${listening ? "bg-red-50 text-red-600 border-red-200 animate-pulse" : ""}`}
          >
            <Volume2 className="h-4.5 w-4.5 mr-1" />
            {listening ? "Mendengar..." : "Suara"}
          </Button>
          <Button 
            variant="ghost" 
            onClick={isiManual}
            className="rounded-xl border border-slate-200"
          >
            <FileText className="h-4.5 w-4.5 mr-1" />
            Isi Manual
          </Button>
        </div>
      </Card>

      {/* ====== KARTU KONFIRMASI ====== */}
      {profil && skor && (
        <Card className="border-pmi/30 shadow-lg">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Kartu Konfirmasi & Triage</h2>
              <p className="text-[10px] text-slate-400 font-medium">VERIFIKASI LAPIS-1 OLEH RELAWAN</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                Skor Kerentanan: {skor.skor}
              </span>
              <LevelBadge level={skor.level} />
            </div>
          </div>

          {/* PRANA Performance Banner */}
          <div className="mb-4 flex items-start gap-3 rounded-2xl p-3 text-xs border bg-blue-50/80 border-blue-200 text-blue-800">
            <div className="mt-0.5">
              <Cpu className="h-4.5 w-4.5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold">AI Assist: Aktif</p>
              <p className="text-[11px] opacity-90 mt-0.5">
                Data diekstraksi secara otomatis melalui kecerdasan buatan (Engine: {modelMode}). Pastikan verifikasi kembali field yang berwarna oranye.
              </p>
            </div>
          </div>

          {/* Reasoning AI / Rule Trace */}
          {profil.agentThought && (
            <div className="mb-5 rounded-2xl bg-slate-50 border border-slate-100 p-3 text-xs text-slate-600">
              <p className="font-bold flex items-center gap-1 text-slate-500 mb-1">
                <Database className="h-3.5 w-3.5" /> Jejak Penalaran PRANA:
              </p>
              <p className="italic font-medium">&ldquo;{profil.agentThought}&rdquo;</p>
            </div>
          )}

          {/* Form Fields Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            <Field label="Nama Kepala Keluarga" meta={profil.provenance?.namaKK}>
              <input
                value={profil.namaKK ?? ""}
                onChange={(e) => patch({ namaKK: e.target.value || null })}
                placeholder="Misal: Bapak Joko"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                  profil.namaKK ? okCls : nullCls
                }`}
              />
            </Field>

            <Field label="Usia KK" meta={profil.provenance?.usiaKK}>
              <input
                type="number"
                value={profil.usiaKK ?? ""}
                onChange={(e) => patch({ usiaKK: e.target.value === "" ? null : Number(e.target.value) })}
                placeholder="Misal: 45"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                  profil.usiaKK === null ? nullCls : okCls
                }`}
              />
            </Field>

            <Field label="Obat Tersedia?" meta={profil.provenance?.obatTersedia}>
              <select
                value={profil.obatTersedia === null ? "" : profil.obatTersedia ? "ya" : "tidak"}
                onChange={(e) => patch({ obatTersedia: e.target.value === "" ? null : e.target.value === "ya" })}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                  profil.obatTersedia === null ? nullCls : okCls
                }`}
              >
                <option value="">Belum tahu / Tidak ditanyakan</option>
                <option value="ya">Ya, obat rutin tersedia</option>
                <option value="tidak">Tidak membawa obat rutin</option>
              </select>
            </Field>

            <Field label="Mobilitas" meta={profil.provenance?.mobilitas}>
              <select
                value={profil.mobilitas ?? ""}
                onChange={(e) => patch({ mobilitas: (e.target.value || null) as ProfilKerentanan["mobilitas"] })}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                  profil.mobilitas === null ? nullCls : okCls
                }`}
              >
                <option value="">Belum tahu</option>
                <option value="mandiri">Mandiri (Bisa jalan sendiri)</option>
                <option value="bantuan">Perlu Bantuan (Dipapah/kursi roda)</option>
                <option value="tidak_bisa">Tidak Bisa Bergerak (Tandu/Lumpuh)</option>
              </select>
            </Field>

            <Field label="Asal Lokasi (Kampung/Desa)" meta={profil.provenance?.asalLokasi}>
              <input
                value={profil.asalLokasi ?? ""}
                onChange={(e) => patch({ asalLokasi: e.target.value || null })}
                placeholder="Misal: Kampung Cibadak"
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${
                  profil.asalLokasi ? okCls : nullCls
                }`}
              />
            </Field>

            <Field label="Instansi Rujukan Utama" meta={profil.provenance?.instansiRujukan}>
              <select
                value={profil.instansiRujukan}
                onChange={(e) => patch({ instansiRujukan: e.target.value as ProfilKerentanan["instansiRujukan"] })}
                className={`w-full rounded-xl border px-3.5 py-2.5 text-sm outline-none transition-all ${okCls}`}
              >
                <option value="DINAS_KESEHATAN">Dinas Kesehatan (Medis/Obat)</option>
                <option value="DINAS_SOSIAL">Dinas Sosial (Logistik/Pangan)</option>
                <option value="BPBD">BPBD (Evakuasi/Hunian)</option>
              </select>
            </Field>
          </div>

          {/* Kondisi medis kritis (tags) */}
          <Field label="Kondisi Medis Kritis / Penyakit Kronis" meta={profil.provenance?.kondisiMedisKritis} className="mt-4">
            <div className="flex flex-wrap gap-2 mb-2 min-h-[32px] items-center">
              {profil.kondisiMedisKritis.length === 0 ? (
                <span className="text-xs text-slate-400 italic">Tidak ada penyakit kritis terdaftar.</span>
              ) : (
                profil.kondisiMedisKritis.map((k, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 border border-red-200/80 px-2.5 py-1 text-xs font-semibold text-red-700"
                  >
                    {k}
                    <button
                      onClick={() => patch({ kondisiMedisKritis: profil.kondisiMedisKritis.filter((_, j) => j !== i) })}
                      className="ml-1 flex h-3.5 w-3.5 items-center justify-center rounded-full text-red-500 hover:bg-red-100 hover:text-red-700 font-bold"
                    >
                      ✕
                    </button>
                  </span>
                ))
              )}
            </div>
            <div className="flex gap-2">
              <input
                value={kondisiInput}
                onChange={(e) => setKondisiInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && kondisiInput.trim()) {
                    e.preventDefault();
                    patch({ kondisiMedisKritis: [...profil.kondisiMedisKritis, kondisiInput.trim()] });
                    setKondisiInput("");
                  }
                }}
                placeholder="Tambah kondisi medis baru, tekan Enter"
                className="flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-pmi"
              />
            </div>
          </Field>

          {/* Anggota keluarga */}
          <Field label="Daftar Anggota Keluarga Terdampak" meta={profil.provenance?.anggotaKeluarga} className="mt-4">
            <div className="flex flex-col gap-2">
              {profil.anggotaKeluarga.length === 0 ? (
                <p className="text-xs text-slate-400 italic mb-1">Belum ada anggota keluarga terdaftar.</p>
              ) : (
                profil.anggotaKeluarga.map((a, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <input
                      value={a.hubungan}
                      onChange={(e) => {
                        const arr = [...profil.anggotaKeluarga];
                        arr[i] = { ...a, hubungan: e.target.value };
                        patch({ anggotaKeluarga: arr });
                      }}
                      placeholder="Hubungan (anak/istri/cucu)"
                      className="w-28 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-pmi outline-none"
                    />
                    <input
                      type="number"
                      value={a.usia ?? ""}
                      onChange={(e) => {
                        const arr = [...profil.anggotaKeluarga];
                        arr[i] = { ...a, usia: e.target.value === "" ? null : Number(e.target.value) };
                        patch({ anggotaKeluarga: arr });
                      }}
                      placeholder="Usia (Th)"
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-pmi outline-none"
                    />
                    <input
                      value={a.kondisiKhusus ?? ""}
                      onChange={(e) => {
                        const arr = [...profil.anggotaKeluarga];
                        arr[i] = { ...a, kondisiKhusus: e.target.value || null };
                        patch({ anggotaKeluarga: arr });
                      }}
                      placeholder="Kondisi Khusus (Opsional)"
                      className="flex-1 min-w-[120px] rounded-lg border border-slate-200 px-2 py-1.5 text-xs focus:border-pmi outline-none"
                    />
                    <button
                      onClick={() => patch({ anggotaKeluarga: profil.anggotaKeluarga.filter((_, j) => j !== i) })}
                      className="text-slate-400 hover:text-red-500 p-1"
                    >
                      ✕
                    </button>
                  </div>
                ))
              )}
              <button
                onClick={() => patch({ anggotaKeluarga: [...profil.anggotaKeluarga, { hubungan: "", usia: null, kondisiKhusus: null }] })}
                className="self-start rounded-xl border border-dashed border-slate-350 px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 transition-colors"
              >
                + Tambah Anggota
              </button>
            </div>
          </Field>

          {/* Rincian Skor */}
          <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200/50 p-4">
            <p className="mb-2 text-xs font-bold text-slate-500 uppercase tracking-wider">
              Rincian Perhitungan Rule-Engine:
            </p>
            {skor.rincian.length === 0 ? (
              <p className="text-xs text-slate-450 italic">Tidak ada faktor risiko kerentanan terdeteksi.</p>
            ) : (
              <ul className="text-xs text-slate-650 space-y-1.5">
                {skor.rincian.map((r, i) => (
                  <li key={i} className="flex justify-between border-b border-dashed border-slate-200/60 pb-1">
                    <span>{r.label}</span>
                    <span className="font-bold text-slate-800">+{r.poin} Poin</span>
                  </li>
                ))}
                <li className="mt-2 flex justify-between pt-1.5 font-black text-slate-900 border-t border-slate-200 text-sm">
                  <span>Total Skor Akhir</span>
                  <span className="text-pmi font-black">{skor.skor} Poin</span>
                </li>
              </ul>
            )}
            {skor.level === "MERAH" && (
              <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-50 p-2 text-xs text-red-700 font-semibold border border-red-100">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Kasus MERAH — Membutuhkan verifikasi medis (Lapis-2) di Dashboard Admin.</span>
              </div>
            )}
          </div>

          <div className="mt-5 flex gap-3">
            <Button 
              onClick={simpan} 
              loading={saving} 
              variant="success" 
              className="flex-1 rounded-xl bg-green-600 text-white font-bold hover:bg-green-700 py-3 shadow-md shadow-green-600/10"
            >
              Konfirmasi & Simpan
            </Button>
            <Button 
              variant="ghost" 
              onClick={() => setProfil(null)}
              className="rounded-xl border border-slate-200"
            >
              Batal
            </Button>
          </div>
        </Card>
      )}

      {tersimpan && (
        <Card className="border-green-200 bg-green-50/80 shadow-md">
          <p className="text-sm font-bold text-green-800 flex items-center gap-1.5">
            <UserCheck className="h-5 w-5 text-green-600" />
            Kasus Berhasil Disimpan — Kode: {tersimpan.kode} [Prioritas {tersimpan.level}]
          </p>
          <p className="text-xs text-slate-500 mt-1 pl-6.5">
            Data pengungsi telah terkirim ke dashboard monitoring pusat secara real-time.
          </p>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 font-medium">
          <Spinner className="text-pmi" /> PRANA sedang menganalisis teks bebas...
        </div>
      )}
    </div>
  );
}

function BadgeForMeta({ meta }: { meta: FieldMetadata }) {
  if (meta.source === "rule") {
    return (
      <span className="rounded bg-green-100 border border-green-200 text-[10px] font-bold text-green-700 px-1.5 py-0.5">
        Aturan
      </span>
    );
  }
  if (meta.source === "neural") {
    const isDeberta = meta.sourceDetail?.includes("gliner") || meta.sourceDetail?.includes("deberta");
    return (
      <span className={`rounded border text-[10px] font-bold px-1.5 py-0.5 ${isDeberta ? "bg-blue-50 border-blue-200 text-blue-700" : "bg-purple-50 border-purple-200 text-purple-700"}`}>
        {isDeberta ? "AI DeBERTa" : "AI LLM"}
      </span>
    );
  }
  if (meta.source === "human") {
    return (
      <span className="rounded bg-purple-50 border border-purple-200 text-[10px] font-bold text-purple-700 px-1.5 py-0.5">
        Diedit Relawan
      </span>
    );
  }
  return (
    <span className="rounded bg-amber-50 border border-amber-200 text-[10px] font-bold text-amber-700 px-1.5 py-0.5 flex items-center gap-0.5 animate-pulse">
      <HelpCircle className="h-3 w-3 text-amber-500" />
      Kosong
    </span>
  );
}

function Field({
  label,
  children,
  className = "",
  meta,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  meta?: FieldMetadata;
}) {
  return (
    <label className={`block text-xs ${className}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="font-bold text-slate-500 uppercase tracking-wider">{label}</span>
        {meta && <BadgeForMeta meta={meta} />}
      </div>
      {children}
      {meta && meta.sourceDetail && meta.confidence > 0 && (
        <span className="mt-1 block text-[10px] text-slate-400 italic">
          Metode: {meta.sourceDetail} • Kepercayaan: {(meta.confidence * 100).toFixed(0)}%
        </span>
      )}
    </label>
  );
}
