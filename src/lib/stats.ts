import type { AuditRow } from "./db";

export function hitungStatistik(audits: AuditRow[], banjar: string[], hari: number) {
  const total = audits.length;
  const baik = audits.filter((a) => a.status_final === "baik").length;
  const perBanjar = banjar.map((b) => {
    const x = audits.filter((a) => a.banjar === b);
    const xb = x.filter((a) => a.status_final === "baik").length;
    return { banjar: b, audit: x.length, baik: xb, persen_baik: x.length ? Math.round((xb / x.length) * 100) : null };
  });
  const perWadah = (["O", "A", "R"] as const).map((w) => {
    const x = audits.filter((a) => a.wadah === w);
    const xb = x.filter((a) => a.status_final === "baik").length;
    return { wadah: w, audit: x.length, persen_baik: x.length ? Math.round((xb / x.length) * 100) : null };
  });
  const freq = new Map<string, number>();
  for (const a of audits) for (const k of a.kontaminan) {
    const key = k.toLowerCase().trim();
    if (key) freq.set(key, (freq.get(key) ?? 0) + 1);
  }
  const kontaminan = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([barang, jumlah]) => ({ barang, jumlah }));
  const dikoreksi = audits.filter((a) => a.dikoreksi).length;
  return {
    periode_hari: hari,
    total_audit: total,
    rumah_diaudit: new Set(audits.map((a) => a.rumah)).size,
    persen_baik: total ? Math.round((baik / total) * 100) : null,
    persen_ai_disetujui_petugas: total ? Math.round(((total - dikoreksi) / total) * 100) : null,
    per_banjar: perBanjar,
    per_wadah: perWadah,
    kontaminan_terbanyak: kontaminan,
  };
}
