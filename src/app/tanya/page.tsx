"use client";
import { useState } from "react";
import DesaSelect, { useDesa } from "@/components/DesaSelect";
import StatusBanner from "@/components/StatusBanner";

type Pesan =
  | { dari: "warga"; teks: string }
  | { dari: "ai"; teks: string; sumber: { id: string; judul: string; sumber: string }[]; cakupan: boolean; q: string; fb?: boolean };

const CONTOH = ["Canang bekas dibuang ke mana?", "Bungkus mi instan masuk wadah apa?", "Kapan sampah organik diangkut?", "Minyak jelantah dibuang di mana?"];

export default function TanyaPage() {
  const [desa, setDesa] = useDesa();
  const [q, setQ] = useState("");
  const [log, setLog] = useState<Pesan[]>([]);
  const [loading, setLoading] = useState(false);

  async function kirim(text?: string) {
    const pertanyaan = (text ?? q).trim();
    if (pertanyaan.length < 3 || loading) return;
    setQ("");
    setLog((l) => [...l, { dari: "warga", teks: pertanyaan }]);
    setLoading(true);
    try {
      const r = await fetch("/api/tanya", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pertanyaan, desa }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menjawab.");
      setLog((l) => [...l, { dari: "ai", teks: j.jawaban, sumber: j.sumber, cakupan: j.dalam_cakupan, q: pertanyaan }]);
    } catch (e) {
      setLog((l) => [...l, { dari: "ai", teks: `⚠️ ${e instanceof Error ? e.message : "Gagal menjawab."}`, sumber: [], cakupan: false, q: pertanyaan, fb: true }]);
    } finally {
      setLoading(false);
    }
  }

  async function feedback(i: number, benar: boolean) {
    const m = log[i];
    if (m.dari !== "ai") return;
    await fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fitur: "tanya", benar, desa, detail: m.q }) }).catch(() => {});
    setLog((l) => l.map((x, j) => (j === i ? { ...(x as Extract<Pesan, { dari: "ai" }>), fb: true } : x)));
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Tanya Pilah</h1>
        <p className="text-slate-600">Jawaban hanya berdasarkan aturan dan dokumen desa, lengkap dengan sumbernya.</p>
      </div>
      <StatusBanner />
      <div className="card"><DesaSelect value={desa} onChange={setDesa} /></div>

      <div className="space-y-3" data-testid="chat">
        {log.length === 0 && (
          <div className="flex flex-wrap gap-2">
            {CONTOH.map((c) => (
              <button key={c} className="btn-ghost py-1.5 text-sm" onClick={() => kirim(c)}>{c}</button>
            ))}
          </div>
        )}
        {log.map((m, i) =>
          m.dari === "warga" ? (
            <div key={i} className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-brand px-4 py-2 text-white">{m.teks}</div>
          ) : (
            <div key={i} className="max-w-[90%] rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-4 py-3">
              <p className="whitespace-pre-line">{m.teks}</p>
              {!m.cakupan && m.sumber.length === 0 && !m.teks.startsWith("⚠️") && (
                <p className="mt-1 text-xs text-amber-700">Belum ada di dokumen desa ini.</p>
              )}
              {m.sumber.length > 0 && (
                <div className="mt-2 border-t pt-2 text-xs text-slate-500">
                  Sumber: {m.sumber.map((s) => `${s.judul} (${s.sumber})`).join("; ")}
                </div>
              )}
              {!m.fb && (
                <div className="mt-2 flex gap-2 text-xs">
                  <button className="underline" onClick={() => feedback(i, true)}>👍 Membantu</button>
                  <button className="underline" onClick={() => feedback(i, false)}>👎 Keliru</button>
                </div>
              )}
            </div>
          ),
        )}
        {loading && <div className="text-sm text-slate-500">AI sedang membaca aturan desa…</div>}
      </div>

      <form className="sticky bottom-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); kirim(); }}>
        <input className="input bg-white shadow" placeholder="Contoh: popok bekas dibuang ke mana?" value={q} maxLength={500} onChange={(e) => setQ(e.target.value)} data-testid="input-tanya" />
        <button className="btn" disabled={loading || q.trim().length < 3}>Kirim</button>
      </form>
    </div>
  );
}
