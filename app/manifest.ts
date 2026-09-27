import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "MertOS",
    short_name: "MertOS",
    description: "Mert'in kişisel hayat işletim sistemi.",
    start_url: "/bugun",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0A0A0B",
    theme_color: "#0A0A0B",
    lang: "tr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      {
        name: "Su ekle",
        short_name: "Su",
        description: "250 ml su ekle",
        url: "/bugun?hizli=su",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Sigara ekle",
        short_name: "Sigara",
        description: "Bir sigara kaydet",
        url: "/bugun?hizli=sigara",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Koşu başlat",
        short_name: "Koşu",
        description: "Yeni bir antrenman oturumu başlat",
        url: "/hublar/beden/antrenman?baslat=1",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
