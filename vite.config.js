import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Evita líos en Windows / PowerShell con argumentos sueltos; localhost fiable
    host: true,
    port: 5173,
    strictPort: false,
    open: true,
  },
})
