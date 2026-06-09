import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Plugin: writes dist/version.json with a unique build timestamp.
// The app fetches this file on every open (bypassing all caches) to
// detect new deploys independently of the service-worker lifecycle.
const versionPlugin = {
  name: 'version-json',
  closeBundle() {
    writeFileSync(
      resolve(__dirname, 'dist/version.json'),
      JSON.stringify({ v: Date.now() }),
    );
  },
};

export default defineConfig({
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    versionPlugin,
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'apple-touch-icon.png', 'icon-192.png', 'icon-512.png'],
      manifest: {
        name: 'ORIA — Tu asesora financiera',
        short_name: 'ORIA',
        description: 'Controla tus finanzas personales con inteligencia artificial. Importación automática, metas de ahorro e informes mensuales.',
        start_url: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#081426',
        theme_color: '#081426',
        lang: 'es',
        categories: ['finance', 'productivity'],
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//],
        // Never precache version.json — it must always come from the network
        globPatterns: ['**/*.{js,css,html,ico,svg,woff2}', 'icon-*.png', 'apple-touch-icon.png', 'favicon.png'],
        globIgnores: ['9E52A2AC*.png', 'version.json'],
        runtimeCaching: [
          // version.json: NetworkOnly — always fetch from server, never from cache
          {
            urlPattern: /\/version\.json/,
            handler: 'NetworkOnly',
          },
          // App shell HTML: NetworkFirst (3s timeout) so iOS always gets fresh HTML
          {
            urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'pages-cache', networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: { cacheName: 'supabase-cache', expiration: { maxEntries: 50, maxAgeSeconds: 300 } },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'google-fonts-cache', expiration: { maxEntries: 10, maxAgeSeconds: 31_536_000 } },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
});
