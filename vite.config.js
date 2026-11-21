import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages liefert die App unter /<repo>/ aus; der Deploy-Workflow setzt BASE_PATH.
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  root: 'app',
  base,
  build: { outDir: '../dist', emptyOutDir: true },
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Deal-Radar',
        short_name: 'Deal-Radar',
        description: 'Technik-Deals in der Schweiz überwachen',
        lang: 'de-CH',
        theme_color: '#ffffff',
        background_color: '#f6f7f9',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,svg,png}'], navigateFallback: `${base}index.html` },
    }),
  ],
  test: { root: '.', include: ['tests/**/*.test.js'] },
})
