import { useEffect, useMemo, useState } from "react"
import { formatTimeAgo } from "../../utils/formatTimeAgo"
import { fullInviteUrl, openWhatsAppInviteForGuest } from "../../utils/whatsapp"
import { useDashboard } from "./DashboardProvider"
import EditGuestModal from "./EditGuestModal"
import QrModal from "./QrModal"
import RsvpDetailsModal from "./RsvpDetailsModal"

function statusLabel(status) {
  switch (status) {
    case "sent":
      return "Enviado"
    case "confirmed":
      return "Confirmado"
    case "declined":
      return "No asiste"
    default:
      return "Pendiente"
  }
}

function statusPillClass(status) {
  switch (status) {
    case "sent":
      return "bg-sky-100 text-sky-900 border-sky-700/40"
    case "confirmed":
      return "bg-emerald-100 text-emerald-900 border-emerald-700/40"
    case "declined":
      return "bg-red-100 text-red-900 border-red-700/40"
    default:
      return "bg-amber-100 text-amber-900 border-amber-700/40"
  }
}

function InviteFormMini({ onSubmit, formError, formKey }) {
  const [first, setFirst] = useState("")
  const [last, setLast] = useState("")
  const [plusOne, setPlusOne] = useState(false)
  useEffect(() => {
    setFirst("")
    setLast("")
    setPlusOne(false)
  }, [formKey])

  /** @type {React.FormEventHandler} */
  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ first, last, plusOne })
  }
  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-wine/40 bg-white/80 p-4 shadow-sm"
    >
      <h3 className="text-lg font-semibold text-wine-dark">Crear invitación</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Nombre(s)
          <input
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-wine focus:outline-none"
            placeholder="Ana María"
          />
        </label>
        <label className="block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Apellido(s)
          <input
            value={last}
            onChange={(e) => setLast(e.target.value)}
            className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-wine focus:outline-none"
            placeholder="García"
          />
        </label>
      </div>
      <label className="mt-2 flex cursor-pointer items-center gap-2 text-xs text-wine-dark">
        <input type="checkbox" checked={plusOne} onChange={(e) => setPlusOne(e.target.checked)} />
        URL con +1 para acompañante
      </label>
      {formError ? <p className="mt-2 text-sm text-red-800">{formError}</p> : null}
      <button
        type="submit"
        className="mt-3 rounded-lg bg-wine px-4 py-2 text-sm font-semibold text-cream hover:bg-wine-dark"
      >
        Generar
      </button>
    </form>
  )
}

const btnTiny =
  "rounded px-2 py-1 text-[10px] font-semibold uppercase tracking-wide border border-wine/30 text-wine hover:bg-wine hover:text-cream transition"

function useFlashCopied(durationMs = 2000) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), durationMs)
    return () => window.clearTimeout(t)
  }, [copied, durationMs])
  return [copied, setCopied]
}

function Activity({ row, kv }) {
  const views = Number(kv?.views) || 0
  const clicks = Number(kv?.clicks) || 0
  const confirms = Number(kv?.confirms) || 0
  const sawNoConfirm =
    views > 0 && row.status !== "confirmed" && row.status !== "declined"
  const last = kv?.last_view ? formatTimeAgo(kv.last_view) : null
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0 text-[11px] tabular-nums leading-tight text-wine-dark">
      <span
        className={`whitespace-nowrap ${views > 0 ? "font-medium text-sky-900" : "text-wine/35"}`}
        title="Vistas"
      >
        👁 {views}
        {last ? ` · ${last}` : ""}
      </span>
      <span className="text-wine/25 select-none" aria-hidden>
        ·
      </span>
      <span
        className={`whitespace-nowrap ${clicks > 0 ? "text-violet-900" : "text-wine/35"}`}
        title="Clics"
      >
        👆 {clicks}
      </span>
      <span className="text-wine/25 select-none" aria-hidden>
        ·
      </span>
      <span
        className={`whitespace-nowrap ${confirms > 0 ? "font-medium text-rose-800" : "text-wine/35"}`}
        title="Confirmó enlace"
      >
        ❤ {confirms}
      </span>
      {sawNoConfirm ? (
        <span
          className="inline-flex shrink-0 rounded bg-amber-100 px-1 py-0 text-[9px] font-bold uppercase text-amber-950"
          title="Vio la invitación sin confirmar aún"
        >
          vio
        </span>
      ) : null}
    </div>
  )
}

