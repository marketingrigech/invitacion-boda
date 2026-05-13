export default function EditGuestModal({
  open,
  guest,
  tables,
  /** @type {(patch: Record<string, unknown>) => void} */
  onSave,
  onClose,
}) {
  if (!open || !guest) return null

  const tableOptions = [{ id: "", name: "(sin mesa)" }, ...(tables || [])]

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-wine-dark/50 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal
    >
      <form
        className="w-full max-w-md rounded-xl border border-wine/40 bg-cream px-5 py-5 shadow-xl"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          onSave({
            menu: fd.get("menu"),
            dietary: fd.get("dietary"),
            email: fd.get("email"),
            phone: fd.get("phone"),
            tableId: fd.get("tableId") === "" ? null : String(fd.get("tableId")),
            plusOneMenu: fd.get("plusOneMenu"),
          })
          onClose()
        }}
      >
        <p className="text-xl font-semibold text-wine-dark">Editar {guest.name}</p>

        <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Menú titular
          <select
            name="menu"
            defaultValue={guest.menu || ""}
            className="mt-1 block w-full min-h-[44px] rounded-lg border border-sand bg-white px-3 text-sm text-wine-dark focus:border-wine focus:outline-none"
          >
            <option value="">(sin especificar)</option>
            <option value="carne">Carne</option>
            <option value="pescado">Pescado</option>
            <option value="vegetariano">Vegetariano</option>
            <option value="infantil">Menú infantil</option>
          </select>
        </label>

        {guest.plusOne ? (
          <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-wine-dark">
            Menú acompañante
            <select
              name="plusOneMenu"
              defaultValue={guest.plusOneMenu || ""}
              className="mt-1 block w-full min-h-[44px] rounded-lg border border-sand bg-white px-3 text-sm text-wine-dark focus:border-wine focus:outline-none"
            >
              <option value="">(sin especificar)</option>
              <option value="carne">Carne</option>
              <option value="pescado">Pescado</option>
              <option value="vegetariano">Vegetariano</option>
              <option value="infantil">Menú infantil</option>
            </select>
          </label>
        ) : null}

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Alergias / observaciones
          <textarea
            name="dietary"
            defaultValue={guest.dietary ?? ""}
            rows={3}
            className="mt-1 block w-full rounded-lg border border-sand px-3 py-2 text-sm text-wine-dark focus:border-wine focus:outline-none"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Email
          <input
            name="email"
            type="email"
            defaultValue={guest.email ?? ""}
            className="mt-1 block w-full min-h-[44px] rounded-lg border border-sand px-3 text-sm text-wine-dark focus:border-wine focus:outline-none"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Teléfono
          <input
            name="phone"
            type="tel"
            defaultValue={guest.phone ?? ""}
            className="mt-1 block w-full min-h-[44px] rounded-lg border border-sand px-3 text-sm text-wine-dark focus:border-wine focus:outline-none"
          />
        </label>

        <label className="mt-3 block text-xs font-semibold uppercase tracking-wide text-wine-dark">
          Mesa
          <select
            name="tableId"
            defaultValue={guest.tableId ?? ""}
            className="mt-1 block w-full min-h-[44px] rounded-lg border border-sand bg-white px-3 text-sm text-wine-dark focus:border-wine focus:outline-none"
          >
            {tableOptions.map((t) => (
              <option key={t.id || "none"} value={t.id || ""}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-6 flex gap-2">
          <button
            type="submit"
            className="min-h-[44px] flex-1 rounded-lg border border-wine bg-wine text-sm font-semibold text-cream hover:bg-wine-dark"
          >
            Guardar
          </button>
          <button
            type="button"
            className="min-h-[44px] flex-1 rounded-lg border border-sand text-sm font-semibold text-wine hover:bg-white"
            onClick={onClose}
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
