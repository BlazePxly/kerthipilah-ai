"use client";
// Catatan pilah pribadi warga, hanya di browser (localStorage). Tanpa foto, tanpa identitas.
import { useSyncExternalStore } from "react";
import type { Kategori } from "./data";

export type Catatan = { nama: string; kategori: Kategori; waktu: number };
const KEY = "kp_riwayat_v1";
const EVENT = "kp-riwayat";
const EMPTY: Catatan[] = [];
let raw: string | null = null;
let cache: Catatan[] = EMPTY;

function read(): Catatan[] {
  try {
    const r = localStorage.getItem(KEY);
    if (r !== raw) {
      raw = r;
      cache = r ? (JSON.parse(r) as Catatan[]) : EMPTY;
    }
    return cache;
  } catch {
    return EMPTY;
  }
}
function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useRiwayat(): Catatan[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function catat(items: { nama: string; kategori: Kategori }[]) {
  const now = Date.now();
  const next = [...items.map((i) => ({ ...i, waktu: now })), ...read()].slice(0, 200);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

export function hariIni(list: Catatan[]): Catatan[] {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return list.filter((c) => c.waktu >= d.getTime());
}
