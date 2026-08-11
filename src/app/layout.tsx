import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

const notoSansArabic = localFont({
  src: [
    { path: "./fonts/noto-sans-arabic-300.ttf", weight: "300", style: "normal" },
    { path: "./fonts/noto-sans-arabic-400.ttf", weight: "400", style: "normal" },
    { path: "./fonts/noto-sans-arabic-500.ttf", weight: "500", style: "normal" },
  ],
  variable: "--font-arabic",
  display: "swap",
});

export const metadata: Metadata = {
  applicationName: "Nurussunnah Hub",
  title: {
    default: "Nurussunnah Hub",
    template: "%s | Nurussunnah Hub",
  },
  description:
    "Sistem Pengelolaan Pegawai Yayasan Islam Nurus Sunnah - manajemen data pegawai, surat pernyataan kerja, dan feedback rekan kerja.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${geistSans.variable} ${geistMono.variable} ${notoSansArabic.variable} h-full`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full bg-background font-sans antialiased"
        suppressHydrationWarning
      >
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
