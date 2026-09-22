import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SLICE-D — Sistem Layanan Informasi Cerdas Denpasar",
  description:
    "Sistem rekonsiliasi belanja Pemerintah Kota Denpasar untuk Admin BPKAD dan seluruh OPD.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="id" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
