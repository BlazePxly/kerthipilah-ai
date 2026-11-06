import { getSession } from "@/lib/auth";
import { findRumah, getDesa } from "@/lib/data";
import { addAudit } from "@/lib/db";
import { errorResponse } from "@/lib/http";

const STATUS = ["baik", "kurang", "tidak_dipilah"];

export async function POST(req: Request) {
  try {
    const s = await getSession();
    if (!s) return Response.json({ error: "Silakan login sebagai petugas." }, { status: 401 });
    const b = await req.json();
    const desa = getDesa(b.desa);
    const rumah = findRumah(desa, String(b.rumah ?? ""));
    if (!rumah) return Response.json({ error: "Kode rumah tidak terdaftar." }, { status: 404 });
    if (!["O", "A", "R"].includes(b.wadah) || !STATUS.includes(b.status_ai) || !STATUS.includes(b.status_final))
      return Response.json({ error: "Data audit tidak valid." }, { status: 400 });
    const kontaminan = Array.isArray(b.kontaminan) ? b.kontaminan.filter((x: unknown) => typeof x === "string").slice(0, 5).map((x: string) => x.slice(0, 60)) : [];
    const row = await addAudit({
      desa: desa.id,
      rumah: rumah.kode,
      banjar: rumah.banjar,
      wadah: b.wadah,
      status_ai: b.status_ai,
      skor_ai: Math.max(0, Math.min(100, Number(b.skor_ai) || 0)),
      status_final: b.status_final,
      dikoreksi: b.status_ai !== b.status_final,
      kontaminan,
      petugas: s.u,
    });
    return Response.json({ ok: true, id: row.id });
  } catch (e) {
    return errorResponse(e);
  }
}
