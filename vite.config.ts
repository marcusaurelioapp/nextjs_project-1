import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const apiProxy = {
  '/api': { target: 'http://localhost:3001', changeOrigin: true },
};

export default defineConfig({
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'LotoSmart Pro',
        short_name: 'LotoSmart',
        description:
          'Gerador estatístico e simulador de sorteios da Lotofácil com filtros matemáticos e Monte Carlo.',
        lang: 'pt-BR',
        display: 'standalone',
        background_color: '#121214',
        theme_color: '#121214',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
});
