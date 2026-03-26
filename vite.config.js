import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'SitePro — Construction Manager',
        short_name: 'SitePro',
        description: 'Construction project management: photos, hours, expenses, tasks & reports.',
        theme_color: '#141414',
        background_color: '#141414',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'gfonts-css', expiration: { maxAgeSeconds: 60*60*24*365 }, cacheableResponse: { statuses: [0,200] } } },
          { urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i, handler: 'CacheFirst', options: { cacheName: 'gfonts-woff', expiration: { maxAgeSeconds: 60*60*24*365 }, cacheableResponse: { statuses: [0,200] } } },
          { urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i, handler: 'CacheFirst', options: { cacheName: 'images', expiration: { maxEntries: 200, maxAgeSeconds: 60*60*24*30 }, cacheableResponse: { statuses: [0,200] } } },
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
    }),
  ],
  server: { port: 3000, host: true },
  build: { sourcemap: false },
});
