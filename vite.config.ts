import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 根据环境变量决定base路径：
  // - GITHUB_PAGES=true 时使用 /caustic_lens/ (GitHub Pages部署)
  // - 其他情况使用 / (Docker部署或本地开发)
  base: process.env.GITHUB_PAGES === 'true' ? '/caustic_lens/' : '/',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          three: ['three'],
          antd: ['antd']
        }
      }
    }
   }
}))
