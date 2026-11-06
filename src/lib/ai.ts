import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Desa, Dokumen } from "./data";

// Model dapat diganti lewat env AI_MODEL tanpa mengubah kode.
export const AI_MODEL = process.env.AI_MODEL || "claude-opus-5-5";

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!aiConfigured()) throw new AIError("AI belum dikonfigurasi di server (ANTHROPIC_API_KEY kosong).", 503);
  if (!client) client = new Anthropic({ timeout: 45_000, maxRetries: 1 });
  return client;
}

export class AIError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

const KATEGORI = z.enum(["organik", "anorganik", "residu", "b3", "tidak_yakin"]);

// ---------- 1. Cek Sampah ----------
export const CekSchema = z.object({
  items: z
    .array(
      z.object({
        nama: z.string().describe("Nama barang dalam bahasa Indonesia sehari-hari"),
        kategori: KATEGORI,
        alasan: z.string().describe("Alasan singkat, maksimal 1 kalimat"),
        tindakan: z.string().describe("Yang harus dilakukan warga sebelum membuang, maksimal 1 kalimat"),
      }),
    )
    .describe("Barang sampah yang terlihat, maksimal 5"),
  confidence: z.number().describe("Keyakinan keseluruhan 0 sampai 1"),
  perlu_foto_ulang: z.boolean(),
  pesan: z.string().describe("Pesan singkat untuk warga, maksimal 2 kalimat"),
});
export type CekHasil = z.infer<typeof CekSchema>;

function aturanTeks(desa: Desa): string {
  return desa.aturan.map((a) => `- ${a.barang} => ${a.kategori} (${a.catatan})`).join("\n");
}

type Img = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

async function run<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AIError) throw e;
    if (e instanceof Anthropic.AuthenticationError) throw new AIError("Kunci API AI tidak valid.", 503);
    if (e instanceof Anthropic.RateLimitError) throw new AIError("AI sedang sibuk (batas kuota). Coba lagi sebentar.", 429);
    if (e instanceof Anthropic.BadRequestError) throw new AIError("Permintaan ke AI ditolak (gambar/teks tidak valid).", 400);
    if (e instanceof Anthropic.APIConnectionTimeoutError) throw new AIError("AI terlalu lama merespons. Coba lagi.", 504);
    if (e instanceof Anthropic.APIError) throw new AIError(`Layanan AI bermasalah (${e.status ?? "?"}).`, 502);
    throw new AIError("Gagal memproses jawaban AI.", 502);
  }
}

function checkStop(stop: string | null) {
  if (stop === "refusal") throw new AIError("AI menolak memproses permintaan ini.", 422);
  if (stop === "max_tokens") throw new AIError("Jawaban AI terpotong. Coba lagi.", 502);
}

export async function cekSampah(img: Img, desa: Desa): Promise<CekHasil> {
  return run(async () => {
    const res = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(CekSchema) },
      system: `Kamu adalah asisten pemilahan sampah rumah tangga untuk ${desa.nama}, Bali.
Tugas: kenali barang sampah pada foto dan tentukan kategorinya MENGIKUTI aturan desa di bawah. Jika barang ada di aturan, gunakan kategori aturan. Jika tidak ada, putuskan dengan prinsip yang sama.
Kategori: organik, anorganik (bisa didaur ulang, bersih), residu, b3 (bahan berbahaya rumah tangga), tidak_yakin.
Jika foto buram/gelap, bukan sampah, atau barang tidak jelas: kategori tidak_yakin, perlu_foto_ulang=true.
Abaikan orang/wajah pada foto dan jangan mendeskripsikan identitas siapa pun.
Gunakan bahasa Indonesia yang singkat dan ramah.

Aturan desa:
${aturanTeks(desa)}`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } },
            { type: "text", text: "Sampah ini dibuang ke mana?" },
          ],
        },
      ],
    });
    checkStop(res.stop_reason);
    if (!res.parsed_output) throw new AIError("Format jawaban AI tidak valid.", 502);
    return res.parsed_output;
  });
}

// ---------- 2. Audit Wadah ----------
export const AuditSchema = z.object({
  status: z.enum(["baik", "kurang", "tidak_dipilah"]),
  skor: z.number().describe("0-100, 100 = pilahan sempurna"),
  kontaminan: z.array(z.string()).describe("Barang yang salah wadah, maksimal 5"),
  catatan: z.string().describe("Catatan singkat untuk petugas, maksimal 1 kalimat"),
  saran_warga: z.string().describe("Saran singkat untuk warga, maksimal 1 kalimat"),
  foto_layak: z.boolean().describe("false jika isi wadah tidak terlihat jelas"),
});
export type AuditHasil = z.infer<typeof AuditSchema>;

