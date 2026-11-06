"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ImagePicker from "@/components/ImagePicker";
import DesaSelect, { useDesa } from "@/components/DesaSelect";
import StatusBanner, { useStatus } from "@/components/StatusBanner";

type Status = "baik" | "kurang" | "tidak_dipilah";
type Audit = { status: Status; skor: number; kontaminan: string[]; catatan: string; saran_warga: string; foto_layak: boolean };

const LABEL: Record<Status, string> = { baik: "Baik", kurang: "Kurang", tidak_dipilah: "Tidak dipilah" };
const WARNA: Record<Status, string> = { baik: "bg-emerald-600", kurang: "bg-amber-500", tidak_dipilah: "bg-red-600" };

type BarcodeDetectorCtor = new (o: { formats: string[] }) => { detect: (s: CanvasImageSource) => Promise<{ rawValue: string }[]> };

function QrScanner({ onResult, onClose }: { onResult: (v: string) => void; onClose: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const BD = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  const [err, setErr] = useState(BD ? "" : "Browser ini belum mendukung pemindai QR. Ketik kode rumah secara manual.");
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
      .catch(() => setErr("Kamera tidak dapat dibuka. Ketik kode rumah secara manual."));
    return () => {
      stop = true;
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onResult, BD]);
  return (
    <div className="space-y-2 rounded-xl border p-3">
      {err ? <p className="text-sm text-amber-700">{err}</p> : <video ref={video} className="w-full rounded-lg bg-black" muted playsInline />}
      <button className="btn-ghost w-full" onClick={onClose}>Tutup pemindai</button>
    </div>
  );
}

export default function PetugasPage() {
  const router = useRouter();
  const st = useStatus();
  const [desa, setDesa] = useDesa();
  const [rumah, setRumah] = useState("");
  const [wadah, setWadah] = useState<"O" | "A" | "R">("O");
  const [foto, setFoto] = useState<string | null>(null);
  const [scan, setScan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [hasil, setHasil] = useState<Audit | null>(null);
  const [final, setFinal] = useState<Status>("baik");
  const [tersimpan, setTersimpan] = useState(0);
  const [info, setInfo] = useState("");

  useEffect(() => {
    if (st && !st.session) router.replace("/login?next=/petugas");
  }, [st, router]);

  async function analisis() {
    setLoading(true);
    setErr("");
    setHasil(null);
    setInfo("");
    try {
      const r = await fetch("/api/audit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ desa, rumah, wadah, image: foto }) });
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

  async function simpan() {
    if (!hasil) return;
    setLoading(true);
    setErr("");
    try {
      const r = await fetch("/api/audit/simpan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ desa, rumah, wadah, status_ai: hasil.status, skor_ai: hasil.skor, status_final: final, kontaminan: hasil.kontaminan }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Gagal menyimpan.");
      setTersimpan((n) => n + 1);
      setInfo(`Tersimpan: ${rumah.toUpperCase()} wadah ${wadah} → ${LABEL[final]}${final !== hasil.status ? " (dikoreksi petugas)" : ""}.`);
      setHasil(null);
      setFoto(null);
      setRumah("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.replace("/login?next=/petugas");
  }

  if (!st?.session) return <p className="text-slate-500">Memeriksa sesi…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-extrabold">Audit Wadah</h1>
          <p className="text-slate-600">Pindai QR rumah, foto wadah, AI menilai, Anda yang memutuskan.</p>
        </div>
        <div className="flex gap-2 text-sm">
          <Link href="/qr" className="btn-ghost py-1.5">QR rumah</Link>
          <button className="btn-ghost py-1.5" onClick={logout}>Keluar</button>
        </div>
      </div>
      <StatusBanner />
      {info && <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800" data-testid="info-simpan">{info} Total sesi ini: {tersimpan}.</p>}
      <div className="card space-y-4">
        <DesaSelect value={desa} onChange={setDesa} />
        <div>
          <label className="text-sm font-semibold text-slate-700">Kode rumah</label>
          <div className="mt-1 flex gap-2">
            <input className="input uppercase" placeholder="mis. KA-001" value={rumah} onChange={(e) => setRumah(e.target.value)} data-testid="input-rumah" />
            <button className="btn-ghost whitespace-nowrap" onClick={() => setScan((s) => !s)}>Pindai QR</button>
          </div>
          {scan && <div className="mt-2"><QrScanner onResult={(v) => { setRumah(v.replace(/^KP:/, "")); setScan(false); }} onClose={() => setScan(false)} /></div>}
        </div>
        <div>
          <span className="text-sm font-semibold text-slate-700">Jenis wadah</span>
          <div className="mt-1 grid grid-cols-3 gap-2">
            {(["O", "A", "R"] as const).map((w) => (
              <button key={w} onClick={() => setWadah(w)} className={wadah === w ? "btn" : "btn-ghost"}>
                {w === "O" ? "Organik" : w === "A" ? "Anorganik" : "Residu"}
              </button>
            ))}
          </div>
        </div>
        <ImagePicker value={foto} onChange={(v) => { setFoto(v); setHasil(null); }} label="Foto isi wadah" />
        <button className="btn w-full" disabled={!foto || !rumah.trim() || loading} onClick={analisis} data-testid="btn-audit">
          {loading && !hasil ? "AI menilai pilahan…" : "Nilai dengan AI"}
        </button>
        {err && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{err}</p>}
      </div>

      {hasil && (
        <div className="card space-y-3">
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 font-bold text-white ${WARNA[hasil.status]}`}>{LABEL[hasil.status]}</span>
            <span className="text-2xl font-extrabold">{hasil.skor}/100</span>
          </div>
          {!hasil.foto_layak && <p className="text-sm text-amber-700">Foto kurang jelas; pertimbangkan foto ulang.</p>}
          <p className="text-sm"><b>Catatan:</b> {hasil.catatan}</p>
          {hasil.kontaminan.length > 0 && <p className="text-sm"><b>Salah wadah:</b> {hasil.kontaminan.join(", ")}</p>}
          <p className="text-sm"><b>Saran untuk warga:</b> {hasil.saran_warga}</p>
          <div className="border-t pt-3">
            <p className="text-sm font-semibold">Keputusan petugas</p>
            <div className="mt-1 grid grid-cols-3 gap-2">
              {(Object.keys(LABEL) as Status[]).map((s) => (
                <button key={s} onClick={() => setFinal(s)} className={final === s ? "btn" : "btn-ghost"}>{LABEL[s]}</button>
              ))}
            </div>
            <button className="btn mt-3 w-full" onClick={simpan} disabled={loading} data-testid="btn-simpan">Simpan audit</button>
          </div>
        </div>
      )}
    </div>
  );
}
