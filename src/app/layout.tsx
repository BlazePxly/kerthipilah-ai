import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import Shell from "@/components/Shell";
import "./globals.css";

const font = DM_Sans({ variable: "--font-app", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KerthiPilah AI – Asisten Pilah Sampah Bali",
  description:
    "Foto sampahnya, AI menentukan cara memilah sesuai aturan desa. Untuk rumah tangga, petugas angkut, dan TPS3R di Bali.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className={`${font.variable} h-full antialiased`}>
      <body className="h-full font-sans">
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
