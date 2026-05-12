import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Invitation from "./Invitation"
import Envelope from "./Envelope"
import { trackEvent } from "../utils/track"

const BG_IMAGE = "/boda/fondo-pagina.webp"

/** Igual criterio que Invitation: solo pathname con segmento tipo invitado. */
function extractSlugFromLocation() {
  if (typeof window === "undefined") return null
  try {
    const rawPath = decodeURIComponent(window.location.pathname)
    let segment = rawPath.replace(/^\//, "").split("/")[0] ?? ""
    if (!segment) return null
    if (segment.endsWith("+1")) segment = segment.slice(0, -2)
    segment = segment.trim()
    if (!segment.includes("-")) return null
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null
    return segment
  } catch {
    return null
  }
}

/** Evita doble envío en React StrictMode (doble mount en desarrollo). */
function trackOncePerSession(storageKey, slug, event) {
  if (!slug) return
  try {
    if (sessionStorage.getItem(storageKey) === "1") return
    sessionStorage.setItem(storageKey, "1")
  } catch {
    /* modo privado */
  }
  trackEvent(slug, event)
}

/** Flujo sobre + invitación (contenido original de App). */
export default function InvitationRoute() {
  const [isReady, setIsReady] = useState(false)
  const [envelopeOpen, setEnvelopeOpen] = useState(false)
  const [envelopeUnmounted, setEnvelopeUnmounted] = useState(false)
  const sceneRef = useRef(null)
  const slugRef = useRef(null)

  useEffect(() => {
    slugRef.current = extractSlugFromLocation()
    if (slugRef.current) {
      trackOncePerSession(`kv_tracked_view_${slugRef.current}`, slugRef.current, "view")
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  const scrollSceneToTop = () => {
    const el = sceneRef.current
    if (el) {
      el.scrollTop = 0
      el.scrollLeft = 0
    }
    window.scrollTo(0, 0)
    document.documentElement.scrollTop = 0
    document.body.scrollTop = 0
  }

  useLayoutEffect(() => {
    if (!envelopeOpen) return
    scrollSceneToTop()
  }, [envelopeOpen])

  useLayoutEffect(() => {
    if (!envelopeUnmounted) return
    scrollSceneToTop()
  }, [envelopeUnmounted])

  const handleReveal = () => {
    const slug = slugRef.current ?? extractSlugFromLocation()
    if (slug) {
      trackOncePerSession(`kv_tracked_open_${slug}`, slug, "open")
    }
    setEnvelopeOpen(true)
  }

  return (
    <div
      ref={sceneRef}
      className={`invitation-scene relative min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto scroll-auto bg-no-repeat bg-bottom md:bg-center bg-[length:100%_auto] md:bg-cover bg-scroll ${
        isReady ? "is-ready" : ""
      }`}
      style={{
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundColor: "#f4f1ea",
      }}
    >
      <div className="loader-overlay" aria-hidden />

      {!envelopeUnmounted && (
        <Envelope
          onReveal={handleReveal}
          onComplete={() => setEnvelopeUnmounted(true)}
        />
      )}

      <div className="relative z-20">
        <Invitation envelopeOpen={envelopeOpen} scrollContainerRef={sceneRef} />
      </div>
    </div>
  )
}
