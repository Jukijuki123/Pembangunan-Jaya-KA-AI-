import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import PwaRegister from "@/components/PwaRegister";
import OfflineBanner from "@/components/OfflineBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "SIGAP AI — Asesmen Kerentanan Pengungsi PMI",
  description:
    "Sistem cerdas asesmen kerentanan pengungsi untuk relawan PMI. AI membantu, manusia memutuskan.",
  icons: { icon: "/logo.png", apple: "/logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#c8102e",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={inter.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-screen font-sans antialiased">
        <ToastProvider>
          {children}
          <PwaRegister />
          <OfflineBanner />
        </ToastProvider>
      </body>
    </html>
  );
}
