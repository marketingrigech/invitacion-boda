import { Route, Routes, useLocation } from "react-router-dom"
import CreatorGate from "./components/CreatorGate"
import CreatorPage from "./components/CreatorPage"
import DashboardPage from "./components/dashboard/DashboardPage"
import DashboardProvider from "./components/dashboard/DashboardProvider"
import ErrorBoundary from "./components/ErrorBoundary"
import InvitationRoute from "./components/InvitationRoute"

function App() {
  const location = useLocation()
  return (
    <ErrorBoundary resetKey={location.pathname}>
      <div className="flex min-h-[100dvh] w-full flex-1 flex-col">
        <Routes>
        <Route
          path="/creador"
          element={
            <CreatorGate>
              <CreatorPage />
            </CreatorGate>
          }
        />
        <Route
          path="/creador/"
          element={
            <CreatorGate>
              <CreatorPage />
            </CreatorGate>
          }
        />
        <Route
          path="/dashboard"
          element={
            <CreatorGate>
              <DashboardProvider>
                <DashboardPage />
              </DashboardProvider>
            </CreatorGate>
          }
        />
        <Route
          path="/dashboard/"
          element={
            <CreatorGate>
              <DashboardProvider>
                <DashboardPage />
              </DashboardProvider>
            </CreatorGate>
          }
        />
        {/* "*" debe ir al final: captura / y /Cualquier-Invitado sin pisar /creador */}
        <Route path="*" element={<InvitationRoute />} />
        </Routes>
      </div>
    </ErrorBoundary>
  )
}

export default App
