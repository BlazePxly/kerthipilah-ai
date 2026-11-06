import { auditWadah } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { findRumah, getDesa } from "@/lib/data";
import { errorResponse, parseImage, rateLimited } from "@/lib/http";

export const maxDuration = 60;

// Analisis AI saja; data baru disimpan setelah petugas mengonfirmasi (/api/audit/simpan).
export async function POST(req: Request) {
  try {
    if (!(await getSession())) return Response.json({ error: "Silakan login sebagai petugas." }, { status: 401 });
    if (rateLimited(req, 30)) return Response.json({ error: "Terlalu banyak permintaan. Tunggu sebentar." }, { status: 429 });
    const body = await req.json();
    const desa = getDesa(body.desa);
    const rumah = findRumah(desa, String(body.rumah ?? ""));
    if (!rumah) return Response.json({ error: "Kode rumah tidak terdaftar." }, { status: 404 });
    const wadah = body.wadah;
    if (!["O", "A", "R"].includes(wadah)) return Response.json({ error: "Jenis wadah tidak valid." }, { status: 400 });
    const img = parseImage(body.image);
    const hasil = await auditWadah(img, wadah, desa);
    return Response.json({ rumah, hasil });
  } catch (e) {
    return errorResponse(e);
  }
}
