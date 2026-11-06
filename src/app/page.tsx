"use client";
import { Suspense, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PromptBar from "@/components/PromptBar";
import { useDesa } from "@/components/DesaSelect";
import { IconCopy, IconThumbDown, IconThumbUp, Sparkle } from "@/components/icons";
import { getChat, newChatId, saveChat, type Chat, type Msg } from "@/lib/chats";
import { KATEGORI_INFO } from "@/lib/data";

const SARAN = [
  { emoji: "📷", teks: "Foto sampahmu", aksi: "foto" as const },
  { emoji: "🌼", teks: "Canang bekas dibuang ke mana?" },
  { emoji: "🍜", teks: "Bungkus mi instan masuk wadah apa?" },
  { emoji: "🗓️", teks: "Kapan sampah organik diangkut?" },
];

async function postJSON(url: string, body: unknown) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || "Terjadi kesalahan.");
  return j;
}

function AiActions({ copyText, fb, onFb }: { copyText: string; fb?: boolean; onFb: (benar: boolean) => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-2 flex items-center gap-0.5 text-[#444746]">
      {fb ? (
        <span className="px-2 text-xs text-[#5f6368]">Terima kasih atas masukannya</span>
      ) : (
        <>
          <button aria-label="Jawaban bagus" title="Jawaban bagus" onClick={() => onFb(true)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"><IconThumbUp className="h-[18px] w-[18px]" /></button>
          <button aria-label="Jawaban keliru" title="Jawaban keliru" onClick={() => onFb(false)} className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"><IconThumbDown className="h-[18px] w-[18px]" /></button>
        </>
      )}
      <button
        aria-label="Salin"
        title={copied ? "Disalin" : "Salin"}
        onClick={() => { navigator.clipboard?.writeText(copyText); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
        className="grid h-9 w-9 place-items-center rounded-full hover:bg-black/5"
      >
        <IconCopy className="h-[18px] w-[18px]" />
      </button>
      {copied && <span className="text-xs text-[#5f6368]">Disalin</span>}
    </div>
  );
}

function AiMessage({ m, onFb }: { m: Extract<Msg, { role: "ai" }>; onFb: (benar: boolean) => void }) {
  return (
    <div className="flex gap-4">
      <Sparkle className="mt-0.5 h-7 w-7 shrink-0" />
      <div className="min-w-0 flex-1 pt-0.5 text-[15.5px] leading-7 text-[#1f1f1f]">
        {m.kind === "error" && <p className="text-[#c5221f]">{m.text}</p>}
        {m.kind === "tanya" && (
          <>
            <p className="whitespace-pre-line">{m.data.jawaban}</p>
            {!m.data.dalam_cakupan && <p className="mt-1 text-sm text-[#7a5900]">Informasi ini belum ada di dokumen desa.</p>}
            {m.data.sumber.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {m.data.sumber.map((s) => (
                  <span key={s.id} title={s.sumber} className="rounded-full bg-[#f0f4f9] px-3 py-1 text-xs text-[#444746]">📄 {s.judul}</span>
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
              {m.data.items.map((it, i) => {
                const k = KATEGORI_INFO[it.kategori];
                return (
                  <div key={i} className="rounded-3xl bg-[#f0f4f9] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-3 py-0.5 text-sm font-semibold text-white ${k.warna}`}>{k.label}</span>
                      <span className="font-semibold">{it.nama}</span>
                    </div>
                    <dl className="mt-2 grid gap-x-3 text-sm leading-6 sm:grid-cols-[88px_1fr]">
                      <dt className="text-[#5f6368]">Wadah</dt><dd>{k.wadah}</dd>
                      <dt className="text-[#5f6368]">Tujuan</dt><dd>{k.tujuan}</dd>
                      <dt className="text-[#5f6368]">Lakukan</dt><dd>{it.tindakan}</dd>
                      <dt className="text-[#5f6368]">Alasan</dt><dd>{it.alasan}</dd>
                    </dl>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-[#5f6368]">
              Keyakinan AI {Math.round(m.data.confidence * 100)}%{m.data.perlu_foto_ulang && " · coba foto ulang dengan cahaya cukup"}
            </p>
            <AiActions copyText={m.data.items.map((i) => `${i.nama}: ${KATEGORI_INFO[i.kategori].label} – ${i.tindakan}`).join("\n")} fb={m.fb} onFb={onFb} />
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
      <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col justify-center px-4 pb-10">
        <h1 className="text-[36px] font-medium leading-tight tracking-tight sm:text-[44px]">
          <span className="bg-gradient-to-r from-[#1e9e6a] via-[#1a9fbf] to-[#4b7bec] bg-clip-text text-transparent">Om Swastyastu.</span>
          <br />
          <span className="text-[#c4c7c5]">Sampah ini dibuang ke mana?</span>
        </h1>
        <div className="mt-8">
          <PromptBar onSend={send} disabled={loading} autoFocus />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {SARAN.map((s) => (
            <button
              key={s.teks}
              onClick={() => (s.aksi === "foto" ? (document.querySelector('[data-testid="btn-plus"]') as HTMLButtonElement | null)?.click() : send(s.teks, null))}
              className="rounded-full border border-[#dadce0] bg-white px-4 py-2 text-sm text-[#444746] hover:bg-[#f0f4f9]"
            >
              {s.emoji} {s.teks}
            </button>
          ))}
        </div>
        <p className="mt-8 text-center text-xs text-[#5f6368]">
          Memakai aturan pilah desa yang dipilih di atas. KerthiPilah bisa keliru, ikuti arahan petugas desa.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col">
      <div className="mx-auto w-full max-w-[760px] flex-1 space-y-8 px-4 pb-6 pt-4" data-testid="chat">
        {chat!.messages.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex flex-col items-end gap-2">
              {m.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.image} alt="Foto sampah" className="max-h-60 max-w-[70%] rounded-3xl object-cover" />
              )}
              {m.hadImage && !m.image && <span className="rounded-full bg-[#f0f4f9] px-3 py-1 text-xs text-[#5f6368]">📷 foto (tidak disimpan)</span>}
              {m.text && <div className="max-w-[80%] rounded-3xl rounded-tr-md bg-[#e9eef6] px-5 py-3 text-[15.5px] text-[#1f1f1f]">{m.text}</div>}
            </div>
          ) : (
            <AiMessage key={i} m={m} onFb={(b) => feedback(i, b)} />
          ),
        )}
        {loading && (
          <div className="flex gap-4">
            <Sparkle className="h-7 w-7 shrink-0" spin />
            <div className="flex-1 space-y-2.5 pt-1.5">
              <div className="h-3.5 w-11/12 animate-pulse rounded-full bg-gradient-to-r from-[#e8f0fe] via-[#d3e3fd] to-[#e8f0fe]" />
              <div className="h-3.5 w-3/4 animate-pulse rounded-full bg-gradient-to-r from-[#e8f0fe] via-[#d3e3fd] to-[#e8f0fe]" />
              <div className="h-3.5 w-1/2 animate-pulse rounded-full bg-gradient-to-r from-[#e8f0fe] via-[#d3e3fd] to-[#e8f0fe]" />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className="sticky bottom-0 bg-white px-4 pb-3 pt-2">
        <div className="mx-auto max-w-[760px]">
          <PromptBar onSend={send} disabled={loading} />
          <p className="mt-2 text-center text-xs text-[#5f6368]">KerthiPilah bisa keliru. Ikuti arahan petugas desa bila ragu.</p>
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
