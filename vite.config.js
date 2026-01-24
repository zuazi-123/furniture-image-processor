import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/', // 使用绝对路径，适配 Web 部署和 Tauri

  // 清除控制台输出
  clearScreen: false,

  server: {
    port: 5175,
    open: false, // Tauri 会自动打开窗口
    strictPort: true, // 端口被占用时报错而不是自动切换
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
    // Tauri 使用 Chromium 内核，可以使用现代特性
    target: process.env.TAURI_PLATFORM == 'windows' ? 'chrome105' : 'safari13',
    // 不使用 minify 以便调试（生产环境可以开启）
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    // 生成 sourcemap 以便调试
    sourcemap: !!process.env.TAURI_DEBUG,
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html')
      },
      output: {
        manualChunks: undefined
      }
    }
  },

  // 环境变量前缀
  envPrefix: ['VITE_', 'TAURI_']
})
