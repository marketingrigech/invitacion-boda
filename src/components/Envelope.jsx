import { useState, useEffect, useRef } from 'react';

// Constantes de física de la cuerda
const NUM_NODES = 40;
const DAMPING = 0.96;
const GRAVITY = 0.6;
const IDLE_GRAVITY = 0.05; // Gravedad baja para mantenerla más tensa mientras reposa
const STIFFNESS = 1.0; // Mayor rigidez
const ITERATIONS = 40; // Mayor cantidad de iteraciones para dar aspecto estirado
const ROPE_COLOR_BASE = '#8b7355'; // Color marrón más oscuro tipo cuerda vieja
const ROPE_COLOR_HIGHLIGHT = '#a68a64'; // Trenzado oscurecido
const ROPE_SHADOW = '#4a3b2b';

// Clases de Simulación Física
class VerletNode {
    constructor(x, y, isFixed = false) {
        this.x = x;
        this.y = y;
        this.oldX = x;
        this.oldY = y;
        this.isFixed = isFixed;
    }
}

class Particle {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 12;
        this.vy = (Math.random() - 0.5) * 12 - 4;
        this.life = 1.0;
        this.decay = Math.random() * 0.03 + 0.02;
        this.size = Math.random() * 2 + 1.5;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.vy += GRAVITY * 0.5;
        this.vx *= 0.95;
        this.life -= this.decay;
    }
}

