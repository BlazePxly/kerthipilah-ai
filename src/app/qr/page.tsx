"use client";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useDesa } from "@/components/DesaSelect";
import { getDesa } from "@/lib/data";

export default function QrPage() {
  const [desa] = useDesa();
  const [codes, setCodes] = useState<{ kode: string; banjar: string; url: string }[]>([]);

  useEffect(() => {
    const d = getDesa(desa);
    Promise.all(d.rumah.map(async (r) => ({ ...r, url: await QRCode.toDataURL(`KP:${r.kode}`, { margin: 1, width: 160 }) }))).then(setCodes);
  }, [desa]);

  return (
    <div className="page space-y-5">
      <div className="flex items-end justify-between gap-2 print:hidden">
        <div>
          <h1 className="page-title">QR rumah</h1>
          <p className="page-sub">Cetak dan tempel di wadah. Kode rumah tidak memuat data pribadi.</p>
        </div>
        <button className="btn" onClick={() => window.print()}>Cetak</button>
      </div>
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {codes.map((c) => (
          <div key={c.kode} className="rounded-2xl bg-white p-2 text-center shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.url} alt={`QR ${c.kode}`} className="mx-auto w-full" />
            <p className="font-bold">{c.kode}</p>
            <p className="text-xs text-[#5f6368]">Banjar {c.banjar}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
