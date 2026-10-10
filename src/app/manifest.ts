import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Nível Aprovado",
    short_name: "Nível Aprovado",
    description: "Do edital à aprovação, um nível de cada vez.",
    lang: "pt-BR",
    start_url: "/painel",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#f7f8fb",
    theme_color: "#1f4fd8",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
