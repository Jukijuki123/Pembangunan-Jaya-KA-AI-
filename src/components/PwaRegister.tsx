"use client";

import { useEffect } from "react";

/**
 * Registrasi Service Worker (PWA). Di-import di layout — berjalan sekali.
 */
export default function PwaRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch((e) => {
      console.warn("[pwa] gagal register SW:", e);
    });
  }, []);

  return null;
}
