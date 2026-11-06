import { connection } from "next/server";
import { AI_MODEL, aiConfigured } from "@/lib/ai";
import { authConfigured, getSession } from "@/lib/auth";
import { dbMode } from "@/lib/db";

export async function GET() {
  await connection(); // selalu dievaluasi saat request (status env & sesi)
  return Response.json({
    ai: aiConfigured(),
    model: AI_MODEL,
    login: authConfigured(),
    penyimpanan: dbMode(),
    session: Boolean(await getSession()),
  });
}
