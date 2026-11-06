import "server-only";
import { neon } from "@neondatabase/serverless";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export type AuditRow = {
  id: string;
  desa: string;
  rumah: string;
  banjar: string;
  wadah: "O" | "A" | "R";
  status_ai: string;
  skor_ai: number;
  status_final: string;
  dikoreksi: boolean;
  kontaminan: string[];
  petugas: string;
  created_at: string;
};

export type FeedbackRow = {
  id: string;
  desa: string;
  fitur: string;
  benar: boolean;
  detail: string;
  created_at: string;
};

const url = process.env.DATABASE_URL;

export function dbMode(): "postgres" | "file" {
  return url ? "postgres" : "file";
}

// ---------------- Postgres (Neon) ----------------
let ready: Promise<void> | null = null;
function sql() {
  return neon(url!);
}
async function ensureSchema() {
  if (!ready) {
    const q = sql();
    ready = (async () => {
      await q`CREATE TABLE IF NOT EXISTS audits (
        id text PRIMARY KEY, desa text NOT NULL, rumah text NOT NULL, banjar text NOT NULL,
        wadah text NOT NULL, status_ai text NOT NULL, skor_ai int NOT NULL, status_final text NOT NULL,
        dikoreksi boolean NOT NULL, kontaminan jsonb NOT NULL, petugas text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now())`;
      await q`CREATE TABLE IF NOT EXISTS feedback (
        id text PRIMARY KEY, desa text NOT NULL, fitur text NOT NULL, benar boolean NOT NULL,
        detail text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`;
    })().catch((e) => {
      ready = null;
      throw e;
    });
  }
  return ready;
}

// ---------------- File JSON (pengembangan lokal) ----------------
type FileDB = { audits: AuditRow[]; feedback: FeedbackRow[] };
const filePath = process.env.VERCEL
  ? path.join(os.tmpdir(), "kerthipilah-db.json")
  : path.join(process.cwd(), ".data", "db.json");

async function readFile(): Promise<FileDB> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as FileDB;
  } catch {
    return { audits: [], feedback: [] };
  }
}
async function writeFile(db: FileDB) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(db, null, 2));
}

// ---------------- API ----------------
export async function addAudit(a: Omit<AuditRow, "id" | "created_at">): Promise<AuditRow> {
  const row: AuditRow = { ...a, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  if (url) {
    await ensureSchema();
    await sql()`INSERT INTO audits (id, desa, rumah, banjar, wadah, status_ai, skor_ai, status_final, dikoreksi, kontaminan, petugas, created_at)
      VALUES (${row.id}, ${row.desa}, ${row.rumah}, ${row.banjar}, ${row.wadah}, ${row.status_ai}, ${row.skor_ai}, ${row.status_final}, ${row.dikoreksi}, ${JSON.stringify(row.kontaminan)}, ${row.petugas}, ${row.created_at})`;
  } else {
    const db = await readFile();
    db.audits.push(row);
    await writeFile(db);
  }
  return row;
}

export async function listAudits(desa: string, sinceDays = 30): Promise<AuditRow[]> {
  const since = new Date(Date.now() - sinceDays * 864e5).toISOString();
  if (url) {
    await ensureSchema();
    const rows = (await sql()`SELECT * FROM audits WHERE desa = ${desa} AND created_at >= ${since} ORDER BY created_at DESC LIMIT 2000`) as Record<string, unknown>[];
    return rows.map((r) => ({
      ...(r as unknown as AuditRow),
      kontaminan: (typeof r.kontaminan === "string" ? JSON.parse(r.kontaminan) : r.kontaminan) as string[],
      created_at: new Date(r.created_at as string).toISOString(),
    }));
  }
  const db = await readFile();
  return db.audits
    .filter((a) => a.desa === desa && a.created_at >= since)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addFeedback(f: Omit<FeedbackRow, "id" | "created_at">) {
  const row: FeedbackRow = { ...f, id: crypto.randomUUID(), created_at: new Date().toISOString() };
  if (url) {
    await ensureSchema();
    await sql()`INSERT INTO feedback (id, desa, fitur, benar, detail, created_at)
      VALUES (${row.id}, ${row.desa}, ${row.fitur}, ${row.benar}, ${row.detail}, ${row.created_at})`;
  } else {
    const db = await readFile();
    db.feedback.push(row);
    await writeFile(db);
  }
}

export async function feedbackStats(desa: string): Promise<{ total: number; benar: number }> {
  if (url) {
    await ensureSchema();
    const r = (await sql()`SELECT count(*)::int AS total, count(*) FILTER (WHERE benar)::int AS benar FROM feedback WHERE desa = ${desa}`) as { total: number; benar: number }[];
    return r[0] ?? { total: 0, benar: 0 };
  }
  const db = await readFile();
  const f = db.feedback.filter((x) => x.desa === desa);
  return { total: f.length, benar: f.filter((x) => x.benar).length };
}
