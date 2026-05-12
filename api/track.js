import { kv } from "@vercel/kv"

const SLUG_RE = /^[A-Za-z0-9_-]{1,220}$/

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

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).end()
    return
  }

  const { slug, event } = parseBody(req)
  if (!slug || typeof slug !== "string" || !SLUG_RE.test(slug)) {
    res.status(400).json({ ok: false, error: "slug" })
    return
  }
  if (!event || !["view", "open"].includes(event)) {
    res.status(400).json({ ok: false, error: "event" })
    return
  }

  try {
    const key = `inv:${slug}`
    const field = event === "view" ? "views" : "opens"
    const now = new Date().toISOString()
    const lastField = event === "view" ? "last_view" : "last_open"

    await kv.hincrby(key, field, 1)
    await kv.hset(key, { [lastField]: now })

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error("[track]", e)
    res.status(500).json({ ok: false })
  }
}
