import { useState } from "react"
import { Link } from "react-router-dom"

const STORAGE_KEY = "boda_creator_ok"

/** Contraseña del gestor; opcional: variable VITE_CREATOR_PASSWORD en .env */
const envPwd = import.meta.env.VITE_CREATOR_PASSWORD
const CREATOR_PASSWORD =
  typeof envPwd === "string" && envPwd.length > 0 ? envPwd : "chanchitaboda"

function readUnlocked() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === "1"
  } catch {
    return false
  }
}

export default function CreatorGate({ children }) {
  const [unlocked, setUnlocked] = useState(readUnlocked)
  const [value, setValue] = useState("")
  const [error, setError] = useState("")

  const submit = (e) => {
    e.preventDefault()
    const trim = value.trim()
    if (trim === CREATOR_PASSWORD) {
      try {
        sessionStorage.setItem(STORAGE_KEY, "1")
      } catch {
        /* modo privado */
      }
      setError("")
      setUnlocked(true)
      setValue("")
    } else {
      setError("Contraseña incorrecta.")
    }
  }

  if (unlocked) return children

  return (
    <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center bg-cream px-3 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-wine-dark sm:px-4">
      <div className="w-full max-w-sm rounded-xl border border-wine/40 bg-white/90 p-5 shadow-sm backdrop-blur-sm sm:p-6">
        <p className="font-serif text-lg leading-snug text-wine-dark sm:text-xl">Acceso de novios</p>
        <p className="mt-2 text-sm text-wine/80">
          Este acceso solo es para los novios. Muchas gracias :)
        </p>
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-xs font-semibold uppercase tracking-wide text-wine-dark">
            Contraseña
            <input
              type="password"
              autoComplete="current-password"
              value={value}
              onChange={(e) => {
                setValue(e.target.value)
                setError("")
              }}
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-sand px-3 py-2 text-base text-wine-dark focus:border-wine focus:outline-none focus:ring-1 focus:ring-wine sm:text-sm"
            />
          </label>
          {error ? <p className="text-sm text-red-700">{error}</p> : null}
          <button
            type="submit"
            className="min-h-[44px] w-full rounded-lg border border-wine bg-wine px-4 py-3 text-base font-semibold text-cream transition hover:bg-wine-dark sm:text-sm sm:py-2.5"
          >
            Entrar
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-wine/70">
          <Link to="/" className="font-semibold text-wine underline decoration-wine/30 hover:text-wine-dark">
            Volver a la invitación
          </Link>
        </p>
      </div>
    </div>
  )
}
