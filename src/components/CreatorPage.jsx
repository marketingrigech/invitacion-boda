import { useEffect, useMemo, useState } from "react"
import confetti from "canvas-confetti"
import { Link } from "react-router-dom"
import { useInvitations } from "../hooks/useInvitations"
import { fullInviteUrl } from "../utils/whatsapp"

/** Misma celebración que en la invitación pública (lateral inferior, dorado). */
function fireGoldConfettiBurst() {
  const duration = 2000
  const end = Date.now() + duration
  const goldColors = ["#D4AF37", "#FFDF00", "#DAA520", "#B8860B", "#F3E5AB"]
  const frame = () => {
    try {
      confetti({
        particleCount: 8,
        angle: 60,
        spread: 80,
        origin: { x: -0.1, y: 0.85 },
        startVelocity: 65,
        colors: goldColors,
        ticks: 200,
        zIndex: 100,
      })
      confetti({
        particleCount: 8,
        angle: 120,
        spread: 80,
        origin: { x: 1.1, y: 0.85 },
        startVelocity: 65,
        colors: goldColors,
        ticks: 200,
        zIndex: 100,
      })
    } catch {
      /* canvas-confetti u optimizadores del navegador */
    }
    if (Date.now() < end) requestAnimationFrame(frame)
  }
  frame()
}

/** Texto relativo en español para ISO timestamps de KV */
function formatTimeAgo(iso) {
  if (!iso || typeof iso !== "string") return ""
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  let d = Date.now() - t
  if (d < 0) d = 0
  const m = Math.floor(d / 60000)
  if (m < 1) return "hace un momento"
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const days = Math.floor(h / 24)
  return `hace ${days} día${days !== 1 ? "s" : ""}`
}

