"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDesa } from "@/components/DesaSelect";
import { usePhotoPicker } from "@/components/PromptBar";
import { IconCamera, IconImage, IconQr, Sparkle } from "@/components/icons";
import StatusBanner, { useStatus } from "@/components/StatusBanner";
import { findRumah, getDesa, type Rumah } from "@/lib/data";

type Status = "baik" | "kurang" | "tidak_dipilah";
type Wadah = "O" | "A" | "R";
type Audit = { status: Status; skor: number; kontaminan: string[]; catatan: string; saran_warga: string; foto_layak: boolean };

const STATUS: Record<Status, { label: string; cls: string; on: string }> = {
  baik: { label: "Baik", cls: "bg-[#e3f4e8] text-[#155c31]", on: "bg-[#2e9e57] text-white" },
  kurang: { label: "Kurang", cls: "bg-[#fff4cc] text-[#6b5000]", on: "bg-[#e0a800] text-[#2b2000]" },
  tidak_dipilah: { label: "Tidak dipilah", cls: "bg-[#fdeceb] text-[#8c1d18]", on: "bg-[#c62828] text-white" },
};
const WADAH: Record<Wadah, { label: string; dot: string; on: string }> = {
  O: { label: "Organik", dot: "bg-[#2e9e57]", on: "border-[#2e9e57] bg-[#e3f4e8]" },
  A: { label: "Anorganik", dot: "bg-[#e0a800]", on: "border-[#e0a800] bg-[#fff4cc]" },
  R: { label: "Residu", dot: "bg-[#6b7570]", on: "border-[#6b7570] bg-[#eceeed]" },
};