/** Icono enlace: copia la URL al portapapeles y muestra «Enlace copiado». */
function CopyInviteLinkButton({ row, className = "" }) {
  const [copied, setCopied] = useFlashCopied()
  return (
    <div className={`flex flex-col items-center gap-0.5 ${className}`}>
      <button
        type="button"
        className="inline-flex shrink-0 items-center justify-center rounded-md border border-wine/25 bg-white/80 p-1 text-wine/80 hover:border-wine/50 hover:bg-cream hover:text-wine-dark"
        title="Copiar enlace"
        aria-label={`Copiar enlace de invitación de ${row.name}`}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(fullInviteUrl(row.slug, row.plusOne))
            setCopied(true)
          } catch {
            /* ignore */
          }
        }}
      >
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
        </svg>
      </button>
      {copied ? (
        <span className="max-w-[6rem] text-center text-[9px] font-semibold leading-tight text-emerald-800" role="status">
          Enlace copiado
        </span>
      ) : null}
    </div>
  )
}

export default function DashboardGuests() {
  const {
    invitations,
    analytics,
    cycleStatus,
    togglePlusOne,
    removeInvitation,
    addInvitation,
    updateStatus,
    patchInvitation,
    tables,
    syncReady,
  } = useDashboard()

  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [formError, setFormError] = useState("")
  const [formKey, setFormKey] = useState(0)
  const [addOpen, setAddOpen] = useState(false)
  const [qr, setQr] = useState({ open: false, url: "", title: "" })
  const [rsvpGuest, setRsvpGuest] = useState(/** @type {null | any} */ (null))
  const [editGuest, setEditGuest] = useState(/** @type {null | any} */ (null))

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return invitations.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false
      if (!q) return true
      return r.name.toLowerCase().includes(q) || r.slug.toLowerCase().includes(q)
    })
  }, [invitations, filter, search])

  const onWa = (row) => {
    openWhatsAppInviteForGuest(row)
    if (row.status === "pending") updateStatus(row.id, "sent")
  }

  const submitCreate = ({ first, last, plusOne }) => {
    setFormError("")
    const res = addInvitation(first, last, plusOne)
    if (!res.ok) setFormError(res.error)
    else {
      setFormKey((k) => k + 1)
      setAddOpen(false)
    }
  }

  return (
    <div className="space-y-6">
      {!syncReady ? (
        <div className="rounded-lg border border-wine/30 bg-white px-3 py-2 text-sm">
          Sincronizando…
        </div>
      ) : null}

      <div className="rounded-xl border border-wine/40 bg-white/80 shadow-sm backdrop-blur-sm">
        <div className="flex flex-col gap-3 border-b border-wine/20 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-wine-dark">Invitados</h2>
            <button
              type="button"
              className="inline-flex h-10 min-w-[2.5rem] items-center justify-center rounded-lg border-2 border-dashed border-wine/35 bg-cream/50 px-3 text-lg font-light leading-none text-wine-dark hover:border-wine/60 hover:bg-cream"
              title="Añadir invitación"
              aria-expanded={addOpen}
              aria-label="Añadir invitación"
              onClick={() => setAddOpen((o) => !o)}
            >
              +
            </button>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="search"
              value={search}
              placeholder="Buscar…"
              onChange={(e) => setSearch(e.target.value)}
              className="min-h-[44px] w-full rounded-lg border border-sand px-3 text-sm focus:border-wine focus:outline-none sm:max-w-xs"
            />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="min-h-[44px] rounded-lg border border-sand bg-white px-3 text-sm"
            >
              <option value="all">Todos</option>
              <option value="pending">Pendiente</option>
              <option value="sent">Enviado</option>
              <option value="confirmed">Confirmados</option>
              <option value="declined">No asisten</option>
            </select>
          </div>
        </div>

        {addOpen ? (
          <div className="border-b border-wine/15 p-4">
            <InviteFormMini formKey={formKey} formError={formError} onSubmit={submitCreate} />
          </div>
        ) : null}

        <div className="hide-scrollbar max-h-[min(70vh,560px)] overflow-x-auto overflow-y-auto">
          <table className="w-full min-w-[600px] border-collapse text-left text-sm">
            <thead className="sticky top-0 z-10 bg-cream/95 text-[10px] uppercase tracking-wide text-wine backdrop-blur-sm">
              <tr>
                <th className="border-b border-wine/20 px-2 py-1.5">Invitado</th>
                <th className="border-b border-wine/20 px-2 py-1.5 text-center whitespace-nowrap w-24">
                  Enlace
                </th>
                <th className="border-b border-wine/20 px-2 py-1.5">Estado</th>
                <th className="border-b border-wine/20 px-2 py-1.5 text-center">+1</th>
                <th className="border-b border-wine/20 px-2 py-1.5">Actividad</th>
                <th className="border-b border-wine/20 px-2 py-1.5">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const kv = analytics[row.slug] ?? {}
                return (
                  <tr key={row.id} className="border-b border-sand/50 hover:bg-cream/50">
                    <td className="max-w-[10rem] px-2 py-1.5 align-middle sm:max-w-[14rem]">
                      <span className="min-w-0 truncate font-medium text-wine-dark">{row.name}</span>
                    </td>
                    <td className="px-2 py-1.5 align-middle text-center">
                      <CopyInviteLinkButton row={row} />
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 align-middle">
                      <button
                        type="button"
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${statusPillClass(row.status)}`}
                        onClick={() => cycleStatus(row.id)}
                      >
                        {statusLabel(row.status)}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 align-middle text-center">
                      <button
                        type="button"
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${row.plusOne ? "bg-wine text-cream" : "bg-sand/60 text-wine-dark"}`}
                        title={row.plusOne ? "Quitar URL con +1" : "Activar invitación con +1"}
                        onClick={() => togglePlusOne(row.id)}
                      >
                        {row.plusOne ? "Sí" : "No"}
                      </button>
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <Activity row={row} kv={kv} />
                    </td>
                    <td className="px-2 py-1.5 align-middle">
                      <div className="flex flex-wrap items-center gap-1">
                        <button type="button" className={btnTiny} title="WhatsApp" onClick={() => onWa(row)}>
                          WA
                        </button>
                        <button
                          type="button"
                          className={btnTiny}
                          title="Código QR"
                          onClick={() =>
                            setQr({
                              open: true,
                              url: fullInviteUrl(row.slug, row.plusOne),
                              title: row.name,
                            })
                          }
                        >
                          QR
                        </button>
                        {row.rsvpReceived ? (
                          <button type="button" className={btnTiny} onClick={() => setRsvpGuest(row)}>
                            RSVP
                          </button>
                        ) : null}
                        <button type="button" className={btnTiny} onClick={() => setEditGuest(row)}>
                          Editar
                        </button>
                        <button
                          type="button"
                          className={`${btnTiny} border-red-800/25 text-red-800/90`}
                          onClick={() => removeInvitation(row.id)}
                        >
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 ? (
          <p className="px-6 py-8 text-center text-sm text-wine/70">Nadie coincide con esta búsqueda.</p>
        ) : null}
      </div>

      <QrModal open={qr.open} url={qr.url} title={qr.title} onClose={() => setQr({ ...qr, open: false })} />

      <RsvpDetailsModal guest={rsvpGuest} open={Boolean(rsvpGuest)} onClose={() => setRsvpGuest(null)} />

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
