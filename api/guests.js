import { kv } from "@vercel/kv"
import {
  WEDDING_INVITATIONS_KV_KEY,
  kvCasSetInvitationBlob,
  withInvitationCAS,
} from "./lib/kv-invitation-store.js"

const KEY = WEDDING_INVITATIONS_KV_KEY
const MAX_GUESTS = 400

const MENU_VALUES = new Set(["", "carne", "pescado", "vegetariano", "infantil"])
const INVITE_STATUSES = new Set(["pending", "sent", "preconfirmed", "confirmed", "declined"])

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

/** @param {string | undefined | null} s */
function normMenu(s) {
  if (s == null || s === "") return ""
  const v = typeof s === "string" ? s.trim().toLowerCase() : ""
  return MENU_VALUES.has(v) && v !== "" ? v : ""
}

/** @param {unknown} v */
function normBool(v) {
  return Boolean(v)
}

/** @param {unknown} s @param {number} max */
function normStr(s, max) {
  if (typeof s !== "string") return ""
  return s.trim().slice(0, max)
}

/** @param {unknown} s */
function normTableId(s) {
  if (s == null || s === "") return null
  if (typeof s !== "string") return null
  const t = s.trim()
  if (t.length === 0 || t.length > 80) return null
  return t
}

/** @param {unknown} v */
function normSeatIdx(v) {
  if (v == null || v === "") return null
  const n = Number(v)
  if (!Number.isInteger(n) || n < 0 || n > 29) return null
  return n
}

/**
 * Cleans optional CRM fields without dropping valid base row.
 * @param {Record<string, unknown>} row
 */
function sanitizeInvitationRow(row) {
  let status = typeof row.status === "string" ? row.status.trim() : "pending"
  if (!INVITE_STATUSES.has(status)) status = "pending"
  /** @type {Record<string, unknown>} */
  const out = {
    id: row.id,
    slug: row.slug,
    name: row.name,
    plusOne: Boolean(row.plusOne),
    status,
    createdAt: typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    menu: normMenu(row.menu),
    plusOneMenu: normMenu(row.plusOneMenu),
    dietary: normStr(row.dietary, 500),
    rsvpReceived: normBool(row.rsvpReceived),
    rsvpAt: typeof row.rsvpAt === "string" && row.rsvpAt.length <= 80 ? row.rsvpAt : "",
    tableId: normTableId(row.tableId),
    seatIndex: normSeatIdx(row.seatIndex),
    plusOneSeatIndex: normSeatIdx(row.plusOneSeatIndex),
    plusOneTableId: normTableId(row.plusOneTableId),
    email: normStr(row.email, 120),
    phone: normStr(row.phone, 40),
    plusOneName: normStr(row.plusOneName, 200),
    isCouple: normBool(row.isCouple),
    plusOneIsCouple: normBool(row.plusOneIsCouple),
  }
  return /** @type {typeof row & Record<string, unknown>} */ (out)
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
      const list = Array.isArray(parsed) ? parsed.filter(isValidRow).map((r) => sanitizeInvitationRow(/** @type {Record<string, unknown>} */ (r))) : []
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
      const clean = invitations
        .filter(isValidRow)
        .map((r) => sanitizeInvitationRow(/** @type {Record<string, unknown>} */ (r)))
        .slice(0, MAX_GUESTS)
      const serialized = JSON.stringify(clean)

      await withInvitationCAS(async (expectedRaw) => {
        const ok = await kvCasSetInvitationBlob(kv, KEY, expectedRaw, serialized)
        if (ok) return { ok: true, value: undefined }
        return { ok: false, retry: true }
      })

      res.status(200).json({ ok: true })
    } catch (e) {
      console.error("[guests POST]", e)
      if (/** @type {Error} */ (e)?.message === "invitation_kv_exhausted") {
        res.status(503).json({ ok: false, error: "busy" })
        return
      }
      res.status(500).json({ ok: false })
    }
    return
  }

  res.status(405).end()
}
