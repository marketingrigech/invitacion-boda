import { useEffect, useState } from "react"
import Invitation from "./components/Invitation"
import Envelope from "./components/Envelope"

const BG_IMAGE =
  "https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/dcfd9c52-fb5b-4766-817a-24807c909752.png"

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
      className={`invitation-scene relative min-h-screen w-full overflow-hidden ${isReady ? "is-ready" : ""}`}
      style={{
        "--paper-image": `url(${BG_IMAGE})`,
        backgroundColor: "#f8f4f0",
      }}
    >
      {/* Fondos estáticos de la carta */}
      <div className="paper-bg" aria-hidden />
      <div className="paper-emboss" aria-hidden />

      {/* El flash blanco inicial */}
      <div className="loader-overlay" aria-hidden />

      {/* Componente del sobre (Intercepta todo hasta que se abre) */}
      {!envelopeOpen && (
        <Envelope onOpen={() => setEnvelopeOpen(true)} />
      )}

      {/* La invitación real (Pasa al frente cuando se abre el sobre) */}
      <div className={`relative z-20 transition-opacity duration-1000 ${envelopeOpen ? 'opacity-100' : 'opacity-0'}`}>
        <Invitation />
      </div>

    </div>
  )
}

export default App
