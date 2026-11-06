"use client";
import { useEffect, useState } from "react";

type Status = { ai: boolean; model: string; login: boolean; penyimpanan: string; session: boolean };

export function useStatus() {
  const [s, setS] = useState<Status | null>(null);
  useEffect(() => {
    fetch("/api/status")
      .then((r) => r.json())
      .then(setS)
      .catch(() => {});
  }, []);
  return s;
}

export default function StatusBanner() {
  const s = useStatus();
  if (!s || s.ai) return null;
  return (
    <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      Layanan AI belum aktif di server ini (ANTHROPIC_API_KEY belum diatur). Fitur AI akan menampilkan pesan galat.
    </div>
  );
}
