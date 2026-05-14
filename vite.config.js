import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { viteDevApiFallback } from './vite-dev-api-fallback.js'

/**
 * Las rutas `/api/*` en Vercel son serverless. Con solo Vite:
 * - Si defines `VITE_API_PROXY` o `API_PROXY` (`.env.local`), se proxea a ese host (p. ej. tu despliegue).
 * - Si no hay proxy en desarrollo, el plugin `vite-dev-api-fallback` sirve un CRM mínimo y lo guarda en `.vite-dev-api.json`.
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiProxy =
    (env.VITE_API_PROXY ?? env.API_PROXY ?? '').trim() || ''
  /** En dev sin proxy, CRM en memoria + disco (no interfiere si hay proxy). */
  const plugins =
    mode === 'development' && !apiProxy
      ? [viteDevApiFallback(), react()]
      : [react()]

  return {
    plugins,
    server: {
      /** 0.0.0.0: accesible vía reenvío de puertos (Cursor / VS Code Remote) y LAN. */
      host: true,
      port: 5173,
      strictPort: false,
      /** En remoto `open` intenta abrir el navegador en el servidor, no en tu PC. */
      open: false,
      ...(apiProxy
        ? {
            proxy: {
              '/api': {
                target: apiProxy,
                changeOrigin: true,
                secure: true,
              },
            },
          }
        : {}),
    },
  }
})
