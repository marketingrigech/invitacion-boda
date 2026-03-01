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
  const [dressGender, setDressGender] = useState('Mujer');

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
            <div className="w-[calc(100%+48px)] sm:w-[calc(100%+96px)] -mx-6 sm:-mx-12 -mt-16 mb-4 overflow-hidden relative z-10 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border-b-[0.5px] border-[#e5d5c5]/60">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/NOS%20CASAMOS%20(1).png"
                alt="Lis y Juanjo"
                className="w-full h-auto max-h-[75vh] object-cover object-top transition-transform hover:scale-[1.03] duration-1000"
              />
            </div>

            <div className="flex justify-center w-full mb-2 mt-2 px-4 relative z-20">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/lis%20y%20juanjo.png"
                alt="Firma Lis y Juanjo"
                className="w-full max-w-[320px] sm:max-w-[400px] h-auto drop-shadow-[0_2px_4px_rgba(0,0,0,0.06)] scale-125 transition-transform hover:scale-[1.3] duration-700"
              />
            </div>

            <p className="text-sm sm:text-base text-wine-dark/70 italic font-serif mt-10">Acompáñanos a celebrar nuestro día</p>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 1: PRAGA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">Cómo nos conocimos</h2>
            <div className="max-w-md mx-auto mb-10">
              <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                Nuestras miradas se cruzaron por primera vez entre la magia de Praga y el aroma de su invierno.
                Aunque nuestras vidas parecían seguir rumbos distintos, aquel encuentro marcó el inicio de algo que ninguno de los dos pudo ignorar.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/0a8969cf-b428-49bf-bef4-f9b7db8d2b66.png"
                alt="Nuestra historia"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 2: DISTANCIA */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">La distancia no fue barrera</h2>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                Nuestra historia continuaba: Ella en Madrid y Juanjo en Barcelona.
                Cientos de kilómetros, infinitas llamadas y billetes de tren que acortaban la espera entre dos corazones que ya no sabían estar separados.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/8cadf582-8daa-4353-b237-2b4e7759596a.png"
                alt="La distancia"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 3: EL SACRIFICIO */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">Todo por amor</h2>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                Llegó el momento de tomar una de las decisiones más valientes. Juanjo lo dejó todo por amor,
                cerrando una etapa en Barcelona para apostar por un futuro juntos, demostrando que cuando el sentimiento es real, el hogar está donde esté la otra persona.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/63a2cf6c-5515-4343-b505-8f00be458419.png"
                alt="Sacrificio por amor"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 4: EL HOGAR */}
          <FadeInSection className="w-full mb-20" delay="300ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">Creamos un hogar</h2>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                Poco a poco, fuimos construyendo nuestro propio mundo, llenando cada rincón de sueños, risas y proyectos compartidos.
                Hoy, nuestro hogar es el refugio donde celebramos la vida cada día.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/72f6c064-bed0-458c-90d4-dfa0e525aca0.png"
                alt="Nuestro hogar"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* SECCIÓN NUESTRA HISTORIA 5: TU PARTE */}
          <FadeInSection className="w-full mb-12" delay="300ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">Sé parte de nosotros</h2>
            <div className="max-w-md mx-auto mb-10 px-4">
              <p className="text-sm sm:text-base text-wine-dark/80 font-serif italic leading-relaxed">
                Ahora queremos que tú seas parte de nuestra historia. Este capítulo final no estaría completo sin tu presencia en el día más importante de nuestras vidas.
              </p>
            </div>

            <div className="w-[calc(100%+24px)] md:w-full -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/d9b6e4aa-df92-467e-8f3f-a62bd5652f6d.png"
                alt="Sé parte de nuestra historia"
                className="w-full h-auto object-cover"
              />
            </div>
          </FadeInSection>

          {/* FECHA Y HORA */}
          <FadeInSection className="w-full mb-16 mt-8" delay="400ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-10">Guárdate este día</h2>

            <div className="flex justify-center w-full px-8 mb-10">
              <img
                src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/FECHA.png"
                alt="Calendario"
                className="w-full max-w-[280px] sm:max-w-[320px] opacity-90 scale-110 mix-blend-multiply"
              />
            </div>

            <div className="flex flex-col items-center mt-6 w-full px-4">
              <div className="relative overflow-hidden bg-[#faf8f5] border-[0.5px] border-[#e5d5c5]/80 shadow-[0_4px_15px_rgba(0,0,0,0.05),_0_1px_3px_rgba(0,0,0,0.03)] rounded-sm py-8 px-6 sm:px-12 w-full max-w-sm flex flex-col items-center mx-auto">
                {/* Textura de papel para el cuadro */}
                <div className="absolute inset-0 opacity-40 pointer-events-none mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/cream-paper.png")' }}></div>

                <div className="relative z-10 flex flex-col items-center w-full">
                  <p className="text-3xl sm:text-4xl md:text-5xl font-sans font-light text-wine mb-2 tracking-[0.15em] sm:tracking-[0.2em] whitespace-nowrap">19 - 09 - 2026</p>
                  <div className="w-16 h-[1px] bg-wine/30 mx-auto my-3"></div>
                  <p className="text-lg sm:text-xl uppercase tracking-widest text-wine-dark/80 font-medium text-center">A las 17:00 hrs</p>
                </div>
              </div>
            </div>
          </FadeInSection>

          {/* DÓNDE SERÁ */}
          <FadeInSection className="w-full mb-16" delay="500ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">¿Dónde será?</h2>
            <div className="flex flex-col items-center">
              <p className="text-lg sm:text-xl text-wine-dark/80 font-serif italic mb-6 text-center max-w-sm">
                Calle travesía del oxígeno 1
              </p>

              <div className="w-[calc(100%+24px)] md:w-full max-w-md -mx-3 md:mx-0 overflow-hidden rounded-sm shadow-lg border-[6px] border-white outline outline-[1px] outline-black/5 mb-8">
                <img
                  src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/Captura%20de%20pantalla%202026-03-01%20165221.png"
                  alt="Mapa de ubicación"
                  className="w-full h-auto object-cover cursor-pointer hover:opacity-95 transition-opacity duration-300"
                  onClick={() => window.open("https://maps.google.com/?q=Calle+travesia+del+oxigeno+1", "_blank")}
                />
              </div>

              <button
                className="bg-wine text-cream px-8 py-3 rounded-sm text-xs sm:text-sm uppercase tracking-widest hover:bg-wine-dark hover:shadow-lg transition-all duration-300 transform hover:-translate-y-0.5"
                onClick={() => window.open("https://maps.google.com/?q=Calle+travesia+del+oxigeno+1", "_blank")}
              >
                Ver en Mapa
              </button>
            </div>
          </FadeInSection>

          {/* CÓDIGO DE VESTIMENTA */}
          <FadeInSection className="w-full mb-16" delay="500ms">
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-6">Cómo ir vestido</h2>

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
                    <img src="https://images.unsplash.com/photo-1566737236500-c8ac43014a67?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code mujer 1" />
                    <img src="https://images.unsplash.com/photo-1612336307429-8a898d10e223?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code mujer 2" />
                    <img src="https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code mujer 3" />
                  </>
                ) : (
                  <>
                    <img src="https://images.unsplash.com/photo-1593030761757-71fae45fa0e7?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code hombre 1" />
                    <img src="https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code hombre 2" />
                    <img src="https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=400&h=600&fit=crop" className="snap-center shrink-0 w-[65%] sm:w-[220px] rounded-sm shadow-md object-cover h-[350px]" alt="Dress code hombre 3" />
                  </>
                )}
              </div>
            </div>
          </FadeInSection>

          {/* REGALO */}
          <FadeInSection className="w-full mb-16" delay="600ms">
            <div className="w-full border-y border-[#e5d5c5]/60 py-10 bg-[#e5d5c5]/10 px-6 rounded-sm">
              <h2 className="text-2xl sm:text-3xl font-serif text-wine mb-4">Sobre el regalo</h2>
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
            <h2 className="text-3xl sm:text-4xl font-serif text-wine mb-2">Asistencia</h2>
            <p className="text-sm text-wine-dark/70 mb-4 font-serif italic px-4">Por favor, confirma tu asistencia para que podamos organizar los detalles.</p>

            {/* COUNTDOWN */}
            <div className="mb-10 w-[calc(100%+48px)] sm:w-[calc(100%+96px)] -mx-6 sm:-mx-12 border-y border-[#e5d5c5]/60 py-8 bg-[#e5d5c5]/20 shadow-[inset_0_0_20px_rgba(255,255,255,0.4)]">
              <p className="text-xs sm:text-sm uppercase tracking-[0.25em] text-wine-dark/80 mb-5 font-medium px-4">Confirma antes del 10 de Mayo de 2026</p>
              <div className="flex justify-center gap-3 sm:gap-6 font-serif px-4">
                <div className="flex flex-col items-center">
                  <span className="text-3xl sm:text-4xl text-wine">{timeLeft.dias || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Días</span>
                </div>
                <span className="text-2xl sm:text-4xl text-wine/30 mt-1">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-3xl sm:text-4xl text-wine">{timeLeft.horas || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Hrs</span>
                </div>
                <span className="text-2xl sm:text-4xl text-wine/30 mt-1">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-3xl sm:text-4xl text-wine">{timeLeft.minutos || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Min</span>
                </div>
                <span className="text-2xl sm:text-4xl text-wine/30 mt-1">:</span>
                <div className="flex flex-col items-center">
                  <span className="text-3xl sm:text-4xl text-wine">{timeLeft.segundos || '0'}</span>
                  <span className="text-[10px] sm:text-xs uppercase tracking-widest text-wine-dark/60 mt-1">Seg</span>
                </div>
              </div>
            </div>

            <form className="w-full max-w-sm mx-auto flex flex-col gap-6" onSubmit={(e) => e.preventDefault()}>
              <div className="flex flex-col text-left">
                <label className="text-xs uppercase tracking-[0.2em] text-wine-dark mb-2 font-medium">Nombre completo</label>
                <input
                  type="text"
                  className="w-full border-b-[1.5px] border-wine/30 bg-transparent py-2 px-1 text-wine-dark focus:outline-none focus:border-wine transition-colors placeholder:text-wine/30 font-serif italic"
                  placeholder="Escribe tu nombre y apellidos"
                  required
                />
              </div>

              <div className="flex flex-col text-left">
                <label className="text-xs uppercase tracking-[0.2em] text-wine-dark mb-2 font-medium">Correo electrónico</label>
                <input
                  type="email"
                  className="w-full border-b-[1.5px] border-wine/30 bg-transparent py-2 px-1 text-wine-dark focus:outline-none focus:border-wine transition-colors placeholder:text-wine/30 font-serif italic"
                  placeholder="tu@correo.com"
                  required
                />
              </div>

              <label className="flex items-center gap-3 text-left mt-2 cursor-pointer group">
                <div className="relative flex items-center justify-center w-5 h-5">
                  <input
                    type="checkbox"
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

              <button
                type="submit"
                className="mt-6 w-full bg-transparent border border-wine text-wine px-10 py-3.5 rounded-sm text-sm uppercase tracking-widest hover:bg-wine hover:text-cream transition-all duration-300"
              >
                Confirmar Asistencia
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
