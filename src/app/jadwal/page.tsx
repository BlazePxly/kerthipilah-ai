"use client";
import { useState, useSyncExternalStore } from "react";
import { BinIcon } from "@/components/Bins";
import { useDesa } from "@/components/DesaSelect";
import { getDesa, KATEGORI_INFO, NAMA_HARI } from "@/lib/data";

const URUT = [1, 2, 3, 4, 5, 6, 0]; // Senin..Minggu
const noop = () => () => {};

function Jadwal() {
  const [desaId] = useDesa();
  const desa = getDesa(desaId);
  const today = new Date().getDay();
  const [hari, setHari] = useState(today);
  const list = desa.angkut.filter((a) => a.hari.includes(hari));

  return (
    <div className="mx-auto w-full max-w-[640px] space-y-5 px-4 pb-10 pt-5">
      <div>
        <h1 className="text-[26px] font-bold tracking-tight text-ink">Jadwal angkut</h1>
        <p className="text-[15px] text-muted">Taruh tong di depan rumah sesuai harinya.</p>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {URUT.map((d) => {
          const kat = desa.angkut.filter((a) => a.hari.includes(d));
          const on = d === hari;
          return (
            <button key={d} onClick={() => setHari(d)} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl text-xs font-semibold transition ${on ? "bg-primary text-white" : "bg-surface text-muted"}`} aria-pressed={on}>
              {NAMA_HARI[d].slice(0, 3)}
              {d === today && <span className={`text-[10px] font-medium ${on ? "text-white/80" : "text-primary"}`}>hari ini</span>}
              <span className="flex gap-0.5">
                {kat.map((a) => <span key={a.kategori} className={`h-2 w-2 rounded-full ${KATEGORI_INFO[a.kategori].warna} ${on ? "ring-1 ring-white" : ""}`} />)}
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">{NAMA_HARI[hari]}{hari === today ? " (hari ini)" : ""}</p>
        {list.length === 0 && <p className="rounded-2xl bg-surface px-4 py-6 text-center text-sm text-subtle">Tidak ada pengangkutan.</p>}
        {list.map((a) => {
          const k = KATEGORI_INFO[a.kategori];
          return (
            <div key={a.kategori} className={`flex items-center gap-3 rounded-2xl p-3 ${k.soft}`}>
              <BinIcon k={a.kategori} open className="h-11 w-11 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className={`font-semibold ${k.teks}`}>{k.label}</p>
                <p className="text-sm text-muted">{a.catatan ?? "Taruh di depan rumah sebelum jam angkut"}</p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-sm font-bold text-ink">{a.jam}</span>
            </div>
          );
        })}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted">Tempat setor</p>
        {desa.fasilitas.map((f) => (
          <div key={f.nama} className="rounded-2xl border border-black/5 bg-white p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-semibold text-ink">{f.nama}</p>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-xs text-muted">{f.jenis}</span>
            </div>
            <p className="mt-1 text-sm text-muted">Menerima: {f.menerima}</p>
            <p className="text-sm text-muted">Buka: {f.buka}</p>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-subtle">{desa.keterangan}</p>
    </div>
  );
}

export default function JadwalPage() {
  // Hari ini dihitung di browser (zona waktu pengguna).
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? <Jadwal /> : null;
}
