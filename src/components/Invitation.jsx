import { useEffect, useRef, useState } from "react"

function FadeInSection({ children, className = "", delay = "0ms" }) {
  const domRef = useRef()
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
        }
      })
    }, { threshold: 0.1, rootMargin: "0px 0px -20px 0px" })

    const currentRef = domRef.current
    if (currentRef) observer.observe(currentRef)
    return () => {
      if (currentRef) observer.unobserve(currentRef)
    }
  }, [])

  return (
    <div className={`fade-in-section ${className}`} ref={domRef} style={{ transitionDelay: delay }}>
      {children}
    </div>
  )
}

function Invitation({ envelopeOpen }) {
  const guestName = "Matheo Santacruz"; // Nombre de ejemplo
  const [showWelcomeBg, setShowWelcomeBg] = useState(false);
  const [showGuestName, setShowGuestName] = useState(false);
  const [showMessage, setShowMessage] = useState(false);
  const [showCard, setShowCard] = useState(false);

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

  return (
    <div className="w-full min-h-screen py-10 flex items-center justify-center px-4 relative">

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
            <div className="w-[calc(100%+48px)] sm:w-[calc(100%+96px)] -mx-6 sm:-mx-12 -mt-16 mb-2 overflow-hidden relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-b-[0.5px] border-[#e5d5c5]/60">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/NOS%20CASAMOS%20(1).png"
                alt="Lis y Juanjo"
                className="w-full h-auto max-h-[75vh] object-cover object-top transition-transform hover:scale-[1.03] duration-1000"
              />
            </div>

            <div className="flex justify-center w-full mb-2 mt-0 px-4 relative z-20">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/lis%20y%20juanjo.png"
                alt="Firma Lis y Juanjo"
                className="w-full max-w-[320px] sm:max-w-[400px] h-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)] scale-125 transition-transform hover:scale-[1.3] duration-700"
              />
            </div>
            <p className="text-sm sm:text-base text-wine-dark/70 italic font-serif mt-6">Acompáñanos a celebrar nuestro día</p>
          </FadeInSection>

          {/* Adorno decorativo */}
          <FadeInSection className="w-full flex justify-center mb-12" delay="300ms">
            <div className="w-24 h-24 sm:w-28 sm:h-28 opacity-30 bg-grape-pattern bg-center bg-contain bg-no-repeat"></div>
          </FadeInSection>

          {/* FECHA Y HORA */}
          <FadeInSection className="w-full mb-14" delay="400ms">
            <div className="flex flex-col items-center">
              <p className="text-xl sm:text-2xl font-serif text-wine-dark mb-1">Sábado</p>
              <p className="text-5xl sm:text-6xl font-serif text-wine mb-2">24</p>
              <p className="text-sm sm:text-base uppercase tracking-widest text-wine-dark/80 mb-6">Octubre 2026</p>

              <div className="w-16 h-[1px] bg-wine/30 mx-auto mb-6"></div>

              <p className="font-semibold text-wine-dark mb-1 tracking-wide">Ceremonia 18:00 hrs</p>
              <p className="text-sm text-wine-dark/70 mb-6 font-serif italic">Hacienda El Refugio, Ciudad de México</p>

              <button className="bg-wine text-cream px-8 py-2.5 rounded-sm text-xs sm:text-sm uppercase tracking-widest hover:bg-wine-dark hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5 mt-2">
                Ver en Mapa
              </button>
            </div>
          </FadeInSection>

          {/* CÓDIGO DE VESTIMENTA */}
          <FadeInSection className="w-full mb-12" delay="500ms">
            <h2 className="text-xl sm:text-2xl font-serif text-wine mb-4">Código de Vestimenta</h2>
            <p className="text-sm tracking-[0.15em] uppercase text-wine-dark/80 mb-2 font-medium">Formal / Elegante</p>
            <p className="text-xs text-wine-dark/60 italic font-serif">Por favor, reserva el blanco para la novia.</p>
          </FadeInSection>

          {/* RSVP */}
          <FadeInSection className="w-full mt-4" delay="600ms">
            <div className="w-full border-t border-wine/10 pt-10">
              <h2 className="text-xl sm:text-2xl font-serif text-wine mb-4">Asistencia</h2>
              <p className="text-sm text-wine-dark/70 mb-8 font-serif italic px-4">Para nosotros es muy importante saber si nos acompañarás en este día tan especial.</p>
              <button className="bg-transparent border border-wine text-wine px-10 py-3 rounded-sm text-xs sm:text-sm uppercase tracking-widest hover:bg-wine hover:text-cream transition-all duration-300">
                Confirmar RSVP
              </button>
            </div>
          </FadeInSection>
        </div>
      </div>
    </div>
  )
}

export default Invitation
