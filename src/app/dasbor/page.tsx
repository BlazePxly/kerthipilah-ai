"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDesa } from "@/components/DesaSelect";
import { Sparkle } from "@/components/icons";

type Stat = {
  total_audit: number;
  rumah_diaudit: number;
  persen_baik: number | null;
  persen_ai_disetujui_petugas: number | null;
  per_banjar: { banjar: string; audit: number; persen_baik: number | null }[];
  per_wadah: { wadah: string; audit: number; persen_baik: number | null }[];
  kontaminan_terbanyak: { barang: string; jumlah: number }[];
};
type Data = {
  user: string;
  penyimpanan: string;
  statistik: Stat;
  feedback: { total: number; benar: number };
  terbaru: { id: string; rumah: string; banjar: string; wadah: string; status_final: string; dikoreksi: boolean; created_at: string }[];
};

const pct = (v: number | null) => (v === null ? "–" : `${v}%`);

export default function DasborPage() {
  const router = useRouter();
  const [desa] = useDesa();
  const [hari, setHari] = useState(30);
  const [d, setD] = useState<Data | null>(null);
  const [err, setErr] = useState("");
  const [ring, setRing] = useState<{ ringkasan: string; rekomendasi: string[] } | null>(null);
  const [loadingR, setLoadingR] = useState(false);

  useEffect(() => {
    let batal = false;
    fetch(`/api/dasbor?desa=${desa}&hari=${hari}`).then(async (r) => {
      if (batal) return;
      if (r.status === 401) return router.replace("/login?next=/dasbor");
      const j = await r.json();
      if (!r.ok) return setErr(j.error || "Gagal memuat.");
      setErr("");
      setD(j);
    });
    return () => {
      batal = true;
    };
  }, [desa, hari, router]);

  async function ringkas() {
    setLoadingR(true);
    setRing(null);
    setErr("");
    const r = await fetch("/api/ringkasan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ desa }) });
    const j = await r.json();
    setLoadingR(false);
    if (!r.ok) return setErr(j.error || "Gagal membuat ringkasan.");
    setRing(j);
  }

  if (!d) return <p className="page text-[#5f6368]">{err || "Memuat dasbor…"}</p>;
  const s = d.statistik;

  return (
    <div className="page space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="page-title">Dasbor TPS3R</h1>
          <p className="page-sub">Kualitas pilahan dari audit petugas (keputusan akhir petugas).</p>
        </div>
        <Link href="/petugas" className="btn py-2">+ Audit baru</Link>
      </div>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Periode">
        {[7, 30, 90].map((h) => (
          <button
            key={h}
            onClick={() => setHari(h)}
            className={`rounded-full border px-4 py-1.5 text-sm ${hari === h ? "border-[#d3e3fd] bg-[#d3e3fd] text-[#041e49]" : "border-[#c4c7c5] text-[#444746] hover:bg-[#f0f4f9]"}`}
          >
            {h} hari
          </button>
        ))}
      </div>
      {d.penyimpanan === "file" && (
        <p className="rounded-2xl bg-[#fef7e0] px-4 py-3 text-xs text-[#7a5900]">Mode penyimpanan file lokal (DATABASE_URL belum diatur). Data dapat hilang saat server dimulai ulang.</p>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Wadah berstatus baik", pct(s.persen_baik)],
          ["Total audit", String(s.total_audit)],
          ["Rumah diaudit", String(s.rumah_diaudit)],
          ["AI disetujui petugas", pct(s.persen_ai_disetujui_petugas)],
        ].map(([k, v]) => (
          <div key={k} className="card">
            <p className="text-xs font-semibold text-[#5f6368]">{k}</p>
            <p className="mt-1 text-[28px] font-medium text-[#1f1f1f]" data-testid={`kpi-${k}`}>{v}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card">
          <h2 className="font-medium">Tingkat pilah per banjar</h2>
          <div className="mt-2 space-y-2">
            {s.per_banjar.map((b) => (
              <div key={b.banjar}>
                <div className="flex justify-between text-sm"><span>{b.banjar}</span><span>{pct(b.persen_baik)} · {b.audit} audit</span></div>
                <div className="h-2.5 rounded bg-slate-100">
                  <div className={`h-2.5 rounded ${(b.persen_baik ?? 0) < 60 ? "bg-amber-500" : "bg-[#0b57d0]"}`} style={{ width: `${b.persen_baik ?? 0}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[#5f6368]">Per wadah: {s.per_wadah.map((w) => `${w.wadah} ${pct(w.persen_baik)}`).join(" · ")}</p>
        </div>
        <div className="card">
          <h2 className="font-medium">Barang salah wadah terbanyak</h2>
          {s.kontaminan_terbanyak.length === 0 ? (
            <p className="mt-2 text-sm text-[#5f6368]">Belum ada data.</p>
          ) : (
            <ol className="mt-2 list-decimal pl-5 text-sm">
              {s.kontaminan_terbanyak.map((k) => <li key={k.barang}>{k.barang} <span className="text-[#5f6368]">({k.jumlah}×)</span></li>)}
            </ol>
          )}
          <p className="mt-3 text-xs text-[#5f6368]">Masukan warga atas jawaban AI: {d.feedback.total ? `${Math.round((d.feedback.benar / d.feedback.total) * 100)}% benar dari ${d.feedback.total}` : "belum ada"}</p>
        </div>
      </div>

      <div className="card space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 font-medium"><Sparkle className="h-5 w-5" /> Ringkasan AI 7 hari</h2>
          <button className="btn py-1.5 text-sm" onClick={ringkas} disabled={loadingR} data-testid="btn-ringkas">{loadingR ? "Menyusun…" : "Buat ringkasan"}</button>
        </div>
        {err && <p className="text-sm text-red-600" role="alert">{err}</p>}
        {ring && (
          <div className="text-sm">
            <p>{ring.ringkasan}</p>
            <ul className="mt-2 list-disc pl-5">{ring.rekomendasi.map((r, i) => <li key={i}>{r}</li>)}</ul>
            <p className="mt-2 text-xs text-[#5f6368]">Dibuat AI dari data agregat; periksa kembali sebelum dipakai di paruman.</p>
          </div>
        )}
      </div>

      <div className="card overflow-x-auto">
        <h2 className="font-medium">Audit terbaru</h2>
        <table className="mt-2 w-full text-left text-sm">
          <thead><tr className="text-[#5f6368]"><th>Waktu</th><th>Rumah</th><th>Banjar</th><th>Wadah</th><th>Status</th></tr></thead>
          <tbody>
            {d.terbaru.map((a) => (
              <tr key={a.id} className="border-t">
                <td className="py-1">{new Date(a.created_at).toLocaleString("id-ID", { dateStyle: "short", timeStyle: "short" })}</td>
                <td>{a.rumah}</td><td>{a.banjar}</td><td>{a.wadah}</td>
                <td>{a.status_final}{a.dikoreksi ? " ✎" : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {d.terbaru.length === 0 && <p className="mt-2 text-sm text-[#5f6368]">Belum ada audit. Mulai dari menu Audit Wadah.</p>}
      </div>
    </div>
  );
}
