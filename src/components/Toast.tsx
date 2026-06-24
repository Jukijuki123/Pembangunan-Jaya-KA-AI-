"use client";

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";

type ToastKind = "success" | "error" | "info";
interface ToastItem {
  id: number;
  kind: ToastKind;
  msg: string;
}

const ToastCtx = createContext<{
  show: (msg: string, kind?: ToastKind) => void;
}>({ show: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

const STYLES: Record<ToastKind, string> = {
  success: "bg-hijau text-white",
  error: "bg-merah text-white",
  info: "bg-slate-800 text-white",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((msg: string, kind: ToastKind = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setItems((prev) => [...prev, { id, kind, msg }]);
    setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  return (
    <ToastCtx.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 left-1/2 z-[100] flex w-full max-w-sm -translate-x-1/2 flex-col gap-2 px-4">
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`rounded-lg px-4 py-3 text-sm font-medium shadow-lg ${STYLES[t.kind]}`}
          >
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
