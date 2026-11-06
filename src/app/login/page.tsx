"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/petugas";
  const [u, setU] = useState("");
  const [p, setP] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const r = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: u, password: p }) });
    const j = await r.json().catch(() => ({}));
    setLoading(false);
    if (!r.ok) return setErr(j.error || "Login gagal.");
    router.push(next.startsWith("/") ? next : "/petugas");
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="card mx-auto mt-16 max-w-sm space-y-4 bg-white shadow-[0_1px_3px_rgba(0,0,0,.12),0_4px_16px_rgba(0,0,0,.06)]">
      <h1 className="text-[22px] font-medium">Login petugas / pengelola</h1>
      <p className="text-sm text-muted">Akun demo juri dikirim melalui form panitia.</p>
      <input className="input" placeholder="Username" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} />
      <input className="input" placeholder="Password" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
      {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
      <button className="btn w-full" disabled={loading || !u || !p}>{loading ? "Memeriksa…" : "Masuk"}</button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
