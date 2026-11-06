"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDesa } from "@/components/DesaSelect";
import { usePhotoPicker } from "@/components/usePhotoPicker";
import { IconCamera, IconClose, IconImage, IconQr } from "@/components/icons";
import { useStatus } from "@/components/StatusBanner";
import { findRumah, getDesa, type Rumah } from "@/lib/data";

type Status = "baik" | "kurang" | "tidak_dipilah";
type Wadah = "O" | "A" | "R";
type Audit = { status: Status; skor: number; kontaminan: string[]; catatan: string; saran_warga: string; foto_layak: boolean };
type Selesai = Record<string, Partial<Record<Wadah, Status>>>; // kode rumah -> wadah -> status

const WADAH_URUT: Wadah[] = ["O", "A", "R"];
const STATUS: Record<Status, { label: string; dot: string; chip: string; on: string }> = {
  baik: { label: "Baik", dot: "bg-[#2e9e57]", chip: "bg-[#e3f4e8] text-[#155c31]", on: "bg-[#2e9e57] text-white" },
  kurang: { label: "Kurang", dot: "bg-[#e0a800]", chip: "bg-[#fff4cc] text-[#6b5000]", on: "bg-[#e0a800] text-[#2b2000]" },
  tidak_dipilah: { label: "Tidak dipilah", dot: "bg-[#c62828]", chip: "bg-[#fdeceb] text-[#8c1d18]", on: "bg-[#c62828] text-white" },
};
const WADAH: Record<Wadah, { label: string; dot: string; soft: string }> = {
  O: { label: "Organik", dot: "bg-[#2e9e57]", soft: "bg-[#e3f4e8]" },
  A: { label: "Anorganik", dot: "bg-[#e0a800]", soft: "bg-[#fff4cc]" },
  R: { label: "Residu", dot: "bg-[#6b7570]", soft: "bg-[#eceeed]" },
};

type BarcodeDetectorCtor = new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function QrScanner({ onResult, onClose }: { onResult: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  const [err, setErr] = useState(BD ? "" : "Browser ini belum mendukung pemindai QR. Ketik kode rumah.");
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
      .catch(() => setErr("Kamera tidak dapat dibuka. Ketik kode rumah."));
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult, BD]);
  return (
    <div className="space-y-2">
      {err ? <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">{err}</p> : <video ref={video} className="aspect-square w-full rounded-2xl bg-black object-cover" muted playsInline />}
      <button className="btn-ghost w-full" onClick={onClose}>Tutup pemindai</button>
    </div>
  );
}

