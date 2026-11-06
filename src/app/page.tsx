import Link from "next/link";

const FITUR = [
  { href: "/cek", ikon: "📷", judul: "Cek Sampah", isi: "Foto barangnya. AI menentukan kategori, wadah, dan ke mana dibuang sesuai aturan desa.", untuk: "Warga" },
  { href: "/tanya", ikon: "💬", judul: "Tanya Pilah", isi: "Tanya apa saja soal pemilahan. Jawaban hanya dari aturan desa dan disertai sumber.", untuk: "Warga" },
  { href: "/petugas", ikon: "✅", judul: "Audit Wadah", isi: "Petugas memotret wadah rumah. AI menilai kualitas pilahan, petugas mengonfirmasi.", untuk: "Petugas" },
  { href: "/dasbor", ikon: "📊", judul: "Dasbor TPS3R", isi: "Tingkat pilah per banjar, kesalahan terbanyak, dan ringkasan AI untuk pembinaan.", untuk: "Pengelola" },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-br from-brand to-emerald-800 p-6 text-white">
        <p className="text-sm font-bold uppercase tracking-wider text-emerald-100">Bali Smart Society · Lingkungan</p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight">Ragu sampah ini masuk wadah mana?</h1>
        <p className="mt-2 text-emerald-50">
          Sejak sampah organik tidak lagi diterima TPA Suwung, sampah harus dipilah dan diolah di sumber. KerthiPilah AI
          membantu warga memilah dengan benar dan membantu TPS3R memantau kualitas pilahan.
        </p>
        <Link href="/cek" className="mt-4 inline-flex rounded-xl bg-white px-4 py-2.5 font-bold text-brand">
          Mulai: foto sampah →
        </Link>
      </section>
      <section className="grid gap-3 sm:grid-cols-2">
        {FITUR.map((f) => (
          <Link key={f.href} href={f.href} className="card block transition hover:border-brand/40 hover:shadow">
            <div className="flex items-center justify-between">
              <span className="text-2xl" aria-hidden>{f.ikon}</span>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-bold text-brand">{f.untuk}</span>
            </div>
            <h2 className="mt-2 text-lg font-extrabold">{f.judul}</h2>
            <p className="text-sm text-slate-600">{f.isi}</p>
          </Link>
        ))}
      </section>
      <p className="text-xs text-slate-500">
        Data desa pada MVP ini adalah <b>data contoh</b> (Desa Adat Demo) untuk pengujian. Kategori: organik, anorganik,
        residu, dan B3 rumah tangga.
      </p>
    </div>
  );
}
