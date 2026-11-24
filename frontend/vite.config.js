import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Prebundle the worker-only import before the editor opens to avoid a first-use reload.
  optimizeDeps: {
    include: ['pyodide'],
  },
})



