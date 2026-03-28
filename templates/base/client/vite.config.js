import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
/* QUICKSTACK_VITE_IMPORT */

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), /* QUICKSTACK_VITE_PLUGIN */],
  server: {
    proxy: {
    '/api': 'http://localhost:5000',
    },
  },
})
