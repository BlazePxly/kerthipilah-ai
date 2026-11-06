// Basis pengetahuan & data demo.
// PENTING: "Desa Adat Demo" adalah data contoh untuk pengujian MVP, bukan data desa nyata.
// Ganti/isi dengan aturan desa mitra sebelum dipakai di lapangan.

export type Kategori = "organik" | "anorganik" | "residu" | "b3" | "tidak_yakin";

// Warna mengikuti warna tong yang umum: hijau organik, kuning anorganik, abu residu, merah B3.
export const KATEGORI_INFO: Record<
  Kategori,
  { label: string; wadah: string; warna: string; soft: string; teks: string; ikon: string; tujuan: string }
> = {
  organik: {
    label: "Organik",
    wadah: "Tong hijau (O)",
    warna: "bg-[#2e9e57]",
    soft: "bg-[#e3f4e8]",
    teks: "text-[#155c31]",
    ikon: "🍃",
    tujuan: "Teba modern / komposter rumah, atau diangkut ke TPS3R untuk kompos/maggot",
  },
  anorganik: {
    label: "Anorganik",
    wadah: "Tong kuning (A)",
    warna: "bg-[#e0a800]",
    soft: "bg-[#fff4cc]",
    teks: "text-[#6b5000]",
    ikon: "♻️",
    tujuan: "Bank sampah atau TPS3R (dalam keadaan bersih & kering)",
  },
  residu: {
    label: "Residu",
    wadah: "Tong abu-abu (R)",
    warna: "bg-[#6b7570]",
    soft: "bg-[#eceeed]",
    teks: "text-[#3b423e]",
    ikon: "🗑️",
    tujuan: "Diangkut sebagai residu ke TPST/TPA",
  },
  b3: {
    label: "B3 rumah tangga",
    wadah: "Kantong merah terpisah",
    warna: "bg-[#c62828]",
    soft: "bg-[#fdeceb]",
    teks: "text-[#8c1d18]",
    ikon: "⚠️",
    tujuan: "Serahkan ke titik kumpul B3 di TPS3R/kantor desa",
  },
  tidak_yakin: {
    label: "Belum yakin",
    wadah: "Foto ulang lebih jelas",
    warna: "bg-[#9aa39d]",
    soft: "bg-[#f1f3f2]",
    teks: "text-[#47504a]",
    ikon: "❔",
    tujuan: "Ambil foto satu barang, cahaya cukup, latar polos",
  },
};

export type Aturan = { barang: string; kategori: Kategori; catatan: string };
export type Dokumen = { id: string; judul: string; sumber: string; isi: string };
export type Rumah = { kode: string; banjar: string };

export type Desa = {
  id: string;
  nama: string;
  keterangan: string;
  banjar: string[];
  jadwal: string;
  aturan: Aturan[];
  dokumen: Dokumen[];
  rumah: Rumah[];
};

const aturanUmum: Aturan[] = [
  { barang: "sisa makanan, nasi, sayur, kulit buah", kategori: "organik", catatan: "Tiriskan airnya dulu." },
  { barang: "canang/banten bekas (janur, bunga, daun)", kategori: "organik", catatan: "Pisahkan plastik, staples, dan kertas dari canang sebelum dibuang." },
  { barang: "daun, ranting, rumput", kategori: "organik", catatan: "Ranting besar dipotong agar mudah dikompos." },
  { barang: "botol plastik PET, gelas plastik", kategori: "anorganik", catatan: "Bilas, kosongkan, lepas label bila bisa." },
  { barang: "kardus, kertas HVS, koran", kategori: "anorganik", catatan: "Harus kering; kertas berminyak masuk residu." },
  { barang: "kaleng minuman, kaleng makanan", kategori: "anorganik", catatan: "Bilas dan pipihkan." },
  { barang: "botol kaca", kategori: "anorganik", catatan: "Jangan dipecah; kaca pecah dibungkus dan diberi tanda." },
  { barang: "kemasan multilapis (sachet kopi, bungkus mi, kemasan snack)", kategori: "residu", catatan: "Umumnya tidak diterima bank sampah; cek kebijakan TPS3R setempat." },
  { barang: "styrofoam", kategori: "residu", catatan: "Hindari pemakaian; masuk residu." },
  { barang: "popok sekali pakai, pembalut, tisu bekas", kategori: "residu", catatan: "Bungkus rapat sebelum dibuang." },
  { barang: "kantong kresek kotor/berminyak", kategori: "residu", catatan: "Kresek bersih & kering boleh ke anorganik." },
  { barang: "baterai, lampu bekas, obat kedaluwarsa, kaleng semprot, wadah racun serangga", kategori: "b3", catatan: "Jangan dicampur sampah lain; kumpulkan terpisah." },
  { barang: "minyak jelantah", kategori: "b3", catatan: "Simpan dalam botol tertutup; jangan dibuang ke saluran air. Serahkan ke titik kumpul jelantah bila tersedia." },
];

