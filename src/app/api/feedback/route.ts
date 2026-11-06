import { getDesa } from "@/lib/data";
import { addFeedback } from "@/lib/db";
import { errorResponse, rateLimited } from "@/lib/http";

export async function POST(req: Request) {
  try {
    if (rateLimited(req, 20)) return Response.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
    const b = await req.json();
    if (!["cek", "tanya"].includes(b.fitur) || typeof b.benar !== "boolean")
      return Response.json({ error: "Data tidak valid." }, { status: 400 });
    await addFeedback({
      desa: getDesa(b.desa).id,
      fitur: b.fitur,
      benar: b.benar,
      detail: typeof b.detail === "string" ? b.detail.slice(0, 300) : "",
    });
    return Response.json({ ok: true });
  } catch (e) {
    return errorResponse(e);
  }
}
