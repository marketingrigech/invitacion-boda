import { useEffect } from "react"
import { createPortal } from "react-dom"

/**
 * Visor a pantalla completa para ampliar una imagen (Escape / fondo / botón cierra).
 */
export default function ImageLightbox({ isOpen, onClose, src, alt = "" }) {
  useEffect(() => {
    if (!isOpen) return
    const onKey = e => {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, onClose])

  if (!isOpen || !src) return null

  const ui = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Imagen ampliada"}
      onClick={onClose}
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onClose}
        className="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-[#1a1a1a]/80 text-white shadow-lg transition hover:bg-[#2a2a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
        </svg>
      </button>
      <img
        src={src}
        alt={alt}
        className="max-h-[min(92vh,920px)] max-w-[min(96vw,1100px)] object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
        draggable={false}
      />
    </div>
  )

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null
}
