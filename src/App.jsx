import { useEffect, useState } from "react"
import Invitation from "./components/Invitation"

const BG_IMAGE =
  "https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/dcfd9c52-fb5b-4766-817a-24807c909752.png"

function App() {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 120)
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
      <div className="paper-bg" aria-hidden />
      <div className="paper-emboss" aria-hidden />
      <div className="loader-overlay" aria-hidden />

      <div className="relative z-20">
        <Invitation />
      </div>
    </div>
  )
}

export default App
