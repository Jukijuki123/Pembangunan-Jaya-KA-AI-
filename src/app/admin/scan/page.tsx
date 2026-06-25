"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { QrCode, AlertCircle, CheckCircle2, User, Phone, MapPin, Activity, X } from "lucide-react";
import { Scanner } from "@/components/qr/Scanner";
import { confirmImportKasus } from "@/app/actions/qr";
import { Button, Card } from "@/components/ui";

interface KasusPreview {
  id: string;
  kodeUnik: string;
  namaKK: string | null;
  usiaKK: number | null;
  kondisiMedisKritis: string[];
  asalLokasi: string | null;
  levelPrioritas: string;
  status: string;
  createdBy?: { username: string; role: string } | null;
  alreadyImported?: boolean;
}

export default function AdminScanPage() {
  const router = useRouter();
  const [scanState, setScanState] = useState<"IDLE" | "SCANNING" | "FETCHING" | "PREVIEW" | "SUCCESS" | "ERROR">("SCANNING");
  const [errorMessage, setErrorMessage] = useState("");
  const [previewData, setPreviewData] = useState<KasusPreview | null>(null);

  const handleScan = async (payload: string) => {
    if (scanState !== "SCANNING") return; // Prevent duplicate triggers
    setScanState("FETCHING");

    try {
      const res = await fetch(`/api/qr/import?payload=${encodeURIComponent(payload)}`);
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "Gagal memverifikasi QR Code");
      }

      setPreviewData(json.alreadyImported ? { ...json.data, alreadyImported: true } : json.data);
      setScanState("PREVIEW");
    } catch (err: any) {
      setErrorMessage(err.message || "Gagal menghubungi server");
      setScanState("ERROR");
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    setScanState("FETCHING"); // Reuse fetching state for loading
    const res = await confirmImportKasus(previewData.id);
    if (!res.ok) {
      setErrorMessage(res.error || "Gagal mengimpor data.");
      setScanState("ERROR");
      return;
    }
    setScanState("SUCCESS");
  };

  const resetScanner = () => {
    setPreviewData(null);
    setErrorMessage("");
    setScanState("SCANNING");
  };

  return (
    <div className="mx-auto max-w-md p-4 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900">
          <QrCode className="h-6 w-6 text-pmi" />
          Scan QR Korban
        </h1>
        <Button variant="ghost" className="h-8 w-8 !p-0" onClick={() => router.push("/admin")}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      <p className="mb-6 text-sm text-slate-500">
        Arahkan kamera ke QR Code yang ada di perangkat korban atau relawan pengirim untuk mengimpor data ke sistem posko.
      </p>

      {scanState === "SCANNING" || scanState === "FETCHING" ? (
        <div className="relative">
          <Scanner onScan={handleScan} paused={scanState === "FETCHING"} />
          {scanState === "FETCHING" && (
            <div className="absolute inset-0 z-20 flex items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
              <div className="flex flex-col items-center gap-3 text-white">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-white border-t-transparent" />
                <p className="font-medium">Memproses data...</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {scanState === "PREVIEW" && previewData && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          <Card className="overflow-hidden border border-slate-200 bg-white/80 p-0 shadow-xl backdrop-blur-md">
            <div className={`p-4 text-white ${
              previewData.alreadyImported ? "bg-slate-500" :
              previewData.levelPrioritas === "MERAH" ? "bg-red-500" :
              previewData.levelPrioritas === "KUNING" ? "bg-amber-500" : "bg-emerald-500"
            }`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium opacity-90">Pratinjau Data</p>
                  <h2 className="text-xl font-bold">{previewData.namaKK || "Anonim"}</h2>
                </div>
                <div className="rounded bg-black/20 px-2 py-1 text-xs font-bold tracking-widest">
                  {previewData.kodeUnik}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-3 p-4">
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <User className="h-4 w-4 text-slate-400" />
                <span>Usia: {previewData.usiaKK ? `${previewData.usiaKK} tahun` : "-"}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Asal: {previewData.asalLokasi || "-"}</span>
              </div>
              {previewData.kondisiMedisKritis && previewData.kondisiMedisKritis.length > 0 && (
                <div className="flex items-start gap-3 text-sm text-slate-600">
                  <Activity className="h-4 w-4 shrink-0 text-slate-400" />
                  <div className="flex flex-wrap gap-1">
                    {previewData.kondisiMedisKritis.map((k, i) => (
                      <span key={i} className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {previewData.alreadyImported ? (
                <div className="mt-4 rounded-xl bg-slate-100 p-4 text-center">
                  <AlertCircle className="mx-auto mb-2 h-6 w-6 text-slate-500" />
                  <p className="text-sm font-medium text-slate-700">Data ini sudah pernah diimpor.</p>
                  <Button className="mt-4 w-full" variant="ghost" onClick={resetScanner}>
                    Scan QR Lain
                  </Button>
                </div>
              ) : (
                <div className="mt-4 flex gap-3">
                  <Button className="flex-1" variant="ghost" onClick={resetScanner}>
                    Batal
                  </Button>
                  <Button className="flex-1 bg-pmi text-white hover:bg-red-700" onClick={handleConfirm}>
                    Konfirmasi Import
                  </Button>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {scanState === "SUCCESS" && (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
          <div className="mb-4 rounded-full bg-emerald-100 p-4 text-emerald-600">
            <CheckCircle2 className="h-12 w-12" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Import Berhasil</h2>
          <p className="mb-8 text-sm text-slate-500">
            Data korban telah masuk ke dalam sistem posko dan siap untuk diproses lebih lanjut.
          </p>
          <Button className="w-full max-w-xs" onClick={resetScanner}>
            Scan QR Baru
          </Button>
        </div>
      )}

      {scanState === "ERROR" && (
        <div className="flex flex-col items-center justify-center py-12 text-center animate-in zoom-in duration-300">
          <div className="mb-4 rounded-full bg-red-100 p-4 text-red-600">
            <AlertCircle className="h-12 w-12" />
          </div>
          <h2 className="mb-2 text-xl font-bold text-slate-900">Gagal Memindai</h2>
          <p className="mb-8 text-sm text-slate-500">{errorMessage}</p>
          <Button className="w-full max-w-xs" onClick={resetScanner}>
            Coba Lagi
          </Button>
        </div>
      )}
    </div>
  );
}
