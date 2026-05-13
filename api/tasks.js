import { kv } from "@vercel/kv"

const KEY = "crm:wedding_tasks"
const MAX_TASKS = 200

const CATEGORIES = new Set([
  "catering",
  "finca",
  "decoracion",
  "ropa",
  "papeleria",
  "logistica",
  "regalos",
  "otros",
])

function parseBody(req) {
  const raw = req.body
  if (raw == null) return {}
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw)
    } catch {
      return {}
    }
  }
  if (typeof raw === "object") return raw
  return {}
}

/** @param {unknown} row */
function isValidTask(row) {
  if (!row || typeof row !== "object") return false
  const r = /** @type {Record<string, unknown>} */ (row)
  if (typeof r.id !== "string" || r.id.length === 0 || r.id.length > 80) return false
  if (typeof r.title !== "string" || r.title.length === 0 || r.title.length >= 200)
    return false
  const cat = typeof r.category === "string" ? r.category : "otros"
  if (!CATEGORIES.has(cat)) return false
  if (typeof r.done !== "boolean") return false
  const notes = typeof r.notes === "string" ? r.notes : ""
  if (notes.length > 2000) return false
  const dueAt = r.dueAt
  if (dueAt != null && dueAt !== "" && typeof dueAt !== "string") return false
  const doneAt = r.doneAt
  if (doneAt != null && doneAt !== "" && typeof doneAt !== "string") return false
  return true
}

/** @param {Record<string, unknown>} row */
function sanitizeTask(row) {
  const dueAt =
    typeof row.dueAt === "string" && row.dueAt.length > 0
      ? row.dueAt.slice(0, 40)
      : ""
  let doneAt =
    typeof row.doneAt === "string" && row.doneAt.length > 0 ? row.doneAt.slice(0, 40) : ""
  const done = Boolean(row.done)
  if (done && !doneAt) doneAt = new Date().toISOString()
  if (!done) doneAt = ""
  const cat =
    typeof row.category === "string" && CATEGORIES.has(row.category)
      ? row.category
      : "otros"
  return {
    id: String(row.id),
    title: String(row.title).trim().slice(0, 199),
    category: cat,
    dueAt,
    done,
    doneAt,
    notes: typeof row.notes === "string" ? row.notes.slice(0, 2000) : "",
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")

  if (req.method === "GET") {
    try {
      const raw = await kv.get(KEY)
      if (raw == null || raw === "") {
        res.status(200).json({ tasks: [] })
        return
      }
      const parsed =
        typeof raw === "string" ? (/** @type {unknown} */ (JSON.parse(raw))) : raw
      const list = Array.isArray(parsed)
        ? /** @type {Record<string, unknown>[]} */ (parsed).filter(isValidTask).map(sanitizeTask)
        : []
      res.status(200).json({ tasks: list })
    } catch (e) {
      console.error("[tasks GET]", e)
      res.status(500).json({ tasks: [] })
    }
    return
  }

  if (req.method === "POST") {
    try {
      const body = parseBody(req)
      const tasks = body?.tasks
      if (!Array.isArray(tasks)) {
        res.status(400).json({ ok: false, error: "tasks" })
        return
      }
      const clean = tasks
        .filter(isValidTask)
        .map((t) => sanitizeTask(/** @type {Record<string, unknown>} */ (t)))
        .slice(0, MAX_TASKS)
      await kv.set(KEY, JSON.stringify(clean))
      res.status(200).json({ ok: true })
    } catch (e) {
      console.error("[tasks POST]", e)
      res.status(500).json({ ok: false })
    }
    return
  }

  res.status(405).end()
}
