import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  base: '/', // 使用绝对路径，适配 Web 部署
  server: {
    port: 5175,
    open: true,
    proxy: {
      '/api/baidu-ocr': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/baidu-ocr/, '')
      },
      '/api/umi-ocr': {
        target: 'http://127.0.0.1:1224',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/umi-ocr/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        manualChunks: undefined
      }
    }
  }
})