type BarcodeDetectorCtor = new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function QrScanner({ onResult, onClose }: { onResult: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  const [err, setErr] = useState(BD ? "" : "Browser ini belum mendukung pemindai QR. Ketik kode rumah di atas.");
  useEffect(() => {
    let stream: MediaStream | null = null;
    let stop = false;
    if (!BD) return;
    const det = new BD({ formats: ["qr_code"] });
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment" } })
      .then(async (s) => {
        stream = s;
        if (!video.current) return;
        video.current.srcObject = s;
        await video.current.play();
        const loop = async () => {
          if (stop || !video.current) return;
          try {
            const r = await det.detect(video.current);
            if (r[0]?.rawValue) return onResult(r[0].rawValue);
          } catch {}
          setTimeout(loop, 300);
        };
        loop();
      })
      .catch(() => setErr("Kamera tidak dapat dibuka. Ketik kode rumah di atas."));
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult, BD]);
  return (
    <div className="mt-3 space-y-2">
      {err ? <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">{err}</p> : <video ref={video} className="aspect-square w-full rounded-2xl bg-black object-cover" muted playsInline />}
      <button className="btn-ghost w-full" onClick={onClose}>Tutup pemindai</button>
    </div>
  );
}

function Step({ n, title, done, active, children }: { n: number; title: string; done?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <section className={`rounded-3xl p-4 transition sm:p-5 ${active ? "bg-surface" : "bg-surface/60"}`}>
      <h2 className="mb-3 flex items-center gap-2.5 text-[16px] font-semibold text-ink">
        <span className={`grid h-7 w-7 place-items-center rounded-full text-sm ${done ? "bg-primary text-white" : active ? "bg-ink text-white" : "bg-surface-3 text-subtle"}`}>{done ? "✓" : n}</span>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function PetugasPage() {
  const router = useRouter();
  const st = useStatus();
  const [desa] = useDesa();
  const [kode, setKode] = useState("");
  const [rumah, setRumah] = useState<Rumah | null>(null);
  const [wadah, setWadah] = useState<Wadah | null>(null);
  const [foto, setFoto] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [hasil, setHasil] = useState<Audit | null>(null);
  const [final, setFinal] = useState<Status>("baik");
  const [selesai, setSelesai] = useState<Wadah[]>([]); // wadah rumah ini yang sudah disimpan
  const [info, setInfo] = useState("");
  const [total, setTotal] = useState(0);

  useEffect(() => {
    if (st && !st.session) router.replace("/login?next=/petugas");
  }, [st, router]);

  function pilihRumah(v: string) {
    const r = findRumah(getDesa(desa), v.replace(/^KP:/, ""));
    setErr("");
    if (!r) return setErr(`Kode "${v.toUpperCase()}" tidak terdaftar di ${getDesa(desa).nama}.`);
    setRumah(r);
    setKode(r.kode);
    setScan(false);
    setSelesai([]);
    setInfo("");
  }

  async function analisis(img: string) {
    if (!rumah || !wadah) return;
    setLoading(true);
    setErr("");
    setHasil(null);
    try {
      const r = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ desa, rumah: rumah.kode, wadah, image: img }) });
      const j = await r.json();
      if (r.status === 401) return router.replace("/login?next=/petugas");
      if (!r.ok) throw new Error(j.error || "Gagal menganalisis.");
      setHasil(j.hasil);
      setFinal(j.hasil.status);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menganalisis.");
    } finally {
      setLoading(false);
    }
  }

  // Foto langsung dinilai AI setelah diambil (tanpa tombol tambahan).
  const picker = usePhotoPicker((img) => { setFoto(img); analisis(img); }, setErr);

  async function simpan() {
    if (!hasil || !rumah || !wadah) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/audit/simpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desa, rumah: rumah.kode, wadah, status_ai: hasil.status, skor_ai: hasil.skor, status_final: final, kontaminan: hasil.kontaminan }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan.");
      const sudah = [...selesai, wadah];
      setSelesai(sudah);
      setTotal((n) => n + 1);
      setInfo(`${rumah.kode} · ${WADAH[wadah].label} tersimpan sebagai "${STATUS[final].label}"${final !== hasil.status ? " (dikoreksi petugas)" : ""}.`);
      setHasil(null);
      setFoto(null);
      setWadah((["O", "A", "R"] as Wadah[]).find((w) => !sudah.includes(w)) ?? null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  function rumahBerikutnya() {
    setRumah(null);
    setKode("");
    setWadah(null);
    setFoto(null);
    setHasil(null);
    setSelesai([]);
    setInfo("");
  }

  if (!st?.session) return <p className="page text-subtle">Memeriksa sesi…</p>;

  return (
    <div className="page space-y-3">
      <div className="flex items-start justify-between gap-3 pb-1">
        <div>
          <h1 className="page-title">Audit Wadah</h1>
          <p className="page-sub">4 langkah: rumah → wadah → foto → putuskan.</p>
        </div>
        <span className="mt-1 shrink-0 rounded-full bg-primary-soft px-3 py-1 text-sm font-semibold text-primary-ink" title="Audit tersimpan sesi ini">{total} tersimpan</span>
      </div>
      <StatusBanner />

      {info && (
        <div className="rounded-3xl bg-ok-bg p-4 text-ok" data-testid="info-simpan">
          <p className="font-semibold">✓ {info}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {wadah && <span className="text-sm">Lanjut wadah {WADAH[wadah].label} di bawah, atau</span>}
            <button className="btn-ghost min-h-10 py-1.5 text-sm" onClick={rumahBerikutnya}>Rumah berikutnya →</button>
          </div>
        </div>
      )}

      <Step n={1} title="Rumah" done={Boolean(rumah)} active={!rumah}>
        {rumah ? (
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3">
            <div><p className="text-lg font-semibold">{rumah.kode}</p><p className="text-sm text-subtle">Banjar {rumah.banjar}</p></div>
            <button className="text-sm font-semibold text-primary" onClick={rumahBerikutnya}>Ganti</button>
          </div>
        ) : (
          <>
            <button className="btn w-full" onClick={() => setScan((s) => !s)} data-testid="btn-scan"><IconQr /> Pindai QR di wadah</button>
            {scan && <QrScanner onResult={pilihRumah} onClose={() => setScan(false)} />}
            <form className="mt-3 flex gap-2" onSubmit={(e) => { e.preventDefault(); pilihRumah(kode); }}>
              <input className="input uppercase" placeholder="atau ketik kode, mis. KA-001" value={kode} onChange={(e) => setKode(e.target.value)} autoCapitalize="characters" data-testid="input-rumah" />
              <button className="btn-ghost shrink-0" disabled={!kode.trim()}>OK</button>
            </form>
          </>
        )}
      </Step>

      <Step n={2} title="Wadah yang diperiksa" done={Boolean(wadah) && Boolean(foto)} active={Boolean(rumah) && !foto}>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(WADAH) as Wadah[]).map((w) => {
            const sudah = selesai.includes(w);
            return (
              <button
                key={w}
                disabled={!rumah || loading}
                onClick={() => { setWadah(w); setFoto(null); setHasil(null); }}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl border-2 bg-white px-2 py-2 text-sm font-semibold transition disabled:opacity-40 ${wadah === w ? WADAH[w].on : "border-transparent"}`}
              >
                <span className={`h-3.5 w-3.5 rounded-full ${WADAH[w].dot}`} />
                {WADAH[w].label}
                {sudah && <span className="text-[11px] font-medium text-ok">✓ selesai</span>}
              </button>
            );
          })}
        </div>
      </Step>

      <Step n={3} title="Foto isi wadah" done={Boolean(foto)} active={Boolean(rumah && wadah) && !foto}>
        {foto ? (
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto} alt="Foto wadah" className="h-20 w-20 rounded-2xl object-cover" />
            <div className="text-sm text-muted">{loading ? "AI sedang menilai…" : "Foto terkirim ke AI."}</div>
            <button className="ml-auto text-sm font-semibold text-primary" disabled={loading} onClick={picker.openCamera}>Foto ulang</button>
          </div>
        ) : (
          <div className="grid grid-cols-[1.4fr_1fr] gap-2">
            <button className="btn" disabled={!rumah || !wadah} onClick={picker.openCamera} data-testid="btn-foto-wadah"><IconCamera /> Ambil foto</button>
            <button className="btn-ghost" disabled={!rumah || !wadah} onClick={picker.openGallery}><IconImage /> Galeri</button>
          </div>
        )}
        {picker.inputs}
      </Step>

      {err && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">{err}</p>}

      {(hasil || (loading && foto)) && (
        <Step n={4} title="Putuskan" active>
          {!hasil ? (
            <div className="flex items-center gap-3 text-sm text-subtle"><Sparkle className="h-6 w-6" spin /> AI menilai pilahan…</div>
          ) : (
            <div className="space-y-3">
              <div className="rounded-2xl bg-white p-4">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-subtle"><Sparkle className="h-4 w-4" /> Saran AI</p>
                <div className="mt-2 flex items-center gap-3">
                  <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS[hasil.status].cls}`}>{STATUS[hasil.status].label}</span>
                  <span className="text-2xl font-semibold">{hasil.skor}<span className="text-base text-subtle">/100</span></span>
                </div>
                {!hasil.foto_layak && <p className="mt-2 text-sm text-warn">Foto kurang jelas, pertimbangkan foto ulang.</p>}
                <p className="mt-2 text-[15px]">{hasil.catatan}</p>
                {hasil.kontaminan.length > 0 && <p className="mt-1 text-[15px]"><span className="text-subtle">Salah wadah:</span> {hasil.kontaminan.join(", ")}</p>}
                <p className="mt-1 text-[15px]"><span className="text-subtle">Saran untuk warga:</span> {hasil.saran_warga}</p>
              </div>
              <p className="text-sm font-semibold text-muted">Keputusan Anda</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(STATUS) as Status[]).map((s) => (
                  <button key={s} onClick={() => setFinal(s)} className={`min-h-12 rounded-2xl px-2 text-sm font-semibold transition ${final === s ? STATUS[s].on : "bg-white text-muted"}`}>
                    {STATUS[s].label}
                  </button>
                ))}
              </div>
              <button className="btn w-full" onClick={simpan} disabled={loading} data-testid="btn-simpan">Simpan audit</button>
            </div>
          )}
        </Step>
      )}

      <div className="flex flex-wrap gap-2 pt-2 text-sm">
        <Link href="/qr" className="btn-ghost min-h-10 py-1.5 text-sm">Cetak QR rumah</Link>
        <Link href="/dasbor" className="btn-ghost min-h-10 py-1.5 text-sm">Lihat dasbor</Link>
      </div>
    </div>
  );
}
