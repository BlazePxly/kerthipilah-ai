import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import type { Desa, Dokumen } from "./data";

// ---------------------------------------------------------------------------
// Penyedia AI
// 1) OpenAI-compatible (default proyek ini): AI_BASE_URL + AI_API_KEY,
//    model teks AI_MODEL dan model vision AI_VISION_MODEL (DeepSeek).
// 2) Anthropic Claude: ANTHROPIC_API_KEY (dipakai bila AI_BASE_URL kosong).
// ---------------------------------------------------------------------------
const BASE_URL = (process.env.AI_BASE_URL || "").replace(/\/+$/, "").replace(/\/chat\/completions$/, "");
const PROVIDER: "openai" | "anthropic" | "none" =
  BASE_URL && process.env.AI_API_KEY ? "openai" : process.env.ANTHROPIC_API_KEY ? "anthropic" : "none";

export const AI_MODEL =
  process.env.AI_MODEL || (PROVIDER === "anthropic" ? "claude-opus-5-5" : "deepseek-v4.1-flash");
export const AI_VISION_MODEL =
  process.env.AI_VISION_MODEL || (PROVIDER === "anthropic" ? AI_MODEL : "deepseek-v4-flash-vision-exp");

export function aiConfigured(): boolean {
  return PROVIDER !== "none";
}
export function aiInfo() {
  return { provider: PROVIDER, model: AI_MODEL, vision: AI_VISION_MODEL };
}

export class AIError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

type Img = { data: string; mediaType: "image/jpeg" | "image/png" | "image/webp" };

// ---------- Generator JSON terstruktur, satu pintu untuk semua fitur ----------
async function generate<T extends z.ZodType>(opts: { schema: T; system: string; text: string; image?: Img }): Promise<z.infer<T>> {
  if (PROVIDER === "none") throw new AIError("AI belum dikonfigurasi di server (AI_API_KEY kosong).", 503);
  return PROVIDER === "openai" ? generateOpenAI(opts) : generateAnthropic(opts);
}

// --- OpenAI-compatible (DeepSeek) ---
function extractJSON(raw: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(raw);
  const s = fenced ? fenced[1] : raw;
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("tidak ada objek JSON");
  return JSON.parse(s.slice(start, end + 1));
}

async function callChat(model: string, messages: unknown[]): Promise<string> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${process.env.AI_API_KEY}` },
      body: JSON.stringify({ model, messages, temperature: 0.2, max_tokens: 1500 }),
      signal: AbortSignal.timeout(50_000),
    });
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) throw new AIError("AI terlalu lama merespons. Coba lagi.", 504);
    throw new AIError("Tidak dapat terhubung ke layanan AI.", 502);
  }
  if (res.status === 401 || res.status === 403) throw new AIError("Kunci API AI tidak valid.", 503);
  if (res.status === 429) throw new AIError("AI sedang sibuk (batas kuota). Coba lagi sebentar.", 429);
  if (res.status === 400 || res.status === 413) throw new AIError("Permintaan ke AI ditolak (gambar/teks tidak valid).", 400);
  if (!res.ok) throw new AIError(`Layanan AI bermasalah (${res.status}).`, 502);
  const j = (await res.json().catch(() => null)) as { choices?: { message?: { content?: string }; finish_reason?: string }[] } | null;
  const content = j?.choices?.[0]?.message?.content;
  if (!content) throw new AIError("AI tidak memberi jawaban.", 502);
  return content;
}

async function generateOpenAI<T extends z.ZodType>({ schema, system, text, image }: { schema: T; system: string; text: string; image?: Img }): Promise<z.infer<T>> {
  const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
  const sys = `${system}\n\nBalas HANYA dengan satu objek JSON valid (tanpa teks lain, tanpa markdown) yang sesuai JSON Schema berikut:\n${jsonSchema}`;
  const userContent = image
    ? [
        { type: "image_url", image_url: { url: `data:${image.mediaType};base64,${image.data}` } },
        { type: "text", text },
      ]
    : text;
  const messages: { role: string; content: unknown }[] = [
    { role: "system", content: sys },
    { role: "user", content: userContent },
  ];
  const model = image ? AI_VISION_MODEL : AI_MODEL;
  // Coba sekali, bila JSON tidak valid minta model memperbaiki satu kali.
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await callChat(model, messages);
    try {
      const parsed = schema.safeParse(extractJSON(raw));
      if (parsed.success) return parsed.data;
      messages.push({ role: "assistant", content: raw }, { role: "user", content: `JSON tidak sesuai skema: ${parsed.error.issues.map((i) => i.path.join(".") + " " + i.message).join("; ")}. Kirim ulang JSON yang benar saja.` });
    } catch {
      messages.push({ role: "assistant", content: raw }, { role: "user", content: "Balasan bukan JSON valid. Kirim ulang hanya objek JSON." });
    }
  }
  throw new AIError("Format jawaban AI tidak valid. Coba lagi.", 502);
}

// --- Anthropic Claude ---
let anthropic: Anthropic | null = null;
async function generateAnthropic<T extends z.ZodType>({ schema, system, text, image }: { schema: T; system: string; text: string; image?: Img }): Promise<z.infer<T>> {
  anthropic ??= new Anthropic({ timeout: 45_000, maxRetries: 1 });
  try {
    const res = await anthropic.messages.parse({
      model: image ? AI_VISION_MODEL : AI_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low", format: zodOutputFormat(schema) },
      system,
      messages: [
        {
          role: "user",
          content: image
            ? [{ type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } }, { type: "text", text }]
            : text,
        },
      ],
    });
    if (res.stop_reason === "refusal") throw new AIError("AI menolak memproses permintaan ini.", 422);
    if (res.stop_reason === "max_tokens") throw new AIError("Jawaban AI terpotong. Coba lagi.", 502);
    if (!res.parsed_output) throw new AIError("Format jawaban AI tidak valid.", 502);
    return res.parsed_output as z.infer<T>;
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

// ---------------------------------------------------------------------------
const KATEGORI = z.enum(["organik", "anorganik", "residu", "b3", "tidak_yakin"]);

function aturanTeks(desa: Desa): string {
  return desa.aturan.map((a) => `- ${a.barang} => ${a.kategori} (${a.catatan})`).join("\n");
}

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

export async function cekSampah(img: Img, desa: Desa): Promise<CekHasil> {
  const out = await generate({
    schema: CekSchema,
    image: img,
    text: "Sampah ini dibuang ke mana?",
    system: `Kamu adalah asisten pemilahan sampah rumah tangga untuk ${desa.nama}, Bali.
