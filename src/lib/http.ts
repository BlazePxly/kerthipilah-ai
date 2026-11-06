import "server-only";
import { AIError } from "./ai";

// Rate limit sederhana per IP (best-effort, per instance) untuk menjaga kuota API AI.
const hits = new Map<string, number[]>();
export function rateLimited(req: Request, limit = 12, windowMs = 60_000): boolean {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const key = `${ip} ${new URL(req.url).pathname}`; // batas terpisah per endpoint
  const now = Date.now();
  const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > limit;
}

const MAX_IMAGE_BYTES = 1_500_000;

export function parseImage(dataUrl: unknown): { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" } {
  if (typeof dataUrl !== "string") throw new AIError("Foto tidak ditemukan.", 400);
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new AIError("Format foto harus JPEG, PNG, atau WebP.", 400);
  if ((m[2].length * 3) / 4 > MAX_IMAGE_BYTES) throw new AIError("Ukuran foto terlalu besar (maks 1,5 MB setelah kompres).", 413);
  return { mediaType: m[1] as "image/jpeg" | "image/png" | "image/webp", data: m[2] };
}

export function errorResponse(e: unknown) {
  if (e instanceof AIError) return Response.json({ error: e.message }, { status: e.status });
  console.error(e);
  return Response.json({ error: "Terjadi kesalahan di server." }, { status: 500 });
}
