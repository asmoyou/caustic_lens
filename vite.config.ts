import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // 根据环境变量决定base路径：
  // - GITHUB_PAGES=true 时使用 /caustic_lens/ (GitHub Pages部署)
  // - 其他情况使用 / (Docker部署或本地开发)
  base: process.env.GITHUB_PAGES === 'true' ? '/caustic_lens/' : '/',
  // 优化依赖预构建配置，解决 macOS 上的缓存问题
  optimizeDeps: {
    // 明确指定需要预构建的依赖，避免 macOS 文件系统时间戳问题
    include: [
      'react',
      'react-dom',
      'react/jsx-runtime',
      'antd',
      'three',
      '@react-three/fiber',
      '@react-three/drei',
      'chart.js',
      'react-chartjs-2',
      'zustand',
      'file-saver',
      'jspdf'
    ],
    // 排除不需要预构建的依赖
    exclude: ['jsdom'],
    // 强制重新构建（仅在开发模式下，生产构建不受影响）
    force: mode === 'development' ? false : undefined
  },
  // 服务器配置，改善 macOS 上的文件监听
  server: {
    watch: {
      // 在 macOS 上使用轮询模式可以避免文件系统事件丢失
      usePolling: false,
      // 增加文件监听稳定性
      interval: 100
    }
  },
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
