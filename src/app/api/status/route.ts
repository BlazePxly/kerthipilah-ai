import { connection } from "next/server";
import { aiConfigured, aiInfo } from "@/lib/ai";
import { authConfigured, getSession } from "@/lib/auth";
import { dbMode } from "@/lib/db";

export async function GET() {
  await connection(); // selalu dievaluasi saat request (status env & sesi)
  const info = aiInfo();
  return Response.json({
    ai: aiConfigured(),
    provider: info.provider,
    model: info.model,
    vision: info.vision,
    login: authConfigured(),
    penyimpanan: dbMode(),
    session: Boolean(await getSession()),
  });
}
