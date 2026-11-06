"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/cek", label: "Cek Sampah" },
  { href: "/tanya", label: "Tanya Pilah" },
  { href: "/petugas", label: "Audit Wadah" },
  { href: "/dasbor", label: "Dasbor" },
];

export default function Header() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-10 border-b border-emerald-900/10 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href="/" className="text-lg font-extrabold text-brand">
          KerthiPilah <span className="rounded bg-brand px-1.5 text-white">AI</span>
        </Link>
        <nav className="flex flex-wrap gap-1 text-sm font-semibold">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-lg px-2.5 py-1.5 ${path.startsWith(n.href) ? "bg-brand-soft text-brand" : "text-slate-600 hover:bg-slate-100"}`}
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
