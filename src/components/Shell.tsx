"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { DESA } from "@/lib/data";
import { useDesa } from "./DesaSelect";
import { useStatus } from "./StatusBanner";
import { IconCalendar, IconCamera, IconChevron, IconSearch, IconTruck } from "./icons";

const TABS = [
  { href: "/", label: "Pindai", icon: IconCamera, match: (p: string) => p === "/" },
  { href: "/kamus", label: "Kamus", icon: IconSearch, match: (p: string) => p.startsWith("/kamus") },
  { href: "/jadwal", label: "Jadwal", icon: IconCalendar, match: (p: string) => p.startsWith("/jadwal") },
  { href: "/petugas", label: "Petugas", icon: IconTruck, match: (p: string) => ["/petugas", "/dasbor", "/qr", "/login"].some((x) => p.startsWith(x)) },
];

function DesaPicker() {
  const [desa, setDesa] = useDesa();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  const d = DESA.find((x) => x.id === desa) ?? DESA[0];
  return (
    <div ref={ref} className="relative min-w-0">
      <button onClick={() => setOpen((o) => !o)} className="flex min-h-11 max-w-full items-center gap-1 rounded-full px-3 text-sm font-medium text-muted hover:bg-black/5" data-testid="desa-picker">
        <span className="truncate">{d.nama.replace(" (data contoh)", "")}</span>
        <IconChevron className="h-4 w-4 shrink-0" />
      </button>
      {open && (
        <div className="absolute right-0 top-12 z-40 w-72 max-w-[calc(100vw-24px)] rounded-2xl bg-white p-2 shadow-[0_8px_28px_rgba(0,0,0,.16)]">
          <p className="px-3 py-1 text-xs text-subtle">Aturan pilah yang dipakai</p>
          {DESA.map((x) => (
            <button key={x.id} onClick={() => { setDesa(x.id); setOpen(false); }} className={`w-full rounded-xl px-3 py-2 text-left hover:bg-surface ${x.id === desa ? "bg-surface" : ""}`}>
              <span className="block text-sm font-medium">{x.nama}</span>
              <span className="block text-xs text-subtle">{x.keterangan}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const st = useStatus();
  return (
    <div className="flex h-dvh flex-col bg-white">
      <header className="safe-top z-30 shrink-0 border-b border-black/5 bg-white/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-[960px] items-center gap-2 px-3 sm:px-4">
          <Link href="/" className="flex shrink-0 items-center gap-2 text-[18px] font-bold tracking-tight text-ink">
            <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden><rect width="32" height="32" rx="9" fill="#1a7f4b" /><path d="M9 12h14l-1.3 11.5a2 2 0 0 1-2 1.8h-7.4a2 2 0 0 1-2-1.8z" fill="#fff" /><rect x="8" y="8.5" width="16" height="2.6" rx="1.3" fill="#bfe8cf" /><path d="M14 16.5l2 2 3-3.5" stroke="#1a7f4b" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
            KerthiPilah
          </Link>
          <nav className="ml-4 hidden gap-1 md:flex">
            {TABS.map((t) => (
              <Link key={t.href} href={t.href} className={`rounded-full px-4 py-2 text-sm font-semibold ${t.match(path) ? "bg-primary-soft text-primary-ink" : "text-muted hover:bg-surface"}`}>
                {t.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex min-w-0 items-center gap-1">
            {st && !st.ai && <span className="hidden rounded-full bg-warn-bg px-3 py-1 text-xs text-warn sm:inline">AI belum aktif</span>}
            <DesaPicker />
          </div>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>

      {/* Tab bawah untuk HP */}
      <nav className="z-30 shrink-0 border-t pb-[env(safe-area-inset-bottom)] border-black/5 bg-white md:hidden" aria-label="Menu utama">
        <div className="grid grid-cols-4">
          {TABS.map((t) => {
            const on = t.match(path);
            const I = t.icon;
            return (
              <Link key={t.href} href={t.href} className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] font-semibold ${on ? "text-primary" : "text-subtle"}`} aria-current={on ? "page" : undefined}>
                <span className={`grid h-8 w-14 place-items-center rounded-full transition ${on ? "bg-primary-soft" : ""}`}><I className="h-[22px] w-[22px]" /></span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