function IconEye({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s4-6 10-6 10 6 10 6-4 6-10 6S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function IconCursor({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4l7 18 3-7 7-3z" />
    </svg>
  )
}

function IconHeart({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  )
}

function IconPaperclip({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
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
  )
}

/** Tras copiar al portapapeles, activa el mensaje «Enlace copiado» unos segundos. */
function useFlashCopied(durationMs = 2000) {
  const [copied, setCopied] = useState(false)
  useEffect(() => {
    if (!copied) return
    const t = window.setTimeout(() => setCopied(false), durationMs)
    return () => window.clearTimeout(t)
  }, [copied, durationMs])
  return [copied, setCopied]
}

function IconTrash({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6" />
    </svg>
  )
}

function IconEnvelope({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M4 4h16v16H4z" />
      <path d="M4 8l8 5 8-5" />
    </svg>
  )
}

function IconCheck({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

/** Pipeline: no asiste / declinado */
function IconDeclined({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M15 9l-6 6M9 9l6 6" />
    </svg>
  )
}

function DashboardStats({ stats, kvTotals = { totalViews: 0, totalOpens: 0, totalClicks: 0, totalConfirms: 0 } }) {
  const total = stats.total || 0
  const pct = (n) => (total > 0 ? Math.round((n / total) * 100) : 0)
  const funnelSteps = [
    { label: "Creados", count: stats.total, hint: "100% base" },
    { label: "Enviados", count: stats.enviados, hint: "Enlace enviado (CRM)" },
    { label: "Pre-conf.", count: stats.preconfirmed ?? 0, hint: "Invitado envió RSVP" },
    { label: "Confirmados", count: stats.confirmed, hint: "Novios validaron" },
    { label: "No asisten", count: stats.declined, hint: "Declinado" },
  ]

  /** Números grandes del panel: Arial para legibilidad */
  const nLg =
    "font-[Arial,Helvetica,sans-serif] text-2xl font-semibold tabular-nums leading-none sm:text-3xl"
  const nFunnel = "font-[Arial,Helvetica,sans-serif] text-lg font-semibold tabular-nums leading-none text-wine-dark"

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <p className={`${nLg} text-wine-dark`}>{stats.total}</p>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Total
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <p className={`${nLg} text-amber-800`}>{stats.pending}</p>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Sin enviar
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <p className={`${nLg} text-violet-900`}>{stats.sent}</p>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Enviado
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <p className={`${nLg} text-sky-800`}>{stats.preconfirmed ?? 0}</p>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Pre-confirmación
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <p className={`${nLg} text-emerald-800`}>{stats.confirmed}</p>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Confirmados
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm col-span-2 sm:col-span-1 lg:col-span-1">
          <p className={`${nLg} text-red-800`}>{stats.declined}</p>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            No asisten
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-3">
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <IconEye className="h-4 w-4 text-sky-700 shrink-0" />
            <p className={`${nLg} text-sky-900`}>{kvTotals.totalViews}</p>
          </div>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Vistas (tiempo real)
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <IconCursor className="h-4 w-4 text-violet-700 shrink-0" />
            <p className={`${nLg} text-violet-900`}>{kvTotals.totalClicks}</p>
          </div>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Clicks totales
          </p>
        </div>
        <div className="rounded-lg border border-wine bg-cream px-3 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <IconHeart className="h-4 w-4 text-rose-500 shrink-0" />
            <p className={`${nLg} text-rose-800`}>{kvTotals.totalConfirms}</p>
          </div>
          <p className="mt-1 text-xs font-sans uppercase tracking-wide text-wine/80">
            Botón confirmar
          </p>
        </div>
      </div>

      <div>
        <p className="mb-2 text-[10px] font-sans font-semibold uppercase leading-snug tracking-wide text-wine-dark sm:text-xs">
          Embudo (cada barra = % sobre invitaciones creadas)
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {funnelSteps.map((s) => (
            <div key={s.label} className="rounded-lg border border-wine/25 bg-white/70 px-2 py-2">
              <div className="flex h-24 items-end justify-center gap-1 rounded-md bg-cream/80 px-1 pt-1">
                <div
                  className="w-full max-w-[2.5rem] rounded-t bg-gradient-to-t from-sand to-wine transition-all"
                  style={{ height: `${Math.max(8, pct(s.count))}%` }}
                  title={`${s.label}: ${s.count}`}
                />
              </div>
              <p className={`mt-2 text-center ${nFunnel}`}>{s.count}</p>
              <p className="text-center text-[10px] font-sans font-semibold uppercase tracking-wide text-wine/80">
                {s.label}
              </p>
              <p className="text-center font-[Arial,Helvetica,sans-serif] text-[10px] tabular-nums text-wine/60">
                {pct(s.count)}%
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function InviteForm({ onSubmit, formError, formKey }) {
  const [first, setFirst] = useState("")
  const [last, setLast] = useState("")
  const [plusOne, setPlusOne] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit({ first, last, plusOne })
  }

  useEffect(() => {
    setFirst("")
    setLast("")
    setPlusOne(false)
  }, [formKey])

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-wine/40 bg-white/80 p-3 shadow-sm backdrop-blur-sm sm:p-4"
    >
      <h2 className="font-serif text-xl text-wine-dark">Crear invitación</h2>
      <p className="mt-1 text-sm text-wine/90">
        Genera el enlace con el formato correcto: nombre(s) y apellido(s) por separado.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm font-medium text-wine-dark">
          Nombre(s)
          <input
            type="text"
            value={first}
            onChange={(e) => setFirst(e.target.value)}
            className="mt-1 w-full rounded-lg border border-sand px-3 py-2 font-sans text-wine-dark placeholder:text-wine/40 focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine"
            placeholder="Matheo Josué"
            autoComplete="given-name"
          />
        </label>
        <label className="block text-sm font-medium text-wine-dark">
          Apellido(s)
          <input
            type="text"
            value={last}
            onChange={(e) => setLast(e.target.value)}
            className="mt-1 w-full rounded-lg border border-sand px-3 py-2 font-sans text-wine-dark placeholder:text-wine/40 focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine"
            placeholder="Santacruz Gómez"
            autoComplete="family-name"
          />
        </label>
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm text-wine-dark">
        <input
          type="checkbox"
          checked={plusOne}
          onChange={(e) => setPlusOne(e.target.checked)}
          className="h-4 w-4 rounded border-wine text-wine focus:ring-wine"
        />
        Incluir <code className="rounded bg-cream px-1">+1</code> en la URL (acompañante)
      </label>

      {formError ? (
        <p className="mt-3 text-sm font-medium text-red-800" role="alert">
          {formError}
        </p>
      ) : null}

      <button
        type="submit"
        className="mt-4 w-full min-h-[44px] rounded-lg bg-wine px-4 py-3 font-sans text-sm font-semibold text-cream shadow transition hover:bg-wine-dark sm:w-auto sm:py-2.5"
      >
        Generar enlace
      </button>
    </form>
  )
}

function InviteBanner({ invitation, onDismiss }) {
  const [visible, setVisible] = useState(true)
  const [linkCopied, setLinkCopied] = useFlashCopied()

  useEffect(() => {
    setLinkCopied(false)
  }, [invitation?.id, setLinkCopied])

  useEffect(() => {
    if (!invitation) return
    setVisible(true)
    let dismissTimer
    const fadeTimer = setTimeout(() => {
      setVisible(false)
      dismissTimer = setTimeout(() => onDismiss?.(), 400)
    }, 8000)
    return () => {
      clearTimeout(fadeTimer)
      if (dismissTimer) clearTimeout(dismissTimer)
    }
  }, [invitation, onDismiss])

  if (!invitation) return null

  const url = fullInviteUrl(invitation.slug, invitation.plusOne)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
    } catch {
      /* fallback silencioso */
    }
  }

  return (
    <div
      className={`overflow-hidden rounded-lg border-l-4 border-wine bg-cream/90 px-4 py-3 shadow-md transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
      role="status"
    >
      <p className="flex flex-wrap items-center gap-2 font-serif text-lg text-wine-dark">
        <span>
          Invitación creada para <strong>{invitation.name}</strong>
        </span>
        <span className="inline-flex flex-col items-start gap-0.5 sm:inline-flex">
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-wine/35 bg-white text-wine shadow-sm transition hover:border-wine/55 hover:bg-cream"
            title="Copiar enlace (boda-lis-juanjo.vercel.app)"
            aria-label="Copiar enlace de la invitación recién creada"
          >
            <IconPaperclip className="h-4 w-4" />
          </button>
          {linkCopied ? (
            <span className="text-xs font-semibold text-emerald-800" role="status">
              Enlace copiado
            </span>
          ) : null}
        </span>
      </p>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <code className="break-all rounded bg-white/80 px-2 py-1 text-xs text-wine-dark">
          {url}
        </code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-lg border border-wine bg-white px-3 py-1.5 text-xs font-semibold text-wine hover:bg-cream"
        >
          Copiar enlace
        </button>
      </div>
    </div>
  )
}

function statusLabel(status) {
  switch (status) {
    case "sent":
      return "Enviado"
    case "preconfirmed":
      return "Pre-confirmación"
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
      return "bg-violet-100 text-violet-900 border-violet-700/40"
    case "preconfirmed":
      return "bg-sky-200 text-sky-950 border-sky-700/50"
    case "confirmed":
      return "bg-emerald-100 text-emerald-900 border-emerald-700/40"
    case "declined":
      return "bg-red-100 text-red-900 border-red-700/40"
    default:
      return "bg-amber-100 text-amber-900 border-amber-700/40"
  }
}

function InviteRow({
  row,
  kvRow,
  onCycleStatus,
  onToggleLinkSent,
  onToggleConfirmedShortcut,
  onToggleDeclinedShortcut,
  onTogglePlusOne,
  onRemove,
}) {
  const [linkCopied, setLinkCopied] = useFlashCopied()
  const views = Number(kvRow?.views) || 0
  const clicks = Number(kvRow?.clicks) || 0
  const confirms = Number(kvRow?.confirms) || 0
  const lastView = kvRow?.last_view ? formatTimeAgo(kvRow.last_view) : null
  const lastClick = kvRow?.last_click ? formatTimeAgo(kvRow.last_click) : null
  const lastConfirm = kvRow?.last_confirm ? formatTimeAgo(kvRow.last_confirm) : null

  const copyPath = async () => {
    const url = fullInviteUrl(row.slug, row.plusOne)
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
    } catch {
      /* ignore */
    }
  }

  const pipelineBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-wine/40"
  const linkSentActive = ["sent", "preconfirmed", "confirmed", "declined"].includes(row.status)

  return (
    <tr className="border-b border-sand/60 hover:bg-cream/50">
      <td className="px-2 py-2 align-middle">
        <div className="min-w-0 max-w-[min(100%,24rem)]">
          <span className="font-sans text-sm font-medium text-wine-dark">{row.name}</span>
        </div>
      </td>
      <td className="px-2 py-2 align-middle text-center">
        <div className="flex min-w-[5.75rem] flex-col items-center gap-1">
          <button
            type="button"
            onClick={copyPath}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-wine/35 bg-white text-wine shadow-sm transition hover:border-wine/55 hover:bg-cream"
            title="Copiar enlace (boda-lis-juanjo.vercel.app)"
            aria-label={`Copiar enlace de invitación de ${row.name}`}
          >
            <IconPaperclip className="h-4 w-4" />
          </button>
          {linkCopied ? (
            <span className="text-[10px] font-semibold leading-tight text-emerald-800" role="status">
              Enlace copiado
            </span>
          ) : null}
        </div>
      </td>
      <td className="px-2 py-2 align-middle">
        <button
          type="button"
          onClick={() => onCycleStatus(row.id)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${statusPillClass(row.status)}`}
          title="Clic para avanzar: pendiente → enviado → pre-confirmación → confirmado → no asiste"
        >
          {statusLabel(row.status)}
        </button>
      </td>
      <td className="px-2 py-2 align-middle">
        <div className="flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => onToggleLinkSent(row.id)}
            className={`${pipelineBtn} ${
              linkSentActive ? "border-wine bg-wine/10 text-wine" : "border-sand text-wine/35"
            }`}
            title="Enlace enviado (pendiente ↔ enviado)"
            aria-pressed={linkSentActive}
          >
            <IconEnvelope className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleConfirmedShortcut(row.id)}
            className={`${pipelineBtn} ${
              row.status === "confirmed"
                ? "border-wine bg-wine/10 text-wine"
                : "border-sand text-wine/35"
            }`}
            title="Marcar confirmado / quitar confirmación"
            aria-pressed={row.status === "confirmed"}
          >
            <IconCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleDeclinedShortcut(row.id)}
            className={`${pipelineBtn} ${
              row.status === "declined"
                ? "border-red-700/50 bg-red-100 text-red-900"
                : "border-sand text-wine/35"
            }`}
            title="No asiste / quitar declinado"
            aria-pressed={row.status === "declined"}
          >
            <IconDeclined className="h-4 w-4" />
          </button>
        </div>
      </td>
      <td className="px-2 py-2 align-middle min-w-[120px]">
        <div className="flex flex-col gap-1">
          <div
            className={`flex items-center gap-1 text-[11px] leading-tight ${views > 0 ? "text-sky-800" : "text-wine/30"}`}
            title={lastView ? `Última vista: ${lastView}` : "Sin visitas aún"}
          >
            <IconEye className="h-3.5 w-3.5 shrink-0" />
            <span className={views > 0 ? "font-semibold" : ""}>{views}</span>
            {lastView && <span className="text-wine/50 text-[10px] ml-0.5">· {lastView}</span>}
          </div>
          <div
            className={`flex items-center gap-1 text-[11px] leading-tight ${clicks > 0 ? "text-violet-800" : "text-wine/30"}`}
            title={lastClick ? `Último click: ${lastClick}` : "Sin clicks aún"}
          >
            <IconCursor className="h-3.5 w-3.5 shrink-0" />
            <span className={clicks > 0 ? "font-semibold" : ""}>{clicks}</span>
            {lastClick && <span className="text-wine/50 text-[10px] ml-0.5">· {lastClick}</span>}
          </div>
          <div
            className={`flex items-center gap-1 text-[11px] leading-tight ${confirms > 0 ? "text-rose-700" : "text-wine/30"}`}
            title={lastConfirm ? `Último confirmar: ${lastConfirm}` : "No ha pulsado confirmar"}
          >
            <IconHeart className="h-3.5 w-3.5 shrink-0" />
            <span className={confirms > 0 ? "font-semibold" : ""}>{confirms}</span>
            {lastConfirm && <span className="text-wine/50 text-[10px] ml-0.5">· {lastConfirm}</span>}
          </div>
        </div>
      </td>
      <td className="px-2 py-2 align-middle text-center">
        <button
          type="button"
          onClick={() => onTogglePlusOne(row.id)}
          className={`rounded-full px-2 py-1 text-xs font-semibold ${
            row.plusOne
              ? "bg-wine text-cream"
              : "bg-sand/50 text-wine-dark"
          }`}
        >
          {row.plusOne ? "Sí" : "No"}
        </button>
      </td>
      <td className="px-2 py-2 align-middle text-center">
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="inline-flex rounded-lg p-2 text-wine/60 hover:bg-red-50 hover:text-red-800"
          title="Eliminar"
        >
          <IconTrash className="h-4 w-4" />
        </button>
      </td>
    </tr>
  )
}

/** Fila compacta para móvil: evita tabla de 720px+ que obliga a zoom/scroll incómodo */
function InviteMobileCard({
  row,
  kvRow,
  onCycleStatus,
  onToggleLinkSent,
  onToggleConfirmedShortcut,
  onToggleDeclinedShortcut,
  onTogglePlusOne,
  onRemove,
}) {
  const [linkCopied, setLinkCopied] = useFlashCopied()
  const views = Number(kvRow?.views) || 0
  const clicks = Number(kvRow?.clicks) || 0
  const confirms = Number(kvRow?.confirms) || 0
  const lastView = kvRow?.last_view ? formatTimeAgo(kvRow.last_view) : null
  const lastClick = kvRow?.last_click ? formatTimeAgo(kvRow.last_click) : null
  const lastConfirm = kvRow?.last_confirm ? formatTimeAgo(kvRow.last_confirm) : null

  const copyPath = async () => {
    const url = fullInviteUrl(row.slug, row.plusOne)
    try {
      await navigator.clipboard.writeText(url)
      setLinkCopied(true)
    } catch {
      /* ignore */
    }
  }

  const pipelineBtn =
    "inline-flex h-10 w-10 items-center justify-center rounded-lg border transition focus:outline-none focus:ring-2 focus:ring-wine/40 active:scale-[0.98]"
  const linkSentActive = ["sent", "preconfirmed", "confirmed", "declined"].includes(row.status)

  return (
    <article className="border-b border-sand/60 px-3 py-4 last:border-b-0 sm:px-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <p className="min-w-0 flex-1 font-sans text-sm font-semibold text-wine-dark">{row.name}</p>
        <div className="flex shrink-0 items-start gap-2">
          <div className="flex flex-col items-center gap-0.5">
            <button
              type="button"
              onClick={copyPath}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-wine/35 bg-white text-wine shadow-sm transition hover:border-wine/55 hover:bg-cream"
              title="Copiar enlace (boda-lis-juanjo.vercel.app)"
              aria-label={`Copiar enlace de invitación de ${row.name}`}
            >
              <IconPaperclip className="h-4 w-4" />
            </button>
            {linkCopied ? (
              <span className="text-[10px] font-semibold leading-tight text-emerald-800" role="status">
                Enlace copiado
              </span>
            ) : null}
          </div>
        <button
          type="button"
          onClick={() => onRemove(row.id)}
          className="inline-flex shrink-0 rounded-lg p-2 text-wine/60 hover:bg-red-50 hover:text-red-800"
          title="Eliminar"
        >
          <IconTrash className="h-5 w-5" />
        </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onCycleStatus(row.id)}
          className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${statusPillClass(row.status)}`}
          title="Clic para avanzar: pendiente → enviado → pre-confirmación → confirmado → no asiste"
        >
          {statusLabel(row.status)}
        </button>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => onToggleLinkSent(row.id)}
            className={`${pipelineBtn} ${
              linkSentActive ? "border-wine bg-wine/10 text-wine" : "border-sand text-wine/35"
            }`}
            title="Enlace enviado (pendiente ↔ enviado)"
            aria-pressed={linkSentActive}
          >
            <IconEnvelope className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleConfirmedShortcut(row.id)}
            className={`${pipelineBtn} ${
              row.status === "confirmed"
                ? "border-wine bg-wine/10 text-wine"
                : "border-sand text-wine/35"
            }`}
            title="Marcar confirmado / quitar confirmación"
            aria-pressed={row.status === "confirmed"}
          >
            <IconCheck className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onToggleDeclinedShortcut(row.id)}
            className={`${pipelineBtn} ${
              row.status === "declined"
                ? "border-red-700/50 bg-red-100 text-red-900"
                : "border-sand text-wine/35"
            }`}
            title="No asiste / quitar declinado"
            aria-pressed={row.status === "declined"}
          >
            <IconDeclined className="h-4 w-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={() => onTogglePlusOne(row.id)}
          className={`ml-auto rounded-full px-3 py-1.5 text-xs font-semibold ${
            row.plusOne ? "bg-wine text-cream" : "bg-sand/50 text-wine-dark"
          }`}
        >
          +1: {row.plusOne ? "Sí" : "No"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-sand/40 pt-3 text-[11px]">
        <span
          className={`inline-flex items-center gap-1 ${views > 0 ? "text-sky-800" : "text-wine/35"}`}
          title={lastView ? `Última vista: ${lastView}` : "Sin visitas aún"}
        >
          <IconEye className="h-3.5 w-3.5 shrink-0" />
          <span className={views > 0 ? "font-semibold" : ""}>{views}</span>
          {lastView ? <span className="text-wine/50">· {lastView}</span> : null}
        </span>
        <span
          className={`inline-flex items-center gap-1 ${clicks > 0 ? "text-violet-800" : "text-wine/35"}`}
          title={lastClick ? `Último click: ${lastClick}` : "Sin clicks aún"}
        >
          <IconCursor className="h-3.5 w-3.5 shrink-0" />
          <span className={clicks > 0 ? "font-semibold" : ""}>{clicks}</span>
          {lastClick ? <span className="text-wine/50">· {lastClick}</span> : null}
        </span>
        <span
          className={`inline-flex items-center gap-1 ${confirms > 0 ? "text-rose-700" : "text-wine/35"}`}
          title={lastConfirm ? `Último confirmar: ${lastConfirm}` : "No ha pulsado confirmar"}
        >
          <IconHeart className="h-3.5 w-3.5 shrink-0" />
          <span className={confirms > 0 ? "font-semibold" : ""}>{confirms}</span>
          {lastConfirm ? <span className="text-wine/50">· {lastConfirm}</span> : null}
        </span>
      </div>
    </article>
  )
}

function InviteList({
  rows,
  analytics,
  filter,
  search,
  onFilterChange,
  onSearchChange,
  onCycleStatus,
  onToggleLinkSent,
  onToggleConfirmedShortcut,
  onToggleDeclinedShortcut,
  onTogglePlusOne,
  onRemove,
}) {
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false
      if (!q) return true
      return (
        r.name.toLowerCase().includes(q) ||
        r.slug.toLowerCase().includes(q)
      )
    })
  }, [rows, filter, search])

  return (
    <div className="rounded-xl border border-wine/40 bg-white/80 shadow-sm backdrop-blur-sm">
      <div className="flex flex-col gap-3 border-b border-wine/20 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <h2 className="font-serif text-lg text-wine-dark sm:text-xl">Lista de invitados</h2>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar…"
            className="min-h-[44px] w-full min-w-0 flex-1 rounded-lg border border-sand px-3 py-2 text-base text-wine-dark focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine sm:max-w-xs sm:text-sm"
          />
          <select
            value={filter}
            onChange={(e) => onFilterChange(e.target.value)}
            className="min-h-[44px] w-full rounded-lg border border-sand bg-white px-3 py-2 text-base text-wine-dark focus:border-wine focus:outline-none sm:w-auto sm:text-sm"
          >
            <option value="all">Todos</option>
            <option value="pending">Pendiente</option>
            <option value="sent">Enviado</option>
            <option value="preconfirmed">Pre-confirmación</option>
            <option value="confirmed">Confirmados</option>
            <option value="declined">No asisten</option>
          </select>
        </div>
      </div>

      <div className="max-h-[min(70vh,560px)] overflow-y-auto md:max-h-[min(60vh,520px)]">
        {/* Móvil: tarjetas apiladas, sin scroll horizontal */}
        <div className="md:hidden">
          {filtered.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-wine/70">
              No hay invitados que coincidan. Crea uno arriba o cambia el filtro.
            </p>
          ) : (
            filtered.map((row) => (
              <InviteMobileCard
                key={row.id}
                row={row}
                kvRow={analytics[row.slug] ?? {}}
                onCycleStatus={onCycleStatus}
                onToggleLinkSent={onToggleLinkSent}
                onToggleConfirmedShortcut={onToggleConfirmedShortcut}
                onToggleDeclinedShortcut={onToggleDeclinedShortcut}
                onTogglePlusOne={onTogglePlusOne}
                onRemove={onRemove}
              />
            ))
          )}
        </div>

        {/* Tablet/desktop: tabla */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[640px] border-collapse text-left lg:min-w-[720px]">
          <thead className="sticky top-0 z-10 bg-cream/95 text-xs uppercase tracking-wide text-wine-dark backdrop-blur-sm">
            <tr>
              <th className="px-2 py-2 font-semibold">Nombre</th>
              <th className="w-28 px-2 py-2 text-center font-semibold">Enlace</th>
              <th className="px-2 py-2 font-semibold">Estado</th>
              <th className="px-2 py-2 font-semibold">Pipeline</th>
              <th className="px-2 py-2 font-semibold">👁 Actividad</th>
              <th className="px-2 py-2 text-center font-semibold">+1</th>
              <th className="px-2 py-2 text-center font-semibold w-12" />
            </tr>
          </thead>
          <tbody className="font-sans text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-wine/70">
                  No hay invitados que coincidan. Crea uno arriba o cambia el filtro.
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <InviteRow
                  key={row.id}
                  row={row}
                  kvRow={analytics[row.slug] ?? {}}
                  onCycleStatus={onCycleStatus}
                  onToggleLinkSent={onToggleLinkSent}
                  onToggleConfirmedShortcut={onToggleConfirmedShortcut}
                  onToggleDeclinedShortcut={onToggleDeclinedShortcut}
                  onTogglePlusOne={onTogglePlusOne}
                  onRemove={onRemove}
                />
              ))
            )}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  )
}

export default function CreatorPage() {
  const {
    invitations,
    lastCreated,
    syncReady,
    stats,
    addInvitation,
    cycleStatus,
    updateStatus,
    togglePlusOne,
    removeInvitation,
  } = useInvitations()

  const [bannerInvite, setBannerInvite] = useState(null)
  const [formError, setFormError] = useState("")
  const [formKey, setFormKey] = useState(0)
  const [search, setSearch] = useState("")
  const [filter, setFilter] = useState("all")
  const [analytics, setAnalytics] = useState({})

  const kvTotals = useMemo(() => {
    let totalViews = 0
    let totalOpens = 0
    let totalClicks = 0
    let totalConfirms = 0
    for (const k of Object.values(analytics)) {
      if (!k || typeof k !== "object") continue
      totalViews += Number(k.views) || 0
      totalOpens += Number(k.opens) || 0
      totalClicks += Number(k.clicks) || 0
      totalConfirms += Number(k.confirms) || 0
    }
    return { totalViews, totalOpens, totalClicks, totalConfirms }
  }, [analytics])

  useEffect(() => {
    let cancelled = false
    const load = () => {
      fetch("/api/analytics")
        .then((r) => (r.ok ? r.json() : {}))
        .then((data) => {
          if (!cancelled && data && typeof data === "object" && !Array.isArray(data)) {
            setAnalytics(data)
          }
        })
        .catch(() => {})
    }
    load()
    const t = setInterval(load, 30_000)
    return () => {
      cancelled = true
      clearInterval(t)
    }
  }, [])

  useEffect(() => {
    if (!lastCreated) return
    setBannerInvite(lastCreated)
  }, [lastCreated])

  const onSubmitForm = ({ first, last, plusOne }) => {
    setFormError("")
    const res = addInvitation(first, last, plusOne)
    if (!res.ok) {
      setFormError(res.error)
      return
    }
    setFormKey((k) => k + 1)
    fireGoldConfettiBurst()
  }

  const toggleLinkSent = (id) => {
    const row = invitations.find((i) => i.id === id)
    if (!row) return
    if (row.status === "pending") updateStatus(id, "sent")
    else if (row.status === "sent") updateStatus(id, "pending")
  }

  const toggleConfirmedShortcut = (id) => {
    const row = invitations.find((i) => i.id === id)
    if (!row) return
    updateStatus(id, row.status === "confirmed" ? "pending" : "confirmed")
  }

  const toggleDeclinedShortcut = (id) => {
    const row = invitations.find((i) => i.id === id)
    if (!row) return
    updateStatus(id, row.status === "declined" ? "pending" : "declined")
  }

  return (
    <div className="relative z-10 flex min-h-[100dvh] w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-cream text-wine-dark">
      <div className="mx-auto max-w-5xl px-3 py-5 pb-20 sm:px-4 sm:py-6 sm:pb-16">
        <header className="mb-6 border-b border-wine/30 pb-4 sm:mb-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <p className="font-serif text-xl leading-snug text-wine-dark sm:text-2xl md:text-3xl">
                Lis & Juanjo - Gestor de invitaciones
              </p>
            </div>
            <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <Link
                to="/"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-wine px-4 py-2.5 text-sm font-semibold text-cream transition hover:bg-wine-dark sm:w-auto sm:py-2"
              >
                Ver invitación pública
              </Link>
              <Link
                to="/dashboard"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-lg border border-wine px-4 py-2.5 text-sm font-semibold text-wine transition hover:bg-white sm:w-auto sm:py-2"
              >
                Avanzado
              </Link>
            </div>
          </div>
        </header>

        {!syncReady ? (
          <p className="mb-4 rounded-lg border border-wine/30 bg-white/90 px-3 py-2 text-sm text-wine-dark">
            Sincronizando lista con el servidor…
          </p>
        ) : null}

        <DashboardStats stats={stats} kvTotals={kvTotals} />

        <div className="mt-8 space-y-4">
          <InviteForm
            onSubmit={onSubmitForm}
            formError={formError}
            formKey={formKey}
          />
          <InviteBanner invitation={bannerInvite} onDismiss={() => setBannerInvite(null)} />
        </div>

        <div className="mt-8">
          <InviteList
            rows={invitations}
            analytics={analytics}
            filter={filter}
            search={search}
            onFilterChange={setFilter}
            onSearchChange={setSearch}
            onCycleStatus={cycleStatus}
            onToggleLinkSent={toggleLinkSent}
            onToggleConfirmedShortcut={toggleConfirmedShortcut}
            onToggleDeclinedShortcut={toggleDeclinedShortcut}
            onTogglePlusOne={togglePlusOne}
            onRemove={removeInvitation}
          />
        </div>
      </div>
    </div>
  )
}
