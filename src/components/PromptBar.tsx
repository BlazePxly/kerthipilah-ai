"use client";
import { useEffect, useRef, useState } from "react";
import { compressImage } from "./ImagePicker";
import { IconClose, IconImage, IconMic, IconPlus, IconSend } from "./icons";

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

export default function PromptBar({
  onSend,
  disabled,
  placeholder = "Tanya KerthiPilah atau tambahkan foto sampah",
  autoFocus,
}: {
  onSend: (text: string, image: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [listening, setListening] = useState(false);
  const [err, setErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const camRef = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const recRef = useRef<SpeechRec | null>(null);
  const [speechOk, setSpeechOk] = useState(false);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    const ok = Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
    if (ok) queueMicrotask(() => setSpeechOk(true));
  }, []);

  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, [text]);

  async function pick(f?: File) {
    setMenu(false);
    setErr("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("File harus berupa gambar.");
    try {
      setImage(await compressImage(f));
    } catch {
      setErr("Gambar tidak dapat dibaca. Coba foto lain (JPEG/PNG).");
    }
  }

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

  return (
    <div className="w-full">
      <div className="rounded-[28px] bg-[#f0f4f9] px-3 pb-2 pt-3 transition focus-within:bg-[#e9eef6]">
        {image && (
          <div className="relative mb-2 ml-1 inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image} alt="Foto terlampir" className="h-16 w-16 rounded-xl object-cover" />
            <button aria-label="Hapus foto" onClick={() => setImage(null)} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-[#1f1f1f] text-white">
              <IconClose className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
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
          placeholder={image ? "Foto siap dicek. Tekan kirim ➜" : placeholder}
          className="block w-full resize-none bg-transparent px-2 text-base text-[#1f1f1f] outline-none placeholder:text-[#5f6368]"
          data-testid="prompt-input"
        />
        <div className="mt-2 flex items-center gap-1">
          <div className="relative">
            <button aria-label="Tambah foto" onClick={() => setMenu((m) => !m)} className="grid h-10 w-10 place-items-center rounded-full text-[#444746] hover:bg-black/5" data-testid="btn-plus">
              <IconPlus />
            </button>
            {menu && (
              <div className="absolute bottom-12 left-0 z-20 w-56 rounded-2xl bg-white p-2 shadow-[0_4px_24px_rgba(0,0,0,.14)]">
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[#f0f4f9]" onClick={() => camRef.current?.click()}>
                  📷 Ambil foto
                </button>
                <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-[#f0f4f9]" onClick={() => fileRef.current?.click()}>
                  <IconImage className="h-5 w-5" /> Unggah dari galeri
                </button>
              </div>
            )}
          </div>
          <span className="hidden text-xs text-[#5f6368] sm:inline">Foto sampah atau ketik pertanyaan</span>
          <div className="ml-auto flex items-center gap-1">
            {speechOk && (
              <button aria-label="Bicara" onClick={mic} className={`grid h-10 w-10 place-items-center rounded-full hover:bg-black/5 ${listening ? "bg-[#fce8e6] text-[#c5221f]" : "text-[#444746]"}`}>
                <IconMic />
              </button>
            )}
            <button
              aria-label="Kirim"
              onClick={send}
              disabled={!canSend}
              className={`grid h-10 w-10 place-items-center rounded-full transition ${canSend ? "bg-[#0b57d0] text-white hover:bg-[#0842a0]" : "text-[#9aa0a6]"}`}
              data-testid="btn-send"
            >
              <IconSend />
            </button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" data-testid="file-input" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }} />
      </div>
      {err && <p className="mt-1 px-4 text-sm text-[#c5221f]">{err}</p>}
    </div>
  );
}
