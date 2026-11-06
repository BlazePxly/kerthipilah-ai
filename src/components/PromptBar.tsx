"use client";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "./ImagePicker";
import { IconCamera, IconClose, IconImage, IconMic, IconSend } from "./icons";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

// Input file tersembunyi untuk kamera & galeri, dipakai ulang oleh kartu aksi dan prompt bar.
export function usePhotoPicker(onPicked: (dataUrl: string) => void, onError: (msg: string) => void) {
  const cam = useRef<HTMLInputElement>(null);
  const gal = useRef<HTMLInputElement>(null);
  async function handle(f?: File) {
    if (!f) return;
    if (!f.type.startsWith("image/")) return onError("File harus berupa gambar.");
    try {
      onPicked(await compressImage(f));
    } catch {
      onError("Gambar tidak dapat dibaca. Coba foto lain (JPEG/PNG).");
    }
  }
  const inputs = (
    <>
      <input ref={cam} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={gal} type="file" accept="image/*" className="hidden" data-testid="file-input" onChange={(e) => { handle(e.target.files?.[0]); e.target.value = ""; }} />
    </>
  );
  return { openCamera: () => cam.current?.click(), openGallery: () => gal.current?.click(), inputs };
}

export default function PromptBar({
  onSend,
  disabled,
  placeholder = "Tanya soal sampah…",
  autoFocus,
}: {
  onSend: (text: string, image: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const [speechOk, setSpeechOk] = useState(false);
  const picker = usePhotoPicker((d) => { setErr(""); setImage(d); }, setErr);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    if (w.SpeechRecognition || w.webkitSpeechRecognition) queueMicrotask(() => setSpeechOk(true));
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [text]);

  function send() {
    const t = text.trim();
    if (disabled || (!t && !image)) return;
    onSend(t, image);
    setText("");
    setImage(null);
  }

  function mic() {
    if (listening) return recRef.current?.stop();
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = "id-ID";
    rec.interimResults = false;
    rec.onresult = (e) => setText((t) => (t ? t + " " : "") + e.results[0][0].transcript);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setListening(true);
    rec.start();
  }

  const canSend = !disabled && (text.trim().length > 0 || Boolean(image));
  const iconBtn = "grid h-11 w-11 shrink-0 place-items-center rounded-full text-muted transition hover:bg-black/5 active:bg-black/10";

  return (
    <div className="w-full">
      <div className="rounded-[26px] border border-transparent bg-surface px-2 py-2 transition focus-within:border-primary/30 focus-within:bg-white focus-within:shadow-[0_2px_12px_rgba(16,60,35,.10)]">
        {image && (
          <div className="relative mb-1 ml-2 mt-1 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Foto terlampir" className="h-16 w-16 rounded-xl object-cover" />
            <button aria-label="Hapus foto" onClick={() => setImage(null)} className="absolute -right-2 -top-2 grid h-7 w-7 place-items-center rounded-full bg-ink text-white">
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="flex items-end gap-0.5">
          <button aria-label="Ambil foto" title="Ambil foto" onClick={picker.openCamera} className={iconBtn} data-testid="btn-camera">
            <IconCamera />
          </button>
          <button aria-label="Pilih dari galeri" title="Pilih dari galeri" onClick={picker.openGallery} className={`${iconBtn} hidden sm:grid`}>
            <IconImage />
          </button>
          <textarea
            ref={taRef}
            rows={1}
            autoFocus={autoFocus}
            value={text}
            maxLength={500}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            placeholder={image ? "Foto siap. Tekan kirim →" : placeholder}
            className="min-h-11 min-w-0 flex-1 resize-none bg-transparent px-1 py-2.5 text-base leading-6 text-ink outline-none placeholder:text-subtle"
            data-testid="prompt-input"
          />
          {speechOk && !text && !image && (
            <button aria-label="Bicara" onClick={mic} className={`${iconBtn} ${listening ? "bg-danger-bg text-danger" : ""}`}>
              <IconMic />
            </button>
          )}
          <button
            aria-label="Kirim"
            onClick={send}
            disabled={!canSend}
            className={`grid h-11 w-11 shrink-0 place-items-center rounded-full transition ${canSend ? "bg-primary text-white hover:bg-primary-hover" : "text-line"}`}
            data-testid="btn-send"
          >
            <IconSend />
          </button>
        </div>
        {picker.inputs}
      </div>
      {err && <p className="mt-1 px-4 text-sm text-danger">{err}</p>}
    </div>
  );
}
