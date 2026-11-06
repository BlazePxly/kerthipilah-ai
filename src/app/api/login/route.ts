import { authConfigured, checkCredentials, createSession, destroySession } from "@/lib/auth";
import { rateLimited } from "@/lib/http";

export async function POST(req: Request) {
  if (rateLimited(req, 8)) return Response.json({ error: "Terlalu banyak percobaan. Tunggu 1 menit." }, { status: 429 });
  if (!authConfigured()) return Response.json({ error: "Login belum dikonfigurasi di server." }, { status: 503 });
  const b = await req.json().catch(() => ({}));
  const u = typeof b.username === "string" ? b.username.trim() : "";
  const p = typeof b.password === "string" ? b.password : "";
  if (!checkCredentials(u, p)) return Response.json({ error: "Username atau password salah." }, { status: 401 });
  await createSession(u);
  return Response.json({ ok: true });
}

export async function DELETE() {
  await destroySession();
  return Response.json({ ok: true });
}
