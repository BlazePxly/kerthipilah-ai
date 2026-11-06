"use client";
import { useSyncExternalStore } from "react";
import { DESA } from "@/lib/data";

const KEY = "kp_desa";
const EVENT = "kp-desa-change";

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

function read(): string {
  try {
    const v = localStorage.getItem(KEY);
    if (v && DESA.some((d) => d.id === v)) return v;
  } catch {}
  return DESA[0].id;
}

export function useDesa(): [string, (v: string) => void] {
  const desa = useSyncExternalStore(subscribe, read, () => DESA[0].id);
  return [
    desa,
    (v: string) => {
      try {
        localStorage.setItem(KEY, v);
      } catch {}
      window.dispatchEvent(new Event(EVENT));
    },
  ];
}

export default function DesaSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const d = DESA.find((x) => x.id === value) ?? DESA[0];
  return (
    <label className="block text-sm">
      <span className="font-semibold text-slate-700">Desa / wilayah aturan</span>
      <select className="input mt-1" value={value} onChange={(e) => onChange(e.target.value)}>
        {DESA.map((x) => (
          <option key={x.id} value={x.id}>
            {x.nama}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-slate-500">{d.keterangan}</span>
    </label>
  );
}
