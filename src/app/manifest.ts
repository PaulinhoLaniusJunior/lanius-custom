import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lanius Custom",
    short_name: "Lanius",
    description:
      "Controle de estoque, serviços e cotações da Lanius Custom.",
    start_url: "/",
    display: "standalone",
    background_color: "#080d16",
    theme_color: "#080d16",
    lang: "pt-BR",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
