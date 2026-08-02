/**
 * IndexedDB — antrian intake offline (client-side only).
 *
 * Store "pending_intake": kasus yang dikonfirmasi relawan saat offline,
 * menunggu dikirim ke server saat koneksi pulih (Background Sync).
 * Data TIDAK pernah keluar dari browser sebelum sync berhasil.
 */

const DB_NAME = "sigap-offline";
const DB_VER = 1;
const STORE = "pending_intake";

export interface PendingIntake {
  id: string; // uuid lokal
  kasus: unknown; // KonfirmasiInput (sudah tervalidasi client-side)
  createdAt: string; // ISO
}

function openDb(): Promise<IDBDatabase> {
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

function txDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function savePendingIntake(item: PendingIntake): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).put(item);
  await txDone(tx);
}

export async function getAllPendingIntake(): Promise<PendingIntake[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve((req.result as PendingIntake[]) ?? []);
    req.onerror = () => reject(req.error);
  });
}

export async function removePendingIntake(id: string): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).delete(id);
  await txDone(tx);
}

export async function countPendingIntake(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).count();
    req.onsuccess = () => resolve(req.result ?? 0);
    req.onerror = () => reject(req.error);
  });
}

export async function clearPendingIntake(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, "readwrite");
  tx.objectStore(STORE).clear();
  await txDone(tx);
}
