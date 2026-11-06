import { ringkasDasbor } from "@/lib/ai";
import { getSession } from "@/lib/auth";
import { getDesa } from "@/lib/data";
import { listAudits } from "@/lib/db";
import { errorResponse, rateLimited } from "@/lib/http";
import { hitungStatistik } from "@/lib/stats";

export const maxDuration = 60;

// Hanya statistik agregat (tanpa kode rumah/nama petugas) yang dikirim ke model AI.
export async function POST(req: Request) {
  try {
    if (!(await getSession())) return Response.json({ error: "Silakan login." }, { status: 401 });
    if (rateLimited(req, 6)) return Response.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const b = await req.json().catch(() => ({}));
    const desa = getDesa(b.desa);
    const audits = await listAudits(desa.id, 7);
    if (audits.length === 0) return Response.json({ error: "Belum ada data audit 7 hari terakhir." }, { status: 400 });
    const stat = hitungStatistik(audits, desa.banjar, 7);
    return Response.json(await ringkasDasbor(stat, desa));
  } catch (e) {
    return errorResponse(e);
  }
}
