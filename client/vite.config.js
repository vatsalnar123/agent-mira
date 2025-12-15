import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/agent-mira/', // GitHub repo name - update if different
  build: {
    outDir: 'dist',
  }
})
