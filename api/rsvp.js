import { kv } from "@vercel/kv"

const KEY = "crm:wedding_invitations"
const RL_PREFIX = "rsvp:rl:"
const SLUG_RE = /^[A-Za-z0-9_-]{1,220}$/

const MENU_VALUES = new Set(["carne", "pescado", "vegetariano", "infantil", ""])

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

function normMenu(s) {
  if (s == null || s === "") return ""
  const v = typeof s === "string" ? s.trim().toLowerCase() : ""
  return MENU_VALUES.has(v) ? v : ""
}

function normStr(s, max) {
  if (typeof s !== "string") return ""
  return s.trim().slice(0, max)
}

function newUuid() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")

  if (req.method !== "POST") {
    res.status(405).end()
    return
  }

  const body = parseBody(req)
  const slug = typeof body.slug === "string" ? body.slug.trim() : ""
  if (!slug || !SLUG_RE.test(slug)) {
    res.status(400).json({ ok: false, error: "slug" })
    return
  }

  try {
    const rlKey = `${RL_PREFIX}${slug}`
    const rl = await kv.get(rlKey)
    if (rl != null && rl !== "") {
      res.status(200).json({ ok: true, throttled: true })
      return
    }
    await kv.set(rlKey, "1", { ex: 5 })

    const name = normStr(body.name, 500)
    if (!name) {
      res.status(400).json({ ok: false, error: "name" })
      return
    }

    const plusOne = Boolean(body.plusOne)
    const plusOneName = plusOne ? normStr(body.plusOneName, 200) : ""
    const menu = normMenu(body.menu)
    const plusOneMenu = plusOne ? normMenu(body.plusOneMenu) : ""
    const dietary = normStr(body.dietary, 500)
    const email = normStr(body.email, 120)
    const phone = normStr(body.phone, 40)
    const now = new Date().toISOString()

    const raw = await kv.get(KEY)
    let list = []
    if (raw != null && raw !== "") {
      try {
        const parsed =
          typeof raw === "string" ? (/** @type {unknown} */ (JSON.parse(raw))) : raw
        if (Array.isArray(parsed))
          list = /** @type {Record<string, unknown>[]} */ (parsed).slice()
      } catch {
        list = []
      }
    }

    const idx = list.findIndex(
      /** @param {unknown} row */ (row) =>
        row && typeof row === "object" && /** @type {Record<string, unknown>} */ (row).slug === slug,
    )

    if (idx >= 0) {
      const prev = /** @type {Record<string, unknown>} */ (list[idx])
      const plusOneStored = Boolean(prev.plusOne)
      list[idx] = {
        ...prev,
        name,
        plusOne: plusOneStored ? plusOneStored : Boolean(plusOne),
        status: "confirmed",
        rsvpReceived: true,
        rsvpAt: now,
        menu,
        plusOneMenu: plusOneStored && Boolean(plusOne) ? plusOneMenu : "",
        dietary,
        email: email || (typeof prev.email === "string" ? prev.email : ""),
        phone: phone || (typeof prev.phone === "string" ? prev.phone : ""),
        plusOneName: plusOneStored && Boolean(plusOne) ? plusOneName : "",
      }
    } else {
      list.push({
        id: newUuid(),
        slug,
        name,
        plusOne,
        plusOneName: plusOne ? plusOneName : "",
        status: "confirmed",
        createdAt: now,
        menu,
        plusOneMenu,
        dietary,
        rsvpReceived: true,
        rsvpAt: now,
        tableId: null,
        email,
        phone,
        seatIndex: null,
      })
    }

    await kv.set(KEY, JSON.stringify(list))

    const invKey = `inv:${slug}`
    const confirmNow = new Date().toISOString()
    await kv.hincrby(invKey, "confirms", 1)
    await kv.hset(invKey, { last_confirm: confirmNow })

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error("[rsvp]", e)
    res.status(500).json({ ok: false })
  }
}
