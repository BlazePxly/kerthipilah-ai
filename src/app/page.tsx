"use client";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PromptBar, { usePhotoPicker } from "@/components/PromptBar";
import { useDesa } from "@/components/DesaSelect";
import { IconCamera, IconCopy, IconImage, IconThumbDown, IconThumbUp, Sparkle } from "@/components/icons";
import { getChat, newChatId, saveChat, type Chat, type Msg } from "@/lib/chats";
import { KATEGORI_INFO, type Kategori } from "@/lib/data";

const PERTANYAAN = ["Canang bekas dibuang ke mana?", "Bungkus mi instan masuk tong apa?", "Kapan sampah organik diangkut?", "Minyak jelantah dibuang di mana?"];

const LEGENDA: { k: Kategori; contoh: string }[] = [
  { k: "organik", contoh: "sisa makanan, daun, canang" },
  { k: "anorganik", contoh: "botol, kardus, kaleng" },
  { k: "residu", contoh: "sachet, popok, styrofoam" },
  { k: "b3", contoh: "baterai, lampu, obat" },
];

async function postJSON(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Terjadi kesalahan.");
  return j;
}

function AiActions({ copyText, fb, onFb }: { copyText: string; fb?: boolean; onFb: (benar: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  const btn = "grid h-10 w-10 place-items-center rounded-full hover:bg-black/5";
  return (
    <div className="mt-1 flex items-center text-muted">
      {fb ? (
        <span className="px-1 py-2 text-xs text-subtle">Terima kasih atas masukannya</span>
      ) : (
        <>
          <span className="mr-1 text-xs text-subtle">Benar?</span>
          <button aria-label="Jawaban benar" onClick={() => onFb(true)} className={btn}><IconThumbUp className="h-[18px] w-[18px]" /></button>
          <button aria-label="Jawaban keliru" onClick={() => onFb(false)} className={btn}><IconThumbDown className="h-[18px] w-[18px]" /></button>
        </>
      )}
      <button
        aria-label="Salin"
        onClick={() => { navigator.clipboard?.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className={btn}
      >
        <IconCopy className="h-[18px] w-[18px]" />
      </button>
      {copied && <span className="text-xs text-subtle">Disalin</span>}
    </div>
  );
}

function HasilItem({ it }: { it: { nama: string; kategori: Kategori; alasan: string; tindakan: string } }) {
  const k = KATEGORI_INFO[it.kategori];
  return (
    <div className="overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,.06)]">
      <div className={`flex items-center gap-3 px-4 py-3 ${k.soft}`}>
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-xl ${k.warna}`} aria-hidden>{k.ikon}</span>
        <div className="min-w-0">
          <p className={`text-xs font-bold uppercase tracking-wide ${k.teks}`}>{k.label}</p>
          <p className="truncate text-[17px] font-semibold text-ink">{it.nama}</p>
        </div>
      </div>
      <ol className="space-y-2 px-4 py-3 text-[15px] leading-6">
        <li className="flex gap-3"><span className="w-20 shrink-0 text-subtle">Buang ke</span><b className="font-semibold">{k.wadah}</b></li>
        <li className="flex gap-3"><span className="w-20 shrink-0 text-subtle">Sebelumnya</span><span>{it.tindakan}</span></li>
        <li className="flex gap-3"><span className="w-20 shrink-0 text-subtle">Lalu</span><span>{k.tujuan}</span></li>
      </ol>
      <p className="border-t border-black/5 px-4 py-2 text-sm text-subtle">Alasan: {it.alasan}</p>
    </div>
  );
}

function AiMessage({ m, onFb, onFotoLagi }: { m: Extract<Msg, { role: "ai" }>; onFb: (benar: boolean) => void; onFotoLagi: () => void }) {
  return (
    <div className="flex gap-3">
      <Sparkle className="mt-0.5 h-7 w-7 shrink-0" />
      <div className="min-w-0 flex-1 pt-0.5 text-[16px] leading-7 text-ink">
        {m.kind === "error" && <p className="rounded-2xl bg-danger-bg px-4 py-3 text-[15px] text-danger">{m.text}</p>}
        {m.kind === "tanya" && (
          <>
            <p className="whitespace-pre-line">{m.data.jawaban}</p>
            {!m.data.dalam_cakupan && <p className="mt-1 text-sm text-warn">Informasi ini belum ada di dokumen desa.</p>}
            {m.data.sumber.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.data.sumber.map((s) => (
                  <span key={s.id} title={s.sumber} className="rounded-full bg-surface px-3 py-1 text-xs text-muted">📄 {s.judul}</span>
                ))}
              </div>
            )}
            <AiActions copyText={m.data.jawaban} fb={m.fb} onFb={onFb} />
          </>
        )}
        {m.kind === "cek" && (
          <>
            <p>{m.data.pesan}</p>
            <div className="mt-3 space-y-3" data-testid="hasil-cek">
              {m.data.items.map((it, i) => <HasilItem key={i} it={it} />)}
            </div>
            <p className="mt-2 text-xs text-subtle">
              Keyakinan AI {Math.round(m.data.confidence * 100)}%{m.data.perlu_foto_ulang && " · coba foto ulang dengan cahaya cukup"}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button onClick={onFotoLagi} className="btn-ghost min-h-10 py-1.5 text-sm"><IconCamera className="h-[18px] w-[18px]" /> Foto barang lain</button>
            </div>
            <AiActions copyText={m.data.items.map((i) => `${i.nama}: ${KATEGORI_INFO[i.kategori].wadah} – ${i.tindakan}`).join("\n")} fb={m.fb} onFb={onFb} />
          </>
        )}
      </div>
    </div>
  );
}

function ChatView({ id }: { id: string | null }) {
  const router = useRouter();
  const [desa] = useDesa();
  const [chat, setChat] = useState<Chat | null>(() => (id ? getChat(id) ?? null : null));
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [prevId, setPrevId] = useState(id);
  // Sinkronkan saat URL berubah (pilih riwayat / "Percakapan baru"),
  // tapi jangan reset saat URL baru saja diisi id percakapan yang sedang berjalan.
  if (id !== prevId) {
    setPrevId(id);
    if (id !== (chat?.id ?? null)) setChat(id ? getChat(id) ?? null : null);
  }
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat?.messages.length, loading]);

  function update(c: Chat) {
    setChat(c);
    saveChat(c);
  }

  async function send(text: string, image: string | null) {
    const base: Chat = chat ?? { id: newChatId(), title: text || "Cek foto sampah", updated: Date.now(), desa, messages: [] };
    const userMsg: Msg = { role: "user", text: text || (image ? "Sampah ini dibuang ke mana?" : ""), image: image ?? undefined };
    let c: Chat = { ...base, updated: Date.now(), messages: [...base.messages, userMsg] };
    update(c);
    if (!chat) router.replace(`/?c=${c.id}`, { scroll: false });
    setLoading(true);
    let ai: Msg;
    try {
      if (image) ai = { role: "ai", kind: "cek", data: await postJSON("/api/cek", { image, desa }) };
      else ai = { role: "ai", kind: "tanya", q: text, data: await postJSON("/api/tanya", { pertanyaan: text, desa }) };
    } catch (e) {
      ai = { role: "ai", kind: "error", text: e instanceof Error ? e.message : "Terjadi kesalahan." };
    }
    setLoading(false);
    c = { ...c, updated: Date.now(), messages: [...c.messages, ai] };
    update(c);
  }

  // Foto dari kartu aksi langsung dikirim ke AI (satu ketukan).
  const picker = usePhotoPicker((img) => { setErr(""); send("", img); }, setErr);

  function feedback(idx: number, benar: boolean) {
    if (!chat) return;
    const m = chat.messages[idx];
    if (m.role !== "ai" || m.kind === "error") return;
    const detail = m.kind === "tanya" ? m.q : m.data.items.map((i) => `${i.nama}:${i.kategori}`).join(", ");
    fetch("/api/feedback", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fitur: m.kind, benar, desa, detail }) }).catch(() => {});
    update({ ...chat, messages: chat.messages.map((x, i) => (i === idx ? ({ ...x, fb: true } as Msg) : x)) });
  }

  const empty = !chat || chat.messages.length === 0;

  if (empty) {
    return (
      <div className="mx-auto flex min-h-full w-full max-w-[680px] flex-col px-4 pb-8 pt-4 sm:justify-center sm:pt-0">
        <h1 className="text-[30px] font-semibold leading-tight tracking-tight sm:text-[40px]">
          <span className="bg-gradient-to-r from-[#0f7a43] via-[#2fa865] to-[#8cc63f] bg-clip-text text-transparent">Om Swastyastu!</span>
        </h1>
        <p className="mt-1 text-[17px] text-muted sm:text-[19px]">Foto sampahnya, KerthiPilah beri tahu masuk tong mana.</p>

        <div className="mt-6 grid grid-cols-[1.4fr_1fr] gap-3">
          <button onClick={picker.openCamera} className="flex min-h-[112px] flex-col items-start justify-between rounded-3xl bg-primary p-4 text-left text-white shadow-[0_6px_18px_rgba(26,127,75,.28)] transition hover:bg-primary-hover active:scale-[.98]" data-testid="btn-foto-utama">
            <IconCamera className="h-8 w-8" />
            <span><span className="block text-[17px] font-semibold">Foto sampah</span><span className="block text-[13px] text-white/80">Langsung dicek AI</span></span>
          </button>
          <button onClick={picker.openGallery} className="flex min-h-[112px] flex-col items-start justify-between rounded-3xl bg-surface p-4 text-left text-ink transition hover:bg-surface-2 active:scale-[.98]">
            <IconImage className="h-8 w-8 text-primary" />
            <span><span className="block text-[17px] font-semibold">Dari galeri</span><span className="block text-[13px] text-subtle">Pilih foto</span></span>
          </button>
        </div>
        {picker.inputs}
        {err && <p className="mt-2 text-sm text-danger">{err}</p>}

        <div className="my-5 flex items-center gap-3 text-xs text-subtle"><span className="h-px flex-1 bg-line/70" /> atau tanya <span className="h-px flex-1 bg-line/70" /></div>
        <PromptBar onSend={send} disabled={loading} />
        <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:flex-wrap sm:overflow-visible">
          {PERTANYAAN.map((q) => (
            <button key={q} onClick={() => send(q, null)} className="min-h-11 shrink-0 rounded-full border border-line bg-white px-4 py-2 text-sm text-muted hover:bg-surface">
              {q}
            </button>
          ))}
        </div>

        <div className="mt-7">
          <p className="mb-2 text-sm font-semibold text-muted">Kenali tongnya</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {LEGENDA.map(({ k, contoh }) => {
              const info = KATEGORI_INFO[k];
              return (
                <div key={k} className={`rounded-2xl px-3 py-2.5 ${info.soft}`}>
                  <p className={`flex items-center gap-2 text-sm font-semibold ${info.teks}`}><span className={`h-3 w-3 rounded-full ${info.warna}`} />{info.label}</p>
                  <p className="mt-0.5 text-xs leading-5 text-muted">{contoh}</p>
                </div>
              );
            })}
          </div>
        </div>
        <p className="mt-6 text-center text-xs text-subtle">Memakai aturan pilah desa yang dipilih di atas. AI bisa keliru, ikuti arahan petugas desa.</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-[720px] flex-1 space-y-7 px-4 pb-4 pt-3" data-testid="chat">
        {chat!.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex flex-col items-end gap-2">
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="Foto sampah" className="max-h-56 max-w-[75%] rounded-3xl object-cover" />
              )}
              {m.hadImage && !m.image && <span className="rounded-full bg-surface px-3 py-1 text-xs text-subtle">📷 foto (tidak disimpan)</span>}
              {m.text && <div className="max-w-[85%] break-words rounded-3xl rounded-tr-md bg-primary-soft px-4 py-2.5 text-[16px] text-primary-ink">{m.text}</div>}
            </div>
          ) : (
            <AiMessage key={i} m={m} onFb={(b) => feedback(i, b)} onFotoLagi={picker.openCamera} />
          ),
        )}
        {loading && (
          <div className="flex gap-3">
            <Sparkle className="h-7 w-7 shrink-0" spin />
            <div className="flex-1 space-y-2.5 pt-1.5">
              <p className="text-sm text-subtle">{chat!.messages.at(-1)?.role === "user" && (chat!.messages.at(-1) as { image?: string }).image ? "Memeriksa foto…" : "Membaca aturan desa…"}</p>
              <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-primary-soft" />
              <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-primary-soft" />
            </div>
          </div>
        )}
        {picker.inputs}
        {err && <p className="text-sm text-danger">{err}</p>}
        <div ref={endRef} />
      </div>
      <div className="safe-bottom sticky bottom-0 bg-gradient-to-t from-white via-white to-white/80 px-3 pt-2 sm:px-4">
        <div className="mx-auto max-w-[720px]">
          <PromptBar onSend={send} disabled={loading} />
          <p className="mt-1.5 text-center text-[11px] text-subtle">AI bisa keliru. Ikuti arahan petugas desa bila ragu.</p>
        </div>
      </div>
    </div>
  );
}

const noop = () => () => {};

function ChatPage() {
  const id = useSearchParams().get("c");
  // Riwayat ada di localStorage (hanya di browser): render setelah hidrasi agar tidak mismatch.
  const client = useSyncExternalStore(noop, () => true, () => false);
  if (!client) return null;
  return <ChatView id={id} />;
}

export default function Home() {
  return (
    <Suspense>
      <ChatPage />
    </Suspense>
  );
}
