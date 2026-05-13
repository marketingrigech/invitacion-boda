const MENU_LABEL = {
  "": "(sin especificar)",
  carne: "Carne",
  pescado: "Pescado",
  vegetariano: "Vegetariano",
  infantil: "Menú infantil",
}

/** @param {string} v */
function menuLbl(v) {
  return MENU_LABEL[v] ?? v ?? ""
}

export default function RsvpDetailsModal({ open, guest, onClose }) {
  if (!open || !guest) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wine-dark/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
      aria-label="Datos RSVP"
    >
      <div className="w-full max-w-md rounded-xl border border-wine/40 bg-cream px-5 py-5 shadow-xl">
        <p className="text-xl font-semibold text-wine-dark">{guest.name}</p>
        <dl className="mt-4 space-y-3 text-sm text-wine-dark">
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-wine/75">
              Menú principal
            </dt>
            <dd className="italic text-wine-dark/90">{menuLbl(guest.menu)}</dd>
          </div>
          {guest.plusOne ? (
            <div>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-wine/75">
                Menú acompañante
              </dt>
              <dd className="italic text-wine-dark/90">{menuLbl(guest.plusOneMenu)}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-wine/75">
              Alergias / comentarios
            </dt>
            <dd className="whitespace-pre-wrap italic text-wine-dark/90">
              {guest.dietary?.trim?.() ? guest.dietary : "(ninguno registrado)"}
            </dd>
          </div>
          {guest.rsvpReceived ? (
            <div className="text-xs text-wine/70">
              Registrado: {guest.rsvpAt || "—"}
            </div>
          ) : (
            <p className="text-sm italic text-wine/70">Sin RSVP en KV.</p>
          )}
        </dl>
        <button
          type="button"
          className="mt-6 w-full rounded-lg border border-wine px-4 py-2 text-sm font-semibold text-wine hover:bg-white"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
