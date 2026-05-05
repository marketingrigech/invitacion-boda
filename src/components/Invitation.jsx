import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import confetti from "canvas-confetti"
import ImageLightbox from "./ImageLightbox"

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

const VENUE_GOOGLE_MAPS_URL = "https://maps.app.goo.gl/4hmsB7UvMiubGZLWA"

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

const WEDDING_ICS_LOCATION = "La Batípuerta, Candelario, Salamanca"

const CAL_EVENT_SUMMARY = "Boda Lis y Juanjo"
const CAL_EVENT_DESCRIPTION = `Ceremonia y celebración (${WEDDING_ICS_LOCATION}). Confirma tu asistencia antes del 25 de junio de 2026.`
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
function SectionTitleWithOrnament({ children, className = "" }) {
  return (
    <div className={`flex flex-col items-center justify-center mb-8 w-full px-2 ${className}`}>
      <h2 className="text-3xl sm:text-4xl font-serif text-wine text-center mb-3">{children}</h2>
      <FloralOrnament className="w-48 sm:w-60 h-auto text-wine/50 shrink-0 drop-shadow-[0_1px_0_rgba(255,255,255,0.6)]" />
    </div>
  );
}

function FadeInSection({ children, className = "", delay = "0ms", observerRoot = null }) {
  const domRef = useRef()
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
          }
        })
      },
      {
        root: observerRoot,
        threshold: 0.08,
        rootMargin: "0px 0px -12px 0px",
      },
    )

    const currentRef = domRef.current
    if (currentRef) observer.observe(currentRef)
    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [observerRoot])

  return (
    <div className={`fade-in-section ${className}`} ref={domRef} style={{ transitionDelay: delay }}>
      {children}
    </div>
  )
}

