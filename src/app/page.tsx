"use client";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";
import { BinRow } from "@/components/Bins";
import { useDesa } from "@/components/DesaSelect";
import { usePhotoPicker } from "@/components/usePhotoPicker";
import { IconCamera, IconImage, IconRefresh } from "@/components/icons";
import { getDesa, KATEGORI_INFO, NAMA_HARI, type Kategori } from "@/lib/data";
import { catat, hariIni, useRiwayat } from "@/lib/riwayat";

type Item = { nama: string; kategori: Kategori; alasan: string; tindakan: string };
type Hasil = { items: Item[]; confidence: number; perlu_foto_ulang: boolean; pesan: string };
type Tahap = { t: "siap" } | { t: "proses"; foto: string } | { t: "hasil"; foto: string; hasil: Hasil } | { t: "gagal"; foto: string; pesan: string };

const noop = () => () => {};

function JadwalHariIni({ desaId }: { desaId: string }) {
  const desa = getDesa(desaId);
  const hari = new Date().getDay();
  const hariIniList = desa.angkut.filter((a) => a.hari.includes(hari));
  return (
    <Link href="/jadwal" className="flex items-center gap-3 rounded-2xl bg-surface px-4 py-3 hover:bg-surface-2">
      <span className="text-2xl" aria-hidden>🚛</span>
      <span className="min-w-0 flex-1 text-sm">
        <span className="block font-semibold text-ink">Diangkut hari ini ({NAMA_HARI[hari]})</span>
        <span className="block truncate text-muted">
          {hariIniList.length ? hariIniList.map((a) => `${KATEGORI_INFO[a.kategori].label} ${a.jam}`).join(" · ") : "Tidak ada pengangkutan"}
        </span>
      </span>
      <span className="text-subtle">›</span>
    </Link>
  );
}

function KartuBarang({ it }: { it: Item }) {
  const k = KATEGORI_INFO[it.kategori];
  const [cek, setCek] = useState(false);
  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_3px_rgba(0,0,0,.06)]">
      <div className={`flex items-center gap-3 px-4 py-3 ${k.soft}`}>
        <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg ${k.warna}`} aria-hidden>{k.ikon}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[16px] font-semibold text-ink">{it.nama}</p>
          <p className={`text-sm font-semibold ${k.teks}`}>→ {k.wadah}</p>
        </div>
      </div>
      <div className="space-y-2 px-4 py-3 text-[15px] leading-6">
        {it.kategori !== "tidak_yakin" && (
          <button onClick={() => setCek((c) => !c)} className="flex w-full items-start gap-3 text-left" aria-pressed={cek}>
            <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 text-sm font-bold ${cek ? "border-primary bg-primary text-white" : "border-line"}`}>{cek ? "✓" : ""}</span>
            <span className={cek ? "text-subtle line-through" : ""}>{it.tindakan}</span>
          </button>
        )}
        <p className="text-sm text-muted"><span className="font-semibold">Lalu:</span> {k.tujuan}</p>
        <p className="text-xs text-subtle">Kenapa: {it.alasan}</p>
      </div>
    </div>
  );
}

