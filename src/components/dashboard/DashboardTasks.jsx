import { useMemo, useState } from "react"
import FadeInSection from "../shared/FadeInSection"
import { useDashboard } from "./DashboardProvider"

const CAT_LABEL = /** @type {Record<string, string>} */ ({
  finca: "Finca / venue",
  catering: "Catering",
  papeleria: "Papel / invitaciones",
  ropa: "Ropa",
  decoracion: "Decoración",
  logistica: "Logística",
  regalos: "Regalos",
  otros: "Otros",
})

/** @typedef {{ id: string; title: string; category: string; dueAt: string; done: boolean; doneAt: string; notes: string }} TaskRow */

function newTaskId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `t-${crypto.randomUUID()}`
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export default function DashboardTasks() {
  const { tasks, saveTasksToServer } = useDashboard()

  const [catFilter, setCatFilter] = useState(
    /** @type {string | "todas"} */ ("todas"),
  )
  const [title, setTitle] = useState("")
  const [category, setCategory] = useState("finca")

  /** @type {React.FormEventHandler} */
  const addTask = (e) => {
    e.preventDefault()
    const t = title.trim()
    if (!t) return
    const row = /** @type {TaskRow} */ ({
      id: newTaskId(),
      title: t,
      category,
      dueAt: "",
      done: false,
      doneAt: "",
      notes: "",
    })
    saveTasksToServer([row, ...tasks])
    setTitle("")
  }

  /** @param {TaskRow} row */
  const toggleDone = (row) => {
    const nextDone = !row.done
    const next = tasks.map((x) =>
      x.id === row.id
        ? {
            ...x,
            done: nextDone,
            doneAt: nextDone ? new Date().toISOString() : "",
          }
        : x,
    )
    saveTasksToServer(next)
  }

  /** @param {TaskRow["id"]} id */
  const removeRow = (id) => {
    if (!window.confirm("¿Eliminar esta tarea?")) return
    saveTasksToServer(tasks.filter((x) => x.id !== id))
  }

  const categoriesInUse = useMemo(() => {
    const set = new Set(tasks.map((t) => t.category))
    return Array.from(set).sort()
  }, [tasks])

  const filtered = useMemo(() => {
    const base =
      catFilter === "todas" ? tasks : tasks.filter((t) => t.category === catFilter)
    return [...base].sort((a, b) => {
      if (a.done !== b.done) return a.done ? 1 : -1
      return a.title.localeCompare(b.title, "es")
    })
  }, [tasks, catFilter])

  const pct =
    tasks.length === 0
      ? 0
      : Math.round((tasks.filter((t) => t.done).length / tasks.length) * 100)

  return (
    <div className="space-y-6">
      <FadeInSection className="rounded-xl border border-wine/40 bg-white/85 p-4 shadow-sm">
        <p className="text-xl font-semibold text-wine-dark">Checklist día B</p>
        <p className="mt-1 text-sm text-wine/75">
          {tasks.filter((t) => t.done).length}/{tasks.length} hechas (~{pct}%)
        </p>
        <form onSubmit={addTask} className="mt-4 flex flex-wrap items-end gap-3">
          <label className="block min-w-[180px] text-xs font-semibold uppercase tracking-wide text-wine-dark">
            Nueva tarea
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-lg border border-sand px-3 py-2 text-sm focus:border-wine focus:outline-none"
              placeholder="Ej. llevar cufflinks"
            />
          </label>
          <label className="block text-xs font-semibold uppercase tracking-wide text-wine-dark">
            Categoría
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 min-h-[42px] w-full rounded-lg border border-sand bg-white px-2 text-sm"
            >
              {Object.entries(CAT_LABEL).map(([k, lab]) => (
                <option key={k} value={k}>
                  {lab}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="rounded-lg border border-wine bg-wine px-4 py-2 text-sm font-semibold text-cream hover:bg-wine-dark"
          >
            Añadir
          </button>
        </form>
      </FadeInSection>

      <FadeInSection delay="80ms" className="rounded-xl border border-wine/30 bg-white/70 p-3 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-wine/70">
          Filtrar
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setCatFilter("todas")}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              catFilter === "todas"
                ? "border-wine bg-wine text-cream"
                : "border-sand text-wine hover:bg-white"
            }`}
          >
            Todas
          </button>
          {categoriesInUse.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCatFilter(c)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                catFilter === c
                  ? "border-wine bg-wine text-cream"
                  : "border-sand text-wine hover:bg-white"
              }`}
            >
              {CAT_LABEL[c] ?? c}
            </button>
          ))}
        </div>
      </FadeInSection>

      <ul className="space-y-2">
        {filtered.map((row, idx) => (
          <FadeInSection key={row.id} delay={`${Math.min(idx, 16) * 25}ms`}>
            <li
              className={`flex flex-wrap items-start gap-3 rounded-xl border px-4 py-3 shadow-sm ${
                row.done ? "border-sand/80 bg-cream/50 opacity-80" : "border-wine/35 bg-white/90"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={row.done}
                  onChange={() => toggleDone(row)}
                  className="h-4 w-4 accent-wine"
                />
                <span
                  className={`text-sm font-medium text-wine-dark ${
                    row.done ? "line-through" : ""
                  }`}
                >
                  {row.title}
                </span>
              </label>
              <span className="rounded-full border border-sand bg-cream/80 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-wine/80">
                {CAT_LABEL[row.category] ?? row.category}
              </span>
              <button
                type="button"
                className="ml-auto text-[11px] text-red-800 hover:underline"
                onClick={() => removeRow(row.id)}
              >
                Borrar
              </button>
            </li>
          </FadeInSection>
        ))}
      </ul>
      {filtered.length === 0 ? (
        <p className="text-center text-sm text-wine/60">No hay tareas en este filtro.</p>
      ) : null}
    </div>
  )
}
