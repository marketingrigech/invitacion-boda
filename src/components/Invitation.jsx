import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react"
import { isRsvpConfigured, supabase } from "../lib/supabaseClient"

/** Lee el invitado desde la URL (?invitado=Nombre o ?n=...) para activar cada enlace por persona */
function getGuestStateFromUrl() {
  try {
    const params = new URLSearchParams(window.location.search)
    const raw = params.get("invitado") ?? params.get("n") ?? ""
    const name = decodeURIComponent(raw.replace(/\+/g, " ")).trim()
    if (name.length > 0) return { displayName: name, prefillRsvpName: true }
  } catch {
    /* ignorar URL mal formada */
  }
  return { displayName: "Invitado", prefillRsvpName: false }
}

const VENUE_GOOGLE_MAPS_URL = "https://maps.app.goo.gl/4hmsB7UvMiubGZLWA"

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
  const [guestInfo] = useState(getGuestStateFromUrl)
  const guestName = guestInfo.displayName
  const [showWelcomeBg, setShowWelcomeBg] = useState(false);
  const [showGuestName, setShowGuestName] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showCard, setShowCard] = useState(false);
  const [dressGender, setDressGender] = useState('Mujer');

  const [rsvpName, setRsvpName] = useState(() =>
    guestInfo.prefillRsvpName ? guestInfo.displayName : "",
  )
  const [rsvpEmail, setRsvpEmail] = useState("")
  const [rsvpPlusOne, setRsvpPlusOne] = useState(false)
  const [rsvpSubmitting, setRsvpSubmitting] = useState(false)
  const [rsvpFeedback, setRsvpFeedback] = useState(null) // { type: 'ok' | 'err', text: string }

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  function calculateTimeLeft() {
    // 10 de mayo de 2026 a las 23:59:59
    const targetDate = new Date("2026-05-10T23:59:59").getTime();
    const now = new Date().getTime();
    const difference = targetDate - now;

    let timeLeftResult = {};

    if (difference > 0) {
      timeLeftResult = {
        dias: Math.floor(difference / (1000 * 60 * 60 * 24)),
        horas: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutos: Math.floor((difference / 1000 / 60) % 60),
        segundos: Math.floor((difference / 1000) % 60),
      };
    } else {
      timeLeftResult = { dias: 0, horas: 0, minutos: 0, segundos: 0 };
    }

    return timeLeftResult;
  }

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

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

    if (!isRsvpConfigured() || !supabase) {
      setRsvpFeedback({
        type: "err",
        text: "Falta la clave de API: crea un archivo .env con VITE_SUPABASE_ANON_KEY (y ejecuta el SQL de supabase/rsvp_setup.sql).",
      })
      return
    }

    const full_name = rsvpName.trim()
    const email = rsvpEmail.trim().toLowerCase()
    if (!full_name || !email) return

    setRsvpSubmitting(true)
    const { error } = await supabase.from("rsvp").insert({
      full_name,
      email,
      plus_one: rsvpPlusOne,
    })
    setRsvpSubmitting(false)

    if (error) {
      setRsvpFeedback({
        type: "err",
        text:
          error.message || "No se pudo enviar. Revisa la conexión o la configuración de Supabase.",
      })
      return
    }

    setRsvpFeedback({ type: "ok", text: "Confirmación recibida. ¡Gracias!" })
    setRsvpName("")
    setRsvpEmail("")
    setRsvpPlusOne(false)
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
        style={{ backgroundImage: `url('https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/fondo%20nombre%20y%20bienveida%20(1).png')` }}
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
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

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
                <div className="relative w-fit max-w-full mx-auto overflow-hidden rounded-[2px] border border-[#e3d5c7] bg-[#faf8f5] shadow-[0_4px_18px_rgba(62,42,42,0.08),inset_0_0_0_1px_rgba(255,255,255,0.4)]">
                  <div className="relative w-full">
                    <img
                      src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/NOS%20CASAMOS.png"
                      alt="Lis y Juanjo — Nos casamos"
                      fetchPriority="high"
                      decoding="async"
                      onLoad={onHeroImageSettled}
                      onError={onHeroImageSettled}
                      className="mx-auto block h-auto w-full max-w-full max-h-[min(58svh,620px)] object-contain object-center transition-transform duration-[1000ms] ease-out motion-safe:hover:scale-[1.02]"
                    />
                    <div
                      className="pointer-events-none absolute inset-0 z-[1] shadow-[inset_0_0_24px_rgba(71,20,33,0.04)]"
                      aria-hidden
                    />
                  </div>
                </div>
                <div className="flex w-full justify-center px-4 pt-5 pb-1">
                  <img
                    src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/lis%20y%20juanjo.png"
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

          {/* SECCIÓN NUESTRA HISTORIA 1: PRAGA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>Cómo nos conocimos</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Nuestras miradas se cruzaron por primera vez entre la magia de Praga y el aroma de su invierno.
                Aunque nuestras vidas parecían seguir rumbos distintos, aquel encuentro marcó el inicio de algo que ninguno de los dos pudo ignorar.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/6690c395-e6e4-48b8-8c25-492c9ac597cf.png"
                alt="Nuestra historia"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 2: DISTANCIA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>La distancia no fue barrera</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Nuestra historia continuaba: Ella en Madrid y Juanjo en Barcelona.
                Cientos de kilómetros, infinitas llamadas y billetes de tren que acortaban la espera entre dos corazones que ya no sabían estar separados.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/8cadf582-8daa-4353-b237-2b4e7759596a.png"
                alt="La distancia"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 3: EL SACRIFICIO */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>Todo por amor</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Llegó el momento de tomar una de las decisiones más valientes. Juanjo lo dejó todo por amor,
                cerrando una etapa en Barcelona para apostar por un futuro juntos, demostrando que cuando el sentimiento es real, el hogar está donde esté la otra persona.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/63a2cf6c-5515-4343-b505-8f00be458419.png"
                alt="Sacrificio por amor"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 4: EL HOGAR */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <SectionTitleWithOrnament>Creamos un hogar</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Poco a poco, fuimos construyendo nuestro propio mundo, llenando cada rincón de sueños, risas y proyectos compartidos.
                Hoy, nuestro hogar es el refugio donde celebramos la vida cada día.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/72f6c064-bed0-458c-90d4-dfa0e525aca0.png"
                alt="Nuestro hogar"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 5: TU PARTE */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <SectionTitleWithOrnament>Sé parte de nosotros</SectionTitleWithOrnament>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-base sm:text-lg text-neutral-600 font-serif font-light italic leading-relaxed tracking-wide antialiased [text-rendering:optimizeLegibility]">
                Ahora queremos que tú seas parte de nuestra historia. Este capítulo final no estaría completo sin tu presencia en el día más importante de nuestras vidas.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/d9b6e4aa-df92-467e-8f3f-a62bd5652f6d.png"
                alt="Sé parte de nuestra historia"
                loading="lazy"
                decoding="async"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* FECHA Y HORA */}
          <FadeInSection className="w-full mb-16 mt-8" delay="400ms">
            <SectionTitleWithOrnament>Guárdate este día</SectionTitleWithOrnament>

            <div className="flex justify-center w-full px-8 mb-10">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/FECHA.png"
                alt="Calendario"
                loading="lazy"
                decoding="async"
                className="w-full max-w-[280px] sm:max-w-[320px] opacity-90 scale-110 mix-blend-multiply"
              />
            </div>

            <div className="flex flex-col items-center mt-6 w-full px-4">
              <div className="relative overflow-hidden bg-[#faf8f5] border-[0.5px] border-[#e5d5c5]/80 shadow-[0_4px_15px_rgba(0,0,0,0.05),_0_1px_3px_rgba(0,0,0,0.03)] rounded-sm py-6 px-4 sm:py-8 sm:px-12 w-full max-w-sm flex flex-col items-center mx-auto">
                {/* Textura de papel para el cuadro */}
                <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

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
                  La Casa Rural Spa La Batipuerta
                </p>
                <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                  Calle Los Cantos, nº 2 (o nº 8 según contacto)
                  <br />
                  <span className="mt-2 inline-block">
                    Candelario, Salamanca · 37710
                  </span>
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

              <div className="w-[calc(100%+24px)] md:w-full max-w-md -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5 mb-8">
                <img
                  src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/casa%20rural.jpg"
                  alt="La Casa Rural Spa La Batipuerta — Candelario, Salamanca"
                  loading="lazy"
                  decoding="async"
                  className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity duration-300"
                  onClick={() => window.open(VENUE_GOOGLE_MAPS_URL, "_blank")}
                />
              </div>

              <button
                type="button"
                className="bg-wine text-cream px-8 py-3 rounded-sm text-xs sm:text-sm uppercase tracking-widest hover:bg-wine-dark hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                onClick={() => window.open(VENUE_GOOGLE_MAPS_URL, "_blank")}
              >
                Ver cómo llegar
              </button>
            </div>
          </FadeInSection>

          {/* CÓDIGO DE VESTIMENTA */}
          <FadeInSection className="w-full mb-16" delay="500ms">
            <SectionTitleWithOrnament>Cómo ir vestido</SectionTitleWithOrnament>

            {/* Toggle */}
            <div className="flex justify-center mb-8">
              <div className="bg-[#e5d5c5]/20 p-1 rounded-sm inline-flex border border-[#e5d5c5]/60 shadow-inner">
                <button
                  onClick={() => setDressGender('Mujer')}
                  className={`px-8 py-2 text-sm uppercase tracking-widest transition-all duration-300 ${dressGender === 'Mujer' ? 'bg-wine text-cream shadow-sm rounded-[1px]' : 'text-wine-dark/70 hover:text-wine'}`}
                >
                  Mujer
                </button>
                <button
                  onClick={() => setDressGender('Hombre')}
                  className={`px-8 py-2 text-sm uppercase tracking-widest transition-all duration-300 ${dressGender === 'Hombre' ? 'bg-wine text-cream shadow-sm rounded-[1px]' : 'text-wine-dark/70 hover:text-wine'}`}
                >
                  Hombre
                </button>
              </div>
            </div>

            {/* Carousel */}
            <div className="w-full overflow-hidden">
              <div className="flex w-full gap-4 overflow-x-auto snap-x snap-mandatory pb-6 px-4 -mx-4 hide-scrollbar justify-start md:justify-center" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {dressGender === 'Mujer' ? (
                  <>
                    <img src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code mujer 1" loading="lazy" decoding="async" />
                    <img src="https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code mujer 2" loading="lazy" decoding="async" />
                    <img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code mujer 3" loading="lazy" decoding="async" />
                  </>
                ) : (
                  <>
                    <img src="https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code hombre 1" loading="lazy" decoding="async" />
                    <img src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code hombre 2" loading="lazy" decoding="async" />
                    <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code hombre 3" loading="lazy" decoding="async" />
                  </>
                )}
              </div>
            </div>
          </FadeInSection>

          {/* REGALO */}
          <FadeInSection className="w-full mb-16" delay="600ms">
            <div className="w-full border-y border-[#e5d5c5]/60 py-10 bg-[#e5d5c5]/10 px-6 rounded-sm">
              <SectionTitleWithOrnament>Sobre el regalo</SectionTitleWithOrnament>
              <p className="text-sm text-wine-dark/80 mb-6 font-serif italic max-w-sm mx-auto">
                Vuestra presencia es el mejor regalo que podríamos pedir.
                Sin embargo, si deseáis hacernos un detalle, os dejamos nuestro número de cuenta:
              </p>
              <div className="bg-white/60 p-4 rounded-sm border border-wine/10 inline-block text-sm sm:text-base text-wine-dark break-all">
                Transferencia bancaria a IBAN:<br />
                <span className="font-bold tracking-widest mt-2 inline-block font-mono text-base md:text-lg text-wine">xxxxxxxxx</span>
              </div>
            </div>
          </FadeInSection>

          {/* RSVP FORM Y COUNTDOWN */}
          <FadeInSection className="w-full mb-16" delay="700ms">
            <SectionTitleWithOrnament>Asistencia</SectionTitleWithOrnament>
            <p className="text-sm text-wine-dark/70 mb-4 font-serif italic px-4">Por favor, confirma tu asistencia para que podamos organizar los detalles.</p>

            {/* COUNTDOWN — mismo ancho que el contenido de la tarjeta (sin sangrar fuera del padding) */}
            <div className="mb-10 w-full rounded-sm border-y border-[#e5d5c5]/60 py-8 bg-[#e5d5c5]/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]">
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-wine-dark/80 mb-5 font-medium px-2 sm:px-0 text-center">
                Confirma antes del 10 de Mayo de 2026
              </p>
              <div className="flex justify-center gap-2 sm:gap-6 font-serif px-2 sm:px-0">
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-2xl sm:text-4xl tabular-nums text-wine">{timeLeft.dias || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Días</span>
                </div>
                <span className="text-xl sm:text-4xl text-wine/30 mt-1 shrink-0">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-2xl sm:text-4xl tabular-nums text-wine">{timeLeft.horas || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Hrs</span>
                </div>
                <span className="text-xl sm:text-4xl text-wine/30 mt-1 shrink-0">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-2xl sm:text-4xl tabular-nums text-wine">{timeLeft.minutos || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Min</span>
                </div>
                <span className="text-xl sm:text-4xl text-wine/30 mt-1 shrink-0">:</span>
                <div className="flex flex-col items-center min-w-0">
                  <span className="text-2xl sm:text-4xl tabular-nums text-wine">{timeLeft.segundos || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Seg</span>
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
                  placeholder="Escribe tu nombre y apellidos"
                  required
                />
              </div>

              <div className="flex flex-col text-left">
                <label
                  className="text-xs uppercase tracking-[0.2em] text-wine-dark mb-2 font-medium"
                  htmlFor="rsvp-email"
                >
                  Correo electrónico
                </label>
                <input
                  id="rsvp-email"
                  type="email"
                  value={rsvpEmail}
                  onChange={e => setRsvpEmail(e.target.value)}
                  autoComplete="email"
                  className="w-full border-b-[1.5px] border-wine/30 bg-transparent py-2 px-1 text-wine-dark focus:outline-none focus:border-wine transition-colors placeholder:text-wine/30 font-serif italic"
                  placeholder="tu@correo.com"
                  required
                />
              </div>

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
                  Voy con un acompañante
                </span>
              </label>

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

              <button
                type="submit"
                disabled={rsvpSubmitting}
                className="mt-2 w-full bg-transparent border border-wine text-wine px-10 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-wine hover:text-cream transition-all duration-300 disabled:opacity-50 disabled:pointer-events-none"
              >
                {rsvpSubmitting ? "Enviando…" : "Confirmar Asistencia"}
              </button>
            </form>
          </FadeInSection>

          {/* CIERRE EPICO */}
          <FadeInSection className="w-full pb-6" delay="800ms">
            <div className="w-16 h-[1px] bg-wine/30 mx-auto mb-10"></div>
            <h2 className="text-6xl sm:text-7xl font-serif text-wine mb-6 mt-2 !leading-tight">Te esperamos</h2>
            <div className="flex justify-center mb-6">
              <svg className="w-8 h-8 text-wine/50" fill="currentColor" viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" /></svg>
            </div>
            <p className="text-xs sm:text-sm uppercase tracking-[0.4em] text-wine-dark/50 font-medium">Con muchísimo amor</p>
          </FadeInSection>
        </div>
      </div>
    </div>
  )
}

export default Invitation