function Pindai() {
  const [desa] = useDesa();
  const riwayat = useRiwayat();
  const jumlahHariIni = hariIni(riwayat).length;
  const [tahap, setTahap] = useState<Tahap>({ t: "siap" });
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");
  const [lapor, setLapor] = useState(false);

  async function analisis(foto: string) {
    setErr("");
    setLapor(false);
    setTahap({ t: "proses", foto });
    try {
      const r = await fetch("/api/cek", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: foto, desa }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Gagal memeriksa foto.");
      setTahap({ t: "hasil", foto, hasil: j });
    } catch (e) {
      setTahap({ t: "gagal", foto, pesan: e instanceof Error ? e.message : "Gagal memeriksa foto." });
    }
  }
  const picker = usePhotoPicker(analisis, setErr);

  function selesai(h: Hasil) {
    const items = h.items.filter((i) => i.kategori !== "tidak_yakin");
    catat(items.map((i) => ({ nama: i.nama, kategori: i.kategori })));
    setToast(`Mantap! ${items.length} barang tercatat terpilah hari ini.`);
    setTimeout(() => setToast(""), 2600);
    setTahap({ t: "siap" });
  }

  function laporSalah(h: Hasil) {
    fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fitur: "cek", benar: false, desa, detail: h.items.map((i) => `${i.nama}:${i.kategori}`).join(", ") }) }).catch(() => {});
    setLapor(true);
  }

  const counts: Partial<Record<Kategori, number>> = {};
  if (tahap.t === "hasil") for (const i of tahap.hasil.items) counts[i.kategori] = (counts[i.kategori] ?? 0) + 1;

  // ---------- Tampilan awal ----------
  if (tahap.t === "siap") {
    return (
      <div className="mx-auto w-full max-w-[560px] space-y-5 px-4 pb-8 pt-5">
        {toast && <div className="rounded-2xl bg-ok-bg px-4 py-3 text-sm font-semibold text-ok" role="status">✓ {toast}</div>}
        <div>
          <h1 className="text-[26px] font-bold tracking-tight text-ink">Buang ke tong mana?</h1>
          <p className="text-[15px] text-muted">Foto sampahnya. KerthiPilah menunjukkan tongnya sesuai aturan desa.</p>
        </div>

        <button
          onClick={picker.openCamera}
          className="group relative flex aspect-[4/3] w-full flex-col items-center justify-center overflow-hidden rounded-[28px] bg-gradient-to-br from-[#14653b] via-[#1a7f4b] to-[#2fa865] text-white shadow-[0_10px_30px_rgba(26,127,75,.30)] active:scale-[.99]"
          data-testid="btn-pindai"
        >
          {/* sudut bingkai pemindai */}
          <span className="pointer-events-none absolute inset-5">
            <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-2xl border-l-4 border-t-4 border-white/80" />
            <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-2xl border-r-4 border-t-4 border-white/80" />
            <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-2xl border-b-4 border-l-4 border-white/80" />
            <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-2xl border-b-4 border-r-4 border-white/80" />
          </span>
          <span className="grid h-20 w-20 place-items-center rounded-full bg-white text-primary shadow-lg transition group-hover:scale-105">
            <IconCamera className="h-9 w-9" />
          </span>
          <span className="mt-4 text-[19px] font-bold">Ketuk untuk memotret</span>
          <span className="mt-1 text-sm text-white/80">Satu atau beberapa barang sekaligus</span>
        </button>
        <button onClick={picker.openGallery} className="btn-ghost w-full"><IconImage className="h-5 w-5" /> Pilih dari galeri</button>
        {picker.inputs}
        {err && <p className="text-sm text-danger">{err}</p>}

        <div>
          <p className="mb-2 text-sm font-semibold text-muted">4 tong di rumahmu</p>
          <BinRow />
        </div>
        <JadwalHariIni desaId={desa} />
        {jumlahHariIni > 0 && (
          <p className="text-center text-sm text-muted">Hari ini kamu sudah memilah <b className="text-primary">{jumlahHariIni}</b> barang 🌿</p>
        )}
        <p className="text-center text-xs text-subtle">Foto tidak disimpan. AI bisa keliru, ikuti arahan petugas desa bila ragu.</p>
      </div>
    );
  }

  // ---------- Proses / hasil / gagal ----------
  const foto = tahap.foto;
  return (
    <div className="mx-auto flex min-h-full w-full max-w-[560px] flex-col px-4 pt-4">
      <div className="flex-1 space-y-4 pb-4">
        <div className={`relative mx-auto overflow-hidden rounded-3xl bg-surface ${tahap.t === "proses" ? "w-full" : "w-28"}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={foto} alt="Foto sampah" className={`w-full object-cover ${tahap.t === "proses" ? "aspect-[4/3]" : "aspect-square"}`} />
          {tahap.t === "proses" && (
            <>
              <span className="absolute inset-0 bg-[#0b3d22]/25" />
              <span className="kp-scan absolute inset-x-0 h-1/3 bg-gradient-to-b from-transparent via-[#9ccc3c]/45 to-transparent" />
              <span className="absolute inset-x-0 bottom-4 text-center text-sm font-semibold text-white drop-shadow">Mengenali barang…</span>
            </>
          )}
        </div>

        {tahap.t === "proses" && (
          <div className="opacity-60"><BinRow /></div>
        )}

        {tahap.t === "gagal" && (
          <div className="space-y-3 text-center">
            <p className="rounded-2xl bg-danger-bg px-4 py-3 text-[15px] text-danger" role="alert">{tahap.pesan}</p>
            <button className="btn w-full" onClick={() => analisis(foto)}><IconRefresh className="h-5 w-5" /> Coba lagi</button>
          </div>
        )}

        {tahap.t === "hasil" && (
          <>
            <p className="text-center text-[16px] font-medium text-ink">{tahap.hasil.pesan}</p>
            <BinRow counts={counts} />
            {(tahap.hasil.perlu_foto_ulang || tahap.hasil.items.length === 0) && (
              <div className="rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">Foto kurang jelas. Coba satu barang, cahaya cukup, latar polos.</div>
            )}
            <div className="space-y-3" data-testid="hasil-cek">
              {tahap.hasil.items.map((it, i) => <KartuBarang key={i} it={it} />)}
            </div>
            <div className="flex items-center justify-between text-xs text-subtle">
              <span>Keyakinan AI {Math.round(tahap.hasil.confidence * 100)}%</span>
              {lapor ? <span>Terima kasih, laporan terkirim</span> : <button className="min-h-10 underline" onClick={() => laporSalah((tahap as { hasil: Hasil }).hasil)}>Hasil salah? Laporkan</button>}
            </div>
          </>
        )}
      </div>

      {/* Bilah aksi tetap di bawah */}
      {tahap.t !== "proses" && (
        <div className="sticky bottom-0 -mx-4 grid grid-cols-[1fr_1.3fr] gap-2 border-t border-black/5 bg-white px-4 py-3">
          <button className="btn-ghost" onClick={picker.openCamera}><IconCamera className="h-5 w-5" /> Pindai lagi</button>
          {tahap.t === "hasil" && tahap.hasil.items.some((i) => i.kategori !== "tidak_yakin") ? (
            <button className="btn" onClick={() => selesai((tahap as { hasil: Hasil }).hasil)} data-testid="btn-selesai">✓ Sudah kubuang</button>
          ) : (
            <button className="btn" onClick={() => setTahap({ t: "siap" })}>Kembali</button>
          )}
        </div>
      )}
      {picker.inputs}
    </div>
  );
}

export default function Home() {
  // Riwayat pilah ada di localStorage: render setelah hidrasi agar tidak mismatch.
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? <Pindai /> : null;
}
