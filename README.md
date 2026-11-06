# KerthiPilah AI

## Description
Aplikasi web asisten pilah sampah berbasis AI untuk Bali. Warga memotret sampah, lalu AI menentukan kategori, wadah, dan tujuan buangnya sesuai aturan desa. Petugas memotret wadah rumah, AI menilai kualitas pilahan, dan TPS3R memantau hasilnya di dasbor.

Dibuat untuk **AI Web Innovation Challenge – Bali DigiFest 2026** (bidang Bali Smart Society).

## Problem & Target User
Sampah organik tidak lagi diterima TPA Suwung, jadi sampah harus dipilah dan diolah di sumber. Di lapangan, warga sering ragu barang tertentu masuk kategori apa, sementara petugas menerima sampah tercampur dan tidak punya data per rumah.

- **Warga (rumah tangga):** butuh jawaban cepat "ini dibuang ke mana?"
- **Petugas angkut/TPS3R:** butuh cara cepat menilai dan mencatat kualitas pilahan per rumah.
- **Pengelola TPS3R & prajuru desa adat:** butuh data banjar mana yang perlu dibina.

## Key Features
| Fitur | Pengguna | Keterangan |
|---|---|---|
| **Pindai** | Warga | Ketuk bingkai pemindai → foto → AI vision mengenali barang → tong yang benar terbuka di "papan 4 tong" + checklist sebelum buang → **Sudah kubuang** (tercatat di hitungan harian, tersimpan di browser) |
| **Kamus pilah** | Warga | Cari nama barang → hasil instan dari aturan desa (tanpa AI, bisa offline). Bila tidak ada → **Tanya AI** menjawab hanya dari dokumen desa, dengan sumber |
| **Jadwal angkut** | Warga | Kalender mingguan per jenis tong, "diangkut hari ini", dan tempat setor (TPS3R, bank sampah) |
| **Rute audit** | Petugas (login) | Daftar rumah per banjar + progres. Ketuk rumah → foto wadah O/A/R → AI memberi status & skor → petugas memutuskan → simpan → otomatis lanjut ke wadah/rumah berikutnya |
| **Dasbor TPS3R** | Pengelola (login) | % wadah baik, per banjar & per wadah, barang salah wadah terbanyak, % AI disetujui petugas |
| **Ringkasan AI** | Pengelola | Ringkasan & rekomendasi pembinaan dari data agregat 7 hari |
| **QR rumah** | Petugas | Cetak QR kode rumah untuk ditempel di wadah |
| **Umpan balik** | Warga | Tombol "Hasil salah? Laporkan" untuk evaluasi akurasi AI |

## Tech Stack
- Frontend & backend: Next.js 16 (App Router, Route Handlers), React 19, Tailwind CSS 4
- AI: DeepSeek via API OpenAI-compatible — `deepseek-v4.1-flash` (teks) dan `deepseek-v4-flash-vision-exp` (vision); output JSON divalidasi Zod. Alternatif bawaan: Anthropic Claude (`@anthropic-ai/sdk`).
- Database: PostgreSQL (Neon, `@neondatabase/serverless`); fallback file JSON untuk pengembangan lokal
- Hosting: Vercel

## AI Implementation
| Fitur | Input | Proses | Output |
|---|---|---|---|
| Cek Sampah | Foto (dikompres ≤1024 px, tanpa EXIF) + aturan desa | DeepSeek vision + output JSON tervalidasi Zod | `{items[{nama,kategori,alasan,tindakan}], confidence, perlu_foto_ulang, pesan}` |
| Audit Wadah | Foto wadah + jenis wadah (O/A/R) + rubrik | DeepSeek vision + rubrik di prompt | `{status, skor, kontaminan[], catatan, saran_warga, foto_layak}` |
| Tanya Pilah | Pertanyaan + dokumen hasil retrieval kata kunci | DeepSeek, dibatasi hanya menjawab dari dokumen | `{jawaban, sumber[], dalam_cakupan}` |
| Ringkasan | Statistik agregat (tanpa kode rumah/nama) | DeepSeek | `{ringkasan, rekomendasi[]}` |

- Model diatur lewat env `AI_MODEL` dan `AI_VISION_MODEL` tanpa mengubah kode. JSON yang tidak sesuai skema diminta ulang satu kali. Kode: [`src/lib/ai.ts`](src/lib/ai.ts).
- Aturan desa disisipkan ke prompt sehingga hasil mengikuti aturan setempat. Ganti data di [`src/lib/data.ts`](src/lib/data.ts) untuk desa lain.
- Penanganan galat: kunci tidak valid, rate limit, timeout, penolakan (`refusal`), dan output tidak valid masing-masing menghasilkan pesan yang jelas. Aplikasi tidak macet.
- Human-in-the-loop: hasil audit AI baru tersimpan setelah petugas mengonfirmasi atau mengoreksi.

## Architecture / Data Flow
```
User (ponsel) → Frontend Next.js (kompres foto) → Route Handler /api/* (validasi, rate limit, auth)
   → DeepSeek API (vision/teks, OpenAI-compatible) → JSON divalidasi Zod → UI
   → PostgreSQL (audit, umpan balik) → Dasbor
```

## Installation / Run Instructions
```bash
npm install
cp .env.example .env.local   # isi AI_BASE_URL, AI_API_KEY, AUTH_SECRET, DEMO_USERNAME, DEMO_PASSWORD
npm run dev                  # http://localhost:3000
```
`DATABASE_URL` opsional. Bila kosong, data tersimpan di `.data/db.json` (hanya untuk lokal).

Deploy ke Vercel: import repository, isi environment variable yang sama, lalu hubungkan Neon Postgres (Storage) agar `DATABASE_URL` terisi.

## Deployment URL
[TODO: isi URL Vercel]

## Demo Account
Akun demo juri (peran petugas/pengelola) dikirim melalui form panitia. Kredensial tidak disimpan di repository.

## Known Limitations
- Data desa adalah **data contoh** (Desa Adat Demo), belum aturan desa nyata.
- Akurasi menurun pada foto gelap/buram atau barang bertumpuk. AI meminta foto ulang bila tidak yakin.
- Retrieval Tanya Pilah memakai pencocokan kata kunci sederhana, belum embedding.
- Rate limit bersifat per instance server (best-effort).
- Pemindai QR memakai BarcodeDetector API (Chrome Android). Di browser lain, kode rumah diketik manual.
- Notifikasi WhatsApp dan bahasa Bali belum tersedia.

## Third-party Resources / Credits
- [Next.js](https://nextjs.org) (MIT), React (MIT), Tailwind CSS (MIT)
- Model AI: DeepSeek (`deepseek-v4.1-flash`, `deepseek-v4-flash-vision-exp`) melalui API gateway OpenAI-compatible
- [@anthropic-ai/sdk](https://github.com/anthropics/anthropic-sdk-typescript) (MIT), sebagai penyedia alternatif
- [zod](https://zod.dev) (MIT), [@neondatabase/serverless](https://github.com/neondatabase/serverless) (MIT), [qrcode](https://github.com/soldair/node-qrcode) (MIT)
- Font Nunito Sans (SIL OFL) via `next/font`
- Rujukan kebijakan: Pergub Bali No. 47/2019; pemberitaan Antara & KLH (2025) tentang TPA Suwung
- AI coding assistant: Claude (Anthropic) dipakai untuk membantu menulis kode dan dokumentasi. Seluruh kode telah ditinjau dan diuji tim.

## Team Members
| Nama | Peran |
|---|---|
| [TODO] | Ketua, produk & AI |
| [TODO] | Pengembang |
| [TODO] | Data lapangan & uji |
