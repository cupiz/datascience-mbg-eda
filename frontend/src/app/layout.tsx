import type { Metadata } from "next";
import { JetBrains_Mono, Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-manrope",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PlateGuard MBG — Aplikasi Prediksi & Audit Sisa Makanan SPPG",
  description:
    "Aplikasi operasional pra-distribusi, TreeSHAP, analitik 38 provinsi, dan audit holdout Makan Bergizi Gratis (MBG).",
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
      data-radius="soft"
      data-ground="sage"
      className={`${manrope.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
