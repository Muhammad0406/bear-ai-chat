import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // proxy API calls during development to the local Express server
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    // output the built frontend into the server `public` folder so server serves it
    outDir: '../public',
    emptyOutDir: true
  }
})
