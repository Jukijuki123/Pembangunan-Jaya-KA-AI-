import { prisma } from "@/lib/prisma";

/**
 * Geocoding alamat -> koordinat via Nominatim (OpenStreetMap).
 *
 * Aturan:
 *  - WAJIB patuh rate limit 1 request/detik (delay antar request).
 *  - HTTP 429 -> retry exponential backoff (1s, 2s, 4s).
 *  - Semua hasil yang berhasil di-cache di tabel GeocodeCache — tidak ada
 *    query ulang ke Nominatim untuk alamat yang sama.
 *  - Alamat tidak ditemukan -> return null (admin drop pin manual).
 */
const NOMINATIM = "https://nominatim.openstreetmap.org/search";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let lastRequest = 0;
async function rateLimit() {
  const elapsed = Date.now() - lastRequest;
  const wait = Math.max(0, 1000 - elapsed); // min 1 detik antar request
  if (wait > 0) await sleep(wait);
  lastRequest = Date.now();
}

export async function geocodeAlamat(
  alamat: string
): Promise<{ lat: number; lng: number; label: string } | null> {
  const key = alamat.trim().toLowerCase();

  // 1) Cache dulu — jangan panggil Nominatim ulang.
  const cached = await prisma.geocodeCache.findUnique({ where: { alamat: key } });
  if (cached) {
    return { lat: cached.lat, lng: cached.lng, label: key };
  }

  // 2) Nominatim dengan rate limit + backoff.
  for (let attempt = 0; attempt < 4; attempt++) {
    await rateLimit();
    try {
      const url = new URL(NOMINATIM);
      url.searchParams.set("q", alamat);
      url.searchParams.set("format", "json");
      url.searchParams.set("countrycodes", "id");
      url.searchParams.set("limit", "1");
      url.searchParams.set("accept-language", "id");

      const res = await fetch(url.toString(), {
        headers: { "User-Agent": "SIGAP-AI/1.0 (koordinasi-posko-bencana)" },
      });

      if (res.status === 429) {
        await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s, 8s
        continue;
      }
      if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);

      const data = (await res.json()) as Array<{ lat: string; lon: string; display_name: string }>;
      if (!data.length) return null; // alamat tidak ditemukan -> fallback pin manual

      const hit = data[0];
      const hasil = {
        lat: parseFloat(hit.lat),
        lng: parseFloat(hit.lon),
        label: hit.display_name,
      };

      // Cache hasil sukses.
      await prisma.geocodeCache.upsert({
        where: { alamat: key },
        update: { lat: hasil.lat, lng: hasil.lng },
        create: { alamat: key, lat: hasil.lat, lng: hasil.lng },
      });
      return hasil;
    } catch (e) {
      if (attempt === 3) {
        console.warn("[geocode] gagal setelah retry:", alamat, (e as Error).message);
        return null;
      }
      await sleep(500 * 2 ** attempt);
    }
  }
  return null;
}
