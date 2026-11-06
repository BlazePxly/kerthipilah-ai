import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// Login sederhana untuk akun demo petugas/pengelola.
// Kredensial disimpan di env (DEMO_USERNAME / DEMO_PASSWORD), tidak pernah di repository.
const COOKIE = "kp_session";
const MAX_AGE = 60 * 60 * 12; // 12 jam

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) throw new Error("AUTH_SECRET belum diatur (minimal 16 karakter).");
  return s;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export function authConfigured(): boolean {
  return Boolean(process.env.AUTH_SECRET && process.env.DEMO_USERNAME && process.env.DEMO_PASSWORD);
}

export function checkCredentials(username: string, password: string): boolean {
  if (!authConfigured()) return false;
  return safeEqual(username, process.env.DEMO_USERNAME!) && safeEqual(password, process.env.DEMO_PASSWORD!);
}

export async function createSession(username: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ u: username, exp })).toString("base64url");
  (await cookies()).set(COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<{ u: string } | null> {
  if (!authConfigured()) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString()) as { u: string; exp: number };
    if (data.exp < Date.now() / 1000) return null;
    return { u: data.u };
  } catch {
    return null;
  }
}
