import { useEffect, useRef } from "react"

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

function Invitation() {
  return (
    <div className="w-full min-h-screen py-10 flex items-center justify-center px-4">

      {/* TARJETA FÍSICA INVITACIÓN */}
      <div className="relative w-full max-w-lg bg-[#fbfaf9] shadow-[0_10px_40px_rgba(0,0,0,0.15)] rounded-sm overflow-hidden flex flex-col items-center pt-16 pb-20 px-6 sm:px-12 text-center animate-fade-in-up">

        {/* Textura de ruido suave (opcional para dar efecto papel) */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

        {/* Borde interior elegante */}
        <div className="absolute inset-3 sm:inset-4 border-[1px] border-[#e5d5c5]/80 pointer-events-none rounded-sm"></div>
        <div className="absolute inset-[14px] sm:inset-[18px] border-[0.5px] border-[#e5d5c5]/40 pointer-events-none rounded-sm"></div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="relative z-10 w-full flex flex-col items-center">

          <FadeInSection className="w-full mb-14" delay="200ms">
            <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-wine/80 mb-6 font-medium">Nos casamos</p>
            <h1 className="text-6xl sm:text-7xl !leading-[0.85] text-wine-dark mb-6">Lis <br /><span className="text-4xl sm:text-5xl font-light text-wine/70 inline-block my-2">&amp;</span><br /> Juanjo</h1>
            <p className="text-sm sm:text-base text-wine-dark/70 italic font-serif mt-4">Acompáñanos a celebrar nuestro día</p>
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
