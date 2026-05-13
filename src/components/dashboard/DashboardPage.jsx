import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import DashboardOverview from "./DashboardOverview"
import DashboardGuests from "./DashboardGuests"
import DashboardCatering from "./DashboardCatering"
import DashboardSeating from "./DashboardSeating"
import DashboardTasks from "./DashboardTasks"
import DashboardExports from "./DashboardExports"
import { useDashboard } from "./DashboardProvider"

const TABS = /** @type {const} */ ([
  { id: "resumen", hash: "#resumen", label: "Resumen", Panel: DashboardOverview },
  { id: "invitados", hash: "#invitados", label: "Invitados", Panel: DashboardGuests },
  { id: "catering", hash: "#catering", label: "Catering", Panel: DashboardCatering },
  { id: "mesas", hash: "#mesas", label: "Mesas", Panel: DashboardSeating },
  { id: "tareas", hash: "#tareas", label: "Tareas", Panel: DashboardTasks },
  {
    id: "exportaciones",
    hash: "#exportaciones",
    label: "Exportar",
    Panel: DashboardExports,
  },
])

/** @returns {typeof TABS[number]} */
function tabFromLocationHash() {
  const raw = (typeof window !== "undefined" && window.location.hash) || ""
  const hit = TABS.find((t) => t.hash === raw || `#${t.id}` === raw)
  return hit ?? TABS[0]
}

export default function DashboardPage() {
  const [activeHash, setActiveHash] = useState(() =>
    typeof window !== "undefined" ? tabFromLocationHash().hash : TABS[0].hash,
  )
  const { saveState } = useDashboard()

  useEffect(() => {
    const sync = () => setActiveHash(tabFromLocationHash().hash)
    sync()
    window.addEventListener("hashchange", sync)
    return () => window.removeEventListener("hashchange", sync)
  }, [])

  const Panel = useMemo(() => {
    const t = TABS.find((x) => x.hash === activeHash)
    return (t ?? TABS[0]).Panel
  }, [activeHash])

  const isMesasTab = activeHash === "#mesas"

  const saving =
    saveState === "savingTables"
      ? "Guardando mesas…"
      : saveState === "savingTasks"
        ? "Guardando tareas…"
        : null

  /** @param {typeof TABS[number]} tab */
  const go = (tab) => {
    window.location.hash = tab.hash.slice(1)
  }

  return (
    <main className="dashboard-print-root relative flex min-h-0 w-full flex-1 flex-col overflow-y-auto bg-cream pb-12 font-[Arial,Helvetica,sans-serif] antialiased">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[linear-gradient(to_bottom,#EFEBE8_0%,#f8f4ef_55%,#EFEBE8_100%)]" />

      <header className="no-print relative border-b border-wine/25 bg-white/92 px-4 py-4 backdrop-blur-md md:px-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-serif text-xl leading-snug text-wine-dark sm:text-2xl md:text-3xl">
              Lis & Juanjo - Gestor de invitaciones
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {saving ? (
              <span className="text-xs font-semibold uppercase tracking-wide text-wine/70">
                {saving}
              </span>
            ) : null}
            <Link
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg bg-wine px-4 py-2.5 text-sm font-semibold text-cream hover:bg-wine-dark sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs"
              to="/"
            >
              Ver invitación pública
            </Link>
            <Link
              className="inline-flex min-h-[44px] items-center justify-center rounded-lg border border-wine px-4 py-2.5 text-sm font-semibold text-wine transition hover:bg-wine hover:text-cream sm:min-h-0 sm:px-3 sm:py-2 sm:text-xs"
              to="/creador"
            >
              Avanzado
            </Link>
          </div>
        </div>
      </header>

      <nav
        className="no-print relative border-b border-wine/20 bg-cream/95 px-2 py-3 backdrop-blur-sm md:px-6"
        aria-label="Secciones del panel"
      >
        <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const on = tab.hash === activeHash
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => go(tab)}
                className={`whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                  on
                    ? "bg-wine text-cream shadow-sm"
                    : "border border-sand bg-white/80 text-wine hover:border-wine/50"
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </nav>

      <div
        className={`mx-auto mt-6 w-full flex-1 pb-8 md:mt-8 ${
          isMesasTab
            ? "flex min-h-0 max-w-none flex-1 flex-col px-3 sm:px-4 md:px-6"
            : "max-w-6xl px-4 md:px-8"
        }`}
      >
        <Panel />
      </div>
    </main>
  )
}
