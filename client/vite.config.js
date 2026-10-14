import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // En desarrollo, las llamadas a /api van al backend de Express
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
})
