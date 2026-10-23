import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: [
        "favicon.svg",
        "apple-touch-icon.png",
        "pwa-192x192.png",
        "pwa-512x512.png"
      ],
      workbox: {
        runtimeCaching: [
          {
            // Varmistetaan että news.json haetaan aina ensisijaisesti verkosta tuoreena
            urlPattern: ({ url }) => url.pathname.endsWith("news.json"),
            handler: "NetworkFirst",
            options: {
              cacheName: "news-json-cache",
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 24 * 60 * 60
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },
      manifest: {
        name: "Uutisapuri",
        short_name: "Uutisapuri",
        description: "Oma henkilökohtainen uutisapuri",
        theme_color: "#111827",
        background_color: "#f5f5f5",
        display: "standalone",
        lang: "fi",
        icons: [
          {
            src: "pwa-192x192.png",
            sizes: "192x192",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png"
          },
          {
            src: "pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable"
          },
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml"
          }
        ]
      }
    })
  ],
  base: "./"
});
