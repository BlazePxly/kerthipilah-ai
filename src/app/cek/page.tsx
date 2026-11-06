"use client";
import { useState } from "react";
import ImagePicker from "@/components/ImagePicker";
import DesaSelect, { useDesa } from "@/components/DesaSelect";
import StatusBanner from "@/components/StatusBanner";
import { KATEGORI_INFO, type Kategori } from "@/lib/data";

type Hasil = {
  items: { nama: string; kategori: Kategori; alasan: string; tindakan: string }[];
  confidence: number;
  perlu_foto_ulang: boolean;
  pesan: string;
};

export default function CekPage() {
  const [desa, setDesa] = useDesa();
  const [foto, setFoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasil, setHasil] = useState<Hasil | null>(null);
  const [err, setErr] = useState("");
  const [fb, setFb] = useState<"" | "terkirim">("");

  async function proses() {
    if (!foto) return;
    setLoading(true);
    setErr("");
    setHasil(null);
    setFb("");
    try {
      const r = await fetch("/api/cek", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: foto, desa }) });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal memproses.");
      setHasil(j);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal memproses.");
    } finally {
      setLoading(false);
    }
  }

  async function kirimFeedback(benar: boolean) {
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fitur: "cek", benar, desa, detail: hasil?.items.map((i) => `${i.nama}:${i.kategori}`).join(", ") }),
    }).catch(() => {});
    setFb("terkirim");
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold">Cek Sampah</h1>
        <p className="text-slate-600">Foto satu atau beberapa barang. AI menentukan cara memilahnya.</p>
      </div>
      <StatusBanner />
      <div className="card space-y-4">
        <DesaSelect value={desa} onChange={setDesa} />
        <ImagePicker value={foto} onChange={(v) => { setFoto(v); setHasil(null); }} label="Foto sampah" />
        <button className="btn w-full" disabled={!foto || loading} onClick={proses} data-testid="btn-cek">
          {loading ? "AI sedang memeriksa…" : "Cek dengan AI"}
        </button>
        {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{err}</p>}
      </div>

      {hasil && (
        <div className="card space-y-3" data-testid="hasil-cek">
          <p className="font-semibold">{hasil.pesan}</p>
          {hasil.items.map((it, i) => {
            const k = KATEGORI_INFO[it.kategori];
            return (
              <div key={i} className="rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold text-white ${k.warna}`}>{k.label}</span>
                  <span className="font-bold">{it.nama}</span>
                </div>
                <p className="mt-1 text-sm"><b>Wadah:</b> {k.wadah}</p>
                <p className="text-sm"><b>Tujuan:</b> {k.tujuan}</p>
                <p className="text-sm"><b>Lakukan:</b> {it.tindakan}</p>
                <p className="text-sm text-slate-500">Alasan: {it.alasan}</p>
              </div>
            );
          })}
          <p className="text-xs text-slate-500">Keyakinan AI: {Math.round(hasil.confidence * 100)}%{hasil.perlu_foto_ulang && " · disarankan foto ulang"}</p>
          <div className="flex flex-wrap items-center gap-2 border-t pt-3 text-sm">
            {fb ? (
              <span className="text-brand">Terima kasih, masukan tersimpan.</span>
            ) : (
              <>
                <span>Jawaban sudah benar?</span>
                <button className="btn-ghost py-1" onClick={() => kirimFeedback(true)}>👍 Benar</button>
                <button className="btn-ghost py-1" onClick={() => kirimFeedback(false)}>👎 Salah</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
