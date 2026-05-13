import { useMemo, useState } from "react"
import { downloadCsv, toCsv } from "../../utils/csv"
import FadeInSection from "../shared/FadeInSection"
import { useDashboard } from "./DashboardProvider"
import EditGuestModal from "./EditGuestModal"

const LABEL = {
  carne: "Carne",
  pescado: "Pescado",
  vegetariano: "Vegetariano",
  infantil: "Menú infantil",
  "": "Sin especificar",
}

function mLabel(menu) {
  return LABEL[/** @type {keyof typeof LABEL} */ (menu)] ?? menu ?? "Sin especificar"
}

/** Mesa en catering: titular solo si tiene plaza en el plano; +1 según su mesa explícita o la del titular si comparten. */
function tableIdForParty(g, /** @type {"titular" | "plusOne"} */ party) {
  if (party === "titular") {
    const t = g.tableId
    if (!t || t === "") return null
    if (typeof g.seatIndex !== "number") return null
    return t
  }
  if (!g.plusOne) return null
  if (typeof g.plusOneSeatIndex !== "number") return null
  const t =
    g.plusOneTableId != null && g.plusOneTableId !== "" ? g.plusOneTableId : g.tableId
  return t && t !== "" ? t : null
}

const btnEdit =
  "shrink-0 rounded border border-wine/30 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-wine hover:bg-wine hover:text-cream"

/** Una línea; «Más» muestra el texto completo en la celda. */
function AlergiaCell({ row, expanded, onToggle }) {
  const text = row.alergias?.trim() || ""
  if (!text) {
    return <span className="text-wine/45">—</span>
  }
  const needsToggle = text.length > 52 || text.includes("\n")
  return (
    <div className="min-w-0 max-w-[13rem]">
      <p
        className={`text-xs leading-snug text-neutral-700 ${
          expanded || !needsToggle ? "break-words" : "truncate"
        }`}
      >
        {text}
      </p>
      {needsToggle ? (
        <button
          type="button"
          className="mt-1 text-[10px] font-bold uppercase tracking-wide text-wine underline decoration-wine/40 underline-offset-2 hover:text-wine-dark"
          onClick={onToggle}
        >
          {expanded ? "Menos" : "Más"}
        </button>
      ) : null}
    </div>
  )
}

