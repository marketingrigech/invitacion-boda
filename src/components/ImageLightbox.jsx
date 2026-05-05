import { useEffect } from "react"
import { createPortal } from "react-dom"

/**
 * Visor a pantalla completa. Una imagen (`src`) o galería (`images` + `index` + `onIndexChange`).
 */
export default function ImageLightbox({
  isOpen,
  onClose,
  src,
  alt = "",
  images = null,
  index = 0,
  onIndexChange = null,
}) {
  const galleryMode = Boolean(images?.length && typeof onIndexChange === "function")
  const list = galleryMode ? images : src ? [src] : []
  const total = list.length
  const safeIndex = galleryMode ? Math.min(Math.max(0, index), total - 1) : 0
  const currentSrc = list[galleryMode ? safeIndex : 0]

  const go = d => {
    if (!galleryMode || total <= 1) return
    onIndexChange((safeIndex + d + total) % total)
  }

  useEffect(() => {
    if (!isOpen) return
    const onKey = e => {
      if (e.key === "Escape") {
        onClose()
        return
      }
      if (galleryMode && total > 1 && onIndexChange) {
        if (e.key === "ArrowLeft") {
          e.preventDefault()
          onIndexChange((safeIndex - 1 + total) % total)
        }
        if (e.key === "ArrowRight") {
          e.preventDefault()
          onIndexChange((safeIndex + 1) % total)
        }
      }
    }
    window.addEventListener("keydown", onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = prev
    }
  }, [isOpen, onClose, galleryMode, total, safeIndex, onIndexChange])

  if (!isOpen || !currentSrc) return null

  const label =
    alt ||
    (galleryMode ? `Foto ${safeIndex + 1} de ${total}` : "Imagen ampliada")

  const ui = (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-[2px] sm:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={label}
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

      {galleryMode && total > 1 ? (
        <>
          <button
            type="button"
            aria-label="Foto anterior"
            onClick={e => {
              e.stopPropagation()
              go(-1)
            }}
            className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#1a1a1a]/85 text-white shadow-lg transition hover:bg-[#2a2a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:left-4"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Foto siguiente"
            onClick={e => {
              e.stopPropagation()
              go(1)
            }}
            className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-white/25 bg-[#1a1a1a]/85 text-white shadow-lg transition hover:bg-[#2a2a2a] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50 sm:right-4"
          >
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <p
            className="absolute bottom-4 left-0 right-0 z-10 text-center text-sm tabular-nums text-white/85"
            aria-live="polite"
          >
            {safeIndex + 1} · {total}
          </p>
        </>
      ) : null}

      <img
        src={currentSrc}
        alt={label}
        className="max-h-[min(88vh,920px)] max-w-[min(96vw,1100px)] object-contain shadow-2xl"
        onClick={e => e.stopPropagation()}
        draggable={false}
      />
    </div>
  )

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null
}
