"use client";
// Riwayat percakapan warga, disimpan hanya di browser (localStorage). Foto tidak disimpan.
import { useSyncExternalStore } from "react";
import type { Kategori } from "./data";

export type CekData = {
  items: { nama: string; kategori: Kategori; alasan: string; tindakan: string }[];
  confidence: number;
  perlu_foto_ulang: boolean;
  pesan: string;
};
export type TanyaData = { jawaban: string; sumber: { id: string; judul: string; sumber: string }[]; dalam_cakupan: boolean };

export type Msg =
  | { role: "user"; text: string; image?: string; hadImage?: boolean }
  | { role: "ai"; kind: "cek"; data: CekData; fb?: boolean }
  | { role: "ai"; kind: "tanya"; data: TanyaData; q: string; fb?: boolean }
  | { role: "ai"; kind: "error"; text: string };

export type Chat = { id: string; title: string; updated: number; desa: string; messages: Msg[] };

const KEY = "kp_chats_v1";
const EVENT = "kp-chats-change";
const EMPTY: Chat[] = [];
let cacheRaw: string | null = null;
let cache: Chat[] = EMPTY;

function readAll(): Chat[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === cacheRaw) return cache;
    cacheRaw = raw;
    cache = raw ? (JSON.parse(raw) as Chat[]) : EMPTY;
    return cache;
  } catch {
    return EMPTY;
  }
}

function writeAll(chats: Chat[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(chats.slice(0, 30)));
  } catch {}
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(cb: () => void) {
  window.addEventListener("storage", cb);
  window.addEventListener(EVENT, cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener(EVENT, cb);
  };
}

export function useChats(): Chat[] {
  return useSyncExternalStore(subscribe, readAll, () => EMPTY);
}

export function getChat(id: string): Chat | undefined {
  return readAll().find((c) => c.id === id);
}

export function saveChat(chat: Chat) {
  // Foto tidak ikut disimpan (privasi & kuota penyimpanan browser).
  const clean: Chat = {
    ...chat,
    messages: chat.messages.map((m) => (m.role === "user" && m.image ? { role: "user", text: m.text, hadImage: true } : m)),
  };
  const rest = readAll().filter((c) => c.id !== chat.id);
  writeAll([clean, ...rest].sort((a, b) => b.updated - a.updated));
}

export function deleteChat(id: string) {
  writeAll(readAll().filter((c) => c.id !== id));
}

export function newChatId() {
  return Math.random().toString(36).slice(2, 10);
}
