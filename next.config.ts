import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

// Tarayıcı güvenlik başlıkları (depo herkese açık — Ekim 2026 güvenlik turu).
// CSP bilinçli olarak dar: script/style kısıtı yok (Next'in satır içi
// betikleri nonce ister), sadece gömülme/base/form/eklenti engelleniyor.
const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Mikrofon: Faz 4 sesli konuşma için yalnızca kendi sitemiz.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), microphone=(self)" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withSerwist(nextConfig);
