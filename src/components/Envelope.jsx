import { useState } from 'react';

export default function Envelope({ onOpen }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCut, setIsCut] = useState(false);

    const handleCut = () => {
        if (isCut || isOpen) return;
        setIsCut(true); // Dispara la animación de corte "snap" y caída de cuerda

        // Ampliamos el tiempo de espera a 1.8s para que dé tiempo a la nueva animación de caída lenta
        setTimeout(() => {
            setIsOpen(true);

            setTimeout(() => {
                onOpen();
            }, 3500);
        }, 1800);
    };

    // Nueva imagen floral proporcionada
    const floralPattern = "url('https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/8b1161c8-c26b-4061-a261-e8462bc500bf.png')";

    return (
        <div className={`fixed inset-0 z-50 overflow-hidden flex items-center justify-center transition-all duration-[2000ms] ${isOpen ? 'pointer-events-none opacity-0 delay-[2500ms]' : 'opacity-100 delay-0'}`}>

            {/* FONDO OPACO / BLUR INICIAL (Desaparece en cuanto se abre para revelar la Imagen Divina debajo) */}
            <div className={`absolute inset-0 transition-opacity duration-[1000ms] ease-in-out pointer-events-none ${isOpen ? 'opacity-0 delay-0' : 'bg-white/80 backdrop-blur-md opacity-100 delay-0'}`}></div>

            {/* DESTELLO DE LUZ MÁGICA ("Cuento de Hadas") que inunda la pantalla en blanco claro */}
            <div
                className={`absolute inset-0 z-10 transition-all ease-in-out pointer-events-none mix-blend-screen ${isOpen ? 'bg-white/80 opacity-100 duration-[1500ms] delay-[800ms]' : 'bg-white/0 opacity-0 duration-0 delay-0'}`}
                style={{
                    background: isOpen ? 'radial-gradient(circle at center, rgba(255,255,255,1) 0%, rgba(255,255,255,0.7) 40%, rgba(255,255,255,0) 100%)' : 'none',
                }}
            ></div>

            {/* Contenedor del sobre a PANTALLA COMPLETA en móvil (ahora transparente por dentro) */}
            <div
                className={`relative w-full h-full md:max-w-[700px] md:h-[90vh] transition-all duration-[2500ms] ease-in-out flex-shrink-0 z-20 ${isOpen ? 'scale-110 opacity-0 delay-[1800ms]' : 'scale-100 opacity-100 delay-0'}`}
                style={{ perspective: '2000px' }}
            >
                {/* Sombra del sobre de fondo (luz blanca muy suave para quitar sombras oscuras) */}
                <div className={`absolute inset-0 md:rounded-xl bg-transparent transition-shadow duration-[1000ms] ${isOpen ? 'shadow-none' : 'shadow-[0_20px_60px_rgba(200,190,180,0.3)]'}`}></div>

                {/* NOTA: Hemos eliminado el fondo opaco falso de "Nuestra Boda" 
                    para que al abrir la solapa se vea directamente la invitación real detrás */}

                {/* SOLAPA IZQUIERDA (Abre lento y elegante) */}
                <div
                    className={`absolute top-0 bottom-0 left-0 w-[50%] md:w-[50%] origin-left z-20 transition-transform duration-[2500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'delay-[700ms]' : 'delay-0'}`}
                    style={{ transform: isOpen ? 'rotateY(-140deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-md md:rounded-l-xl shadow-[5px_0_20px_rgba(0,0,0,0.06)] overflow-hidden border-r-[0.5px] border-[#e5d5c5]/80" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}>
                        {/* Nuevo Patrón floral semi-transparente - Izquierda */}
                        <div className="absolute inset-0 opacity-[0.9] bg-cover mix-blend-multiply w-[200%] md:w-[200%]" style={{ backgroundImage: floralPattern, backgroundPosition: 'left center' }}></div>
                    </div>
                </div>

                {/* SOLAPA DERECHA (Abre lento y elegante) */}
                <div
                    className={`absolute top-0 bottom-0 right-0 w-[51%] md:w-[51%] origin-right z-30 transition-transform duration-[2500ms] ease-[cubic-bezier(0.25,1,0.5,1)] delay-0`}
                    style={{ transform: isOpen ? 'rotateY(140deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-white/50 backdrop-blur-md md:rounded-r-xl border-l-[0.5px] border-[#e5d5c5]/80 shadow-[-5px_0_20px_rgba(0,0,0,0.06)] overflow-hidden" style={{ backgroundImage: "url('https://www.transparenttextures.com/patterns/cream-paper.png')" }}>
                        {/* Nuevo Patrón floral semi-transparente - Derecha */}
                        <div className="absolute inset-0 opacity-[0.9] bg-cover mix-blend-multiply right-0 w-[196%]" style={{ backgroundImage: floralPattern, backgroundPosition: 'right center' }}></div>
                    </div>
                </div>

                {/* CUERDA HORIZONTAL TEXTURIZADA MULTI-SEGMENTO */}
                <div
                    className={`absolute top-[50%] left-0 right-0 h-10 w-full -translate-y-1/2 z-30 transition-opacity duration-[400ms] ${isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                >
                    {/* Mitad Izquierda de la Cuerda */}
                    <div className={`absolute left-0 w-[73%] h-0 top-1/2 -translate-y-1/2 transition-all duration-[2400ms] ease-[cubic-bezier(0.3,0,0.2,1)] ${isCut ? 'translate-y-[28vh] opacity-0 delay-[200ms]' : 'translate-y-0 opacity-100 delay-0'}`}>
                        <FlexibleRope isCut={isCut} side="left" segments={5} />
                    </div>

                    {/* Mitad Derecha de la Cuerda */}
                    <div className={`absolute right-0 w-[27%] h-0 top-1/2 -translate-y-1/2 transition-all duration-[2000ms] ease-[cubic-bezier(0.3,0,0.2,1)] ${isCut ? 'translate-y-[28vh] opacity-0 delay-[100ms]' : 'translate-y-0 opacity-100 delay-0'}`}>
                        <FlexibleRope isCut={isCut} side="right" segments={4} />
                    </div>

                    {/* Área Interactiva de CORTE (Tijeras) posicionada en el borde de corte Z-50 */}
                    <div
                        className={`absolute top-1/2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 z-50 group ${isCut ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-110 active:scale-90'}`}
                        style={{ left: '73%', transform: 'translate(-50%, -50%)' }}
                        onClick={handleCut}
                    >
                        {/* Marco pulsante de corte */}
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-[#a0937d]/80 bg-white/40 backdrop-blur-sm flex items-center justify-center shadow-lg relative animate-pulse">
                            <span className="text-xl md:text-2xl group-hover:-rotate-[30deg] group-active:-rotate-[60deg] transition-transform duration-200 relative top-[-1px]">✂️</span>
                        </div>
                        <div className="absolute top-14 md:top-16 text-[#857b68] text-[9px] md:text-[10px] font-sans font-bold tracking-[0.2em] uppercase whitespace-nowrap bg-white/90 px-3 py-1 rounded-sm shadow-sm opacity-80 group-hover:opacity-100">
                            Corta Aquí
                        </div>
                    </div>
                </div>

                {/* Sello de cera DIVINO (Z-40: PISA LA CUERDA) */}
                <div
                    className={`absolute top-[50%] left-1/2 flex flex-col items-center justify-center z-40 pointer-events-none transition-all duration-[2200ms] ease-[cubic-bezier(0.4,0,0.2,1)] ${isCut ? 'opacity-0 delay-100' : 'opacity-100 delay-0'}`}
                    style={{ transform: isCut ? 'translate(-40%, 65vh) rotate(-20deg) scale(0.95)' : 'translate(-50%, -50%) rotate(0deg) scale(1)' }}
                >
                    <img
                        src="https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/ebc182e5-b02d-45ca-9652-1b8c9bfe09c6.png"
                        alt="Sello de cera"
                        className="w-52 md:w-64 h-auto select-none"
                        style={{ filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.35))' }}
                        draggable={false}
                    />
                </div>

            </div>
        </div>
    );
}

/* =========================================================
   COMPONENTE AUXILIAR PARA LA FÍSICA DE LA CUERDA MULTI-NODO
   ========================================================= */
function FlexibleRope({ isCut, side, segments }) {
    const renderSegment = (current) => {
        if (current >= segments) return null;
        const isLeft = side === 'left';
        const isFirst = current === 0;

        const duration = 800 + current * 200; // MUCH slower, smoother transition
        const delay = isCut ? current * 80 : 0; // Longer delay between nodes = smoother whip

        // Rotaciones progresivas para simular una curva "Whip"
        let rot = 0;
        if (isCut) {
            const rots = isLeft ? [75, 15, 10, 6, 4] : [-75, -20, -10, -5];
            rot = rots[current] || (isLeft ? 4 : -4);
        }

        const origin = isLeft ? 'origin-left' : 'origin-right';
        const position = isFirst
            ? (isLeft ? 'left-0' : 'right-0')
            : (isLeft ? 'left-[99%]' : 'right-[99%]');

        // El primer segmento ocupa su fracción, los sucesivos heredan ocupando el 100%
        const wStr = isFirst ? `${100 / segments + 0.5}%` : `100%`;

        return (
            <div
                className={`absolute top-0 ${position} h-[5px] rope-pattern overflow-visible ${origin} transition-transform ease-[cubic-bezier(0.3,0,0.2,1)]`}
                style={{
                    width: wStr,
                    transform: `rotate(${rot}deg)`,
                    transitionDuration: `${duration}ms`,
                    transitionDelay: `${delay}ms`
                }}
            >
                {renderSegment(current + 1)}
            </div>
        );
    };

    return renderSegment(0);
}