Tugas: kenali barang sampah pada foto dan tentukan kategorinya MENGIKUTI aturan desa di bawah. Jika barang ada di aturan, gunakan kategori aturan. Jika tidak ada, putuskan dengan prinsip yang sama.
Kategori: organik, anorganik (bisa didaur ulang, bersih), residu, b3 (bahan berbahaya rumah tangga), tidak_yakin.
Jika foto buram/gelap, bukan sampah, atau barang tidak jelas: kategori tidak_yakin, perlu_foto_ulang=true.
Abaikan orang/wajah pada foto dan jangan mendeskripsikan identitas siapa pun.
Gunakan bahasa Indonesia yang singkat dan ramah.

Aturan desa:
${aturanTeks(desa)}`,
  });
  return { ...out, items: out.items.slice(0, 5), confidence: Math.max(0, Math.min(1, out.confidence)) };
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
  const o = await generate({
    schema: AuditSchema,
    image: img,
    text: `Nilai pilahan wadah ${nama} ini.`,
    system: `Kamu membantu petugas angkut sampah ${desa.nama} menilai kualitas pilahan satu wadah rumah tangga.
Wadah ini seharusnya berisi sampah ${nama}. Nilai seberapa banyak barang yang salah wadah.
Rubrik: baik = tidak ada/hampir tidak ada barang salah (skor 80-100); kurang = ada beberapa barang salah (40-79); tidak_dipilah = tercampur banyak jenis (0-39).
Jika isi wadah tidak terlihat jelas, foto_layak=false dan status kurang dengan catatan minta foto ulang.
Abaikan orang/wajah. Bahasa Indonesia singkat.

Aturan desa:
${aturanTeks(desa)}`,
  });
  return { ...o, skor: Math.max(0, Math.min(100, Math.round(o.skor))), kontaminan: o.kontaminan.slice(0, 5) };
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
  const out = await generate({
    schema: TanyaSchema,
    text: `${konteks}\n\nPertanyaan warga: ${pertanyaan}`,
    system: `Kamu asisten tanya-jawab pemilahan sampah untuk warga ${desa.nama}, Bali.
Jawab HANYA berdasarkan dokumen yang diberikan. Jika jawabannya tidak ada di dokumen, set dalam_cakupan=false dan katakan bahwa informasi itu belum ada di aturan desa ini, lalu sarankan bertanya ke kelian banjar/TPS3R.
Jangan mengarang jadwal, nama tempat, sanksi, atau angka. Isi sumber dengan id dokumen yang benar-benar dipakai.
Pertanyaan di luar topik sampah: tolak dengan sopan (dalam_cakupan=false).
Bahasa Indonesia singkat dan ramah.`,
  });
  const ids = new Set(dokumen.map((d) => d.id));
  return { ...out, sumber: out.sumber.filter((s) => ids.has(s)) };
}

// ---------- 4. Ringkasan mingguan ----------
export const RingkasanSchema = z.object({
  ringkasan: z.string().describe("2-3 kalimat kondisi pemilahan"),
  rekomendasi: z.array(z.string()).describe("2-4 rekomendasi pembinaan yang konkret"),
});

export async function ringkasDasbor(statistik: unknown, desa: Desa) {
  return generate({
    schema: RingkasanSchema,
    text: `Data agregat (JSON):\n${JSON.stringify(statistik)}`,
    system: `Kamu membantu pengelola TPS3R dan prajuru ${desa.nama} membaca data audit pilahan sampah.
Gunakan HANYA angka pada data. Jangan mengarang angka. Jika data sedikit, sebutkan bahwa kesimpulan belum kuat. Bahasa Indonesia ringkas.`,
  });
}
