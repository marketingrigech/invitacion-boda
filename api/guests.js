import { kv } from "@vercel/kv"

const KEY = "crm:wedding_invitations"
const MAX_GUESTS = 400

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

function isValidRow(row) {
  return (
    row &&
    typeof row.id === "string" &&
    typeof row.slug === "string" &&
    typeof row.name === "string" &&
    row.slug.length > 0 &&
    row.slug.length < 300 &&
    row.name.length < 500
  )
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")

  if (req.method === "GET") {
    try {
      const raw = await kv.get(KEY)
      if (raw == null || raw === "") {
        res.status(200).json({ invitations: [] })
        return
      }
      const parsed =
        typeof raw === "string" ? (/** @type {unknown} */ (JSON.parse(raw))) : raw
      const list = Array.isArray(parsed) ? parsed.filter(isValidRow) : []
      res.status(200).json({ invitations: list })
    } catch (e) {
      console.error("[guests GET]", e)
      res.status(500).json({ invitations: [] })
    }
    return
  }

  if (req.method === "POST") {
    try {
      const body = parseBody(req)
      const invitations = body?.invitations
      if (!Array.isArray(invitations)) {
        res.status(400).json({ ok: false, error: "invitations" })
        return
      }
      const clean = invitations.filter(isValidRow).slice(0, MAX_GUESTS)
      await kv.set(KEY, JSON.stringify(clean))
      res.status(200).json({ ok: true })
    } catch (e) {
      console.error("[guests POST]", e)
      res.status(500).json({ ok: false })
    }
    return
  }

  res.status(405).end()
}
