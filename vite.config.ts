import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages serves the app below /<repo>/. The deploy workflow sets BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  // MapLibre allein ist gut 1 MB; es wird nur mit der Kartenseite geladen.
  build: { chunkSizeWarningLimit: 1400 },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Etappa',
        short_name: 'Etappa',
        description: 'Fernwanderungen planen, in Etappen aufteilen und unterwegs navigieren.',
        lang: 'de-CH',
        theme_color: '#e9e8da',
        background_color: '#e9e8da',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,mjs,css,html,svg,png,woff2}'],
        // Kartenschriften kommen über den Laufzeit-Cache (siehe unten), nicht in den Vorab-Cache
        globIgnores: ['fonts/**'],
        navigateFallback: `${base}index.html`,
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Höhen-Kacheln und Kartenschriften: einmal geladen, offline verfügbar.
        // Die Cache-Namen nutzt auch src/offline/store.ts für gezielte Downloads.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/s3\.amazonaws\.com\/elevation-tiles-prod\//,
            handler: 'CacheFirst',
            options: { cacheName: 'dem-tiles', expiration: { maxEntries: 8000 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            // eigene Kartenschriften (public/fonts): nur die benutzten Bereiche laden und behalten
            urlPattern: /\/fonts\/PlexMono-[^/]+\/[\d-]+\.pbf$/,
            handler: 'CacheFirst',
            options: { cacheName: 'map-fonts', expiration: { maxEntries: 120 } },
          },
          {
            // Fotos der Fernwege (Wikimedia Commons), damit der Katalog auch offline Bilder zeigt
            urlPattern: /^https:\/\/upload\.wikimedia\.org\//,
            handler: 'CacheFirst',
            options: { cacheName: 'trail-photos', expiration: { maxEntries: 200 }, cacheableResponse: { statuses: [0, 200] } },
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
