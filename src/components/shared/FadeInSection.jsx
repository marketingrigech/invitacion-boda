import { useEffect, useLayoutEffect, useRef } from "react"

/**
 * Evita pantallas «vacías»: con threshold alto o layout aún sin medir,
 * IntersectionObserver a veces no vuelve a disparar hasta que hay scroll.
 * @param {Element} el
 */
function markVisibleIfInViewport(el) {
  const r = el.getBoundingClientRect()
  const vw = typeof window !== "undefined" ? window.innerWidth : 0
  const vh = typeof window !== "undefined" ? window.innerHeight : 0
  /** Cualquier solapamiento con la ventana (incluye altura 0 en el primer frame). */
  if (r.width >= 0 && r.height >= 0 && r.bottom > 0 && r.right > 0 && r.top < vh && r.left < vw) {
    el.classList.add("is-visible")
    return true
  }
  return false
}

/**
 * @param {object} props
 * @param {import("react").ReactNode} props.children
 * @param {string} [props.className]
 * @param {string} [props.delay]
 * @param {Element | null} [props.observerRoot]
 */
export default function FadeInSection({
  children,
  className = "",
  delay = "0ms",
  observerRoot = null,
}) {
  const domRef = useRef(null)

  useLayoutEffect(() => {
    const el = domRef.current
    if (!el) return
    markVisibleIfInViewport(el)
  }, [observerRoot])

  useEffect(() => {
    const el = domRef.current
    if (!el) return

    /** Segundo paso tras estilos/flex/grid (p. ej. panel /dashboard#mesas). */
    let raf1 = 0
    let raf2 = 0
    raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => markVisibleIfInViewport(el))
    })

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible")
          }
        })
      },
      {
        root: observerRoot ?? null,
        threshold: [0, 0.02, 0.08],
        rootMargin: "0px",
      },
    )

    observer.observe(el)
    return () => {
      cancelAnimationFrame(raf1)
      cancelAnimationFrame(raf2)
      observer.unobserve(el)
    }
  }, [observerRoot])

  return (
    <div className={`fade-in-section ${className}`} ref={domRef} style={{ transitionDelay: delay }}>
      {children}
    </div>
  )
}
