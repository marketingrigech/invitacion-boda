import FadeInSection from "../shared/FadeInSection"
import { openWhatsAppInviteForGuest } from "../../utils/whatsapp"
import { useDashboard } from "./DashboardProvider"

const cardBase =
  "rounded-xl border border-wine/45 bg-white/95 p-3 shadow-sm transition-shadow hover:shadow-md"

/** KPIs principales: números más pequeños, vistazo rápido */
const nStat = "text-xl font-semibold tabular-nums leading-none sm:text-2xl"

/** Tarjetas vistas/clicks/confirmar — compactas */
const cardKv = "rounded-lg border border-wine/35 bg-white/95 p-2 shadow-sm sm:p-2.5"

const nKv = "text-lg font-semibold tabular-nums leading-none sm:text-xl"

const labelSm = "text-[9px] font-bold uppercase tracking-wide text-wine/80"

const labelKv = "text-[8px] font-bold uppercase leading-tight text-wine/75 sm:text-[9px] pr-4"

function pct(total, value) {
  return total > 0 ? Math.round((value / total) * 100) : 0
}

/** Iconos línea para tarjetas de actividad KV */
function IconEye({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}
function IconPointer({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M4 4l7.07 17 2.51-7.39L21 11.07z" />
    </svg>
  )
}
function IconHeart({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </svg>
  )
}

export default function DashboardOverview() {
  const { invitations, stats, kvTotals, analytics, updateStatus, syncReady } = useDashboard()

  /** @param {typeof invitations[0]} guest */
  const launchReminder = (guest) => {
    openWhatsAppInviteForGuest(guest)
    if (guest.status === "pending") updateStatus(guest.id, "sent")
  }

  const vioSinConfirmar = invitations.filter((g) => {
    if (g.status === "confirmed" || g.status === "declined" || g.status === "preconfirmed")
      return false
    const kv = analytics[g.slug]
    const views = kv ? Number(kv.views) || 0 : 0
    return views > 0
  })

  const t = stats.total
  const funnelSteps = [
    { key: "creados", label: "Creados", count: t, p: 100 },
    {
      key: "enviados",
      label: "Enviados",
      count: stats.enviados,
      p: pct(t, stats.enviados),
    },
    {
      key: "preconfirmed",
      label: "Pre-confirmación",
      count: stats.preconfirmed ?? 0,
      p: pct(t, stats.preconfirmed ?? 0),
    },
    {
      key: "confirmados",
      label: "Confirmados",
      count: stats.confirmed,
      p: pct(t, stats.confirmed),
    },
    {
      key: "noasisten",
      label: "No asisten",
      count: stats.declined,
      p: pct(t, stats.declined),
    },
  ]

  return (
    <div className="space-y-4">
      {!syncReady ? (
        <div className="rounded-lg border border-wine/30 bg-white/90 px-4 py-2 text-sm text-wine-dark">
          Sincronizando lista con el servidor…
        </div>
      ) : null}

      {/* Estado invitaciones — 6 tarjetas */}
      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FadeInSection className={cardBase} delay="0ms">
          <p className={labelSm}>Total</p>
          <p className={`${nStat} mt-1.5 text-wine-dark`}>{stats.total}</p>
          <p className="mt-1.5 text-[10px] leading-snug text-wine/65">
            Asist. ~<strong className="text-wine-dark">{stats.totalAttendees}</strong>
            {stats.plusOneAmongConfirmed ? (
              <>
                {" "}
                · <strong className="text-wine-dark">{stats.plusOneAmongConfirmed}</strong> +1
              </>
            ) : null}
          </p>
        </FadeInSection>
        <FadeInSection className={cardBase} delay="40ms">
          <p className={labelSm}>Sin enviar</p>
          <p className={`${nStat} mt-1.5 text-amber-800`}>{stats.pending}</p>
        </FadeInSection>
        <FadeInSection className={cardBase} delay="80ms">
          <p className={labelSm}>Enviado</p>
          <p className={`${nStat} mt-1.5 text-violet-800`}>{stats.sent}</p>
        </FadeInSection>
        <FadeInSection className={cardBase} delay="100ms">
          <p className={labelSm}>Pre-confirmación</p>
          <p className={`${nStat} mt-1.5 text-sky-900`}>{stats.preconfirmed ?? 0}</p>
          <p className="mt-1.5 text-[10px] leading-snug text-wine/65">Invitado envió RSVP; pendiente de los novios.</p>
        </FadeInSection>
        <FadeInSection className={cardBase} delay="120ms">
          <p className={labelSm}>Confirmados</p>
          <p className={`${nStat} mt-1.5 text-emerald-800`}>{stats.confirmed}</p>
        </FadeInSection>
        <FadeInSection className={cardBase} delay="160ms">
          <p className={labelSm}>No asisten</p>
          <p className={`${nStat} mt-1.5 text-red-800`}>{stats.declined}</p>
        </FadeInSection>
      </div>

      {/* Actividad KV — mucho más compacta */}
      <div className="grid grid-cols-3 gap-2">
        <FadeInSection className={cardKv} delay="200ms">
          <div className="relative min-h-[3.25rem]">
            <IconEye className="absolute right-0 top-0 h-3.5 w-3.5 text-teal-600" />
            <p className={labelKv}>Vistas</p>
            <p className={`${nKv} mt-1 text-teal-700`}>{kvTotals.totalViews}</p>
          </div>
        </FadeInSection>
        <FadeInSection className={cardKv} delay="210ms">
          <div className="relative min-h-[3.25rem]">
            <IconPointer className="absolute right-0 top-0 h-3.5 w-3.5 text-violet-600" />
            <p className={labelKv}>Clicks</p>
            <p className={`${nKv} mt-1 text-violet-700`}>{kvTotals.totalClicks}</p>
          </div>
        </FadeInSection>
        <FadeInSection className={cardKv} delay="220ms">
          <div className="relative min-h-[3.25rem]">
            <IconHeart className="absolute right-0 top-0 h-3.5 w-3.5 text-wine" />
            <p className={labelKv}>Confirmar</p>
            <p className={`${nKv} mt-1 text-wine`}>{kvTotals.totalConfirms}</p>
          </div>
        </FadeInSection>
      </div>

      {/* Embudo — barras verticales (% sobre invitaciones creadas) */}
      <FadeInSection className={cardBase} delay="230ms">
        <p className="mb-4 text-center text-xs font-bold uppercase tracking-wide text-wine-dark md:text-sm">
          Embudo (cada barra = % sobre invitaciones creadas)
        </p>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          {funnelSteps.map((step) => (
            <div key={step.key} className="flex flex-col items-center">
              <div className="flex h-44 w-full max-w-[108px] items-end justify-center rounded-xl bg-neutral-100 ring-1 ring-wine/10 sm:h-52 sm:max-w-[120px]">
                <div
                  className="w-[70%] rounded-t-md bg-gradient-to-b from-wine via-wine/85 to-wine/25 shadow-inner transition-all duration-500"
                  style={{
                    height: `${Math.max(3, step.p)}%`,
                    minHeight: step.count > 0 ? 8 : 2,
                  }}
                  title={`${step.label}: ${step.count} (${step.p}%)`}
                />
              </div>
              <p className="mt-3 text-center text-[10px] font-bold uppercase tracking-wide text-wine/90">
                {step.label}
              </p>
              <p className="text-xl font-semibold tabular-nums text-wine-dark">{step.count}</p>
              <p className="text-xs font-semibold tabular-nums text-wine/55">{step.p}%</p>
            </div>
          ))}
        </div>
      </FadeInSection>

      {/* Vio sin confirmar */}
      <FadeInSection className={cardBase} delay="280ms">
        <p className="text-sm font-bold uppercase tracking-wide text-wine-dark">
          Vio la invitación pero no está confirmado
        </p>
        <p className="mt-1 text-xs text-wine/75">
          Repaso por WhatsApp; si sigue pendiente, se marca «Enviado».
        </p>
        <ul className="mt-3 max-h-56 divide-y divide-sand/70 overflow-y-auto rounded-lg border border-wine/15 bg-cream/40">
          {vioSinConfirmar.length === 0 ? (
            <li className="px-3 py-4 text-center text-xs text-wine/65">Lista vacía. ¡Buena señal!</li>
          ) : (
            vioSinConfirmar.map((g) => (
              <li
                key={g.id}
                className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="text-sm font-semibold text-wine-dark">{g.name}</p>
                  <p className="text-[11px] text-wine/65">
                    {Number(analytics[g.slug]?.views) || 0} vistas · {g.status}
                  </p>
                </div>
                <button
                  type="button"
                  className="min-h-[36px] shrink-0 rounded-lg border border-wine bg-white px-2.5 text-[11px] font-semibold text-wine hover:bg-wine hover:text-cream"
                  onClick={() => launchReminder(g)}
                >
                  WhatsApp
                </button>
              </li>
            ))
          )}
        </ul>
      </FadeInSection>
    </div>
  )
}
