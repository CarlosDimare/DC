import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base relativa vacía para que funcione en cualquier subruta (como GitHub Pages)
  base: './', 
  build: {
    outDir: 'dist',
  }
})