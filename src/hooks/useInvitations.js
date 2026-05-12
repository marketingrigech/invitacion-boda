import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { buildSlug } from "../utils/slugify"

const STORAGE_KEY = "wedding_invitations"

const STATUSES = /** @type {const} */ (["pending", "sent", "confirmed", "declined"])

/** @typedef {(typeof STATUSES)[number]} InviteStatus */

/**
 * @typedef {object} Invitation
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {boolean} plusOne
 * @property {InviteStatus} status
 * @property {string} createdAt
 */

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** @param {unknown} rowRaw */
function normalizeOneRow(rowRaw) {
  if (
    !rowRaw ||
    typeof rowRaw !== "object" ||
    typeof rowRaw.id !== "string" ||
    typeof rowRaw.slug !== "string" ||
    typeof rowRaw.name !== "string"
  ) {
    return null
  }
  const row = /** @type {Record<string, unknown>} */ (rowRaw)

  let status = /** @type {string} */ (row.status)
  const legacyLinkSent = Boolean(row.linkSent)

  if (!STATUSES.includes(/** @type {InviteStatus} */ (status))) {
    if (status === "pending" || status === "confirmed" || status === "declined") {
      /* antiguo sin "sent" */
    } else {
      status = "pending"
    }
  }

  if (status === "pending" && legacyLinkSent) status = "sent"

  if (!STATUSES.includes(/** @type {InviteStatus} */ (status))) status = "pending"

  return /** @type {Invitation} */ ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plusOne: Boolean(row.plusOne),
    status: /** @type {InviteStatus} */ (status),
    createdAt:
      typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
  })
}

/** @param {unknown} parsed */
function normalizeInvitations(parsed) {
  if (!Array.isArray(parsed)) return /** @type {Invitation[]} */ ([])
  return parsed.map(normalizeOneRow).filter(Boolean)
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return /** @type {Invitation[]} */ ([])
    const parsed = JSON.parse(raw)
    return normalizeInvitations(parsed)
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

function pushGuestsToServer(list) {
  fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitations: list }),
  }).catch(() => {})
}

function computeStats(list) {
  const total = list.length
  const confirmedList = list.filter((i) => i.status === "confirmed")
  const pending = list.filter((i) => i.status === "pending").length
  const sent = list.filter((i) => i.status === "sent").length
  const declined = list.filter((i) => i.status === "declined").length
  /** Marcados como enlace enviado o ya respondieron */
  const enviados = list.filter((i) =>
    ["sent", "confirmed", "declined"].includes(i.status),
  ).length
  const totalAttendees =
    confirmedList.length +
    confirmedList.filter((i) => i.plusOne).length
  const plusOneAmongConfirmed = confirmedList.filter((i) => i.plusOne).length
  return {
    total,
    confirmed: confirmedList.length,
    pending,
    sent,
    declined,
    enviados,
    totalAttendees,
    plusOneAmongConfirmed,
  }
}

export function useInvitations() {
  const [invitations, setInvitations] = useState(loadFromStorage)
  const [lastCreated, setLastCreated] = useState(/** @type {Invitation | null} */ (null))
  const [syncReady, setSyncReady] = useState(false)
  const invitationsRef = useRef(invitations)

  useEffect(() => {
    invitationsRef.current = invitations
  }, [invitations])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetch("/api/guests")
        const data = r.ok ? await r.json() : null
        const remote = normalizeInvitations(data?.invitations)
        const local = loadFromStorage()

        if (remote.length > 0) {
          if (!cancelled) {
            setInvitations(remote)
            saveToStorage(remote)
          }
        } else if (local.length > 0) {
          await fetch("/api/guests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ invitations: local }),
          }).catch(() => {})
          if (!cancelled) setInvitations(local)
        }
      } catch {
        if (!cancelled) setInvitations(loadFromStorage())
      } finally {
        if (!cancelled) setSyncReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const persist = useCallback((updater) => {
    setInvitations((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater
      saveToStorage(next)
      pushGuestsToServer(next)
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

    const prev = invitationsRef.current
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
      createdAt: new Date().toISOString(),
    })
    const next = [inv, ...prev]
    saveToStorage(next)
    pushGuestsToServer(next)
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

  const removeInvitation = useCallback((id) => {
    persist((prev) => prev.filter((i) => i.id !== id))
  }, [persist])

  const cycleStatus = useCallback((id) => {
    const order = /** @type {InviteStatus[]} */ ([
      "pending",
      "sent",
      "confirmed",
      "declined",
    ])
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
    syncReady,
    stats,
    addInvitation,
    updateStatus,
    cycleStatus,
    togglePlusOne,
    removeInvitation,
  }
}
