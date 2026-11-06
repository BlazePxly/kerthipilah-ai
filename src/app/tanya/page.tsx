import { redirect } from "next/navigation";

// Tanya Pilah kini ada di Kamus (cari instan + Tanya AI).
export default function TanyaPage() {
  redirect("/kamus");
}
