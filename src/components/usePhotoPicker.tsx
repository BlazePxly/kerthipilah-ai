"use client";
import { useRef } from "react";
import { compressImage } from "./ImagePicker";

// Input file tersembunyi untuk kamera & galeri. Foto dikompres (≤1024 px, EXIF hilang) sebelum dipakai.
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
