import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue()],
  base: '/', // Set the base URL
  build: {
    
    outDir: '../backend/public/dist', // Build output directory
  },
  server: {
    proxy: {
      mimeTypes: {
        'application/javascript': ['vue'],
      },
      '/': 'http://localhost:3000', // Proxy API requests to the Express backend
    },
  },
})
