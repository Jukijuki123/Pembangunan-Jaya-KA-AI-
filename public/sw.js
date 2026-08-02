/* SIGAP AI — Service Worker (Offline-first PWA)
 *
 * 1. Precache shell statis (manifest, icons, halaman masuk).
 * 2. Runtime cache semua GET: navigasi network-first (fallback ke cache),
 *    aset statis stale-while-revalidate.
 * 3. Background Sync "sync-intake": kirim antrian intake (IndexedDB) ke
 *    /api/offline/sync saat koneksi pulih — otomatis, tanpa buka app.
 */
const CACHE_NAME = "sigap-v2";
const SHELL = ["/", "/login", "/manifest.json", "/icon-192.png", "/icon-512.png"];

/* ── IndexedDB (antrian intake offline) ─────────────────── */
const DB_NAME = "sigap-offline";
const DB_VER = 1;
const STORE = "pending_intake";

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllPending() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const all = tx.objectStore(STORE).getAll();
    all.onsuccess = () => resolve(all.result || []);
    all.onerror = () => reject(all.error);
  });
}

async function removePending(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/* ── Install & aktivasi ─────────────────────────────────── */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

/* ── Runtime cache: fetch ───────────────────────────────── */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // POST/PATCH/DELETE selalu ke network

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // jangan cache API eksternal
  if (url.pathname.startsWith("/api/")) return; // API: selalu network (auth cookie)

  // Navigasi halaman: network-first, fallback cache → shell.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.headers.get("content-type")?.includes("text/html")) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("/"))
        )
    );
    return;
  }

  // Aset statis: cache-first, fallback network, TIDAK PERNAH return undefined.
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => new Response("", { status: 503, statusText: "Offline" }));
    })
  );
});

/* ── Background Sync: kirim antrian offline ─────────────── */
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-intake") {
    event.waitUntil(syncPendingIntake());
  }
});

async function syncPendingIntake() {
  try {
    const items = await getAllPending();
    if (!items.length) return;

    const res = await fetch("/api/offline/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ items: items.map((i) => ({ id: i.id, kasus: i.kasus })) }),
    });

    if (!res.ok) {
      // 401 = sesi login kedaluwarsa — jangan ulangi terus, tunggu buka app.
      if (res.status === 401) return;
      throw new Error("sync gagal " + res.status);
    }

    const data = await res.json();
    const savedIds = new Set((data.saved || []).map((s) => s.id));
    for (const it of items) {
      if (savedIds.has(it.id)) await removePending(it.id);
    }

    // Kabari halaman supaya badge antrian diperbarui.
    const clients = await self.clients.matchAll({ type: "window" });
    clients.forEach((c) => c.postMessage({ type: "SYNC_DONE", saved: data.saved?.length || 0 }));
  } catch (e) {
    // Gagal jaringan — browser akan mencoba lagi otomatis.
    console.warn("[sw] syncPendingIntake gagal:", e);
  }
}

/* Kabari halaman saat ada item antrean baru (untuk badge). */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "PENDING_CHANGED") {
    const clients = self.clients.matchAll({ type: "window" });
    clients.then((cs) => cs.forEach((c) => c.postMessage({ type: "PENDING_CHANGED" })));
  }
});
