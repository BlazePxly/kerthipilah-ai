import { getSession } from "@/lib/auth";
import { getDesa } from "@/lib/data";
import { dbMode, feedbackStats, listAudits } from "@/lib/db";
import { errorResponse } from "@/lib/http";
import { hitungStatistik } from "@/lib/stats";

export async function GET(req: Request) {
  try {
    const s = await getSession();
    if (!s) return Response.json({ error: "Silakan login." }, { status: 401 });
    const url = new URL(req.url);
    const desa = getDesa(url.searchParams.get("desa"));
    const hari = Math.min(90, Math.max(1, Number(url.searchParams.get("hari")) || 30));
    const audits = await listAudits(desa.id, hari);
    const fb = await feedbackStats(desa.id);
    return Response.json({
      user: s.u,
      desa: { id: desa.id, nama: desa.nama, banjar: desa.banjar },
      penyimpanan: dbMode(),
      statistik: hitungStatistik(audits, desa.banjar, hari),
      feedback: fb,
      terbaru: audits.slice(0, 20),
    });
  } catch (e) {
    return errorResponse(e);
  }
}
