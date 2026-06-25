"use client";

import { Scanner as ReactQrScanner } from "@yudiel/react-qr-scanner";

interface ScannerProps {
  onScan: (data: string) => void;
  onError?: (error: Error) => void;
  paused?: boolean;
}

export function Scanner({ onScan, onError, paused = false }: ScannerProps) {
  return (
    <div className="relative overflow-hidden rounded-2xl border-4 border-white/20 shadow-2xl">
      <ReactQrScanner
        paused={paused}
        onScan={(result) => {
          if (result?.[0]?.rawValue) {
            onScan(result[0].rawValue);
          }
        }}
        onError={(err) => {
          if (onError) {
            onError(new Error(typeof err === "string" ? err : (err as any)?.message || "Scanner error"));
          }
        }}
        components={{
          onOff: true,
          torch: true,
          zoom: true,
          finder: true,
        }}
      />
      {/* Animated scanning line overlay */}
      {!paused && (
        <>
          <style>{`
            @keyframes scan {
              0%, 100% { transform: translateY(-50%); }
              50% { transform: translateY(50%); }
            }
            .animate-scan {
              animation: scan 3s ease-in-out infinite;
            }
          `}</style>
          <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-center px-8">
            <div className="h-0.5 w-full animate-scan bg-red-500 shadow-[0_0_8px_2px_rgba(239,68,68,0.8)]" />
          </div>
        </>
      )}
    </div>
  );
}
