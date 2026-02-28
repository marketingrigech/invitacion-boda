import { useState } from 'react';

export default function Envelope({ onOpen }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCut, setIsCut] = useState(false);

    const handleCut = () => {
        if (isCut || isOpen) return;
        setIsCut(true); // Dispara la animación de cortar la cuerda

        // Esperamos a que el sello y la cuerda caigan antes de abrir mágicamente las solapas
        setTimeout(() => {
            setIsOpen(true);

            // Damos mucho más tiempo (3.8s) para que las solapas se abran lenta y majestuosamente
            // y el resplandor de cuento de hadas termine antes de informar a App.jsx que el sobre ha terminado.
            setTimeout(() => {
                onOpen();
            }, 3800);
        }, 800);
    };

    // Nueva imagen floral proporcionada
    const floralPattern = "url('https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/8b1161c8-c26b-4061-a261-e8462bc500bf.png')";

    return (
        <div className={`fixed inset-0 z-50 overflow-hidden flex items-center justify-center transition-all duration-[2000ms] ${isOpen ? 'pointer-events-none opacity-0 delay-[2500ms]' : 'bg-black/20 backdrop-blur-sm opacity-100 delay-0'}`}>

            {/* DESTELLO DE LUZ MÁGICA ("Cuento de Hadas") que aparece justo cuando se abre el sobre */}
            <div
                className={`absolute inset-0 bg-white z-10 transition-all duration-[3000ms] ease-out pointer-events-none ${isOpen ? 'opacity-0 scale-150' : 'opacity-0 scale-50'}`}
                style={{
                    background: 'radial-gradient(circle at center, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0) 70%)',
                    mixBlendMode: 'screen'
                }}
            ></div>
            <div
                className={`absolute inset-0 bg-[#fff9e6] z-10 transition-opacity duration-[2000ms] ease-in-out pointer-events-none ${isOpen ? 'opacity-40 animate-pulse delay-300' : 'opacity-0'}`}
                style={{ mixBlendMode: 'overlay' }}
            ></div>

            {/* Contenedor del sobre a PANTALLA COMPLETA en móvil (ahora transparente por dentro) */}
            <div
                className={`relative w-full h-full md:max-w-[700px] md:h-[90vh] transition-all duration-[2000ms] ease-in-out flex-shrink-0 z-20 ${isOpen ? 'scale-110 opacity-0 delay-[1800ms]' : 'scale-100 opacity-100 delay-0'}`}
                style={{ perspective: '2000px' }}
            >
                {/* Sombra del sobre de fondo (desaparece paulatinamente al abrirse) */}
                <div className={`absolute inset-0 md:rounded-xl bg-transparent transition-shadow duration-[1000ms] ${isOpen ? 'shadow-none' : 'shadow-[0_20px_50px_rgba(0,0,0,0.15)]'}`}></div>

                {/* NOTA: Hemos eliminado el fondo opaco falso de "Nuestra Boda" 
                    para que al abrir la solapa se vea directamente la invitación real detrás */}

                {/* SOLAPA IZQUIERDA (Abre muy lentamente) */}
                <div
                    className={`absolute top-0 bottom-0 left-0 w-[50%] md:w-[50%] origin-left z-20 transition-transform duration-[2500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'delay-[700ms]' : 'delay-0'}`}
                    style={{ transform: isOpen ? 'rotateY(-140deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-md md:rounded-l-xl shadow-[5px_0_20px_rgba(0,0,0,0.06)] overflow-hidden border-r-[0.5px] border-[#e5d5c5]/80" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}>
                        {/* Nuevo Patrón floral semi-transparente - Izquierda */}
                        <div className="absolute inset-0 opacity-[0.9] bg-cover mix-blend-multiply w-[200%] md:w-[200%]" style={{ backgroundImage: floralPattern, backgroundPosition: 'left center' }}></div>
                    </div>
                </div>

                {/* SOLAPA DERECHA (Abre muy lentamente) */}
                <div
                    className={`absolute top-0 bottom-0 right-0 w-[51%] md:w-[51%] origin-right z-30 transition-transform duration-[2500ms] ease-[cubic-bezier(0.25,1,0.5,1)] delay-0`}
                    style={{ transform: isOpen ? 'rotateY(140deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-md md:rounded-r-xl border-l-[0.5px] border-[#e5d5c5]/80 shadow-[-5px_0_20px_rgba(0,0,0,0.06)] overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}>
                        {/* Nuevo Patrón floral semi-transparente - Derecha */}
                        <div className="absolute inset-0 opacity-[0.9] bg-cover mix-blend-multiply right-0 w-[196%]" style={{ backgroundImage: floralPattern, backgroundPosition: 'right center' }}></div>
                    </div>
                </div>

                {/* CUERDA HORIZONTAL + SELLO DE CERA NUEVO */}
                <div
                    className={`absolute top-[50%] left-0 right-0 -translate-y-1/2 flex flex-col items-center justify-center transition-all duration-[600ms] z-50 ${isOpen ? 'opacity-0 scale-[1.5] pointer-events-none' : 'opacity-100 scale-100'}`}
                >
                    {/* Mitad Izquierda de la Cuerda (Segmento Largo) - Ocupa casi todo hasta el punto de corte */}
                    <div
                        className={`absolute left-0 w-[75%] md:w-[70%] flex flex-col justify-center gap-[1px] origin-left transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0.2,1)] z-0 ${isCut ? 'rotate-[-30deg] translate-y-32 opacity-0' : 'rotate-0 translate-y-0 opacity-90'}`}
                        style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.15))' }}
                    >
                        <div className="w-full h-[1.5px] bg-gradient-to-r from-[#9e8f75] via-[#cfc3a7] to-[#abb8b8]"></div>
                        <div className="w-full h-[1px] bg-gradient-to-r from-[#b5a78f] via-[#ebdcc2] to-[#b5a78f]"></div>
                        <div className="w-full h-[0.5px] bg-gradient-to-r from-[#8a7a60] via-[#c4b496] to-[#8a7a60]"></div>
                    </div>

                    {/* Mitad Derecha de la Cuerda (Segmento Corto) - Desde el punto de corte hasta el borde derecho */}
                    <div
                        className={`absolute right-0 w-[25%] md:w-[30%] flex flex-col justify-center gap-[1px] origin-right transition-all duration-[600ms] ease-[cubic-bezier(0.5,0,0.2,1)] z-0 ${isCut ? 'rotate-[45deg] translate-y-16 translate-x-10 opacity-0' : 'rotate-0 translate-y-0 opacity-90'}`}
                        style={{ filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.15))' }}
                    >
                        <div className="w-full h-[1.5px] bg-gradient-to-r from-[#cfc3a7] to-[#9e8f75]"></div>
                        <div className="w-full h-[1px] bg-gradient-to-r from-[#ebdcc2] to-[#b5a78f]"></div>
                        <div className="w-full h-[0.5px] bg-gradient-to-r from-[#c4b496] to-[#8a7a60]"></div>
                    </div>

                    {/* Área Interactiva de CORTE (Tijeras) posicionada en el margen derecho */}
                    <div
                        className={`absolute right-[8%] md:right-[15%] top-1/2 -translate-y-1/2 flex flex-col items-center justify-center cursor-pointer transition-all duration-500 z-30 group ${isCut ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-110'}`}
                        onClick={handleCut}
                    >
                        {/* Círculo punteado donde cortar */}
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-[#a0937d]/80 bg-white/40 backdrop-blur-sm flex items-center justify-center shadow-lg relative animate-pulse">
                            <span className="text-xl md:text-2xl group-hover:-rotate-[30deg] group-active:-rotate-[60deg] transition-transform duration-300 relative top-[-1px]">✂️</span>
                        </div>
                        {/* Etiqueta indicativa */}
                        <div className="absolute top-14 md:top-16 text-[#857b68] text-[9px] md:text-[10px] font-sans font-bold tracking-[0.2em] uppercase whitespace-nowrap bg-white/90 px-3 py-1 rounded-sm shadow-sm opacity-80 group-hover:opacity-100">
                            Corta Aquí
                        </div>
                    </div>

                    {/* Sello de cera en el centro, atado al segmento izquierdo que caerá pesadamente */}
                    <div className={`relative flex flex-col items-center justify-center transition-all duration-[800ms] ease-in z-20 pointer-events-none ${isCut ? 'translate-y-[40vh] -rotate-12 opacity-0' : 'translate-y-0 rotate-0 opacity-100'}`}>
                        <img
                            src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/ebc182e5-b02d-45ca-9652-1b8c9bfe09c6.png"
                            alt="Sello de cera"
                            className="w-52 md:w-64 h-auto select-none"
                            style={{ filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.25))' }}
                            draggable={false}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
}
