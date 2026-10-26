import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Inter, Martian_Mono } from "next/font/google";
import { Providers } from "@/components/shell/providers";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
// Faz 3 tasarımı (docs/gorev-dosyasi/faz-3-tasarim.md): teknik karakterli ana yazı + rakamlar için mono.
const tech = Chakra_Petch({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-tech", display: "swap" });
const mono = Martian_Mono({ subsets: ["latin", "latin-ext"], variable: "--font-fx-mono", display: "swap" });

export const metadata: Metadata = {
  title: "MertOS",
  description: "Mert'in kişisel hayat işletim sistemi.",
  robots: { index: false, follow: false },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "MertOS",
  },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0A0A0B",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr" className={`${inter.variable} ${tech.variable} ${mono.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col bg-[var(--color-bg)] text-[var(--color-text-primary)] antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
