import { useEffect, useRef } from "react"
import { renderQrToCanvas, downloadQrAsPng } from "../../utils/qr"

export default function QrModal({ open, url, title, onClose }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!open || !url || !canvasRef.current) return
    renderQrToCanvas(canvasRef.current, url).catch(() => {})
  }, [open, url])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wine-dark/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label="Código QR de invitación"
    >
      <div className="w-full max-w-sm rounded-xl border border-wine/40 bg-cream px-5 py-5 shadow-xl">
        <p className="text-lg font-semibold text-wine-dark">{title || "Enlace QR"}</p>
        <p className="mt-2 break-all font-mono text-[11px] text-wine/80">{url}</p>
        <div className="mx-auto mt-4 flex justify-center rounded-sm border border-wine/20 bg-white p-3 shadow-inner">
          <canvas ref={canvasRef} className="h-auto max-w-[240px]" width={260} height={260} />
        </div>
        <div className="mt-5 flex gap-2">
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg border border-wine bg-wine px-3 text-sm font-semibold text-cream transition hover:bg-wine-dark"
            onClick={() => downloadQrAsPng(url, "invitacion-qr")}
          >
            Descargar PNG
          </button>
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg border border-sand px-3 text-sm font-semibold text-wine hover:bg-white"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
