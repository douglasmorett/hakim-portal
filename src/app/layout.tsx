import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FireHub — Gestão para Restaurantes",
  description: "Plataforma completa de gestão para restaurantes. Cardápio digital, pedidos online, delivery e muito mais.",
  icons: {
    icon: [
      { url: "/icon.jpg", type: "image/jpeg" },
    ],
    apple: [
      { url: "/apple-icon.jpg", type: "image/jpeg" },
    ],
    shortcut: "/favicon.ico",
  },
  themeColor: "#C62828",
  applicationName: "FireHub",
  keywords: ["restaurante", "delivery", "cardápio digital", "gestão", "pedidos"],
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
