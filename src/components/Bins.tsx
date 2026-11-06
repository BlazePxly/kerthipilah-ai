import { KATEGORI_INFO, type Kategori } from "@/lib/data";

export const BIN_ORDER: Kategori[] = ["organik", "anorganik", "residu", "b3"];
const HEX: Record<Kategori, { body: string; lid: string }> = {
  organik: { body: "#2e9e57", lid: "#1f7a41" },
  anorganik: { body: "#e8b100", lid: "#c29200" },
  residu: { body: "#7a847e", lid: "#5d665f" },
  b3: { body: "#d03b33", lid: "#a82a24" },
  tidak_yakin: { body: "#b7bfba", lid: "#9aa39d" },
};
const SHORT: Record<Kategori, string> = { organik: "Organik", anorganik: "Anorganik", residu: "Residu", b3: "B3", tidak_yakin: "?" };

export function BinIcon({ k, open = false, className = "h-12 w-12" }: { k: Kategori; open?: boolean; className?: string }) {
  const c = HEX[k];
  return (
    <svg viewBox="0 0 48 52" className={className} aria-hidden>
      <g style={{ transformOrigin: "8px 12px", transform: open ? "rotate(-28deg)" : "none", transition: "transform .35s cubic-bezier(.3,1.6,.5,1)" }}>
        <rect x="6" y="8" width="36" height="7" rx="3.5" fill={c.lid} />
        <rect x="19" y="4" width="10" height="5" rx="2" fill={c.lid} />
      </g>
      <path d="M9 17h30l-2.6 30a3 3 0 0 1-3 2.7H14.6a3 3 0 0 1-3-2.7z" fill={c.body} />
      <path d="M18 24v18M24 24v18M30 24v18" stroke="#fff" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

// Deretan 4 tong. Tong yang menerima barang terangkat, tutupnya terbuka, dan diberi angka jumlah barang.
export function BinRow({ counts, size = "md" }: { counts?: Partial<Record<Kategori, number>>; size?: "sm" | "md" }) {
  const active = counts && Object.values(counts).some((n) => (n ?? 0) > 0);
  return (
    <div className="grid grid-cols-4 gap-2">
      {BIN_ORDER.map((k) => {
        const n = counts?.[k] ?? 0;
        const on = n > 0;
        return (
          <div
            key={k}
            className={`relative flex flex-col items-center rounded-2xl px-1 pb-2 pt-2 transition-all duration-300 ${on ? `${KATEGORI_INFO[k].soft} -translate-y-1 shadow-[0_6px_14px_rgba(0,0,0,.10)]` : active ? "opacity-35" : ""}`}
            data-bin={k}
            data-on={on ? "1" : "0"}
          >
            {on && <span className="absolute -top-2 right-1 grid h-6 min-w-6 place-items-center rounded-full bg-ink px-1.5 text-xs font-bold text-white">{n}</span>}
            <BinIcon k={k} open={on} className={size === "sm" ? "h-9 w-9" : "h-12 w-12"} />
            <span className={`mt-1 text-center text-[12px] font-semibold leading-tight ${on ? KATEGORI_INFO[k].teks : "text-muted"}`}>{SHORT[k]}</span>
          </div>
        );
      })}
    </div>
  );
}
