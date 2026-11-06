import { connection } from "next/server";
import { getSession } from "@/lib/auth";
import { getDesa } from "@/lib/data";
import { listAudits } from "@/lib/db";
import { errorResponse } from "@/lib/http";

// Progres rute petugas: audit 24 jam terakhir (rumah + wadah + status).
export async function GET(req: Request) {
  await connection();
  try {
    if (!(await getSession())) return Response.json({ error: "Silakan login." }, { status: 401 });
    const desa = getDesa(new URL(req.url).searchParams.get("desa"));
    const rows = await listAudits(desa.id, 1);
    return Response.json(rows.map((r) => ({ rumah: r.rumah, wadah: r.wadah, status: r.status_final, waktu: r.created_at })));
  } catch (e) {
    return errorResponse(e);
  }
}
