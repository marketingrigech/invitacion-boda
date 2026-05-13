import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import ImageLightbox from "./ImageLightbox"
import FadeInSection from "./shared/FadeInSection"
import { extractSlugFromLocation } from "../utils/slugFromPath"
import { getPublicInviteOrigin } from "../utils/whatsapp"

/**
 * Lee el nombre del invitado y si viene con acompañante desde la URL.
 *
 * Formatos soportados:
 *   /Lourdes-Sibañа          → nombre, sin acompañante
 *   /Lourdes-Sibañа+1        → nombre, con acompañante pre-marcado
 *   /Matheo_Josue-Santacruz_Gomez+1  → nombre completo, con acompañante
 *
 * Reglas del path:
 *   - "_"  espacio dentro del mismo grupo (segundo nombre / segundo apellido)
 *   - "-"  espacio entre grupo de nombres y grupo de apellidos
 *   - "+1" al final → acompañante pre-marcado (se elimina del nombre)
 *
 * Fallback legacy: ?invitado=Nombre o ?n=Nombre
 */
function getGuestStateFromUrl() {
  try {
    // 1. Intentar leer desde el path
    const rawPath = decodeURIComponent(window.location.pathname)
    let pathSegment = rawPath.replace(/^\//, "").split("/")[0]
    if (pathSegment && pathSegment.length > 0) {
      const plusOne = pathSegment.endsWith("+1")
      if (plusOne) pathSegment = pathSegment.slice(0, -2) // quitar "+1"
      const nameFromPath = pathSegment.replace(/[_-]/g, " ").trim()
      if (nameFromPath.length > 0) {
        return { displayName: nameFromPath, prefillRsvpName: true, plusOne }
      }
    }

    // 2. Fallback: query string legacy  ?invitado=Nombre  o  ?n=Nombre
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("invitado") ?? params.get("n") ?? ""
    const name = decodeURIComponent(raw.replace(/\+/g, " ")).trim()
    if (name.length > 0) return { displayName: name, prefillRsvpName: true, plusOne: false }
  } catch {
    /* ignorar URL mal formada */
  }
  return { displayName: "Invitado", prefillRsvpName: false, plusOne: false }
}

/** Búsqueda directa en Google Maps (evita enlaces cortos que apunten mal). */
const CHURCH_GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("Iglesia Nuestra Señora de la Asunción, C. de la Iglesia, 1, 37710 Candelario, Salamanca")
const RECEPTION_GOOGLE_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=" +
  encodeURIComponent("La Batipuerta, Calle Los Cantos, 2, 37710 Candelario, Salamanca")

/** Sube el número cuando sustituyas `public/boda/fecha.png` para forzar recarga (caché CDN/navegador). */
const FECHA_CALENDARIO_SRC = `/boda/fecha.png?v=3`

/** Fotos de la finca (carpeta public/boda/Finca). Orden: 12.14.32 → 12.14.33 (1)…(11). */
const FINCA_IMAGE_FILENAMES = [
  "WhatsApp Image 2026-05-05 at 12.14.32.jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.32 (1).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.32 (2).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.32 (3).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33.jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (1).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (2).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (3).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (4).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (5).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (6).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (7).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (8).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (9).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (10).jpeg",
  "WhatsApp Image 2026-05-05 at 12.14.33 (11).jpeg",
]

const FINCA_IMAGE_URLS = FINCA_IMAGE_FILENAMES.map(
  name => `/boda/Finca/${encodeURIComponent(name)}`,
)

/** Carrusel «¿Dónde será?»: portada = WhatsApp … 12.14.33 (11).jpeg, después el resto sin duplicar. */
const VENUE_FINCA_CAROUSEL_URLS = (() => {
  const names = [...FINCA_IMAGE_FILENAMES]
  const portada = names.splice(15, 1)[0]
  return [portada, ...names].map(n => `/boda/Finca/${encodeURIComponent(n)}`)
})()

/** WhatsApp en formato internacional sin + ni espacios (confirmaciones de asistencia). */
const RSVP_WHATSAPP_PHONE = "34655935191"

/** Marco fotos dentro del interior de la tarjeta (sin bleed; alineado al texto). */
const fotoMarcoInvitacion =
  "mx-auto w-full max-w-md overflow-hidden rounded-sm border-[6px] border-white shadow-lg outline outline-[1px] outline-black/5"

/** Texto narrativo «nuestra historia»: algo más grande, interlineado más compacto. */
const historiaBodyClass =
  "text-xl sm:text-[1.25rem] md:text-[1.35rem] text-neutral-600 font-serif font-light italic leading-snug tracking-wide antialiased [text-rendering:optimizeLegibility]"

/** Cuenta atrás hasta un instante (epoch ms), estable en todos los navegadores. */
function getTimeRemaining(targetMs) {
  const diff = targetMs - Date.now()
  if (!Number.isFinite(diff) || diff <= 0) {
    return { dias: 0, horas: 0, minutos: 0, segundos: 0 }
  }
  return {
    dias: Math.floor(diff / (1000 * 60 * 60 * 24)),
    horas: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutos: Math.floor((diff / 1000 / 60) % 60),
    segundos: Math.floor((diff / 1000) % 60),
  }
}

/** Ceremonia: 19 sept 2026, 17:00 en España (CEST, UTC+2). */
const WEDDING_CEREMONY_TARGET_MS = Date.UTC(2026, 8, 19, 15, 0, 0)

const WEDDING_ICS_LOCATION =
  "Iglesia Nuestra Señora de la Asunción, Candelario; celebración La Batipuerta, Candelario, Salamanca"

const CAL_EVENT_SUMMARY = "Boda Lis y Juanjo"
const CAL_EVENT_DESCRIPTION =
  "Ceremonia a las 17:00 en la Iglesia Nuestra Señora de la Asunción (C/ de la Iglesia, 1, Candelario). Celebración en La Batipuerta (Calle Los Cantos, 2). Confirma tu asistencia antes del 25 de junio de 2026."
/** Mismo intervalo que el .ics (UTC): inicio ceremonia y fin de la fiesta en el calendario. */
const CAL_GOOGLE_DATES = "20260919T150000Z/20260919T220000Z"
const CAL_OUTLOOK_START = "2026-09-19T15:00:00Z"
const CAL_OUTLOOK_END = "2026-09-19T22:00:00Z"

function buildGoogleCalendarUrl() {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: CAL_EVENT_SUMMARY,
    dates: CAL_GOOGLE_DATES,
    details: CAL_EVENT_DESCRIPTION,
    location: WEDDING_ICS_LOCATION,
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

/** Outlook / Microsoft 365 en el navegador (abre pantalla de nuevo evento). */
function buildOutlookWebCalendarUrl() {
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: CAL_EVENT_SUMMARY,
    body: CAL_EVENT_DESCRIPTION,
    location: WEDDING_ICS_LOCATION,
    startdt: CAL_OUTLOOK_START,
    enddt: CAL_OUTLOOK_END,
  })
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`
}

function escapeIcsText(s) {
  return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

function formatIcsUtcStamp(d) {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z"
}

function downloadWeddingCalendarReminder(pageOrigin) {
  const nowStamp = formatIcsUtcStamp(new Date())
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Lis y Juanjo//Invitacion//ES",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:boda-lis-juanjo-2026-09-19@invitacion-boda",
    `DTSTAMP:${nowStamp}`,
    "DTSTART:20260919T150000Z",
    "DTEND:20260919T220000Z",
    `SUMMARY:${escapeIcsText(CAL_EVENT_SUMMARY)}`,
    `DESCRIPTION:${escapeIcsText(CAL_EVENT_DESCRIPTION)}`,
    `LOCATION:${escapeIcsText(WEDDING_ICS_LOCATION)}`,
    pageOrigin ? `URL:${pageOrigin}` : "",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter(Boolean)
  const ics = lines.join("\r\n")

  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = "recordatorio-boda-lis-juanjo.ics"
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function IconoCalleLlegar({ className }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12 21C8 17.4 4 13.3 4 9a8 8 0 0116 0c0 4.3-4 8.4-8 12z" />
      <circle cx="12" cy="9" r="2.25" />
    </svg>
  )
}

/** Marca Google (G) — pictograma compacto para el botón de calendario. */
function IconCalendarGoogle({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  )
}

/** Calendario / Outlook — marca sugerida en azul Microsoft. */
function IconCalendarOutlook({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden xmlns="http://www.w3.org/2000/svg">
      <path
        fill="#0078D4"
        d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V10h14v10zm0-12H5V6h14v2z"
      />
      <path fill="#0078D4" fillOpacity="0.45" d="M7 12h4v4H7v-4zm6 0h4v4h-4v-4z" />
    </svg>
  )
}

/** Descarga archivo / Apple Calendar y otros (.ics). */
function IconCalendarIcs({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="4" y="4" width="16" height="17" rx="2" />
      <path d="M8 2v4M16 2v4M4 9h16" />
      <path d="M12 14v6M12 17l2.5 2M12 17l-2.5 2" />
    </svg>
  )
}

/** Carrusel de fotos de la finca en «¿Dónde será?». */
function VenueFincaCarousel() {
  const urls = VENUE_FINCA_CAROUSEL_URLS
  const total = urls.length
  const [index, setIndex] = useState(0)
  const [viewerOpen, setViewerOpen] = useState(false)
  const touchStartX = useRef(null)

  const go = d => {
    setIndex(i => (i + d + total) % total)
  }

  const onTouchStart = e => {
    touchStartX.current = e.touches[0]?.clientX ?? null
  }

  const onTouchEnd = e => {
    const start = touchStartX.current
    touchStartX.current = null
    if (start == null) return
    const end = e.changedTouches[0].clientX
    const dx = end - start
    if (dx > 48) go(-1)
    else if (dx < -48) go(1)
  }

  return (
    <div
      className="relative w-full"
      role="region"
      aria-roledescription="carrusel"
      aria-label="Fotografías de La Batípuerta"
    >
      <div
        className="relative aspect-[4/5] w-full overflow-hidden bg-[#e8e4df] sm:aspect-[4/3]"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <img
          src={urls[index]}
          alt={`La Batípuerta, Candelario — foto ${index + 1} de ${total}`}
          loading={index === 0 ? "eager" : "lazy"}
          decoding="async"
          draggable={false}
          className="h-full w-full cursor-zoom-in object-cover object-center transition-opacity duration-300 hover:opacity-[0.97]"
          onClick={() => setViewerOpen(true)}
        />
        {total > 1 ? (
          <>
            <button
              type="button"
              aria-label="Foto anterior"
              onClick={e => {
                e.stopPropagation()
                go(-1)
              }}
              className="absolute left-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-wine/25 bg-[#fbfaf9]/95 text-wine shadow-md backdrop-blur-[2px] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Foto siguiente"
              onClick={e => {
                e.stopPropagation()
                go(1)
              }}
              className="absolute right-2 top-1/2 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-wine/25 bg-[#fbfaf9]/95 text-wine shadow-md backdrop-blur-[2px] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </>
        ) : null}
      </div>
      {total > 1 ? (
        <p
          className="border-t border-white/80 bg-white/40 py-2 text-center text-[11px] tabular-nums tracking-[0.14em] text-wine-dark/55"
          aria-live="polite"
        >
          {index + 1} · {total}
        </p>
      ) : null}
      <div
        className="mt-3 grid w-full max-w-md grid-cols-4 gap-1 px-0 sm:gap-2 sm:px-0.5"
        aria-label="Cuatro fotitos del espacio de celebración"
      >
        {urls.slice(0, 4).map((src, i) => (
          <button
            key={src}
            type="button"
            onClick={() => setIndex(i)}
            className={`overflow-hidden rounded-sm border-2 border-white shadow-[0_2px_8px_rgba(62,42,42,0.1)] outline outline-[0.5px] outline-black/5 transition-opacity sm:border-[3px] ${
              index === i ? "ring-2 ring-wine/50 ring-offset-1" : "opacity-90 hover:opacity-100"
            }`}
            aria-label={`Ver foto ${i + 1} en grande`}
            aria-current={index === i ? "true" : undefined}
          >
            <img
              src={src}
              alt=""
              loading="lazy"
              decoding="async"
              draggable={false}
              className="aspect-square w-full object-cover object-center"
            />
          </button>
        ))}
      </div>
      <ImageLightbox
        isOpen={viewerOpen}
        onClose={() => setViewerOpen(false)}
        images={urls}
        index={index}
        onIndexChange={setIndex}
        alt={`La Batípuerta, Candelario — foto ${index + 1} de ${total}`}
      />
    </div>
  )
}

/** Ornamento botánico estilo tinta — racimo que mira hacia el título; `flipped` espeja para el otro lado */
const FloralOrnament = ({ className, flipped }) => (
  <svg
    viewBox="0 0 200 40"
    className={`${className} ${flipped ? "scale-x-[-1]" : ""}`}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="0.6">
      {/* Trazos curvos principales simétricos y muy sutiles */}
      <path d="M 15 20 C 40 20 50 12 70 20 C 75 22 80 24 85 20" />
      <path d="M 185 20 C 160 20 150 12 130 20 C 125 22 120 24 115 20" />

      {/* Espirales decorativos inferiores (muy delicados) */}
      <path d="M 70 20 C 60 28 55 20 62 16 C 64 15 67 16 67 18" />
      <path d="M 130 20 C 140 28 145 20 138 16 C 136 15 133 16 133 18" />

      {/* Espirales decorativos superiores (diminutos) */}
      <path d="M 40 18 C 35 12 42 10 45 13" />
      <path d="M 160 18 C 165 12 158 10 155 13" />

      {/* Detalles sutiles de hojas/pétalos laterales */}
      <path d="M 28 19 Q 32 15 35 18 Q 32 21 28 19 Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M 172 19 Q 168 15 165 18 Q 168 21 172 19 Z" fill="currentColor" fillOpacity="0.15" />
      
      <path d="M 52 17 Q 55 13 58 16 Q 55 19 52 17 Z" fill="currentColor" fillOpacity="0.15" />
      <path d="M 148 17 Q 145 13 142 16 Q 145 19 148 17 Z" fill="currentColor" fillOpacity="0.15" />

      {/* Pieza central (motivo floral/rombo) ultra fina */}
      <g transform="translate(100, 20)">
        {/* Tallo central que conecta ambos lados suavemente */}
        <path d="M -15 0 C -10 -2 10 -2 15 0" />
        
        {/* Flor central estilizada de 3 pétalos o flor de lis simple */}
        <path d="M 0 1 C -4 -5 -4 -12 0 -15 C 4 -12 4 -5 0 1 Z" />
        <path d="M 0 0 C -8 -2 -12 -8 -8 -12 C -6 -10 -3 -5 0 -2" />
        <path d="M 0 0 C 8 -2 12 -8 8 -12 C 6 -10 3 -5 0 -2" />
        
        {/* Adorno inferior central */}
        <path d="M 0 1 C -3 5 0 8 0 8 C 0 8 3 5 0 1 Z" fill="currentColor" fillOpacity="0.2" />
        <circle cx="0" cy="11" r="0.6" fill="currentColor" stroke="none" />
      </g>

      {/* Pequeños puntos a lo largo para dar aire principesco */}
      <circle cx="45" cy="22" r="0.5" fill="currentColor" stroke="none" />
      <circle cx="155" cy="22" r="0.5" fill="currentColor" stroke="none" />
    </g>
  </svg>
);

/** Título de sección con el mismo filigrana que «Cómo nos conocimos» */
function SectionTitleWithOrnament({ children, className = "", dense = false }) {
  return (
    <div
      className={`flex flex-col items-center justify-center w-full px-2 ${dense ? "mb-5" : "mb-8"} ${className}`}
    >
      <h2
        className={`text-4xl sm:text-5xl font-serif text-wine text-center ${dense ? "mb-2" : "mb-3"}`}
      >
        {children}
      </h2>
      <FloralOrnament className="w-48 sm:w-60 h-auto text-wine/50 shrink-0 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]" />
    </div>
  );
}

function Invitation({ envelopeOpen, scrollContainerRef }) {
  const [guestInfo] = useState(() => getGuestStateFromUrl())
  const guestName =
    typeof guestInfo.displayName === "string" && guestInfo.displayName.trim().length > 0
      ? guestInfo.displayName.trim()
      : "Invitado"
  const [showWelcomeBg, setShowWelcomeBg] = useState(false);
  const [showGuestName, setShowGuestName] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (showConfetti) {
      const duration = 2000; // Reducido a 2 segundos
      const end = Date.now() + duration;

      const frame = () => {
        try {
          const goldColors = ["#D4AF37", "#FFDF00", "#DAA520", "#B8860B", "#F3E5AB"]

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

        if (Date.now() < end) {
          requestAnimationFrame(frame)
        }
      }
      frame();
    }
  }, [showConfetti]);

  const [rsvpName, setRsvpName] = useState("")
  const [rsvpComments, setRsvpComments] = useState("")
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpFeedback, setRsvpFeedback] = useState(null) // { type: 'ok' | 'err', text: string }

  const [timeLeft, setTimeLeft] = useState(() => getTimeRemaining(WEDDING_CEREMONY_TARGET_MS))
  const [conocimosLightboxOpen, setConocimosLightboxOpen] = useState(false)

  useEffect(() => {
    setTimeLeft(getTimeRemaining(WEDDING_CEREMONY_TARGET_MS))
    const timer = setInterval(() => {
      setTimeLeft(getTimeRemaining(WEDDING_CEREMONY_TARGET_MS))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    // Cuando el sobre ya está abierto, revelamos secuencialmente los mensajes y la tarjeta
    if (envelopeOpen) {
      // 0. Mostrar fondo de bienvenida dinámico
      const timerBgIn = setTimeout(() => setShowWelcomeBg(true), 100);

      // 1. Mostrar el nombre del invitado
      const timerNameIn = setTimeout(() => setShowGuestName(true), 800);
      const timerNameOut = setTimeout(() => setShowGuestName(false), 3000);

      // 2. Mostrar el mensaje
      const timerMsgIn = setTimeout(() => setShowMessage(true), 3800);
      const timerMsgOut = setTimeout(() => setShowMessage(false), 6000);

      // 3. Mostrar la tarjeta de invitación (y ocultar suavemente el fondo)
      const timerCard = setTimeout(() => {
        setShowWelcomeBg(false);
        setShowCard(true);
        setShowConfetti(true);
      }, 6800);

      return () => {
        clearTimeout(timerBgIn);
        clearTimeout(timerNameIn);
        clearTimeout(timerNameOut);
        clearTimeout(timerMsgIn);
        clearTimeout(timerMsgOut);
        clearTimeout(timerCard);
      };
    }
  }, [envelopeOpen]);

  const scrollContainerToTop = useCallback(() => {
    const el = scrollContainerRef?.current
    if (!el) return
    el.scrollTop = 0
    el.scrollLeft = 0
  }, [scrollContainerRef])

  const onHeroImageSettled = useCallback(() => {
    scrollContainerToTop()
    requestAnimationFrame(() => {
      scrollContainerToTop()
      requestAnimationFrame(scrollContainerToTop)
    })
  }, [scrollContainerToTop])

  async function handleRsvpSubmit(e) {
    e.preventDefault()
    setRsvpFeedback(null)

    const fullName = guestInfo.prefillRsvpName ? guestName.trim() : rsvpName.trim()
    if (!fullName) {
      setRsvpFeedback({ type: "err", text: "Indica nombre y apellidos para confirmar." })
      return
    }

    const comments = rsvpComments.trim()
    const slug = extractSlugFromLocation()
    const hasPlusOneGuest = Boolean(guestInfo.plusOne)

    if (slug) {
      try {
        await fetch("/api/rsvp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug,
            name: fullName,
            plusOne: hasPlusOneGuest,
            plusOneName: "",
            menu: "",
            plusOneMenu: "",
            dietary: comments,
            email: "",
            phone: "",
          }),
        })
      } catch {
        /* silencioso: mismo criterio que track */
      }
    }

    const lines = [
      "Hola, confirmo mi asistencia a la boda de Lis y Juanjo.",
      "",
      `Nombre: ${fullName}`,
      hasPlusOneGuest ? "Con acompañante (+1)." : "Voy solo/a.",
    ]
    if (comments) lines.push("", "Alergias u observaciones:", comments)
    const text = lines.join("\n")

    const url = `https://wa.me/${RSVP_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")

    setRsvpSubmitting(true)
    window.setTimeout(() => setRsvpSubmitting(false), 800)

    setRsvpFeedback({
      type: "ok",
      text: "Se ha abierto el mensaje preparado; solo tienes que pulsar Enviar. Quedarás en pre-confirmación hasta que Lis y Juanjo validen tu asistencia.",
    })
  }

  useLayoutEffect(() => {
    if (!showCard) return
    scrollContainerToTop()
  }, [showCard, scrollContainerToTop])

  useEffect(() => {
    if (!showCard) return
    const t = window.setTimeout(() => {
      scrollContainerToTop()
    }, 400)
    return () => window.clearTimeout(t)
  }, [showCard, scrollContainerToTop])

  return (
    <div className="relative flex w-full min-h-0 flex-col items-center px-4 pb-12 pt-4">

      {/* FONDO DE BIENVENIDA (Aparece sólo durante la secuencia inicial) */}
      <div
        className={`fixed inset-0 z-0 bg-cover bg-center transition-opacity duration-[2000ms] ease-in-out pointer-events-none
          ${showWelcomeBg ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ backgroundImage: `url('/boda/fondo-nombre-bienvenida.webp')` }}
      ></div>

      {/* NOMBRE DEL INVITADO EN TODA LA PÁGINA */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-10 px-6 transition-all duration-[1200ms] ease-out pointer-events-none
          ${showGuestName ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}
      >
        <h2 className="text-[5rem] sm:text-[6.5rem] md:text-[9rem] font-serif text-wine-dark text-center max-w-4xl !leading-[0.9] md:!leading-[0.85] tracking-wide" style={{ textShadow: '0 0 40px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,0.6)' }}>
          {guestName.split(' ').map((word, i) => (
            <span key={i} className="block">{word}</span>
          ))}
        </h2>
      </div>

      {/* MENSAJE EN TODA LA PÁGINA */}
      <div
        className={`fixed inset-0 flex items-center justify-center z-10 px-6 transition-all duration-[1500ms] ease-out pointer-events-none 
          ${showMessage ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}
        `}
      >
        <h2 className="text-4xl md:text-6xl font-serif text-wine-dark text-center max-w-4xl !leading-[1.1] md:!leading-[1] tracking-wide" style={{ textShadow: '0 0 40px rgba(255,255,255,0.9), 0 0 10px rgba(255,255,255,0.6)' }}>
          ¡Queremos que estés presente en este momento!
        </h2>
      </div>

      {/* TARJETA FÍSICA INVITACIÓN (Aparece después del mensaje) */}
      <div className={`relative z-20 w-full max-w-lg bg-[#fbfaf9] shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden flex flex-col items-center pt-16 pb-20 px-6 sm:px-12 text-center transition-all duration-[2000ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${showCard ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-95 pointer-events-none'}`}>

        {/* Textura de ruido suave (efecto papel crema) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("/boda/cream-paper.png")' }}></div>

        {/* Borde interior elegante */}
        <div className="absolute inset-3 sm:inset-4 border-[1px] border-[#e5d5c5]/80 pointer-events-none rounded-sm"></div>
        <div className="absolute inset-[14px] sm:inset-[18px] border-[0.5px] border-[#e5d5c5]/40 pointer-events-none rounded-sm"></div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative z-10 w-full flex flex-col items-center">

          <FadeInSection className="w-full mb-14" delay="200ms">
            {/*
              Portada: único bloque a ancho hasta el borde interno de la tarjeta
              (-mx-* compensa el padding px-6 / px-12 del panel de la tarjeta).
            */}
            <div className="relative z-10 -mx-6 -mt-16 mb-6 w-[calc(100%+48px)] max-w-[calc(100%+48px)] overflow-hidden border-b border-[#e5d5c5]/60 shadow-[0_12px_40px_rgba(62,42,42,0.12)] sm:-mx-12 sm:w-[calc(100%+96px)] sm:max-w-[calc(100%+96px)]">
              {/* Foto principal: mismo encuadre en todos los dispositivos (aspect-ratio + object-position únicos) */}
              <div className="relative bg-[#f8f5f1]">
                <div className="w-full max-w-full px-5 pt-6 pb-3 sm:px-7 sm:pt-9 sm:pb-4 [container-type:inline-size]">
                  <p className="whitespace-nowrap text-center font-serif font-bold italic tracking-[0.07em] text-wine-dark text-[clamp(1.05rem,11cqw,2.65rem)] sm:tracking-[0.1em] md:tracking-[0.12em]">
                    ¡NOS CASAMOS!
                  </p>
                </div>
                <div className="px-3 pb-0.5 sm:px-4 sm:pb-1">
                  <div className="relative w-full overflow-hidden rounded-[2px] border border-[#e3d5c7] bg-[#faf8f5] shadow-[0_4px_18px_rgba(62,42,42,0.08),inset_0_0_0_1px_rgba(255,255,255,0.4)]">
                    <div className="group relative aspect-[4/5] w-full overflow-hidden">
                      <img
                        src="/boda/Nos-casamos.jpg"
                        alt="Lis y Juanjo — Nos casamos"
                        fetchPriority="high"
                        decoding="async"
                        onLoad={onHeroImageSettled}
                        onError={onHeroImageSettled}
                        className="absolute inset-0 h-full w-full object-cover object-[center_30%] transition-transform duration-[1000ms] ease-out motion-safe:group-hover:scale-[1.02]"
                      />
                      <div
                        className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_24px_rgba(71,20,33,0.04)]"
                        aria-hidden
                      />
                    </div>
                  </div>
                </div>
                <div className="flex w-full justify-center px-4 pb-1 pt-4 sm:pt-5">
                  <img
                    src="/boda/lis-y-juanjo.png"
                    alt="Firma Lis y Juanjo"
                    decoding="async"
                    onLoad={onHeroImageSettled}
                    onError={onHeroImageSettled}
                    className="h-auto w-full max-w-[280px] select-none object-contain drop-shadow-[0_2px_8px_rgba(0,0,0,0.08)] sm:max-w-[340px]"
                  />
                </div>
              </div>
            </div>

            <p className="text-2xl sm:text-3xl text-black italic font-serif font-bold mt-8">Acompáñanos a celebrar nuestro día</p>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 1: CÓMO NOS CONOCIMOS */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <SectionTitleWithOrnament dense>Cómo nos conocimos</SectionTitleWithOrnament>
            <div className="mx-auto mb-5 max-w-md space-y-2.5 px-4 text-center sm:space-y-3">
              <p className={historiaBodyClass}>Nos conocimos en una boda.</p>
              <p className={historiaBodyClass}>
                Y aquella noche, sin sospecharlo, el amor empezó a escribir nuestra historia.
              </p>
              <p className={historiaBodyClass}>
                Entre todas las personas.
                <br />
                Entre todas las conversaciones.
                <br />
                Nos elegimos.
              </p>
            </div>

            <div className={fotoMarcoInvitacion}>
              <button
                type="button"
                onClick={() => setConocimosLightboxOpen(true)}
                className="group relative block w-full cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/50 focus-visible:ring-offset-2"
                aria-label="Ampliar foto — nos elegimos"
              >
                <img
                  src="/boda/6690c395-e6e4-48b8-8c25-492c9ac597cf.png"
                  alt="Lis y Juanjo — nos elegimos"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto max-h-[min(65svh,480px)] object-cover object-center transition-opacity duration-300 group-hover:opacity-95 sm:max-h-[520px]"
                />
              </button>
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 2: ESA CERTEZA TRANQUILA */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <SectionTitleWithOrnament dense>Esa certeza tranquila</SectionTitleWithOrnament>
            <div className="mx-auto mb-5 max-w-md space-y-2.5 px-4 text-center sm:space-y-3">
              <p className={historiaBodyClass}>No fue casualidad.</p>
              <p className={historiaBodyClass}>
                Fue esa certeza tranquila que aparece sin hacer ruido y susurra:
                <br />“Aquí es”.
              </p>
              <p className={historiaBodyClass}>
                Desde el primer instante todo fue fácil.
                <br />
                Natural.
                <br />
                Como si, de alguna manera, lleváramos toda la vida esperando este momento.
              </p>
            </div>

            <div className={fotoMarcoInvitacion}>
              <img
                src="/boda/5d4c1529-3ed0-4812-a346-799dec95b802.png"
                alt="Encuentro"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 3: DISTANCIA */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <SectionTitleWithOrnament dense>La distancia no fue barrera</SectionTitleWithOrnament>
            <div className="mx-auto mb-5 max-w-md space-y-2.5 px-4 text-center sm:space-y-3">
              <p className={historiaBodyClass}>
                Él en Barcelona.
                <br />
                Ella en Madrid.
              </p>
              <p className={historiaBodyClass}>
                Pero cuando dos personas deciden caminar en la misma dirección, las distancias dejan de ser obstáculos y
                se transforman en ilusión.
              </p>
            </div>

            <div className={fotoMarcoInvitacion}>
              <img
                src="/boda/01cce7b4-4112-4927-abc9-1b3a3bb9bfb1.png"
                alt="Distancia"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 4: UN PROYECTO DE VIDA */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <SectionTitleWithOrnament dense>Un proyecto de vida</SectionTitleWithOrnament>
            <div className="mx-auto mb-5 max-w-md space-y-2.5 px-4 text-center sm:space-y-3">
              <p className={historiaBodyClass}>
                Juanjo dejó Barcelona para empezar una nueva vida con Lis en Madrid.
              </p>
              <p className={historiaBodyClass}>
                Lo que comenzó en una noche inesperada acabó convirtiéndose en un proyecto de vida.
              </p>
            </div>

            <div className={fotoMarcoInvitacion}>
              <img
                src="/boda/929a4c1a-a108-409f-bfcb-85f70664deac.png"
                alt="Nuestro hogar"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 5: SÉ PARTE DE NOSOTROS */}
          <FadeInSection className="w-full mb-10" delay="300ms">
            <SectionTitleWithOrnament dense>Sé parte de nosotros</SectionTitleWithOrnament>
            <div className="mx-auto mb-6 max-w-md space-y-2.5 px-4 text-center sm:space-y-3">
              <p className={historiaBodyClass}>
                Y ahora queremos celebrar de forma oficial lo que el corazón ya sabía desde el principio.
              </p>
              <p className={historiaBodyClass}>Nos casamos.</p>
              <p className={historiaBodyClass}>
                Nos haría muchísima ilusión que estuvieras allí. Porque eres una parte importante de nuestras vidas.
              </p>
              <p className={historiaBodyClass}>
                Para compartirlo.
                <br />
                Para sentirlo.
                <br />
                Para celebrarlo juntos.
              </p>
              <div className="mt-6 flex flex-col items-center text-center">
                <p className="inline-flex flex-wrap items-center justify-center gap-2.5 sm:gap-3 font-serif text-2xl sm:text-3xl md:text-4xl text-neutral-500 italic font-medium tracking-[0.04em]">
                  <span>Te esperamos</span>
                  <svg
                    className="h-[0.95em] w-[0.95em] shrink-0 text-neutral-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden
                  >
                    <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                  </svg>
                </p>
                {guestName !== "Invitado" ? (
                  <p className="mt-3 font-serif text-2xl sm:text-[1.65rem] text-wine-dark font-semibold tracking-wide leading-snug">
                    {guestName}
                  </p>
                ) : null}
              </div>
            </div>

            <div className={fotoMarcoInvitacion}>
              <img
                src="/boda/d0e41918-df85-4a43-bef6-9646831e9ddc.png"
                alt="Sé parte de nuestra historia"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* FECHA Y HORA */}
          <FadeInSection className="w-full mb-16 mt-8" delay="400ms">
            <SectionTitleWithOrnament>{guestName !== "Invitado" ? `${guestName.split(" ")[0]}, guárdate este día` : "Guárdate este día"}</SectionTitleWithOrnament>

            {/* Calendario: object-cover + aspecto cuadrado recorta márgenes horizontales del PNG; el motivo se ve más grande */}
            <div className="mx-auto mb-8 w-full max-w-xs overflow-hidden rounded-sm aspect-square shadow-[0_2px_12px_rgba(62,42,42,0.06)] sm:max-w-sm md:max-w-md">
              <img
                src={FECHA_CALENDARIO_SRC}
                alt="Calendario"
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover object-center"
              />
            </div>

            <div
              className="mx-auto mb-8 max-w-md rounded-sm bg-black px-4 py-5 text-center shadow-md sm:px-6"
              role="note"
            >
              <span className="block font-serif text-base italic leading-relaxed tracking-wide text-white/95 sm:text-[1.05rem]">
                Aunque adoramos a los peques, esta celebración será solo para adultos
              </span>
              <span className="mt-3 block font-sans text-sm font-bold uppercase tracking-[0.18em] text-white">
                SOLO ADULTOS
              </span>
            </div>

            <div className="flex w-full flex-col items-center">
              <div className="relative mx-auto w-full max-w-md overflow-hidden rounded-sm border-[0.5px] border-[#e5d5c5]/80 bg-[#faf8f5] py-9 shadow-[0_4px_15px_rgba(0,0,0,0.05),_0_1px_3px_rgba(0,0,0,0.03)] px-6 sm:py-12 sm:px-10 flex flex-col items-center">
                {/* Textura de papel para el cuadro */}
                <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("/boda/cream-paper.png")' }}></div>

                <div className="relative z-10 flex flex-col items-center w-full min-w-0">
                  <div
                    className="flex flex-col items-center gap-0.5 sm:gap-1 font-sans font-light text-wine tabular-nums"
                    aria-label="19 de septiembre de 2026"
                  >
                    <span className="text-5xl leading-[0.95] tracking-[0.06em] sm:text-6xl md:text-7xl lg:text-8xl">19</span>
                    <span className="text-2xl leading-none text-wine/45 select-none sm:text-3xl md:text-4xl py-0.5" aria-hidden>
                      −
                    </span>
                    <span className="text-5xl leading-[0.95] tracking-[0.06em] sm:text-6xl md:text-7xl lg:text-8xl">09</span>
                    <span className="text-2xl leading-none text-wine/45 select-none sm:text-3xl md:text-4xl py-0.5" aria-hidden>
                      −
                    </span>
                    <span className="text-5xl leading-[0.95] tracking-[0.06em] sm:text-6xl md:text-7xl lg:text-8xl">26</span>
                  </div>
                  <div className="w-16 sm:w-24 h-px bg-wine/25 mx-auto my-5 sm:my-7" />
                  <p className="font-sans text-xl sm:text-2xl md:text-3xl text-wine-dark/85 font-normal tracking-[0.12em] text-center">
                    a las 17:00
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* DÓNDE SERÁ */}
          <FadeInSection className="w-full mb-16" delay="500ms">
            <SectionTitleWithOrnament>¿Dónde será?</SectionTitleWithOrnament>
            <div className="flex flex-col items-center gap-7">
              <p className="mx-auto max-w-lg px-3 text-center text-[0.95rem] leading-snug text-wine-dark sm:text-[1.05rem] sm:leading-snug font-serif font-medium">
                El día tendrá dos momentos en sitios distintos: primero la ceremonia en la iglesia y después la celebración en La Batipuerta.
              </p>

              <div className="flex w-full max-w-md flex-col gap-5 px-2">
                {/* Ceremonia — cabecera en color granate */}
                <article className="overflow-hidden rounded-sm border-[1.5px] border-wine/40 bg-[#faf8f6] shadow-[0_8px_28px_rgba(62,42,42,0.08)]">
                  <header className="flex items-center justify-center gap-3 bg-wine px-4 py-3.5 text-[#fdfbf8] sm:gap-4 sm:px-5 sm:py-4">
                    <span
                      className="select-none font-sans text-[2.85rem] font-black tabular-nums leading-none tracking-tight sm:text-[3.35rem]"
                    >
                      1
                    </span>
                    <div className="min-w-0 border-l border-white/35 pl-3 text-left sm:pl-4">
                      <span className="block font-serif text-[1.35rem] font-semibold leading-none sm:text-[1.55rem]">
                        Ceremonia
                      </span>
                    </div>
                  </header>
                  <div className="px-5 py-5 text-center sm:px-7 sm:py-6">
                    <h3 className="font-serif text-[1.2rem] font-semibold leading-snug text-wine sm:text-[1.35rem] sm:leading-tight">
                      Iglesia Nuestra Señora de la Asunción
                    </h3>
                    <p className="mt-3 inline-block rounded-sm border border-wine/20 bg-white/70 px-3 py-1.5 font-sans text-lg font-bold tabular-nums tracking-wide text-wine-dark sm:text-xl">
                      17:00 h
                    </p>
                    <div className="mx-auto mt-4 max-w-sm border-t border-wine/20 pt-4">
                      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-wine-dark/65 sm:text-[11px]">
                        Dirección (para apuntar o dar al taxi)
                      </p>
                      <address className="mt-2.5 not-italic">
                        <p className="font-sans text-base font-semibold leading-snug text-wine-dark sm:text-[1.05rem]">
                          Calle de la Iglesia, número 1
                        </p>
                        <p className="mt-1.5 font-sans text-sm font-medium leading-snug text-wine-dark sm:text-base">
                          Código postal 37710 — Candelario (Salamanca), España
                        </p>
                      </address>
                    </div>
                    <button
                      type="button"
                      aria-label="Abrir cómo llegar a la ceremonia en Google Maps"
                      className="mx-auto mt-5 flex w-full max-w-[20rem] items-center justify-center gap-2 rounded-sm border-[1.5px] border-wine bg-wine px-4 py-2.5 text-sm font-semibold tracking-wide text-[#fdfbf8] shadow-sm transition-colors hover:bg-wine-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/45 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f6] sm:text-base sm:py-3"
                      onClick={() => window.open(CHURCH_GOOGLE_MAPS_URL, "_blank", "noopener,noreferrer")}
                    >
                      <IconoCalleLlegar className="h-5 w-5 shrink-0 text-[#fdfbf8] sm:h-[1.35rem] sm:w-[1.35rem]" />
                      <span>Cómo llegar</span>
                    </button>
                    <p className="mt-3 font-sans text-[12px] leading-relaxed text-wine-dark/80 sm:text-[13px]">
                      Llegad con un poco de tiempo para aparcar y localizar la entrada a la iglesia.
                    </p>
                  </div>
                </article>

                {/* Celebración — cabecera en otro tono (verde bosque suave), número 2 destacado */}
                <article className="overflow-hidden rounded-sm border-[1.5px] border-[#4a6148]/45 bg-[#faf8f6] shadow-[0_8px_28px_rgba(62,42,42,0.06)]">
                  <header className="flex items-center justify-center gap-3 bg-[#4a6148] px-4 py-3.5 text-[#f5faf4] sm:gap-4 sm:px-5 sm:py-4">
                    <span
                      className="select-none font-sans text-[2.85rem] font-black tabular-nums leading-none tracking-tight sm:text-[3.35rem]"
                    >
                      2
                    </span>
                    <div className="min-w-0 border-l border-white/35 pl-3 text-left sm:pl-4">
                      <span className="block font-serif text-[1.35rem] font-semibold leading-none sm:text-[1.55rem]">
                        Celebración
                      </span>
                    </div>
                  </header>
                  <div className="px-5 py-5 text-center sm:px-7 sm:py-6">
                    <h3 className="font-serif text-[1.2rem] font-semibold leading-snug text-[#3d5540] sm:text-[1.35rem] sm:leading-tight">
                      La Batipuerta
                    </h3>
                    <p className="mx-auto mt-3 max-w-[22rem] font-sans text-[0.875rem] font-medium leading-relaxed text-wine-dark sm:text-[0.95rem]">
                      Al terminar la ceremonia seguimos el convite en este espacio (mismo pueblo, trayecto corto en coche).
                    </p>
                    <div className="mx-auto mt-4 max-w-sm border-t border-[#4a6148]/20 pt-4">
                      <p className="font-sans text-[10px] font-bold uppercase tracking-[0.14em] text-wine-dark/65 sm:text-[11px]">
                        Dirección (para apuntar o dar al taxi)
                      </p>
                      <address className="mt-2.5 not-italic">
                        <p className="font-sans text-base font-semibold leading-snug text-wine-dark sm:text-[1.05rem]">
                          Calle Los Cantos, número 2
                        </p>
                        <p className="mt-1.5 font-sans text-sm font-medium leading-snug text-wine-dark sm:text-base">
                          Código postal 37710 — Candelario (Salamanca), España
                        </p>
                      </address>
                    </div>
                    <button
                      type="button"
                      aria-label="Abrir cómo llegar a la celebración en Google Maps"
                      className="mx-auto mt-5 flex w-full max-w-[20rem] items-center justify-center gap-2 rounded-sm border-[1.5px] border-[#4a6148] bg-[#4a6148] px-4 py-2.5 text-sm font-semibold tracking-wide text-[#f5faf4] shadow-sm transition-colors hover:bg-[#3d5140] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#4a6148]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#faf8f6] sm:text-base sm:py-3"
                      onClick={() => window.open(RECEPTION_GOOGLE_MAPS_URL, "_blank", "noopener,noreferrer")}
                    >
                      <IconoCalleLlegar className="h-5 w-5 shrink-0 text-[#f5faf4] sm:h-[1.35rem] sm:w-[1.35rem]" />
                      <span>Cómo llegar</span>
                    </button>
                    <p className="mt-3 font-sans text-[12px] leading-relaxed text-wine-dark/80 sm:text-[13px]">
                      En Maps podréis ver el acceso rural y zonas cercanas para aparcar con calma.
                    </p>
                  </div>
                </article>

                {/* Horario cóctel */}
                <div className="rounded-sm border border-wine/25 bg-white/60 px-4 py-4 text-center shadow-sm sm:px-6 sm:py-5">
                  <p className="font-sans text-xs font-bold uppercase tracking-[0.12em] text-wine-dark/75 sm:text-sm">
                    Ritmo del día
                  </p>
                  <p className="mt-2.5 font-serif text-[1rem] font-medium leading-relaxed text-wine-dark sm:text-[1.1rem]">
                    Cóctel al atardecer y fiesta hasta las{" "}
                    <span className="whitespace-nowrap font-semibold tabular-nums text-wine-dark">00:00 h</span>.
                    <br />
                    <span className="font-medium text-wine-dark/90">Después, lo que surja.</span>
                  </p>
                </div>
              </div>

              <div className="flex w-full max-w-md flex-col items-center">
                <p className="font-serif text-lg font-semibold text-wine sm:text-xl">
                  Fotitos del lugar
                </p>
                <p className="mt-1 max-w-[22rem] text-center font-sans text-[12px] font-medium uppercase tracking-[0.12em] text-wine-dark/55 sm:text-[13px] sm:tracking-[0.14em]">
                  Un adelanto de La Batipuerta · Candelario (Salamanca)
                </p>
                <div className={`mt-3 ${fotoMarcoInvitacion}`}>
                  <VenueFincaCarousel />
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* CÓDIGO DE VESTIMENTA */}
          <FadeInSection className="w-full mb-16" delay="550ms">
            <SectionTitleWithOrnament>Código de vestimenta</SectionTitleWithOrnament>
            <div className="mx-auto w-full max-w-md px-4">
              <div className="rounded-sm border border-[#e5d5c5]/90 bg-gradient-to-b from-[#fdfcfa] to-[#f8f4ef] px-6 py-8 text-center shadow-[0_6px_28px_rgba(71,20,33,0.07)] sm:px-9 sm:py-10">
                <p className="font-sans text-[0.65rem] font-semibold uppercase tracking-[0.28em] text-wine/75">
                  Dress code
                </p>
                <p className="mt-3 font-serif text-[1.2rem] font-light italic leading-snug tracking-[0.02em] text-wine-dark sm:text-[1.35rem] sm:leading-[1.35]">
                  Cóctel formal al atardecer.
                </p>
                <div
                  className="mx-auto mt-6 max-w-[12rem] border-t border-wine/15 pt-6"
                  aria-hidden
                />
                <p className="font-serif text-sm leading-relaxed text-wine-dark/60 sm:text-[0.95rem]">
                  El evento tendrá lugar en zonas de piedra, por lo que recomendamos calzado
                  adecuado.
                </p>
              </div>
            </div>
          </FadeInSection>

          {/* REGALO */}
          <FadeInSection className="w-full mb-16" delay="600ms">
            <div className="w-full border-y border-[#e5d5c5]/60 py-10 bg-[#e5d5c5]/10 px-6 rounded-sm">
              <SectionTitleWithOrnament>Sobre el regalo</SectionTitleWithOrnament>
              <p className="text-base sm:text-lg text-wine-dark/80 mb-6 font-serif italic max-w-sm mx-auto leading-relaxed">
                Tu presencia es el mejor regalo para comenzar esta nueva etapa.
                <br /><br />
                Y si además quieres ayudarnos a seguir construyendo nuestro hogar, puedes hacerlo aquí:
              </p>
              <div className="bg-white/60 p-4 rounded-sm border border-wine/10 inline-block text-base sm:text-lg text-wine-dark break-all mb-6 max-w-full">
                Titulares: Lis & Juanjo<br />
                IBAN:{" "}
                <span className="font-bold tracking-wide sm:tracking-wider mt-2 inline-block font-mono text-sm sm:text-base md:text-lg text-wine">
                  ES42&nbsp;0182&nbsp;5322&nbsp;2802&nbsp;0868&nbsp;6251
                </span>
                <span className="mt-3 block text-left">
                  SWIFT/BIC:{" "}
                  <span className="font-bold tracking-wide font-mono text-sm sm:text-base md:text-lg text-wine">
                    BBVAESMM
                  </span>
                </span>
                <p className="mt-4 border-t border-wine/15 pt-3 text-center text-base sm:text-lg text-wine-dark/75 font-serif italic leading-relaxed break-normal">
                  También se acepta dinero en efectivo y sobre con amor 💌
                </p>
              </div>
              <p className="text-base sm:text-lg text-wine-dark/80 font-serif italic max-w-sm mx-auto leading-relaxed">
                Gracias por acompañarnos en el día que, sin saberlo, el destino llevaba tiempo preparando.
              </p>
            </div>
          </FadeInSection>

          {/* RSVP FORM Y COUNTDOWN */}
          <FadeInSection className="w-full mb-16" delay="700ms">
            {/* Cuenta atrás + recordatorio calendario */}
            <div className="mb-8 w-full rounded-sm border-y border-[#e5d5c5]/60 py-6 sm:py-7 bg-[#e5d5c5]/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]">
              <p className="text-lg sm:text-xl md:text-2xl text-wine-dark mb-5 px-3 sm:px-4 text-center leading-snug font-serif font-bold">
                La fecha de confirmación límite es el:
                <br />
                <span className="text-wine mt-1 inline-block">25 de junio de 2026</span>
              </p>
              <div className="flex justify-center gap-0.5 sm:gap-3 md:gap-5 px-0.5 sm:px-0">
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{timeLeft.dias ?? 0}</span>
                  <span className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2 font-bold">Días</span>
                </div>
                <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-wine/35 mt-0.5 sm:mt-1 shrink-0 font-bold leading-none font-[Arial,Helvetica,sans-serif]">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{String(timeLeft.horas ?? 0).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2 font-bold">Hrs</span>
                </div>
                <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-wine/35 mt-0.5 sm:mt-1 shrink-0 font-bold leading-none font-[Arial,Helvetica,sans-serif]">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{String(timeLeft.minutos ?? 0).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2 font-bold">Min</span>
                </div>
                <span className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl text-wine/35 mt-0.5 sm:mt-1 shrink-0 font-bold leading-none font-[Arial,Helvetica,sans-serif]">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{String(timeLeft.segundos ?? 0).padStart(2, "0")}</span>
                  <span className="text-[10px] sm:text-[11px] md:text-xs uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2 font-bold">Seg</span>
                </div>
              </div>

              <div className="mt-5 mx-auto max-w-xs border-t border-wine/10 pt-4 px-3">
                <p className="text-center text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-wine-dark/75 mb-1">
                  Poner recordatorio
                </p>
                <p className="text-center text-[10px] sm:text-[11px] text-wine-dark/55 font-serif italic mb-3">
                  Elige tu aplicación
                </p>
                <div className="flex justify-center gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    aria-label="Añadir en Google Calendar"
                    title="Google Calendar"
                    onClick={() =>
                      window.open(buildGoogleCalendarUrl(), "_blank", "noopener,noreferrer")
                    }
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-wine/30 bg-white/70 text-wine shadow-sm transition-colors hover:border-wine/55 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/35 focus-visible:ring-offset-2"
                  >
                    <IconCalendarGoogle className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Añadir en Outlook"
                    title="Outlook"
                    onClick={() =>
                      window.open(buildOutlookWebCalendarUrl(), "_blank", "noopener,noreferrer")
                    }
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-wine/30 bg-white/70 shadow-sm transition-colors hover:border-wine/55 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/35 focus-visible:ring-offset-2"
                  >
                    <IconCalendarOutlook className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Descargar archivo de calendario (.ics)"
                    title="Apple y otros (.ics)"
                    onClick={() =>
                      downloadWeddingCalendarReminder(getPublicInviteOrigin())
                    }
                    className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full border border-wine/30 bg-white/70 text-wine-dark/85 shadow-sm transition-colors hover:border-wine/55 hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/35 focus-visible:ring-offset-2"
                  >
                    <IconCalendarIcs className="h-[18px] w-[18px] sm:h-5 sm:w-5" />
                  </button>
                </div>
              </div>
            </div>

            <form
              className="w-full max-w-sm mx-auto flex flex-col gap-6"
              onSubmit={handleRsvpSubmit}
            >
              {!guestInfo.prefillRsvpName ? (
                <div className="flex flex-col text-left">
                  <label
                    className="text-xs uppercase tracking-[0.2em] text-wine-dark mb-2 font-medium"
                    htmlFor="rsvp-name"
                  >
                    Nombre completo
                  </label>
                  <input
                    id="rsvp-name"
                    type="text"
                    value={rsvpName}
                    onChange={e => setRsvpName(e.target.value)}
                    autoComplete="name"
                    className="w-full border-b-[1.5px] border-wine/30 bg-transparent py-2 px-1 text-wine-dark focus:outline-none focus:border-wine transition-colors placeholder:text-wine/30 font-serif italic"
                    placeholder="Escribe tu nombre y apellidos"
                    required
                  />
                </div>
              ) : null}

              <div className="flex flex-col text-left">
                <label
                  className="text-xs uppercase tracking-[0.2em] text-wine-dark mb-2 font-medium"
                  htmlFor="rsvp-comments"
                >
                  Alergias o comentarios
                </label>
                <input
                  id="rsvp-comments"
                  type="text"
                  value={rsvpComments}
                  onChange={e => setRsvpComments(e.target.value)}
                  className="w-full border-b-[1.5px] border-wine/30 bg-transparent py-2 px-1 text-wine-dark focus:outline-none focus:border-wine transition-colors placeholder:text-wine/30 font-serif italic"
                  placeholder="Ej: Soy celíaco, etc. (opcional)"
                />
              </div>

              {rsvpFeedback && (
                <p
                  className={`text-sm font-serif italic text-center ${
                    rsvpFeedback.type === "ok" ? "text-wine" : "text-red-800/90"
                  }`}
                  role="status"
                >
                  {rsvpFeedback.text}
                </p>
              )}

              <p className="text-[11px] text-wine-dark/55 font-serif italic px-1">
                Al confirmar se abrirá un mensaje listo para enviarlo al +34 655 93 51 91.
              </p>

              <button
                type="submit"
                disabled={rsvpSubmitting}
                className="mt-2 w-full bg-wine text-cream px-10 py-3.5 rounded-sm text-sm uppercase tracking-widest shadow-md hover:bg-wine-dark hover:shadow-lg transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/50 focus-visible:ring-offset-2"
              >
                {rsvpSubmitting ? "Abriendo…" : "Confirmar asistencia"}
              </button>
            </form>
          </FadeInSection>

          {/* CIERRE EPICO */}
          <FadeInSection className="w-full pb-6" delay="800ms">
            <div className="w-16 h-[1px] bg-wine/30 mx-auto mb-10"></div>
            <h2 className="text-6xl sm:text-7xl font-serif text-wine mb-6 mt-2 !leading-tight">
              {guestName !== "Invitado" ? (
                <>{guestName.split(" ")[0]},<br /><span className="text-5xl sm:text-6xl">te esperamos</span></>
              ) : "Te esperamos"}
            </h2>
            <div className="flex justify-center mb-6">
              <svg className="w-8 h-8 text-wine/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-wine-dark/50 font-medium">Con muchísimo amor</p>
          </FadeInSection>
      </div>
    </div>
      <ImageLightbox
        isOpen={conocimosLightboxOpen}
        onClose={() => setConocimosLightboxOpen(false)}
        src="/boda/6690c395-e6e4-48b8-8c25-492c9ac597cf.png"
        alt="Lis y Juanjo — nos elegimos"
      />
    </div>
  )
}

export default Invitation
