/**
 * Client-side sync helper — dipakai OfflineBanner & IntakeClient.
 * Fallback untuk browser tanpa Background Sync (mis. Safari): sinkronisasi
 * dijalankan saat event "online" atau saat halaman dibuka kembali.
 */
import {
  getAllPendingIntake,
  removePendingIntake,
} from "@/lib/idb";

export async function runSyncNow(): Promise<{
  synced: number;
  failed: number;
}> {
  const items = await getAllPendingIntake();
  if (items.length === 0) return { synced: 0, failed: 0 };

  const res = await fetch("/api/offline/sync", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    body: JSON.stringify({
      items: items.map((i) => ({ id: i.id, kasus: i.kasus })),
    }),
  });

  if (!res.ok) {
    throw new Error(`Sinkronisasi gagal (${res.status})`);
  }

  const data = await res.json();
  const savedIds = new Set<string>((data.saved ?? []).map((s: { id: string }) => s.id));
  for (const it of items) {
    if (savedIds.has(it.id)) await removePendingIntake(it.id);
  }
  return { synced: data.saved?.length ?? 0, failed: data.failed?.length ?? 0 };
}

export async function registerBackgroundSync(): Promise<void> {
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg) {
      // @ts-ignore — Background Sync API (ada di Chromium; aman di lain)
      await reg.sync.register("sync-intake");
    }
  } catch {
    // Browser tanpa Background Sync: fallback event "online" di OfflineBanner.
  }
}

export function notifySwPendingChanged(): void {
  navigator.serviceWorker?.controller?.postMessage({ type: "PENDING_CHANGED" });
}
