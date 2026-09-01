import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Lanius Custom",
    template: "%s | Lanius Custom",
  },
  description:
    "Controle de estoque, serviços e cotações da Lanius Custom — pintura, reforma e lanternagem de caminhões.",
  applicationName: "Lanius Custom",
  appleWebApp: {
    capable: true,
    title: "Lanius Custom",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#080d16",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
