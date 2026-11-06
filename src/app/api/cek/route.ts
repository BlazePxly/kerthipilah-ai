import { cekSampah } from "@/lib/ai";
import { getDesa } from "@/lib/data";
import { errorResponse, parseImage, rateLimited } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) return Response.json({ error: "Terlalu banyak permintaan. Tunggu sebentar." }, { status: 429 });
    const body = await req.json();
    const img = parseImage(body.image);
    const desa = getDesa(body.desa);
    const hasil = await cekSampah(img, desa);
    return Response.json(hasil);
  } catch (e) {
    return errorResponse(e);
  }
}
