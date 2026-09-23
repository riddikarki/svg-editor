import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['svgo'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
