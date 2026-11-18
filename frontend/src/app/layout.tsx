import type { Metadata } from "next";
import { Host_Grotesk, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const hostGrotesk = Host_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-host-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PlateGuard MBG — Aplikasi Spatial Glass & Penjelasan Bahasa Sederhana",
  description:
    "Aplikasi prediksi sisa makanan MBG dengan TreeSHAP, ringkasan bahasa awam humanizer-id, analitik 38 provinsi, dan audit holdout.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      data-type="software"
      data-radius="round"
      data-theme="spatial-glass"
      className={`${hostGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
