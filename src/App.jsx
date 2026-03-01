import { useEffect, useState } from "react"
import Invitation from "./components/Invitation"
import Envelope from "./components/Envelope"

const BG_IMAGE =
  "https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/fondo%20pagina.png"

function App() {
  const [isReady, setIsReady] = useState(false)
  const [envelopeOpen, setEnvelopeOpen] = useState(false)

  useEffect(() => {
    // Retrasar el inicio de la animación para que el usuario perciba el blanco sólido primero
    const timer = setTimeout(() => setIsReady(true), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      className={`invitation-scene relative min-h-screen w-full overflow-x-hidden overflow-y-auto ${isReady ? "is-ready" : ""}`}
      style={{
        backgroundImage: `url(${BG_IMAGE})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        backgroundColor: "#f4f1ea",
      }}
    >
      {/* El flash blanco inicial */}
      <div className="loader-overlay" aria-hidden />

      {/* Componente del sobre (Intercepta todo hasta que se abre) */}
      {!envelopeOpen && (
        <Envelope onOpen={() => setEnvelopeOpen(true)} />
      )}

      {/* La invitación real (Siempre visible en el fondo, se revela a través del sobre transparente) */}
      <div className="relative z-20">
        <Invitation envelopeOpen={envelopeOpen} />
      </div>

    </div>
  )
}

export default App
