import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// In local development the Python API runs on port 8000 (uvicorn) and Vite
// forwards /api requests to it. On Vercel both live on the same domain.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { '/api': 'http://localhost:8000' },
  },
})