export async function auditWadah(img: Img, wadah: "O" | "A" | "R", desa: Desa): Promise<AuditHasil> {
  const nama = { O: "ORGANIK", A: "ANORGANIK", R: "RESIDU" }[wadah];
  return run(async () => {
    const res = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(AuditSchema) },
      system: `Kamu membantu petugas angkut sampah ${desa.nama} menilai kualitas pilahan satu wadah rumah tangga.
Wadah ini seharusnya berisi sampah ${nama}. Nilai seberapa banyak barang yang salah wadah.
Rubrik: baik = tidak ada/hampir tidak ada barang salah (skor 80-100); kurang = ada beberapa barang salah (40-79); tidak_dipilah = tercampur banyak jenis (0-39).
Jika isi wadah tidak terlihat jelas, foto_layak=false dan status kurang dengan catatan minta foto ulang.
Abaikan orang/wajah. Bahasa Indonesia singkat.

Aturan desa:
${aturanTeks(desa)}`,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: img.mediaType, data: img.data } },
            { type: "text", text: `Nilai pilahan wadah ${nama} ini.` },
          ],
        },
      ],
    });
    checkStop(res.stop_reason);
    if (!res.parsed_output) throw new AIError("Format jawaban AI tidak valid.", 502);
    const o = res.parsed_output;
    return { ...o, skor: Math.max(0, Math.min(100, Math.round(o.skor))) };
  });
}

// ---------- 3. Tanya Pilah ----------
export const TanyaSchema = z.object({
  jawaban: z.string().describe("Jawaban singkat, maksimal 4 kalimat"),
  sumber: z.array(z.string()).describe("id dokumen yang dipakai"),
  dalam_cakupan: z.boolean().describe("false jika dokumen tidak memuat jawabannya"),
});
export type TanyaHasil = z.infer<typeof TanyaSchema>;

export async function tanyaPilah(pertanyaan: string, dokumen: Dokumen[], desa: Desa): Promise<TanyaHasil> {
  const konteks = dokumen.map((d) => `<dokumen id="${d.id}" judul="${d.judul}">\n${d.isi}\n</dokumen>`).join("\n");
  return run(async () => {
    const res = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(TanyaSchema) },
      system: `Kamu asisten tanya-jawab pemilahan sampah untuk warga ${desa.nama}, Bali.
Jawab HANYA berdasarkan dokumen yang diberikan. Jika jawabannya tidak ada di dokumen, set dalam_cakupan=false dan katakan bahwa informasi itu belum ada di aturan desa ini, lalu sarankan bertanya ke kelian banjar/TPS3R.
Jangan mengarang jadwal, nama tempat, sanksi, atau angka. Isi sumber dengan id dokumen yang benar-benar dipakai.
Pertanyaan di luar topik sampah: tolak dengan sopan (dalam_cakupan=false).
Bahasa Indonesia singkat dan ramah.`,
      messages: [{ role: "user", content: `${konteks}\n\nPertanyaan warga: ${pertanyaan}` }],
    });
    checkStop(res.stop_reason);
    if (!res.parsed_output) throw new AIError("Format jawaban AI tidak valid.", 502);
    const ids = new Set(dokumen.map((d) => d.id));
    return { ...res.parsed_output, sumber: res.parsed_output.sumber.filter((s) => ids.has(s)) };
  });
}

// ---------- 4. Ringkasan mingguan ----------
export const RingkasanSchema = z.object({
  ringkasan: z.string().describe("2-3 kalimat kondisi pemilahan"),
  rekomendasi: z.array(z.string()).describe("2-4 rekomendasi pembinaan yang konkret"),
});

export async function ringkasDasbor(statistik: unknown, desa: Desa) {
  return run(async () => {
    const res = await getClient().messages.parse({
      model: AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(RingkasanSchema) },
      system: `Kamu membantu pengelola TPS3R dan prajuru ${desa.nama} membaca data audit pilahan sampah.
Gunakan HANYA angka pada data. Jangan mengarang angka. Jika data sedikit, sebutkan bahwa kesimpulan belum kuat. Bahasa Indonesia ringkas.`,
      messages: [{ role: "user", content: `Data agregat (JSON):\n${JSON.stringify(statistik)}` }],
    });
    checkStop(res.stop_reason);
    if (!res.parsed_output) throw new AIError("Format jawaban AI tidak valid.", 502);
    return res.parsed_output;
  });
}