export default function Envelope({ onOpen, onReveal, onComplete }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isCut, setIsCut] = useState(false);

    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    // Estado mutable para RAF (requestAnimationFrame)
    const stateRef = useRef({
        nodes: [],
        particles: [],
        cutIndex: -1,
        isCut: false,
        flashTimer: 0,
        time: 0,
        restLength: 0
    });

    const initRope = (width, height) => {
        const nodes = [];
        const startX = 0;
        const endX = width;
        const y = height / 2;
        const segmentLength = width / (NUM_NODES - 1);

        stateRef.current.restLength = segmentLength;

        for (let i = 0; i < NUM_NODES; i++) {
            const isCenter = i === Math.floor(NUM_NODES / 2);
            const isFixed = i === 0 || i === NUM_NODES - 1 || isCenter;
            nodes.push(new VerletNode(startX + i * segmentLength, y, isFixed));
        }
        stateRef.current.nodes = nodes;
    };

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;

        let animationFrameId;

        const resizeObserver = new ResizeObserver((entries) => {
            for (let entry of entries) {
                const { width, height } = entry.contentRect;
                canvas.width = width;
                canvas.height = height;
                if (!stateRef.current.isCut) {
                    initRope(width, height);
                }
            }
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        const updatePhysics = () => {
            const state = stateRef.current;
            state.time += 0.05;

            // Actualizar nodos
            for (let i = 0; i < state.nodes.length; i++) {
                const node = state.nodes[i];
                if (!node.isFixed) {
                    const vx = (node.x - node.oldX) * DAMPING;
                    const vy = (node.y - node.oldY) * DAMPING;
                    const currentGravity = state.isCut ? GRAVITY : IDLE_GRAVITY;
                    node.oldX = node.x;
                    node.oldY = node.y;
                    node.x += vx;
                    node.y += vy + currentGravity;

                    // Respiración idle si no está cortada
                    if (!state.isCut) {
                        const distToEdge = Math.min(i, state.nodes.length - 1 - i);
                        const intensity = distToEdge / (state.nodes.length / 2);
                        node.y += Math.sin(state.time + i * 0.15) * 0.15 * intensity;
                    }
                }
            }

            // Constraints Verlet
            for (let iter = 0; iter < ITERATIONS; iter++) {
                for (let i = 0; i < state.nodes.length - 1; i++) {
                    if (state.isCut && i === state.cutIndex) continue; // Si está cortada, ignorar enlace

                    const n1 = state.nodes[i];
                    const n2 = state.nodes[i + 1];
                    const dx = n2.x - n1.x;
                    const dy = n2.y - n1.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const difference = state.restLength - distance;
                    const percent = difference / distance / 2;
                    const offsetX = dx * percent;
                    const offsetY = dy * percent;

                    if (!n1.isFixed) {
                        n1.x -= offsetX * STIFFNESS;
                        n1.y -= offsetY * STIFFNESS;
                    }
                    if (!n2.isFixed) {
                        n2.x += offsetX * STIFFNESS;
                        n2.y += offsetY * STIFFNESS;
                    }
                }
            }

            // Actualizar partículas
            for (let i = state.particles.length - 1; i >= 0; i--) {
                const p = state.particles[i];
                p.update();
                if (p.life <= 0) {
                    state.particles.splice(i, 1);
                }
            }

            if (state.flashTimer > 0) {
                state.flashTimer -= 0.08;
            }
        };

        const drawRopeOffset = (ctx, nodes, cutIndex, isCut, offsetY, color, lineWidth, dash = [], dashOffset = 0) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = lineWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.setLineDash(dash);
            ctx.lineDashOffset = dashOffset;

            const drawSegment = (start, end) => {
                if (end <= start) return;
                ctx.moveTo(nodes[start].x, nodes[start].y + offsetY);
                for (let i = start; i < end - 1; i++) {
                    const xc = (nodes[i].x + nodes[i + 1].x) / 2;
                    const yc = (nodes[i].y + nodes[i + 1].y) / 2;
                    ctx.quadraticCurveTo(nodes[i].x, nodes[i].y + offsetY, xc, yc + offsetY);
                }
                ctx.lineTo(nodes[end].x, nodes[end].y + offsetY);
            };

            // Dibujar mitad izquierda
            if (nodes.length > 0) {
                drawSegment(0, isCut ? cutIndex : nodes.length - 1);
            }
            ctx.stroke();

            // Dibujar mitad derecha si está cortada
            if (isCut && cutIndex < nodes.length - 1) {
                ctx.beginPath();
                drawSegment(cutIndex + 1, nodes.length - 1);
                ctx.stroke();
            }
            ctx.setLineDash([]); // Resetear line dash para la siguiente brocha
        };

        const render = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            const state = stateRef.current;

            updatePhysics();

            // Efecto de sombra realista (más suave para cuerda más fina)
            ctx.shadowBlur = 4;
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowOffsetY = 2;

            // Capa 1: Contorno oscuro de la cuerda para sensación cilíndrica (3D)
            drawRopeOffset(ctx, state.nodes, state.cutIndex, state.isCut, 0, '#382a1c', 3.5);

            ctx.shadowColor = 'transparent';

            // Capa 2: Base principal de la cuerda
            drawRopeOffset(ctx, state.nodes, state.cutIndex, state.isCut, 0, '#8c755c', 2.5);

            // Capa 3: Trenzado claro (luces hiladas) en espiral
            drawRopeOffset(ctx, state.nodes, state.cutIndex, state.isCut, -0.5, '#cdae86', 1.5, [4, 4], 0);

            // Capa 4: Trenzado oscuro (sombras hiladas) interceptadas
            drawRopeOffset(ctx, state.nodes, state.cutIndex, state.isCut, 0.5, '#5c4834', 1.5, [4, 4], 4);

            // Dibujar partículas (fibras saltando) simulando hilo rasgado
            if (state.particles.length > 0) {
                state.particles.forEach(p => {
                    ctx.fillStyle = `rgba(205, 174, 134, ${Math.max(0, p.life)})`;
                    ctx.beginPath();
                    ctx.ellipse(p.x, p.y, p.size * 1.8, p.size * 0.4, p.vx * 0.5, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            // Circular flash blanco en el corte
            if (state.flashTimer > 0) {
                const cutNode = state.nodes[state.cutIndex];
                if (cutNode) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0, state.flashTimer)})`;
                    ctx.beginPath();
                    ctx.arc(cutNode.x, cutNode.y, 25 * (1 - state.flashTimer + 0.5), 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            resizeObserver.disconnect();
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    const handleCut = () => {
        if (isCut || isOpen) return;
        setIsCut(true);

        const state = stateRef.current;
        state.isCut = true;
        // Cortar en el lado derecho (aprox 75%) para que se vea la animación cayendo
        state.cutIndex = Math.floor(NUM_NODES * 0.75);
        state.flashTimer = 1.0;

        // Liberar el nodo central para que la cuerda entera caiga y no se quede
        // flotando en el medio del aire cuando el sello desaparece/baja.
        const centerIndex = Math.floor(NUM_NODES / 2);
        if (state.nodes[centerIndex]) {
            state.nodes[centerIndex].isFixed = false;
        }

        const leftNode = state.nodes[state.cutIndex];
        const rightNode = state.nodes[state.cutIndex + 1];

        // Empuje inicial realista para que se separen
        if (leftNode) {
            leftNode.oldX += 10;
            leftNode.oldY -= 5;
        }
        if (rightNode) {
            rightNode.oldX -= 10;
            rightNode.oldY -= 5;
        }

        // Fibras saltando
        if (leftNode) {
            for (let i = 0; i < 12; i++) {
                state.particles.push(new Particle(leftNode.x, leftNode.y));
            }
        }

        setTimeout(() => {
            setIsOpen(true);

            // Cuando las puertas están abiertas al máximo y el sobre empieza a desvanecerse
            setTimeout(() => {
                if (onReveal) onReveal();
                if (onOpen) onOpen(); // Por compatibilidad
            }, 1800);

            // Desmontar completamente cuando el sobre ya no es visible
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 4500);
        }, 1800);
    };
    const floralPattern = "url('https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/fondos%20puertas.png')";
    const interiorPattern = "url('https://sobdpvsovjixsvpsfmvr.supabase.co/storage/v1/object/public/Boda%20Lis%20y%20Juanjo/dcfd9c52-fb5b-4766-817a-24807c909752.png')";

    return (
        <div className={`fixed inset-0 z-50 overflow-hidden flex items-center justify-center transition-all duration-[2000ms] ${isOpen ? 'pointer-events-none opacity-0 delay-[2500ms]' : 'opacity-100 delay-0'}`}>

            {/* FONDO OPACO / BLUR INICIAL */}
            <div className={`absolute inset-0 transition-opacity duration-[1000ms] ease-in-out pointer-events-none ${isOpen ? 'opacity-0 delay-0' : 'bg-white/80 backdrop-blur-md opacity-100 delay-0'}`}></div>

            {/* Contenedor del sobre */}
            <div
                className={`relative w-full h-full md:max-w-[700px] md:h-[90vh] transition-all duration-[2500ms] ease-in-out flex-shrink-0 z-20 ${isOpen ? 'scale-110 opacity-0 delay-[1800ms]' : 'scale-100 opacity-100 delay-0'}`}
                style={{ perspective: '2000px' }}
            >
                {/* Sombra del sobre */}
                <div className={`absolute inset-0 md:rounded-xl bg-transparent transition-shadow duration-[1000ms] ${isOpen ? 'shadow-none' : 'shadow-[0_20px_60px_rgba(200,190,180,0.3)]'}`}></div>

                {/* INTERIOR DEL SOBRE */}
                <div className="absolute inset-0 bg-[#f9f8f6] md:rounded-xl overflow-hidden z-10 border-[0.5px] border-[#e5d5c5]/80">
                    <div className="absolute inset-0 bg-[length:100%_100%] md:bg-cover bg-no-repeat bg-center" style={{ backgroundImage: interiorPattern }}></div>
                    <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(0,0,0,0.1)] pointer-events-none"></div>
                </div>

                {/* SOLAPA IZQUIERDA */}
                <div
                    className={`absolute top-0 bottom-0 left-0 w-[50%] md:w-[50%] origin-left z-20 transition-transform duration-[2500ms] ease-[cubic-bezier(0.25,1,0.5,1)] ${isOpen ? 'delay-[700ms]' : 'delay-0'}`}
                    style={{ transform: isOpen ? 'rotateY(-140deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-[#f9f8f6] md:rounded-l-xl shadow-[5px_0_20px_rgba(0,0,0,0.06)] overflow-hidden border-r-[0.5px] border-[#e5d5c5]/80">
                        <div className="absolute top-0 bottom-0 left-0 bg-[length:100%_100%] md:bg-cover bg-no-repeat bg-center w-[200%]" style={{ backgroundImage: floralPattern }}></div>
                    </div>
                </div>

                {/* SOLAPA DERECHA */}
                <div
                    className={`absolute top-0 bottom-0 right-0 w-[51%] md:w-[51%] origin-right z-30 transition-transform duration-[2500ms] ease-[cubic-bezier(0.25,1,0.5,1)] delay-0`}
                    style={{ transform: isOpen ? 'rotateY(140deg)' : 'rotateY(0deg)', transformStyle: 'preserve-3d' }}
                >
                    <div className="absolute inset-0 bg-[#f9f8f6] md:rounded-r-xl border-l-[0.5px] border-[#e5d5c5]/80 shadow-[-5px_0_20px_rgba(0,0,0,0.06)] overflow-hidden">
                        <div className="absolute top-0 bottom-0 right-0 bg-[length:100%_100%] md:bg-cover bg-no-repeat bg-center w-[196.1%]" style={{ backgroundImage: floralPattern }}></div>
                    </div>
                </div>

                {/* SIMULACIÓN DE CUERDA (CANVAS) Y CONTROLES */}
                <div
                    ref={containerRef}
                    className={`absolute inset-0 z-30 pointer-events-none transition-opacity duration-[1200ms] ${isOpen ? 'opacity-0' : 'opacity-100'}`}
                >
                    <canvas
                        ref={canvasRef}
                        className="absolute w-full h-full"
                    />

                    {/* Área Interactiva de CORTE (Tijeras) posicionada en el lado derecho */}
                    <div
                        className={`absolute top-1/2 flex flex-col items-center justify-center cursor-pointer pointer-events-auto transition-all duration-300 z-50 group hover:-translate-y-1 ${isCut ? 'scale-0 opacity-0 pointer-events-none' : 'scale-100 opacity-100 hover:scale-110 active:scale-90'}`}
                        style={{ left: '75%', transform: 'translate(-50%, -50%)' }}
                        onClick={handleCut}
                    >
                        {/* Marco pulsante de corte */}
                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-full border-2 border-dashed border-[#a0937d]/80 bg-white/40 backdrop-blur-sm flex items-center justify-center shadow-lg relative animate-pulse">
                            <span className="text-xl md:text-2xl group-hover:-rotate-[30deg] group-active:-rotate-[60deg] transition-transform duration-200 relative top-[-1px]">✂️</span>
                        </div>
                        <div className="absolute top-14 md:top-16 text-[#857b68] text-[9px] md:text-[10px] font-sans font-bold tracking-[0.2em] uppercase text-center bg-white/90 px-3 py-1.5 rounded-sm shadow-sm opacity-80 group-hover:opacity-100 flex flex-col items-center leading-tight">
                            <span>Pulsa aquí</span>
                            <span>para cortar</span>
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
                        className="w-32 md:w-40 h-auto select-none"
                        style={{ filter: 'drop-shadow(0px 10px 15px rgba(0,0,0,0.35))' }}
                        draggable={false}
                    />
                </div>

            </div>
        </div>
    );
}
