import { Component } from "react"

/**
 * @typedef {object} Props
 * @property {import("react").ReactNode} children
 * @property {string | number} [resetKey] Cuando cambia (p. ej. ruta), limpia el error para no quedar bloqueado
 */

/**
 * @extends {Component<Props, { hasError: boolean, error: Error | null }>}
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error: /** @type {Error | null} */ (error instanceof Error ? error : null) }
  }

  componentDidCatch(error, info) {
    console.error("[Invitación] Error no capturado:", error, info)
  }

  componentDidUpdate(prevProps) {
    const { resetKey } = this.props
    if (
      resetKey !== undefined &&
      resetKey !== prevProps.resetKey &&
      this.state.hasError
    ) {
      this.setState({ hasError: false, error: null })
    }
  }

  render() {
    if (this.state.hasError) {
      const dev = import.meta.env.DEV
      const msg = this.state.error?.message ?? ""
      return (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#f4f1ea",
            padding: "2rem",
            textAlign: "center",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            color: "#471421",
          }}
        >
          <p style={{ fontSize: "3rem", marginBottom: "1rem" }}>💌</p>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 400, marginBottom: "0.75rem" }}>
            Lis & Juanjo
          </h1>
          <p style={{ fontSize: "1.1rem", fontWeight: 300, marginBottom: "2rem", maxWidth: "320px", lineHeight: 1.6 }}>
            Algo no fue bien al cargar la invitación. Prueba a recargar, ir al inicio o abrir desde otro navegador.
          </p>
          {dev && msg ? (
            <pre
              style={{
                marginBottom: "1rem",
                maxWidth: "100%",
                overflow: "auto",
                fontSize: "0.7rem",
                textAlign: "left",
                padding: "0.75rem",
                background: "rgba(0,0,0,0.06)",
                borderRadius: "6px",
              }}
            >
              {msg}
            </pre>
          ) : null}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => window.location.reload()}
              style={{
                background: "#471421",
                color: "#f4f1ea",
                border: "none",
                padding: "0.75rem 2rem",
                fontSize: "0.8rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              Recargar
            </button>
            <button
              type="button"
              onClick={() => {
                window.location.assign("/")
              }}
              style={{
                background: "transparent",
                color: "#471421",
                border: "2px solid #471421",
                padding: "0.75rem 2rem",
                fontSize: "0.8rem",
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: "pointer",
                borderRadius: "2px",
              }}
            >
              Inicio
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
