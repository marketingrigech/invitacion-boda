import { useEffect } from "react"

/**
 * @param {{
 *   open: boolean
 *   tableName: string
 *   guestCount: number
 *   onConfirm: () => void
 *   onCancel: () => void
 * }} props
 */
export default function DeleteTableConfirmModal({
  open,
  tableName,
  guestCount,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(/** @type {KeyboardEvent} */ e) {
      if (e.key === "Escape") onCancel()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [open, onCancel])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-wine-dark/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-labelledby="delete-table-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel()
      }}
    >
      <div
        className="w-full max-w-md rounded-xl border border-wine/40 bg-cream px-5 py-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="delete-table-title" className="text-xl font-semibold text-wine-dark">
          ¿Eliminar esta mesa?
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-wine-dark/90">
          <span className="font-semibold">«{tableName}»</span>
          {guestCount > 0 ? (
            <>
              {" "}
              tiene <strong className="tabular-nums">{guestCount}</strong> invitación
              {guestCount === 1 ? "" : "es"} enlazada{guestCount === 1 ? "" : "s"} a esta
              mesa. Se quitarán del plano (titular y acompañantes).
            </>
          ) : (
            <> se eliminará del plano. No hay invitados asignados.</>
          )}
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg border border-sand bg-white px-4 py-2 text-sm font-semibold text-wine-dark hover:bg-white/95"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg border border-red-900/35 bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800"
            onClick={onConfirm}
          >
            Eliminar mesa
          </button>
        </div>
      </div>
    </div>
  )
}
