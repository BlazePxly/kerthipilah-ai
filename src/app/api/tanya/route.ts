import { tanyaPilah } from "@/lib/ai";
import { getDesa, retrieve } from "@/lib/data";
import { errorResponse, rateLimited } from "@/lib/http";

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    if (rateLimited(req)) return Response.json({ error: "Terlalu banyak permintaan. Tunggu sebentar." }, { status: 429 });
    const body = await req.json();
    const q = typeof body.pertanyaan === "string" ? body.pertanyaan.trim() : "";
    if (q.length < 3) return Response.json({ error: "Tulis pertanyaan minimal 3 karakter." }, { status: 400 });
    if (q.length > 500) return Response.json({ error: "Pertanyaan terlalu panjang (maks 500 karakter)." }, { status: 400 });
    const desa = getDesa(body.desa);
    const dokumen = retrieve(desa, q);
    const hasil = await tanyaPilah(q, dokumen, desa);
    const sumber = hasil.sumber.map((id) => {
      const d = dokumen.find((x) => x.id === id)!;
      return { id: d.id, judul: d.judul, sumber: d.sumber };
    });
    return Response.json({ ...hasil, sumber });
  } catch (e) {
    return errorResponse(e);
  }
}
