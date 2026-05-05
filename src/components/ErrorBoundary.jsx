import { Component } from "react"

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error("[Invitación] Error no capturado:", error, info)
  }

  render() {
    if (this.state.hasError) {
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
            Algo no fue bien al cargar la invitación. Por favor recarga la página o inténtalo desde otro navegador.
          </p>
          <button
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
        </div>
      )
    }

    return this.props.children
  }
}
