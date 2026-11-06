"use client";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { DESA } from "@/lib/data";
import { deleteChat, useChats } from "@/lib/chats";
import { useDesa } from "./DesaSelect";
import { useStatus } from "./StatusBanner";
import { IconChart, IconCheck, IconChevron, IconEdit, IconLogout, IconMenu, IconPin, IconQr, IconTrash, Sparkle } from "./icons";

function NavItem({ href, icon, label, active, open, onClick }: { href: string; icon: React.ReactNode; label: string; active?: boolean; open: boolean; onClick?: () => void }) {
  return (
    <Link
      href={href}
      onClick={onClick}
      title={label}
      className={`flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium transition ${active ? "bg-[#d3e3fd]/70 text-[#041e49]" : "text-[#444746] hover:bg-black/5"}`}
    >
      <span className="shrink-0">{icon}</span>
      {open && <span className="truncate">{label}</span>}
    </Link>
  );
}

function Recent({ open, onPick }: { open: boolean; onPick: () => void }) {
  const chats = useChats();
  const current = useSearchParams().get("c");
  const path = usePathname();
  const router = useRouter();
  if (!open) return null;
  return (
    <div className="mt-4 min-h-0 flex-1 overflow-y-auto">
      <p className="px-3 pb-1 text-xs font-medium text-[#444746]">Terbaru</p>
      {chats.length === 0 && <p className="px-3 text-xs text-[#5f6368]">Belum ada percakapan.</p>}
      {chats.map((c) => {
        const active = path === "/" && current === c.id;
        return (
          <div key={c.id} className={`group flex items-center rounded-full ${active ? "bg-[#d3e3fd]/70" : "hover:bg-black/5"}`}>
            <Link href={`/?c=${c.id}`} onClick={onPick} className="min-w-0 flex-1 truncate px-3 py-2 text-sm text-[#1f1f1f]">
              {c.title}
            </Link>
            <button
              aria-label="Hapus percakapan"
              className="mr-1 hidden rounded-full p-1.5 text-[#444746] hover:bg-black/10 group-hover:block"
              onClick={() => {
                deleteChat(c.id);
                if (active) router.push("/");
              }}
            >
              <IconTrash className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

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
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-medium text-[#444746] hover:bg-black/5" data-testid="desa-picker">
        <span className="max-w-[46vw] truncate">{d.nama.replace(" (data contoh)", "")}</span>
        <IconChevron className="h-4 w-4" />
      </button>
      {open && (
        <div className="absolute left-0 top-10 z-30 w-72 rounded-2xl bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,.14)]">
          <p className="px-3 py-1 text-xs text-[#5f6368]">Aturan pilah yang dipakai AI</p>
          {DESA.map((x) => (
            <button key={x.id} onClick={() => { setDesa(x.id); setOpen(false); }} className={`w-full rounded-xl px-3 py-2 text-left hover:bg-[#f0f4f9] ${x.id === desa ? "bg-[#f0f4f9]" : ""}`}>
              <span className="block text-sm font-medium">{x.nama}</span>
              <span className="block text-xs text-[#5f6368]">{x.keterangan}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Shell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const st = useStatus();
  const [open, setOpen] = useState(true); // desktop: lebar/ramping
  const [mobile, setMobile] = useState(false); // mobile: laci terbuka
  const closeMobile = () => setMobile(false);

  async function logout() {
    await fetch("/api/login", { method: "DELETE" });
    router.push("/");
    router.refresh();
  }

  const sidebar = (wide: boolean) => (
    <div className="flex h-full flex-col px-3 pb-3 pt-3">
      <button aria-label="Menu" className="mb-4 grid h-10 w-10 place-items-center rounded-full text-[#444746] hover:bg-black/5" onClick={() => (mobile ? setMobile(false) : setOpen((o) => !o))}>
        <IconMenu />
      </button>
      <Link
        href="/"
        onClick={closeMobile}
        className={`mb-2 flex h-10 items-center gap-3 rounded-full px-3 text-sm font-medium text-[#444746] hover:bg-black/5 ${wide ? "w-fit bg-[#dde3ea]/70 pr-4" : ""}`}
        title="Percakapan baru"
        data-testid="new-chat"
      >
        <IconEdit /> {wide && "Percakapan baru"}
      </Link>
      <nav className="space-y-0.5">
        {wide && <p className="px-3 pb-1 pt-3 text-xs font-medium text-[#444746]">Petugas & TPS3R</p>}
        <NavItem href="/petugas" icon={<IconCheck />} label="Audit Wadah" active={path.startsWith("/petugas")} open={wide} onClick={closeMobile} />
        <NavItem href="/dasbor" icon={<IconChart />} label="Dasbor TPS3R" active={path.startsWith("/dasbor")} open={wide} onClick={closeMobile} />
        <NavItem href="/qr" icon={<IconQr />} label="QR rumah" active={path.startsWith("/qr")} open={wide} onClick={closeMobile} />
      </nav>
      <Suspense>
        <Recent open={wide} onPick={closeMobile} />
      </Suspense>
      {!wide && <div className="flex-1" />}
      <div className="mt-2 space-y-0.5 border-t border-black/5 pt-2">
        {st?.session && (
          <button onClick={logout} className="flex h-10 w-full items-center gap-3 rounded-full px-3 text-sm text-[#444746] hover:bg-black/5" title="Keluar">
            <IconLogout /> {wide && "Keluar dari akun petugas"}
          </button>
        )}
        <div className="flex items-center gap-3 px-3 py-2 text-xs text-[#5f6368]" title="Data contoh">
          <IconPin className="h-5 w-5 shrink-0" />
          {wide && <span>Bali · data desa contoh</span>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh overflow-hidden bg-white">
      {/* Sidebar desktop */}
      <aside className={`hidden shrink-0 bg-[#f0f4f9] transition-[width] duration-200 md:block ${open ? "w-[272px]" : "w-[72px]"}`}>{sidebar(open)}</aside>
      {/* Laci mobile */}
      {mobile && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={closeMobile} />
          <aside className="absolute inset-y-0 left-0 w-[280px] bg-[#f0f4f9] shadow-xl">{sidebar(true)}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-1 px-2 md:px-4">
          <button aria-label="Menu" className="grid h-10 w-10 place-items-center rounded-full text-[#444746] hover:bg-black/5 md:hidden" onClick={() => setMobile(true)}>
            <IconMenu />
          </button>
          <Link href="/" className="flex items-center gap-1.5 px-1 text-[20px] font-medium text-[#1f1f1f]">
            <Sparkle className="h-5 w-5" /> KerthiPilah
          </Link>
          <DesaPicker />
          <div className="ml-auto flex items-center gap-2">
            {st && !st.ai && <span className="hidden rounded-full bg-[#fef7e0] px-3 py-1 text-xs text-[#7a5900] sm:inline">AI belum aktif</span>}
            {st?.session ? (
              <span className="grid h-8 w-8 place-items-center rounded-full bg-[#1e8e5a] text-sm font-semibold text-white" title="Petugas">P</span>
            ) : (
              <Link href="/login" className="rounded-full bg-[#0b57d0] px-4 py-1.5 text-sm font-medium text-white hover:bg-[#0842a0]">Masuk</Link>
            )}
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
