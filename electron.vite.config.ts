import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'

const sharedAlias = { '@shared': resolve(__dirname, 'src/shared') }

export default defineConfig({
  // 依赖外置由 electron-vite 按 build.externalizeDeps 默认注入，不再手动挂插件
  main: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/main/index.ts') },
      },
    },
  },
  preload: {
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/preload/index.ts') },
      },
    },
  },
  renderer: {
    root: resolve(__dirname, 'src/renderer'),
    plugins: [react()],
    resolve: { alias: sharedAlias },
    build: {
      rollupOptions: {
        input: { index: resolve(__dirname, 'src/renderer/index.html') },
      },
    },
  },
})
