"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Status = { ai: boolean; model: string; login: boolean; penyimpanan: string; session: boolean };

// Status server (AI aktif? sesi login?). Dimuat ulang setiap pindah halaman.
export function useStatus() {
  const path = usePathname();
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    let batal = false;
    fetch("/api/status", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => !batal && setS(j))
      .catch(() => {});
    return () => {
      batal = true;
    };
  }, [path]);
  return s;
}

export default function StatusBanner() {
  const s = useStatus();
  if (!s || s.ai) return null;
  return (
    <div className="mb-4 rounded-2xl bg-warn-bg px-4 py-3 text-sm text-warn">
      Layanan AI belum aktif di server ini (ANTHROPIC_API_KEY belum diatur). Fitur AI akan menampilkan pesan galat.
    </div>
  );
}
