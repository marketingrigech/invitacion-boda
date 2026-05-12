import { Route, Routes } from "react-router-dom"
import CreatorPage from "./components/CreatorPage"
import InvitationRoute from "./components/InvitationRoute"

function App() {
  return (
    <div className="flex min-h-[100dvh] w-full flex-1 flex-col">
      <Routes>
        <Route path="/creador" element={<CreatorPage />} />
        <Route path="/creador/" element={<CreatorPage />} />
        {/* "*" debe ir al final: captura / y /Cualquier-Invitado sin pisar /creador */}
        <Route path="*" element={<InvitationRoute />} />
      </Routes>
    </div>
  )
}

export default App