export default function DashboardCatering() {
  const { invitations, stats, tables, patchInvitation } = useDashboard()
  const mc = stats.menuCounts
  const [editGuest, setEditGuest] = useState(/** @type {null | import("../../hooks/useInvitations").Invitation} */ (null))
  const [alergiaExpanded, setAlergiaExpanded] = useState(
    /** @type {Record<string, boolean>} */ ({}),
  )

  const alergiaRowKey = (row) => `${row.invitationId}-${row.party}`

  const toggleAlergia = (key) => {
    setAlergiaExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  const mesaNombre = /** @type {(tid: string | null)=>string } */ ((tid) => {
    if (!tid) return ""
    const t = tables.find((x) => x.id === tid)
    return t ? t.name : tid
  })

  /** @type {{ invitationId: string, party: "titular" | "plusOne", nombre: string, rol: string, menu: string, alergias: string, mesa: string, tableId: string | null }[]} */
  const filasConfirmados = useMemo(() => {
    const out = []
    for (const g of invitations) {
      if (g.status !== "confirmed") continue
      const tidT = tableIdForParty(g, "titular")
      out.push({
        invitationId: g.id,
        party: "titular",
        nombre: g.name,
        rol: "titular",
        menu: g.menu ? mLabel(g.menu) : "Sin especificar",
        alergias: g.dietary?.trim() || "",
        mesa: tidT ? mesaNombre(tidT) : "Sin especificar",
        tableId: tidT,
      })
      if (g.plusOne) {
        const tidP = tableIdForParty(g, "plusOne")
        const nombrePlus =
          g.plusOneName?.trim() || `${g.name} (+1)`
        out.push({
          invitationId: g.id,
          party: "plusOne",
          nombre: nombrePlus,
          rol: "acompañante",
          menu: g.plusOneMenu ? mLabel(g.plusOneMenu) : "Sin especificar",
          alergias: g.dietary?.trim() || "",
          mesa: tidP ? mesaNombre(tidP) : "Sin especificar",
          tableId: tidP,
        })
      }
    }
    out.sort((a, b) => a.nombre.localeCompare(b.nombre, "es"))
    return out
  }, [invitations, tables])

  const groupedByMesa = useMemo(() => {
    const byKey = new Map()
    for (const r of filasConfirmados) {
      const key = r.tableId ?? "__sin_mesa__"
      if (!byKey.has(key)) {
        const tableName =
          key === "__sin_mesa__"
            ? "Mesa sin especificar"
            : mesaNombre(key) || r.mesa || "Mesa"
        byKey.set(key, {
          tableKey: key,
          tableId: r.tableId,
          tableName,
          rows: /** @type {typeof filasConfirmados} */ ([]),
        })
      }
      byKey.get(key).rows.push(r)
    }
    const orderIdx = new Map(tables.map((t, i) => [t.id, i]))
    const blocks = [...byKey.values()]
    blocks.sort((a, b) => {
      if (a.tableKey === "__sin_mesa__") return 1
      if (b.tableKey === "__sin_mesa__") return -1
      const ia = a.tableId ? orderIdx.get(a.tableId) ?? 9999 : 9999
      const ib = b.tableId ? orderIdx.get(b.tableId) ?? 9999 : 9999
      if (ia !== ib) return ia - ib
      return (a.tableName || "").localeCompare(b.tableName || "", "es")
    })
    for (const b of blocks) {
      b.rows.sort((x, y) => x.nombre.localeCompare(y.nombre, "es"))
    }
    return blocks
  }, [filasConfirmados, tables])

  const plainTextLines = () => {
    let s = ""
    s += "--- Conteo ---\r\n"
    s += `Carne: ${mc.carne}\r\n`
    s += `Pescado: ${mc.pescado}\r\n`
    s += `Vegetariano: ${mc.vegetariano}\r\n`
    s += `Infantil: ${mc.infantil}\r\n`
    s += `Sin especificar / vacío: ${mc.empty}\r\n\r\n`
    s += "--- Por mesas (confirmados) ---\r\n"
    for (const blk of groupedByMesa) {
      s += `\r\n[${blk.tableName}] — ${blk.rows.length} pax\r\n`
      for (const r of blk.rows) {
        const al = r.alergias ? ` · Alergia: ${r.alergias}` : ""
        s += `  · ${r.nombre} (${r.rol}) · ${r.menu}${al}\r\n`
      }
    }
    return s.trim()
  }

  const exportCateringCsv = () => {
    const headers = ["Nombre", "Rol", "Menú", "Alergias_observaciones", "Mesa"]
    const rows = filasConfirmados.map((r) => [
      r.nombre,
      r.rol,
      r.menu,
      r.alergias,
      r.mesa,
    ])
    downloadCsv("catering-boda-excel.csv", toCsv(headers, rows))
  }

  const openEdit = (invitationId) => {
    const inv = invitations.find((i) => i.id === invitationId)
    if (inv) setEditGuest(inv)
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {(["carne", "pescado", "vegetariano", "infantil", "empty"]).map((k) => (
          <FadeInSection
            key={k}
            className="rounded-xl border border-wine/40 bg-white/90 px-4 py-4 shadow-sm"
            delay="0ms"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-wine/80">
              {k === "empty" ? "Sin especificar" : LABEL[/** @type {any} */ (k)]}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-wine-dark">
              {mc[/** @type {any} */ (k)]}
            </p>
          </FadeInSection>
        ))}
      </div>

      <FadeInSection className="rounded-xl border border-wine/40 bg-white/80 p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xl font-semibold text-wine-dark">
            Lista de detalle (solo confirmados)
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg border border-wine bg-wine px-4 py-2 text-sm font-semibold text-cream hover:bg-wine-dark"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(plainTextLines())
                  alert("Copiado al portapapeles")
                } catch {
                  alert("No se pudo copiar; prueba con Descargar Excel")
                }
              }}
            >
              Copiar texto catering
            </button>
            <button
              type="button"
              title="CSV listo para abrir en Microsoft Excel"
              className="rounded-lg border border-sand bg-white px-4 py-2 text-sm font-semibold text-wine hover:bg-cream"
              onClick={exportCateringCsv}
            >
              Descargar Excel
            </button>
          </div>
        </div>

        <div className="mt-4">
          {groupedByMesa.length === 0 ? (
            <p className="rounded-lg border border-dashed border-wine/25 bg-cream/30 px-4 py-6 text-center text-sm text-wine/65">
              No hay invitados confirmados todavía.
            </p>
          ) : (
            <div className="hide-scrollbar max-h-[min(70vh,560px)] overflow-x-auto overflow-y-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm">
                <thead className="sticky top-0 z-10 bg-cream/95 text-[10px] uppercase tracking-wide text-wine backdrop-blur-sm">
                  <tr>
                    <th className="border-b border-wine/20 px-2 py-1.5">Nombre</th>
                    <th className="border-b border-wine/20 px-2 py-1.5">Rol</th>
                    <th className="border-b border-wine/20 px-2 py-1.5">Menú</th>
                    <th className="border-b border-wine/20 px-2 py-1.5">Alergias</th>
                    <th className="border-b border-wine/20 px-2 py-1.5">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedByMesa.flatMap((blk) => [
                    <tr key={`mesa-${blk.tableKey}`} className="bg-neutral-200/95">
                      <td
                        colSpan={5}
                        className="border-b border-neutral-300 px-2 py-1.5 text-xs font-bold tracking-wide text-neutral-800"
                      >
                        <span className="uppercase">{blk.tableName}</span>
                        <span className="ml-2 tabular-nums font-semibold text-neutral-600">
                          {blk.rows.length} pax
                        </span>
                      </td>
                    </tr>,
                    ...blk.rows.map((row) => (
                      <tr
                        key={`${row.invitationId}-${row.party}`}
                        className="border-b border-sand/50 hover:bg-cream/50"
                      >
                        <td className="max-w-[14rem] px-2 py-1.5 align-middle font-semibold text-wine-dark">
                          <span className="line-clamp-2">{row.nombre}</span>
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 align-middle text-[11px] uppercase text-wine/60">
                          {row.rol}
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 align-middle text-wine">
                          {row.menu}
                        </td>
                        <td className="px-2 py-1.5 align-top">
                          <AlergiaCell
                            row={row}
                            expanded={Boolean(alergiaExpanded[alergiaRowKey(row)])}
                            onToggle={() => toggleAlergia(alergiaRowKey(row))}
                          />
                        </td>
                        <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                          <button
                            type="button"
                            className={btnEdit}
                            onClick={() => openEdit(row.invitationId)}
                          >
                            Editar
                          </button>
                        </td>
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </FadeInSection>

      <EditGuestModal
        tables={tables}
        guest={editGuest}
        open={Boolean(editGuest)}
        onClose={() => setEditGuest(null)}
        onSave={(patch) => {
          if (editGuest?.id) patchInvitation(editGuest.id, patch)
        }}
      />
    </div>
  )
}
