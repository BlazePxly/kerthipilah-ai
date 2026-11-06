import type { Metadata, Viewport } from "next";
import { Nunito_Sans } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const nunito = Nunito_Sans({ variable: "--font-nunito", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KerthiPilah AI – Asisten Pilah Sampah Bali",
  description:
    "Foto sampahnya, AI menentukan cara memilah sesuai aturan desa. Untuk rumah tangga, petugas angkut, dan TPS3R di Bali.",
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = { themeColor: "#1f6f4a" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${nunito.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <Header />
        <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-emerald-900/10 py-4 text-center text-xs text-slate-500">
          KerthiPilah AI · MVP untuk AI Web Innovation Challenge Bali DigiFest 2026 · Jawaban AI dapat keliru, ikuti arahan petugas desa.
        </footer>
      </body>
    </html>
  );
}
