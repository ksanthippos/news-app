import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Uutiskoostaja",
        short_name: "Uutiset",
        description: "Oma henkilökohtainen uutiskoostaja",
        theme_color: "#111827",
        background_color: "#f5f5f5",
        display: "standalone",
        lang: "fi",
        icons: []
      }
    })
  ],
  base: "./"
});
