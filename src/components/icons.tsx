// Ikon SVG inline (gaya outline 24px).
type P = { className?: string };
const base = (className = "h-5 w-5") => ({
  className,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
});

export const IconMenu = ({ className }: P) => (<svg {...base(className)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>);
export const IconEdit = ({ className }: P) => (<svg {...base(className)}><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>);
export const IconChat = ({ className }: P) => (<svg {...base(className)}><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>);
export const IconPlus = ({ className }: P) => (<svg {...base(className)}><path d="M12 5v14M5 12h14" /></svg>);
export const IconMic = ({ className }: P) => (<svg {...base(className)}><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></svg>);
export const IconSend = ({ className }: P) => (<svg {...base(className)}><path d="M5 12h14M13 6l6 6-6 6" /></svg>);
export const IconImage = ({ className }: P) => (<svg {...base(className)}><rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></svg>);
export const IconCamera = ({ className }: P) => (<svg {...base(className)}><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>);
export const IconClose = ({ className }: P) => (<svg {...base(className)}><path d="M6 6l12 12M18 6L6 18" /></svg>);
export const IconChart = ({ className }: P) => (<svg {...base(className)}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></svg>);
export const IconCheck = ({ className }: P) => (<svg {...base(className)}><rect x="3" y="3" width="18" height="18" rx="4" /><path d="M8 12l3 3 5-6" /></svg>);
export const IconQr = ({ className }: P) => (<svg {...base(className)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3M21 14v7h-4M14 18v3" /></svg>);
export const IconThumbUp = ({ className }: P) => (<svg {...base(className)}><path d="M7 10v10H4V10zM7 10l4-7a2 2 0 0 1 3 2l-1 5h6a2 2 0 0 1 2 2.3l-1.3 6A2 2 0 0 1 17.7 20H7" /></svg>);
export const IconThumbDown = ({ className }: P) => (<svg {...base(className)}><path d="M7 14V4H4v10zM7 14l4 7a2 2 0 0 0 3-2l-1-5h6a2 2 0 0 0 2-2.3l-1.3-6A2 2 0 0 0 17.7 4H7" /></svg>);
export const IconCopy = ({ className }: P) => (<svg {...base(className)}><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" /></svg>);
export const IconChevron = ({ className }: P) => (<svg {...base(className)}><path d="M6 9l6 6 6-6" /></svg>);
export const IconLogout = ({ className }: P) => (<svg {...base(className)}><path d="M15 4h4v16h-4M10 8l-4 4 4 4M6 12h10" /></svg>);
export const IconTrash = ({ className }: P) => (<svg {...base(className)}><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></svg>);
export const IconSearch = ({ className }: P) => (<svg {...base(className)}><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>);
export const IconCalendar = ({ className }: P) => (<svg {...base(className)}><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>);
export const IconTruck = ({ className }: P) => (<svg {...base(className)}><path d="M3 6h11v10H3zM14 10h4l3 3v3h-7" /><circle cx="7" cy="18" r="2" /><circle cx="17.5" cy="18" r="2" /></svg>);
export const IconRefresh = ({ className }: P) => (<svg {...base(className)}><path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7" /></svg>);
export const IconPin =({ className }: P) => (<svg {...base(className)}><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>);

// Ikon "sparkle" khas asisten, dengan gradien merek KerthiPilah.
export function Sparkle({ className = "h-7 w-7", spin = false }: { className?: string; spin?: boolean }) {
  return (
    <svg viewBox="0 0 28 28" className={`${className} ${spin ? "animate-spin [animation-duration:2.4s]" : ""}`} aria-hidden>
      <defs>
        <linearGradient id="kp-sparkle" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#0f7a43" />
          <stop offset=".55" stopColor="#2fa865" />
          <stop offset="1" stopColor="#9ccc3c" />
        </linearGradient>
      </defs>
      <path d="M14 1c.9 6.6 5.4 11.1 13 13-7.6 1.9-12.1 6.4-13 13-.9-6.6-5.4-11.1-13-13 7.6-1.9 12.1-6.4 13-13z" fill="url(#kp-sparkle)" />
    </svg>
  );
}
