import pathlib

# 1. layout.tsx
p = pathlib.Path("src/app/layout.tsx")
p.write_text('''import type { Metadata } from "next";
import { Geist, Geist_Mono, Noto_Sans_Arabic } from "next/font/google";
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

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  weight: ["300", "400", "500"],
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
''', encoding="utf-8")
print("layout.tsx ok")
