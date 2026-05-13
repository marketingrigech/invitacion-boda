import { useMemo } from "react"
import { downloadCsv, toCsv } from "../../utils/csv"
import FadeInSection from "../shared/FadeInSection"
import { useDashboard } from "./DashboardProvider"

const MENU_LABEL = {
  carne: "Carne",
  pescado: "Pescado",
  vegetariano: "Vegetariano",
  infantil: "Menú infantil",
  "": "Sin especificar",
}

function mLabel(menu) {
  return MENU_LABEL[/** @type {keyof typeof MENU_LABEL} */ (menu)] ?? "Sin especificar"
}

export default function DashboardExports() {
  const { invitations, tables, tasks, analytics, kvTotals } = useDashboard()

  const mesaNombre = /** @type {(tid: string | null)=>string } */ ((tid) => {
    if (!tid) return ""
    const t = tables.find((x) => x.id === tid)
    return t ? t.name : tid
  })

  const filasCatering = useMemo(() => {
    /** @type {Array<{ nombre: string; rol: string; menu: string; alergias: string; mesa: string }>} */
    const out = []
    for (const g of invitations) {
      if (g.status !== "confirmed") continue
      out.push({
        nombre: g.name,
        rol: "titular",
        menu: g.menu ? mLabel(g.menu) : "Sin especificar",
        alergias: g.dietary?.trim() || "",
        mesa: mesaNombre(g.tableId),
      })
      if (g.plusOne) {
        out.push({
          nombre: `${g.name} (+1)`,
          rol: "acompañante",
          menu: g.plusOneMenu ? mLabel(g.plusOneMenu) : "Sin especificar",
          alergias: g.dietary?.trim() || "",
          mesa: mesaNombre(g.tableId),
        })
      }
    }
    out.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    return out
  }, [invitations, tables])

  const exportFull = () => {
    const headers = [
      "Nombre",
      "Slug",
      "Estado",
      "PlusOne",
      "PlusOne_nombre",
      "Menu_titular",
      "Menu_plus1",
      "Alergias",
      "Email",
      "Telefono",
      "RSVP_recibido",
      "RSVP_fecha",
      "Mesa",
      "Mesa_id",
      "Creado",
    ]
    const rows = invitations.map((g) => [
      g.name,
      g.slug,
      g.status,
      g.plusOne ? "si" : "no",
      g.plusOneName || "",
      g.menu,
      g.plusOneMenu,
      g.dietary,
      g.email,
      g.phone,
      g.rsvpReceived ? "si" : "no",
      g.rsvpAt,
      mesaNombre(g.tableId),
      g.tableId ?? "",
      g.createdAt,
    ])
    downloadCsv("invitados-completo-boda.csv", toCsv(headers, rows))
  }

  const exportCateringCsv = () => {
    const headers = ["Nombre", "Rol", "Menú", "Alergias_observaciones", "Mesa"]
    const rows = filasCatering.map((r) => [
      r.nombre,
      r.rol,
      r.menu,
      r.alergias,
      r.mesa,
    ])
    downloadCsv("catering-boda-export.csv", toCsv(headers, rows))
  }

  const exportMesasCsv = () => {
    const headers = ["Mesa", "Capacidad", "Asignados_nombres", "Cuenta_asignados"]
    const confirmed = invitations.filter((i) => i.status === "confirmed")
    const rows = tables.map((tbl) => {
      const g = confirmed.filter((x) => x.tableId === tbl.id)
      return [
        tbl.name,
        String(tbl.capacity),
        g.map((x) => x.name).join(" | "),
        String(g.length),
      ]
    })
    downloadCsv("mesas-boda-export.csv", toCsv(headers, rows))
  }

  const exportJsonBackup = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      invitations,
      tables,
      tasks,
      analyticsSnapshot: analytics,
      kvTotals,
    }
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `backup-boda-${new Date().toISOString().slice(0, 10)}.json`
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const printMesas = () => {
    window.location.hash = "mesas"
    window.setTimeout(() => window.print(), 250)
  }

  const cards = [
    {
      title: "CSV invitados (completo)",
      desc: "Todos los campos CRM: menús, RSVP, mesa, contacto.",
      action: exportFull,
    },
    {
      title: "CSV catering",
      desc: "Filas titular/+1 solo confirmados.",
      action: exportCateringCsv,
    },
    {
      title: "CSV mesas",
      desc: "Capacidad y nombres asignados.",
      action: exportMesasCsv,
    },
    {
      title: "JSON backup",
      desc: "Invitados + mesas + tareas + snapshot analytics.",
      action: exportJsonBackup,
    },
  ]

  return (
    <div className="space-y-6">
      <FadeInSection className="rounded-xl border border-wine/40 bg-white/85 p-5 shadow-sm">
        <p className="text-xl font-semibold text-wine-dark">Exportaciones</p>
        <p className="mt-2 text-sm text-wine/75">
          Separador punto y coma, UTF-8 con BOM para abrir bien en Excel.
        </p>
        <button
          type="button"
          className="no-print mt-4 rounded-lg border border-wine px-4 py-2 text-sm font-semibold text-wine hover:bg-wine hover:text-cream"
          onClick={printMesas}
        >
          Ir a Mesas e imprimir
        </button>
      </FadeInSection>

      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c, i) => (
          <FadeInSection key={c.title} delay={`${i * 50}ms`}>
            <div className="flex h-full flex-col rounded-xl border border-wine/35 bg-white/90 p-4 shadow-sm">
              <p className="text-lg font-semibold text-wine-dark">{c.title}</p>
              <p className="mt-2 flex-1 text-sm text-wine/75">{c.desc}</p>
              <button
                type="button"
                className="no-print mt-4 rounded-lg bg-wine px-4 py-2 text-sm font-semibold text-cream hover:bg-wine-dark"
                onClick={c.action}
              >
                Descargar
              </button>
            </div>
          </FadeInSection>
        ))}
      </div>
    </div>
  )
}
