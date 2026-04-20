import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import webfontDownload from 'vite-plugin-webfont-dl'
import pkg from './package.json'

// https://vite.dev/config/
export default defineConfig({
  base: '/app/',
  build: {
    outDir: 'dist/app',
  },
  plugins: [
    react(),
    webfontDownload([
      'https://fonts.googleapis.com/css2?family=Manrope:wght@400;600;800&family=Work+Sans:wght@400;500;600;700&display=swap',
      'https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap',
    ]),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png'],
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        navigateFallback: '/app/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/auth\//, /^\/.well-known\//],
      },
      manifest: {
        name: 'Skatastrophe',
        short_name: 'Skatastrophe',
        description: 'Moderne Skat Zählapp für Punkte und Statistiken',
        theme_color: '#00261b', /* primary color */
        background_color: '#fcf9f8', /* bg color */
        display: 'standalone',
        icons: [
          {
            src: 'android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: 'android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      }
    })
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  test: {
    environment: 'node',
    globals: true,
  },
})
