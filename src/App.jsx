import { useEffect, useLayoutEffect, useRef, useState } from "react"
import Invitation from "./components/Invitation"
import Envelope from "./components/Envelope"

const BG_IMAGE = "/boda/fondo-pagina.webp"

function App() {
  const [isReady, setIsReady] = useState(false)
  const [envelopeOpen, setEnvelopeOpen] = useState(false)
  const [envelopeUnmounted, setEnvelopeUnmounted] = useState(false)
  const sceneRef = useRef(null)

  useEffect(() => {
    // Retrasar el inicio de la animación para que el usuario perciba el blanco sólido primero
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

  return (
    <div
      ref={sceneRef}
      className={`invitation-scene relative min-h-0 w-full flex-1 overflow-x-hidden overflow-y-auto scroll-auto bg-no-repeat bg-bottom md:bg-center bg-[length:100%_auto] md:bg-cover bg-scroll ${isReady ? "is-ready" : ""}`}
      style={{
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundColor: "#f4f1ea",
      }}
    >
      {/* El flash blanco inicial */}
      <div className="loader-overlay" aria-hidden />

      {/* Componente del sobre (Intercepta todo hasta que se abre) */}
      {!envelopeUnmounted && (
        <Envelope
          onReveal={() => setEnvelopeOpen(true)}
          onComplete={() => setEnvelopeUnmounted(true)}
        />
      )}

      {/* La invitación real (Siempre visible en el fondo, se revela a través del sobre transparente) */}
      <div className="relative z-20">
        <Invitation envelopeOpen={envelopeOpen} scrollContainerRef={sceneRef} />
      </div>

    </div>
  )
}

export default App