// ---------------- Lembar audit satu rumah ----------------
function LembarAudit({ rumah, desa, selesai, onSaved, onClose, onNext }: {
  rumah: Rumah;
  desa: string;
  selesai: Partial<Record<Wadah, Status>>;
  onSaved: (w: Wadah, s: Status) => void;
  onClose: () => void;
  onNext: (() => void) | null;
}) {
  const router = useRouter();
  const [wadah, setWadah] = useState<Wadah>(WADAH_URUT.find((w) => !selesai[w]) ?? "O");
  const [foto, setFoto] = useState<string | null>(null);
  const [hasil, setHasil] = useState<Audit | null>(null);
  const [final, setFinal] = useState<Status>("baik");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const semua = WADAH_URUT.every((w) => selesai[w]);

  async function analisis(img: string) {
    setFoto(img);
    setHasil(null);
    setErr("");
    setLoading(true);
    try {
      const r = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ desa, rumah: rumah.kode, wadah, image: img }) });
      const j = await r.json().catch(() => ({}));
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
  const picker = usePhotoPicker(analisis, setErr);

  async function simpan() {
    if (!hasil) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/audit/simpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desa, rumah: rumah.kode, wadah, status_ai: hasil.status, skor_ai: hasil.skor, status_final: final, kontaminan: hasil.kontaminan }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan.");
      onSaved(wadah, final);
      const next = WADAH_URUT.find((w) => w !== wadah && !selesai[w]);
      setFoto(null);
      setHasil(null);
      if (next) setWadah(next);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" role="dialog" aria-modal="true" aria-label={`Audit ${rumah.kode}`}>
      <div className="flex max-h-[94dvh] w-full max-w-[520px] flex-col overflow-hidden rounded-t-[28px] bg-white sm:rounded-[28px]">
        <div className="flex items-center gap-3 border-b border-black/5 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-ink">{rumah.kode}</p>
            <p className="text-sm text-subtle">Banjar {rumah.banjar}</p>
          </div>
          <button aria-label="Tutup" onClick={onClose} className="grid h-11 w-11 place-items-center rounded-full hover:bg-surface"><IconClose /></button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {/* Pilih wadah */}
          <div className="grid grid-cols-3 gap-2">
            {WADAH_URUT.map((w) => {
              const s = selesai[w];
              const on = w === wadah && !semua;
              return (
                <button
                  key={w}
                  disabled={loading}
                  onClick={() => { setWadah(w); setFoto(null); setHasil(null); }}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border-2 text-sm font-semibold transition ${on ? `border-ink ${WADAH[w].soft}` : "border-transparent bg-surface"}`}
                >
                  <span className={`h-3.5 w-3.5 rounded-full ${WADAH[w].dot}`} />
                  {WADAH[w].label}
                  <span className={`rounded-full px-2 text-[11px] ${s ? STATUS[s].chip : "text-subtle"}`}>{s ? STATUS[s].label : "belum"}</span>
                </button>
              );
            })}
          </div>

          {semua && !foto ? (
            <div className="space-y-3 rounded-3xl bg-ok-bg p-5 text-center text-ok">
              <p className="text-3xl">✓</p>
              <p className="font-semibold">Ketiga wadah {rumah.kode} sudah diaudit.</p>
              {onNext ? <button className="btn w-full" onClick={onNext} data-testid="btn-rumah-berikut">Rumah berikutnya →</button> : <button className="btn w-full" onClick={onClose}>Selesai</button>}
            </div>
          ) : !foto ? (
            <div className="space-y-2">
              <button className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-3xl bg-ink text-white active:scale-[.99]" onClick={picker.openCamera} data-testid="btn-foto-wadah">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-white text-ink"><IconCamera className="h-8 w-8" /></span>
                <span className="text-[17px] font-semibold">Foto isi wadah {WADAH[wadah].label}</span>
              </button>
              <button className="btn-ghost w-full" onClick={picker.openGallery}><IconImage className="h-5 w-5" /> Dari galeri</button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="relative overflow-hidden rounded-3xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={foto} alt="Foto wadah" className={`w-full object-cover ${hasil ? "aspect-[16/7]" : "aspect-[16/10]"}`} />
                {loading && !hasil && (
                  <>
                    <span className="absolute inset-0 bg-black/25" />
                    <span className="kp-scan absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-[#9ccc3c]/45 to-transparent" />
                    <span className="absolute inset-x-0 bottom-3 text-center text-sm font-semibold text-white drop-shadow">AI menilai pilahan…</span>
                  </>
                )}
              </div>
              {hasil && (
                <>
                  <div className="rounded-2xl bg-surface p-4">
                    <div className="flex items-center gap-3">
                      <span className={`rounded-full px-3 py-1 text-sm font-bold ${STATUS[hasil.status].chip}`}>Saran AI: {STATUS[hasil.status].label}</span>
                      <span className="ml-auto text-xl font-bold">{hasil.skor}<span className="text-sm text-subtle">/100</span></span>
                    </div>
                    {hasil.kontaminan.length > 0 && <p className="mt-2 text-[15px]"><span className="text-subtle">Salah wadah:</span> {hasil.kontaminan.join(", ")}</p>}
                    <p className="mt-1 text-[15px]">{hasil.catatan}</p>
                    {!hasil.foto_layak && <p className="mt-1 text-sm text-warn">Foto kurang jelas, pertimbangkan foto ulang.</p>}
                  </div>
                  <p className="text-sm font-semibold text-muted">Keputusan Anda</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(STATUS) as Status[]).map((s) => (
                      <button key={s} onClick={() => setFinal(s)} className={`min-h-12 rounded-2xl px-1 text-sm font-semibold ${final === s ? STATUS[s].on : "bg-surface text-muted"}`}>{STATUS[s].label}</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-[1fr_1.4fr] gap-2">
                    <button className="btn-ghost" disabled={loading} onClick={picker.openCamera}>Foto ulang</button>
                    <button className="btn" disabled={loading} onClick={simpan} data-testid="btn-simpan">Simpan</button>
                  </div>
                </>
              )}
            </div>
          )}
          {err && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-sm text-danger" role="alert">{err}</p>}
          {picker.inputs}
        </div>
      </div>
    </div>
  );
}

// ---------------- Halaman rute ----------------
export default function PetugasPage() {
  const router = useRouter();
  const st = useStatus();
  const [desaId] = useDesa();
  const desa = getDesa(desaId);
  const [banjar, setBanjar] = useState(desa.banjar[0]);
  const [selesai, setSelesai] = useState<Selesai>({});
  const [aktif, setAktif] = useState<Rumah | null>(null);
  const [kode, setKode] = useState("");
  const [scan, setScan] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (st && !st.session) router.replace("/login?next=/petugas");
  }, [st, router]);

  useEffect(() => {
    if (!st?.session) return;
    let batal = false;
    fetch(`/api/audit/hari-ini?desa=${desaId}`).then(async (r) => {
      if (batal || !r.ok) return;
      const rows = (await r.json()) as { rumah: string; wadah: Wadah; status: Status }[];
      const s: Selesai = {};
      for (const x of [...rows].reverse()) (s[x.rumah] ??= {})[x.wadah] = x.status;
      setSelesai(s);
    });
    return () => {
      batal = true;
    };
  }, [st?.session, desaId]);

  const rute = useMemo(() => desa.rumah.filter((r) => r.banjar === banjar), [desa, banjar]);
  const beres = (k: string) => WADAH_URUT.every((w) => selesai[k]?.[w]);
  const jumlahBeres = rute.filter((r) => beres(r.kode)).length;
  const berikut = (dari: Rumah) => {
    const i = rute.findIndex((r) => r.kode === dari.kode);
    return [...rute.slice(i + 1), ...rute.slice(0, i)].find((r) => !beres(r.kode)) ?? null;
  };

  const buka = useCallback((v: string) => {
    const r = findRumah(desa, v.replace(/^KP:/, ""));
    setScan(false);
    if (!r) return setErr(`Kode "${v.toUpperCase()}" tidak terdaftar.`);
    setErr("");
    setKode("");
    setBanjar(r.banjar);
    setAktif(r);
  }, [desa]);

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login?next=/petugas");
  }

  if (!st?.session) return <p className="px-4 pt-6 text-subtle">Memeriksa sesi…</p>;

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-4 px-4 pb-10 pt-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">Rute audit</h1>
          <p className="text-[15px] text-muted">Ketuk rumah, foto 3 wadahnya, putuskan.</p>
        </div>
        <button onClick={logout} className="min-h-10 shrink-0 rounded-full px-3 text-sm text-subtle hover:bg-surface">Keluar</button>
      </div>
      {st && !st.ai && <p className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">Layanan AI belum aktif di server ini.</p>}

      <div className="flex gap-2 overflow-x-auto [scrollbar-width:none]">
        {desa.banjar.map((b) => (
          <button key={b} onClick={() => setBanjar(b)} className={`min-h-10 shrink-0 rounded-full border px-4 text-sm font-semibold ${b === banjar ? "border-ink bg-ink text-white" : "border-line text-muted"}`}>
            Banjar {b}
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-surface p-4">
        <div className="flex items-baseline justify-between">
          <p className="font-semibold text-ink">Banjar {banjar}</p>
          <p className="text-sm text-muted" data-testid="progres"><b className="text-ink">{jumlahBeres}</b>/{rute.length} rumah selesai</p>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${rute.length ? (jumlahBeres / rute.length) * 100 : 0}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-[auto_1fr] gap-2">
        <button className="btn" onClick={() => setScan((s) => !s)} data-testid="btn-scan"><IconQr className="h-5 w-5" /> Pindai QR</button>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (kode.trim()) buka(kode); }}>
          <input className="input uppercase" placeholder="Kode rumah" value={kode} onChange={(e) => setKode(e.target.value)} autoCapitalize="characters" data-testid="input-rumah" />
        </form>
      </div>
      {scan && <QrScanner onResult={buka} onClose={() => setScan(false)} />}
      {err && <p className="text-sm text-danger">{err}</p>}

      <ul className="divide-y divide-black/5 overflow-hidden rounded-2xl border border-black/5" data-testid="daftar-rumah">
        {rute.map((r) => {
          const s = selesai[r.kode] ?? {};
          const done = beres(r.kode);
          return (
            <li key={r.kode}>
              <button onClick={() => setAktif(r)} className="flex min-h-14 w-full items-center gap-3 bg-white px-4 py-2 text-left hover:bg-surface">
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-sm font-bold ${done ? "bg-primary text-white" : "bg-surface text-subtle"}`}>{done ? "✓" : ""}</span>
                <span className="min-w-0 flex-1 font-semibold text-ink">{r.kode}</span>
                <span className="flex gap-1.5" aria-label="Status wadah O, A, R">
                  {WADAH_URUT.map((w) => (
                    <span key={w} title={`${WADAH[w].label}: ${s[w] ? STATUS[s[w]!].label : "belum"}`} className={`grid h-6 w-6 place-items-center rounded-full text-[10px] font-bold ${s[w] ? `${STATUS[s[w]!].dot} text-white` : "border border-line text-subtle"}`}>{w}</span>
                  ))}
                </span>
                <span className="text-subtle">›</span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="grid grid-cols-2 gap-2">
        <Link href="/dasbor" className="btn-ghost">Dasbor TPS3R</Link>
        <Link href="/qr" className="btn-ghost">Cetak QR rumah</Link>
      </div>

      {aktif && (
        <LembarAudit
          key={aktif.kode}
          rumah={aktif}
          desa={desaId}
          selesai={selesai[aktif.kode] ?? {}}
          onSaved={(w, s) => setSelesai((prev) => ({ ...prev, [aktif.kode]: { ...prev[aktif.kode], [w]: s } }))}
          onClose={() => setAktif(null)}
          onNext={berikut(aktif) ? () => setAktif(berikut(aktif)) : null}
        />
      )}
    </div>
  );
}
