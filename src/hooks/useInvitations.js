import { useCallback, useMemo, useState } from "react"
import { buildSlug } from "../utils/slugify"

const STORAGE_KEY = "wedding_invitations"

/** @typedef {"pending" | "confirmed" | "declined"} InviteStatus */

/**
 * @typedef {object} Invitation
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {boolean} plusOne
 * @property {InviteStatus} status
 * @property {boolean} linkSent
 * @property {boolean} seen
 * @property {string} createdAt
 */

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return /** @type {Invitation[]} */ ([])
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (row) =>
          row &&
          typeof row.id === "string" &&
          typeof row.slug === "string" &&
          typeof row.name === "string",
      )
      .map((row) => ({
        id: row.id,
        name: row.name,
        slug: row.slug,
        plusOne: Boolean(row.plusOne),
        status: ["pending", "confirmed", "declined"].includes(row.status)
          ? row.status
          : "pending",
        linkSent: Boolean(row.linkSent),
        seen: Boolean(row.seen),
        createdAt:
          typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
      }))
  } catch {
    return /** @type {Invitation[]} */ ([])
  }
}

function saveToStorage(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    /* capacidad o modo privado */
  }
}

function computeStats(list) {
  const total = list.length
  const confirmedList = list.filter((i) => i.status === "confirmed")
  const pending = list.filter((i) => i.status === "pending").length
  const declined = list.filter((i) => i.status === "declined").length
  const sent = list.filter((i) => i.linkSent).length
  const seenCount = list.filter((i) => i.seen).length
  const totalAttendees =
    confirmedList.length +
    confirmedList.filter((i) => i.plusOne).length
  const plusOneAmongConfirmed = confirmedList.filter((i) => i.plusOne).length
  return {
    total,
    confirmed: confirmedList.length,
    pending,
    declined,
    sent,
    seen: seenCount,
    totalAttendees,
    plusOneAmongConfirmed,
  }
}

export function useInvitations() {
  const [invitations, setInvitations] = useState(loadFromStorage)
  const [lastCreated, setLastCreated] = useState(/** @type {Invitation | null} */ (null))

  const persist = useCallback((updater) => {
    setInvitations((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      saveToStorage(next)
      return next
    })
  }, [])

  const stats = useMemo(() => computeStats(invitations), [invitations])

  /** @param {string} firstName @param {string} lastName @param {boolean} plusOne */
  const addInvitation = useCallback((firstName, lastName, plusOne) => {
    const fn = firstName.trim()
    const ln = lastName.trim()
    const slug = buildSlug(fn, ln)
    if (!slug) return { ok: false, error: "Nombre y apellido son obligatorios." }

    const prev = loadFromStorage()
    if (prev.some((i) => i.slug === slug)) {
      return {
        ok: false,
        error: "Ya existe un invitado con esta URL. Cambia el nombre o revisa la lista.",
      }
    }

    const inv = /** @type {Invitation} */ ({
      id: newId(),
      name: `${fn} ${ln}`.replace(/\s+/g, " ").trim(),
      slug,
      plusOne,
      status: "pending",
      linkSent: false,
      seen: false,
      createdAt: new Date().toISOString(),
    })
    const next = [inv, ...prev]
    saveToStorage(next)
    setInvitations(next)
    setLastCreated(inv)
    return { ok: true }
  }, [])

  /** @param {string} id @param {InviteStatus} status */
  const updateStatus = useCallback((id, status) => {
    persist((prev) => prev.map((i) => (i.id === id ? { ...i, status } : i)))
  }, [persist])

  const togglePlusOne = useCallback((id) => {
    persist((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        return { ...i, plusOne: !i.plusOne }
      }),
    )
  }, [persist])

  const toggleLinkSent = useCallback((id) => {
    persist((prev) =>
      prev.map((i) => (i.id === id ? { ...i, linkSent: !i.linkSent } : i)),
    )
  }, [persist])

  const toggleSeen = useCallback((id) => {
    persist((prev) =>
      prev.map((i) => (i.id === id ? { ...i, seen: !i.seen } : i)),
    )
  }, [persist])

  const removeInvitation = useCallback((id) => {
    persist((prev) => prev.filter((i) => i.id !== id))
  }, [persist])

  const cycleStatus = useCallback((id) => {
    const order = /** @type {InviteStatus[]} */ (["pending", "confirmed", "declined"])
    persist((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const idx = order.indexOf(i.status)
        const next = order[(idx + 1) % order.length]
        return { ...i, status: next }
      }),
    )
  }, [persist])

  return {
    invitations,
    lastCreated,
    stats,
    addInvitation,
    updateStatus,
    cycleStatus,
    togglePlusOne,
    toggleLinkSent,
    toggleSeen,
    removeInvitation,
  }
}
