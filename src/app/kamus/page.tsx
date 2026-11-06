"use client";
import { useMemo, useState } from "react";
import { BinIcon } from "@/components/Bins";
import { useDesa } from "@/components/DesaSelect";
import { IconSearch } from "@/components/icons";
import { cariAturan, getDesa, KATEGORI_INFO, type Kategori } from "@/lib/data";

type Jawaban = { q: string; jawaban: string; sumber: { id: string; judul: string; sumber: string }[]; dalam_cakupan: boolean };
const FILTER: (Kategori | "semua")[] = ["semua", "organik", "anorganik", "residu", "b3"];

export default function KamusPage() {
  const [desaId] = useDesa();
  const desa = getDesa(desaId);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Kategori | "semua">("semua");
  const [ai, setAi] = useState<Jawaban | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const hasil = useMemo(() => {
    const list = q.trim() ? cariAturan(desa, q) : desa.aturan;
    return filter === "semua" ? list : list.filter((a) => a.kategori === filter);
  }, [desa, q, filter]);

  async function tanyaAI(pertanyaan = q.trim()) {
    if (pertanyaan.length < 3) return;
    setLoading(true);
    setErr("");
    setAi(null);
    try {
      const r = await fetch("/api/tanya", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pertanyaan, desa: desaId }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Gagal bertanya ke AI.");
      setAi({ q: pertanyaan, ...j });
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal bertanya ke AI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4 px-4 pb-10 pt-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Kamus pilah</h1>
        <p className="text-[15px] text-muted">Cari nama barang. Kalau tidak ada, tanyakan ke AI.</p>
      </div>

      <form
        className="sticky top-0 z-10 -mx-4 bg-white px-4 pb-2 pt-1"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 3 && hasil.length === 0) tanyaAI();
        }}
      >
        <label className="flex min-h-12 items-center gap-2 rounded-2xl border border-line bg-white px-3 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary">
          <IconSearch className="h-5 w-5 shrink-0 text-subtle" />
          <input
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base outline-none placeholder:text-subtle"
            placeholder="mis. sachet kopi, canang, baterai"
            value={q}
            maxLength={120}
            onChange={(e) => { setQ(e.target.value); setAi(null); }}
            enterKeyHint="search"
            data-testid="kamus-input"
          />
          {q && <button type="button" aria-label="Hapus" className="grid h-9 w-9 place-items-center rounded-full text-subtle hover:bg-surface" onClick={() => { setQ(""); setAi(null); }}>×</button>}
        </label>
        <div className="mt-2 flex gap-2 overflow-x-auto [scrollbar-width:none]">
          {FILTER.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-medium ${filter === f ? "border-primary bg-primary text-white" : "border-line text-muted"}`}
            >
              {f === "semua" ? "Semua" : KATEGORI_INFO[f].label}
            </button>
          ))}
        </div>
      </form>

      {q.trim().length >= 3 && (
        <button onClick={() => tanyaAI()} disabled={loading} className="flex w-full items-center gap-3 rounded-2xl bg-primary-soft px-4 py-3 text-left text-primary-ink disabled:opacity-60" data-testid="btn-tanya-ai">
          <span className="text-xl" aria-hidden>✨</span>
          <span className="min-w-0 flex-1 text-[15px]">
            {loading ? "AI sedang membaca aturan desa…" : <>Tanya AI: <b className="break-words">“{q.trim()}”</b></>}
          </span>
        </button>
      )}
      {err && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger">{err}</p>}
      {ai && (
        <div className="rounded-3xl border border-primary/20 bg-white p-4 shadow-[0_1px_3px_rgba(0,0,0,.06)]" data-testid="jawaban-ai">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Jawaban AI dari aturan desa</p>
          <p className="mt-1 text-[16px] leading-7 text-ink">{ai.jawaban}</p>
          {!ai.dalam_cakupan && <p className="mt-1 text-sm text-warn">Belum ada di dokumen desa. Tanyakan ke kelian banjar/TPS3R.</p>}
          {ai.sumber.length > 0 && <p className="mt-2 text-xs text-subtle">Sumber: {ai.sumber.map((s) => s.judul).join(" · ")}</p>}
        </div>
      )}

      <div className="space-y-2" data-testid="kamus-hasil">
        {hasil.map((a) => {
          const k = KATEGORI_INFO[a.kategori];
          return (
            <div key={a.barang} className="flex gap-3 rounded-2xl bg-surface p-3">
              <BinIcon k={a.kategori} className="h-10 w-10 shrink-0" />
              <div className="min-w-0">
                <p className="text-[15px] font-semibold capitalize text-ink">{a.barang}</p>
                <p className={`text-sm font-semibold ${k.teks}`}>{k.wadah}</p>
                <p className="text-sm text-muted">{a.catatan}</p>
              </div>
            </div>
          );
        })}
        {hasil.length === 0 && q.trim() && !ai && !loading && (
          <p className="py-6 text-center text-sm text-subtle">Tidak ada di kamus desa. Tekan “Tanya AI” di atas.</p>
        )}
      </div>
    </div>
  );
}
