import { kv } from "@vercel/kv"
import {
  WEDDING_INVITATIONS_KV_KEY,
  kvCasApplyRsvpWithAnalytics,
  withInvitationCAS,
} from "./lib/kv-invitation-store.js"

const KEY = WEDDING_INVITATIONS_KV_KEY
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

  const name = normStr(body.name, 500)
  if (!name) {
    res.status(400).json({ ok: false, error: "name" })
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

    const plusOne = Boolean(body.plusOne)
    const plusOneName = plusOne ? normStr(body.plusOneName, 200) : ""
    const menu = normMenu(body.menu)
    const plusOneMenu = plusOne ? normMenu(body.plusOneMenu) : ""
    const dietary = normStr(body.dietary, 500)
    const email = normStr(body.email, 120)
    const phone = normStr(body.phone, 40)

    await withInvitationCAS(async (expectedRaw) => {
      /** @type {Record<string, unknown>[]} */
      let list = []
      if (expectedRaw !== "") {
        try {
          const parsed =
            typeof expectedRaw === "string"
              ? (/** @type {unknown} */ (JSON.parse(expectedRaw)))
              : expectedRaw
          if (Array.isArray(parsed)) list = /** @type {Record<string, unknown>[]} */ (parsed).slice()
        } catch {
          list = []
        }
      }

      const now = new Date().toISOString()
      const idx = list.findIndex(
        /** @param {unknown} row */ (row) =>
          row &&
          typeof row === "object" &&
          /** @type {Record<string, unknown>} */ (row).slug === slug,
      )

      if (idx >= 0) {
        const prev = /** @type {Record<string, unknown>} */ (list[idx])
        const plusOneStored = Boolean(prev.plusOne)
        const prevStatus = typeof prev.status === "string" ? prev.status : "pending"
        const nextStatus = prevStatus === "confirmed" ? "confirmed" : "preconfirmed"
        list[idx] = {
          ...prev,
          name,
          plusOne: plusOneStored ? plusOneStored : Boolean(plusOne),
          status: nextStatus,
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
          status: "preconfirmed",
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

      const confirmNow = new Date().toISOString()
      const nextJson = JSON.stringify(list)
      const committed = await kvCasApplyRsvpWithAnalytics(
        kv,
        KEY,
        expectedRaw,
        nextJson,
        slug,
        confirmNow,
      )
      if (committed) return { ok: true, value: undefined }
      return { ok: false, retry: true }
    })

    res.status(200).json({ ok: true })
  } catch (e) {
    console.error("[rsvp]", e)
    if (/** @type {Error} */ (e)?.message === "invitation_kv_exhausted") {
      res.status(503).json({ ok: false, error: "busy" })
      return
    }
    res.status(500).json({ ok: false })
  }
}
