import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Invitation from "./Invitation"
import Envelope from "./Envelope"
import { trackEvent } from "../utils/track"
import { extractSlugFromLocation } from "../utils/slugFromPath"

const BG_IMAGE = "/boda/fondo-pagina.webp"

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

/** Throttle simple: ejecuta fn como máximo una vez cada `ms` milisegundos. */
function throttle(fn, ms) {
  let last = 0
  return (...args) => {
    const now = Date.now()
    if (now - last < ms) return
    last = now
    fn(...args)
  }
}

/** Flujo sobre + invitación (contenido original de App). */
export default function InvitationRoute() {
  const [isReady, setIsReady] = useState(false)
  const [envelopeOpen, setEnvelopeOpen] = useState(false)
  const [envelopeUnmounted, setEnvelopeUnmounted] = useState(false)
  const sceneRef = useRef(null)
  const slugRef = useRef(null)
  const trackClickRef = useRef(null)

  useEffect(() => {
    slugRef.current = extractSlugFromLocation()
    if (slugRef.current) {
      trackOncePerSession(`kv_tracked_view_${slugRef.current}`, slugRef.current, "view")
    }
  }, [])

  useEffect(() => {
    const slug = slugRef.current ?? extractSlugFromLocation()
    if (!slug) return
    const handler = throttle(() => trackEvent(slug, "click"), 1500)
    trackClickRef.current = handler
    const el = sceneRef.current
    if (el) el.addEventListener("click", handler)
    return () => { if (el) el.removeEventListener("click", handler) }
  }, [isReady])

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
