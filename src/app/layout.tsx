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
  title: "Hakim Portal — Gestão para Franquias",
  description: "Portal de gestão exclusivo para franquias Hakim. Cardápio digital, pedidos online, estoque e muito mais.",
  icons: {
    icon: [
      { url: "/icon.jpg", type: "image/jpeg" },
    ],
    apple: [
      { url: "/apple-icon.jpg", type: "image/jpeg" },
    ],
    shortcut: "/favicon.ico",
  },
  themeColor: "#EF4444",
  applicationName: "Hakim Portal",
  keywords: ["franquia", "hakim", "restaurante", "gestão", "delivery", "cardápio digital"],
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