function Invitation({ envelopeOpen, scrollContainerRef }) {
  const [guestInfo] = useState(() => getGuestStateFromUrl())
  const guestName = guestInfo.displayName
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
        const goldColors = ['#D4AF37', '#FFDF00', '#DAA520', '#B8860B', '#F3E5AB'];
        
        confetti({
          particleCount: 8,
          angle: 60,
          spread: 80,
          origin: { x: -0.1, y: 0.85 },
          startVelocity: 65,
          colors: goldColors,
          ticks: 200,
          zIndex: 100
        });
        confetti({
          particleCount: 8,
          angle: 120,
          spread: 80,
          origin: { x: 1.1, y: 0.85 },
          startVelocity: 65,
          colors: goldColors,
          ticks: 200,
          zIndex: 100
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };
      frame();
    }
  }, [showConfetti]);

  const [rsvpName, setRsvpName] = useState(() =>
    guestInfo.prefillRsvpName ? guestInfo.displayName : "",
  )
  const [rsvpComments, setRsvpComments] = useState(() =>
    guestInfo.prefillRsvpName ? "Sin alergías ni observaciones." : "",
  )
  const [rsvpPlusOne, setRsvpPlusOne] = useState(() => guestInfo.plusOne === true)
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

  function handleRsvpSubmit(e) {
    e.preventDefault()
    setRsvpFeedback(null)

    const fullName = rsvpName.trim()
    if (!fullName) {
      setRsvpFeedback({ type: "err", text: "Indica nombre y apellidos para confirmar." })
      return
    }

    const comments = rsvpComments.trim()

    const lines = [
      "Hola, confirmo mi asistencia a la boda de Lis y Juanjo.",
      "",
      `Nombre: ${fullName}`,
      rsvpPlusOne ? "Con acompañante (+1)." : "Voy solo/a.",
    ]
    if (comments) lines.push("", "Alergias u observaciones:", comments)
    const text = lines.join("\n")

    const url = `https://wa.me/${RSVP_WHATSAPP_PHONE}?text=${encodeURIComponent(text)}`
    window.open(url, "_blank", "noopener,noreferrer")

    setRsvpSubmitting(true)
    window.setTimeout(() => setRsvpSubmitting(false), 800)

    setRsvpFeedback({
      type: "ok",
      text: "Se ha abierto el mensaje preparado; solo tienes que pulsar Enviar.",
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
        style={{ backgroundImage: `url('/boda/fondo-nombre-bienvenida.png')` }}
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
            <div className="w-[calc(100%+48px)] sm:w-[calc(100%+96px)] -mx-6 sm:-mx-12 -mt-16 mb-6 overflow-hidden relative z-10 shadow-[0_12px_40px_rgba(62,42,42,0.12)] border-b-[0.5px] border-[#e5d5c5]/60">
              {/* Foto principal + firma debajo (en flujo, no superpuesta) */}
              <div className="relative bg-[#f8f5f1]">
                {/* Marco fino, sin el bloque blanco grueso; abraza la imagen para no dejar franjas vacías */}
                <div className="relative w-full overflow-hidden rounded-[2px] border border-[#e3d5c7] bg-[#faf8f5] shadow-[0_4px_18px_rgba(62,42,42,0.08),inset_0_0_0_1px_rgba(255,255,255,0.4)]">
                  <div className="relative w-full overflow-hidden">
                    <img
                      src="/boda/Nos-casamos.jpg"
                      alt="Lis y Juanjo — Nos casamos"
                      fetchPriority="high"
                      decoding="async"
                      onLoad={onHeroImageSettled}
                      onError={onHeroImageSettled}
                      className="block h-[min(58svh,620px)] w-full object-cover object-[center_22%] sm:object-center transition-transform duration-[1000ms] ease-out motion-safe:hover:scale-[1.02]"
                    />
                    <div className="pointer-events-none absolute inset-0 z-[2] flex justify-center px-4 pt-[10%] sm:pt-[12%] md:pt-[14%]">
                      <p className="text-center font-serif font-bold italic tracking-[0.1em] text-wine-dark drop-shadow-[0_2px_20px_rgba(255,255,255,0.98)] sm:tracking-[0.14em] md:tracking-[0.16em] text-[clamp(2.35rem,9vw,4.25rem)] sm:text-[clamp(2.5rem,10vw,4.75rem)]">
                        ¡NOS CASAMOS!
                      </p>
                    </div>
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_24px_rgba(71,20,33,0.04)]"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="flex w-full justify-center px-4 pt-5 pb-1">
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

            <p className="text-xl sm:text-2xl text-black italic font-serif font-bold mt-8">Acompáñanos a celebrar nuestro día</p>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 1: CÓMO NOS CONOCIMOS */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>Cómo nos conocimos</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-8 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Nos conocimos en una boda.
                <br /><br />
                Y aquella noche, sin sospecharlo, el amor empezó a escribir nuestra historia.
                <br /><br />
                Entre todas las personas.<br />
                Entre todas las conversaciones.<br />
                Nos elegimos.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full max-w-md mx-auto -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <button
                type="button"
                onClick={() => setConocimosLightboxOpen(true)}
                className="group relative block w-full cursor-zoom-in overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/50 focus-visible:ring-offset-2"
                aria-label="Ampliar foto de Praga"
              >
                <img
                  src="/boda/historia-praga.png"
                  alt="Praga — cómo nos conocimos"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto max-h-[min(65svh,480px)] object-cover object-center transition-opacity duration-300 group-hover:opacity-95 sm:max-h-[520px]"
                />
              </button>
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 2: ESA CERTEZA TRANQUILA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>Esa certeza tranquila</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                No fue casualidad.
                <br /><br />
                Fue esa certeza tranquila que aparece sin hacer ruido y susurra:
                <br />
                “Aquí es”.
                <br /><br />
                Desde el primer instante todo fue fácil.<br />
                Natural.<br />
                Como si, de alguna manera, lleváramos toda la vida esperando este momento.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="/boda/encuentro.png"
                alt="Encuentro"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 3: DISTANCIA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>La distancia no fue barrera</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Él en Barcelona.<br />
                Ella en Madrid.
                <br /><br />
                Pero cuando dos personas deciden caminar en la misma dirección,
                las distancias dejan de ser obstáculos y se transforman en ilusión.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="/boda/distancia.png"
                alt="Distancia"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 4: UN PROYECTO DE VIDA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>Un proyecto de vida</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Juanjo dejó Barcelona para empezar una nueva vida con Lis en Madrid.
                <br /><br />
                Lo que comenzó en una noche inesperada acabó convirtiéndose en un proyecto de vida.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="/boda/historia-hogar.png"
                alt="Nuestro hogar"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 5: SÉ PARTE DE NOSOTROS */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <SectionTitleWithOrnament>Sé parte de nosotros</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Y ahora queremos celebrar de forma oficial lo que el corazón ya sabía desde el principio.
                <br /><br />
                Nos casamos.
                <br /><br />
                Nos haría muchísima ilusión que estuvieras allí. Porque eres una parte importante de nuestras vidas.
                <br /><br />
                Para compartirlo.<br />
                Para sentirlo.<br />
                Para celebrarlo juntos.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="/boda/historia-parte.png"
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

            <div className="flex justify-center w-full px-8 mb-10">
              <img
                src="/boda/fecha.png"
                alt="Calendario"
                loading="lazy"
                decoding="async"
                className="w-full max-w-[280px] sm:max-w-[320px] opacity-90 scale-110 mix-blend-multiply"
              />
            </div>

            <div className="flex flex-col items-center mt-6 w-full px-4">
              <div className="relative overflow-hidden bg-[#faf8f5] border-[0.5px] border-[#e5d5c5]/80 shadow-[0_4px_15px_rgba(0,0,0,0.05),_0_1px_3px_rgba(0,0,0,0.03)] rounded-sm py-6 px-4 sm:py-8 sm:px-12 w-full max-w-sm flex flex-col items-center mx-auto">
                {/* Textura de papel para el cuadro */}
                <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("/boda/cream-paper.png")' }}></div>

                <div className="relative z-10 flex flex-col items-center w-full min-w-0">
                  <div
                    className="flex flex-col items-center gap-1 sm:gap-1.5 font-sans font-light text-wine tabular-nums"
                    aria-label="19 de septiembre de 2026"
                  >
                    <span className="text-3xl leading-none tracking-[0.08em] sm:text-4xl md:text-5xl">19</span>
                    <span className="text-lg leading-none text-wine/45 select-none sm:text-xl" aria-hidden>
                      −
                    </span>
                    <span className="text-3xl leading-none tracking-[0.08em] sm:text-4xl md:text-5xl">09</span>
                    <span className="text-lg leading-none text-wine/45 select-none sm:text-xl" aria-hidden>
                      −
                    </span>
                    <span className="text-3xl leading-none tracking-[0.08em] sm:text-4xl md:text-5xl">26</span>
                  </div>
                  <div className="w-12 sm:w-16 h-px bg-wine/25 mx-auto my-4 sm:my-5" />
                  <p className="font-sans text-base sm:text-lg md:text-xl text-wine-dark/85 font-normal tracking-[0.12em] text-center">
                    a las 17:00
                  </p>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* DÓNDE SERÁ */}
          <FadeInSection className="w-full mb-16" delay="500ms">
            <SectionTitleWithOrnament>¿Dónde será?</SectionTitleWithOrnament>
            <div className="flex flex-col items-center">
              <div className="mb-6 max-w-md px-2 text-center">
                <p className="text-lg sm:text-xl text-wine-dark/85 font-serif italic mb-3">
                  La Batípuerta
                </p>
                <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                  Candelario, Salamanca
                </p>
                <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed mt-4">
                  Ceremonia y celebración en el mismo lugar.
                  <br />
                  Cóctel al atardecer, cena y fiesta hasta las 00:00…
                  <br />
                  y después, lo que surja.
                </p>
                <button
                  type="button"
                  className="mt-5 inline-flex items-center justify-center gap-2 rounded-sm px-4 py-2 text-sm font-medium tracking-wide text-[#8f7a65] underline-offset-4 transition-colors hover:text-[#6d5c4d] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-wine/40 focus-visible:ring-offset-2"
                  onClick={() => window.open(VENUE_GOOGLE_MAPS_URL, "_blank")}
                >
                  <IconoCalleLlegar className="h-6 w-6 shrink-0 text-[#8f7a65]" />
                  <span>Cómo llegar</span>
                </button>
              </div>

              <div className="w-[calc(100%+24px)] md:w-full max-w-md -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
                <VenueFincaCarousel />
              </div>
            </div>
          </FadeInSection>

          {/* REGALO */}
          <FadeInSection className="w-full mb-16" delay="600ms">
            <div className="w-full border-y border-[#e5d5c5]/60 py-10 bg-[#e5d5c5]/10 px-6 rounded-sm">
              <SectionTitleWithOrnament>Sobre el regalo</SectionTitleWithOrnament>
              <p className="text-sm sm:text-base text-wine-dark/80 mb-6 font-serif italic max-w-sm mx-auto leading-relaxed">
                Tu presencia es el mejor regalo para comenzar esta nueva etapa.
                <br /><br />
                Y si además quieres ayudarnos a seguir construyendo nuestro hogar, puedes hacerlo aquí:
              </p>
              <div className="bg-white/60 p-4 rounded-sm border border-wine/10 inline-block text-sm sm:text-base text-wine-dark break-all mb-6 max-w-full">
                Titulares: Lis & Juanjo<br />
                IBAN:{" "}
                <span className="font-bold tracking-wide sm:tracking-wider mt-2 inline-block font-mono text-sm sm:text-base md:text-lg text-wine">
                  ES76&nbsp;0073&nbsp;0100&nbsp;5504&nbsp;6566&nbsp;5778
                </span>
                <p className="mt-4 border-t border-wine/15 pt-3 text-center text-sm sm:text-base text-wine-dark/75 font-serif italic leading-relaxed break-normal">
                  También se acepta dinero en efectivo y sobre con amor 💌
                </p>
              </div>
              <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic max-w-sm mx-auto leading-relaxed">
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
                  <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{timeLeft.dias ?? 0}</span>
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2.5 font-bold">Días</span>
                </div>
                <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-wine/35 mt-0.5 sm:mt-1 shrink-0 font-bold leading-none font-[Arial,Helvetica,sans-serif]">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{timeLeft.horas ?? 0}</span>
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2.5 font-bold">Hrs</span>
                </div>
                <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-wine/35 mt-0.5 sm:mt-1 shrink-0 font-bold leading-none font-[Arial,Helvetica,sans-serif]">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{timeLeft.minutos ?? 0}</span>
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2.5 font-bold">Min</span>
                </div>
                <span className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl text-wine/35 mt-0.5 sm:mt-1 shrink-0 font-bold leading-none font-[Arial,Helvetica,sans-serif]">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl tabular-nums font-bold text-wine leading-none font-[Arial,Helvetica,sans-serif]">{timeLeft.segundos ?? 0}</span>
                  <span className="text-[10px] sm:text-xs md:text-sm uppercase tracking-widest text-wine-dark/70 mt-1.5 sm:mt-2.5 font-bold">Seg</span>
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
                      downloadWeddingCalendarReminder(
                        typeof window !== "undefined" ? window.location.origin : "",
                      )
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
                  placeholder={guestInfo.prefillRsvpName ? "" : "Escribe tu nombre y apellidos"}
                  required
                />
              </div>

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

              {guestInfo.plusOne && (
                <label className="flex items-center gap-3 text-left mt-2 cursor-pointer group">
                  <div className="relative flex items-center justify-center w-5 h-5">
                    <input
                      type="checkbox"
                      checked={rsvpPlusOne}
                      onChange={e => setRsvpPlusOne(e.target.checked)}
                      className="peer appearance-none w-5 h-5 border-[1.5px] border-wine/40 rounded-[2px] checked:bg-wine checked:border-wine cursor-pointer transition-all focus:outline-none"
                    />
                    <div className="absolute text-cream pointer-events-none opacity-0 peer-checked:opacity-100 transition-opacity">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </div>
                  </div>
                  <span className="text-sm font-serif italic text-wine-dark/80 group-hover:text-wine transition-colors cursor-pointer">
                    Voy con un acompañante (+1)
                  </span>
                </label>
              )}

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
        src="/boda/historia-praga.png"
        alt="Praga — cómo nos conocimos Lis y Juanjo"
      />
    </div>
  )
}

export default Invitation