const dokumenUmum: Dokumen[] = [
  {
    id: "pergub-47-2019",
    judul: "Prinsip Pergub Bali No. 47 Tahun 2019",
    sumber: "Ringkasan tim atas Pergub Bali No. 47/2019 tentang Pengelolaan Sampah Berbasis Sumber",
    isi: "Pergub Bali 47/2019 mengatur pengelolaan sampah berbasis sumber: sampah dipilah sejak dari rumah tangga, usaha, dan kawasan, lalu diolah sedekat mungkin dengan sumbernya. Desa/kelurahan dan desa adat berperan menyelenggarakan pengelolaan sampah di wilayahnya, antara lain melalui TPS3R. Hanya residu yang semestinya dibawa ke TPA.",
  },
  {
    id: "suwung-2025",
    judul: "Pembatasan sampah organik ke TPA Suwung",
    sumber: "Antara (2025); KLH (2025)",
    isi: "Pemerintah Provinsi Bali membatasi sampah organik masuk TPA Suwung karena porsinya sekitar 65% dari timbulan dan berkadar air tinggi. KLH menetapkan penghentian open dumping TPA Suwung; pengelola kawasan dan pelaku usaha wajib memilah dan mengelola sampahnya sendiri. Artinya sampah organik harus diselesaikan di sumber (teba modern, komposter, TPS3R).",
  },
  {
    id: "teba-modern",
    judul: "Teba modern",
    sumber: "Panduan umum tim",
    isi: "Teba modern adalah lubang/silinder pengomposan di pekarangan untuk sampah organik rumah tangga (sisa makanan, daun, canang). Masukkan organik saja, tanpa plastik. Tutup agar tidak berbau dan tidak dihinggapi lalat. Kompos yang matang dapat dipakai untuk tanaman.",
  },
  {
    id: "canang",
    judul: "Canang dan banten bekas",
    sumber: "Panduan umum tim",
    isi: "Canang dan banten bekas pada dasarnya organik (janur, bunga, daun, jajan). Sebelum masuk wadah organik/teba, pisahkan bagian non-organik seperti plastik pembungkus, staples, kertas, dan uang kepeng/koin.",
  },
];

export const DESA: Desa[] = [
  {
    id: "demo",
    nama: "Desa Adat Demo (data contoh)",
    keterangan: "Data contoh untuk uji MVP. Bukan aturan desa nyata.",
    banjar: ["Kaja", "Tengah", "Kelod"],
    jadwal: "Organik diangkut Senin, Rabu, Jumat. Anorganik & residu diangkut Selasa dan Sabtu. B3 diserahkan ke titik kumpul TPS3R setiap Sabtu.",
    aturan: aturanUmum,
    dokumen: [
      ...dokumenUmum,
      {
        id: "demo-jadwal",
        judul: "Jadwal angkut Desa Adat Demo",
        sumber: "Data contoh MVP",
        isi: "Organik diangkut Senin, Rabu, Jumat pukul 07.00. Anorganik dan residu diangkut Selasa dan Sabtu. B3 rumah tangga diserahkan ke titik kumpul TPS3R Demo setiap Sabtu pukul 08.00-11.00.",
      },
      {
        id: "demo-pararem",
        judul: "Contoh pararem pemilahan (Desa Adat Demo)",
        sumber: "Data contoh MVP",
        isi: "Setiap krama dan penduduk pendatang wajib memilah sampah menjadi organik, anorganik, dan residu sebelum diangkut. Sampah yang tidak dipilah dicatat petugas dan dikembalikan untuk dipilah. Banjar dengan tingkat pilah terbaik tiap bulan mendapat apresiasi pada paruman.",
      },
      {
        id: "demo-fasilitas",
        judul: "Fasilitas di Desa Adat Demo",
        sumber: "Data contoh MVP",
        isi: "TPS3R Demo menerima organik untuk kompos dan maggot, serta anorganik bersih. Bank Sampah Demo buka Minggu pukul 09.00-12.00 dan menerima botol PET, kardus, kertas, kaleng, dan botol kaca. Titik kumpul jelantah ada di TPS3R Demo.",
      },
    ],
    rumah: Array.from({ length: 30 }, (_, i) => {
      const banjar = ["Kaja", "Tengah", "Kelod"][i % 3];
      const kode = `${banjar.slice(0, 2).toUpperCase()}-${String(Math.floor(i / 3) + 1).padStart(3, "0")}`;
      return { kode, banjar };
    }),
  },
];

export function getDesa(id: string | null | undefined): Desa {
  return DESA.find((d) => d.id === id) ?? DESA[0];
}

export function findRumah(desa: Desa, kode: string): Rumah | undefined {
  const k = kode.trim().toUpperCase();
  return desa.rumah.find((r) => r.kode === k);
}

// Retrieval sederhana: skor kata kunci (tanpa embedding) agar ringan & mudah diaudit.
const STOP = new Set(["yang", "dan", "di", "ke", "dari", "itu", "ini", "apa", "apakah", "bagaimana", "untuk", "dengan", "atau", "saya", "aku", "kalau", "kah", "bisa", "boleh", "mana", "buang", "dibuang"]);

function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOP.has(t));
}

export function retrieve(desa: Desa, pertanyaan: string, k = 4): Dokumen[] {
  const q = tokens(pertanyaan);
  const aturanDoc: Dokumen = {
    id: "aturan-pilah",
    judul: `Daftar aturan pilah ${desa.nama}`,
    sumber: desa.keterangan,
    isi: desa.aturan.map((a) => `${a.barang}: ${a.kategori}. ${a.catatan}`).join("\n"),
  };
  const semua = [aturanDoc, ...desa.dokumen];
  const skor = semua.map((d) => {
    const t = new Set(tokens(`${d.judul} ${d.isi}`));
    const s = q.reduce((n, w) => n + (t.has(w) ? 1 : [...t].some((x) => x.startsWith(w) || w.startsWith(x)) ? 0.5 : 0), 0);
    return { d, s };
  });
  const hasil = skor.filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, k).map((x) => x.d);
  // Daftar aturan selalu disertakan agar pertanyaan "barang X masuk mana" terjawab.
  if (!hasil.find((d) => d.id === aturanDoc.id)) hasil.unshift(aturanDoc);
  return hasil.slice(0, k);
}
