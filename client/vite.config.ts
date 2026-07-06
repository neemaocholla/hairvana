import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'HAIRVANA',
        short_name: 'HAIRVANA',
        description:
          'Discover hairstyles, book stylists, and shop hair extensions — all in one app.',
        theme_color: '#7C3AED',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['lifestyle', 'beauty', 'shopping'],
        lang: 'en',
        dir: 'ltr',
        scope: '/',
      },
      workbox: {
        // Cache-first for static assets and core discovery screens
        runtimeCaching: [
          {
            // Hairstyle gallery — cache-first (offline browsing)
            urlPattern: /\/api\/hairstyles(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'hairstyle-gallery',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 5 * 60, // 5 min
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Stylist list — cache-first (offline browsing)
            urlPattern: /\/api\/stylists(\?.*)?$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'stylist-list',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 5 * 60,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Bookings and payments — network-first (must be fresh)
            urlPattern: /\/api\/(bookings|payments)(\/.*)?$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'booking-payment',
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // CDN images — stale-while-revalidate
            urlPattern: /^https:\/\/images\.unsplash\.com\/.*/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'cdn-images',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60, // 1 day
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
        // Pre-cache the app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  build: {
    // Code-split vendor chunks for smaller initial bundle
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          router: ['react-router-dom'],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
    },
  },
});
