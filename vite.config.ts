import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// API는 항상 상대 경로 /api로 부른다.
// - 로컬: Vite dev server가 /api를 Spring Boot(localhost:8080)로 넘긴다.
// - 운영: Vercel rewrites가 /api를 OCI API로 넘긴다(vercel.json).
// 브라우저 입장에서 화면과 API가 같은 오리진이라 refresh 쿠키(SameSite=Strict)와 CORS 문제가 없다.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'DecisionFlow',
        short_name: 'DecisionFlow',
        description: '팀 할 일과 의사결정',
        lang: 'ko',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f6f5f1',
        theme_color: '#f6f5f1',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // 화면(앱 셸)만 캐시한다. API 응답은 캐시하지 않는다.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  server: {
    port: 5173,
    // 같은 와이파이의 iPhone에서 http://<PC IP>:5173 으로 열어 볼 수 있게 한다.
    host: true,
    proxy: {
      // changeOrigin을 끄면 브라우저의 Origin 헤더가 그대로 가서 서버의 Origin 검사를 통과한다.
      '/api': { target: 'http://localhost:8080', changeOrigin: false },
    },
  },
})
