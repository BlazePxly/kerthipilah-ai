"use client";
import { useRef, useState } from "react";

// Mengompres foto di browser (maks 1024 px, JPEG) sebelum dikirim.
// Metadata EXIF (termasuk lokasi) otomatis hilang karena gambar digambar ulang lewat canvas.
async function compress(file: File, max = 1024): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export default function ImagePicker({
  value,
  onChange,
  label = "Ambil / unggah foto",
}: {
  value: string | null;
  onChange: (dataUrl: string | null) => void;
  label?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState("");

  async function onFile(f: File | undefined) {
    setErr("");
    if (!f) return;
    if (!f.type.startsWith("image/")) return setErr("File harus berupa gambar.");
    try {
      onChange(await compress(f));
    } catch {
      setErr("Gambar tidak dapat dibaca. Coba foto lain (JPEG/PNG).");
    }
  }

  return (
    <div>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        data-testid="file-input"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {value ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="Foto yang dipilih" className="max-h-72 w-full rounded-xl object-contain bg-slate-100" />
          <button type="button" className="btn-ghost w-full" onClick={() => ref.current?.click()}>
            Ganti foto
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => ref.current?.click()}
          className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand/40 bg-brand-soft/50 font-bold text-brand hover:bg-brand-soft"
        >
          <span className="text-3xl" aria-hidden>📷</span>
          {label}
        </button>
      )}
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
    </div>
  );
}
