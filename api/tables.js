import { kv } from "@vercel/kv"

const KEY = "crm:wedding_tables"
const MAX_TABLES = 60

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

const SHAPE_VALUES = new Set(["round", "rectangular", "square"])
const VB_W = 1200
const VB_H = 800

/** @param {unknown} row */
function isValidTable(row) {
  if (!row || typeof row !== "object") return false
  const r = /** @type {Record<string, unknown>} */ (row)
  if (typeof r.id !== "string" || r.id.length === 0 || r.id.length > 80) return false
  if (typeof r.name !== "string" || r.name.length === 0 || r.name.length >= 80) return false
  const cap = Number(r.capacity)
  if (!Number.isInteger(cap) || cap < 1 || cap > 30) return false
  const notes = typeof r.notes === "string" ? r.notes : ""
  if (notes.length > 400) return false
  return true
}

/** @param {number} index */
function defaultTableXY(index) {
  const cols = 4
  const col = index % cols
  const row = Math.floor(index / cols)
  return { x: 160 + col * 260, y: 140 + row * 220 }
}

/** @param {unknown} n @param {number} fallback */
function normCoord(n, fallback) {
  const x = Number(n)
  if (!Number.isFinite(x)) return fallback
  return Math.min(VB_W - 40, Math.max(40, x))
}

/** @param {unknown} s */
function normShape(s) {
  const v = typeof s === "string" ? s.trim().toLowerCase() : ""
  return SHAPE_VALUES.has(v) ? v : "round"
}

/** @param {unknown} rot */
function normRotation(rot) {
  const r = Number(rot)
  if (!Number.isFinite(r)) return 0
  return ((((r % 360) + 360) % 360) | 0)
}

/** @param {Record<string, unknown>} row @param {number} index */
function sanitizeTable(row, index) {
  const d = defaultTableXY(Math.max(0, index))
  return {
    id: String(row.id),
    name: String(row.name).trim().slice(0, 79),
    capacity: Number(row.capacity),
    notes: typeof row.notes === "string" ? row.notes.slice(0, 400) : "",
    shape: normShape(row.shape),
    x: normCoord(row.x, d.x),
    y: normCoord(row.y, d.y),
    rotation: normRotation(row.rotation),
  }
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")

  if (req.method === "GET") {
    try {
      const raw = await kv.get(KEY)
      if (raw == null || raw === "") {
        res.status(200).json({ tables: [] })
        return
      }
      const parsed =
        typeof raw === "string" ? (/** @type {unknown} */ (JSON.parse(raw))) : raw
      const rawList = Array.isArray(parsed)
        ? /** @type {Record<string, unknown>[]} */ (parsed).filter(isValidTable)
        : []
      const list = rawList.map((trow, idx) =>
        sanitizeTable(/** @type {Record<string, unknown>} */ (trow), idx),
      )
      res.status(200).json({ tables: list })
    } catch (e) {
      console.error("[tables GET]", e)
      res.status(500).json({ tables: [] })
    }
    return
  }

  if (req.method === "POST") {
    try {
      const body = parseBody(req)
      const tables = body?.tables
      if (!Array.isArray(tables)) {
        res.status(400).json({ ok: false, error: "tables" })
        return
      }
      const filtered = tables.filter(isValidTable)
      const clean = filtered
        .map((t, idx) =>
          sanitizeTable(/** @type {Record<string, unknown>} */ (t), idx),
        )
        .slice(0, MAX_TABLES)
      await kv.set(KEY, JSON.stringify(clean))
      res.status(200).json({ ok: true })
    } catch (e) {
      console.error("[tables POST]", e)
      res.status(500).json({ ok: false })
    }
    return
  }

  res.status(405).end()
}
