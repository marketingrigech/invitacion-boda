import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { buildSlug } from "../utils/slugify"

const STORAGE_KEY = "wedding_invitations"

const STATUSES = /** @type {const} */ (["pending", "sent", "preconfirmed", "confirmed", "declined"])

const MENU_VALUES = /** @type {const} */ ([
  "",
  "carne",
  "pescado",
  "vegetariano",
  "infantil",
])

/** @typedef {(typeof STATUSES)[number]} InviteStatus */

/**
 * @typedef {object} Invitation
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {boolean} plusOne
 * @property {InviteStatus} status
 * @property {string} createdAt
 * @property {"" | "carne" | "pescado" | "vegetariano" | "infantil"} menu
 * @property {"" | "carne" | "pescado" | "vegetariano" | "infantil"} plusOneMenu
 * @property {string} dietary
 * @property {boolean} rsvpReceived
 * @property {string} rsvpAt
 * @property {string | null} tableId
 * @property {number | null} seatIndex
 * @property {number | null} plusOneSeatIndex
 * @property {string | null} plusOneTableId
 * @property {string} email
 * @property {string} phone
 * @property {string} plusOneName
 */

function newId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/** @param {unknown} m */
function normMenuVal(m) {
  if (m == null) return ""
  const s = String(m).trim().toLowerCase()
  return MENU_VALUES.includes(/** @type {Invitation["menu"]} */ (s))
    ? /** @type {Invitation["menu"]} */ (s)
    : ""
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
    if (
      status !== "pending" &&
      status !== "sent" &&
      status !== "preconfirmed" &&
      status !== "confirmed" &&
      status !== "declined"
    ) {
      status = "pending"
    }
  }

  if (status === "pending" && legacyLinkSent) status = "sent"

  if (!STATUSES.includes(/** @type {InviteStatus} */ (status))) status = "pending"

  const tid = row.tableId
  /** @type {string | null} */
  let tableId = null
  if (tid != null && tid !== "") {
    if (typeof tid === "string") tableId = tid.slice(0, 80)
  }

  /** @type {number | null} */
  let seatIndex = null
  const siRaw = row.seatIndex
  if (typeof siRaw === "number" && Number.isInteger(siRaw) && siRaw >= 0 && siRaw <= 29) {
    seatIndex = siRaw
  }

  /** @type {number | null} */
  let plusOneSeatIndex = null
  const poRaw = row.plusOneSeatIndex
  if (
    typeof poRaw === "number" &&
    Number.isInteger(poRaw) &&
    poRaw >= 0 &&
    poRaw <= 29
  ) {
    plusOneSeatIndex = poRaw
  }

  /** @type {string | null} */
  let plusOneTableId = null
  const potRaw = row.plusOneTableId
  if (potRaw != null && potRaw !== "") {
    if (typeof potRaw === "string") plusOneTableId = potRaw.slice(0, 80)
  }

  return /** @type {Invitation} */ ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    plusOne: Boolean(row.plusOne),
    status: /** @type {InviteStatus} */ (status),
    createdAt:
      typeof row.createdAt === "string" ? row.createdAt : new Date().toISOString(),
    menu: normMenuVal(row.menu),
    plusOneMenu: normMenuVal(row.plusOneMenu),
    dietary:
      typeof row.dietary === "string" ? row.dietary.slice(0, 500) : "",
    rsvpReceived: Boolean(row.rsvpReceived),
    rsvpAt: typeof row.rsvpAt === "string" ? row.rsvpAt.slice(0, 80) : "",
    tableId,
    seatIndex,
    plusOneSeatIndex,
    plusOneTableId,
    email: typeof row.email === "string" ? row.email.slice(0, 120) : "",
    phone: typeof row.phone === "string" ? row.phone.slice(0, 40) : "",
    plusOneName:
      typeof row.plusOneName === "string"
        ? row.plusOneName.slice(0, 200)
        : "",
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
    /* modo privado / capacidad */
  }
}

function pushGuestsToServer(list) {
  fetch("/api/guests", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitations: list }),
  }).catch(() => {})
}

/** @typedef {{ carne:number, pescado:number, vegetariano:number, infantil:number, empty:number }} MenuAgg */

/**
 * Cuenta menús solo de invitados confirmados titular (+ menú segundo plato si +1 previsto).
 * @param {Invitation[]} list
 * @returns {MenuAgg}
 */
export function cateringMenuTotals(list) {
  /** @type {MenuAgg} */
  const out = {
    carne: 0,
    pescado: 0,
    vegetariano: 0,
    infantil: 0,
    empty: 0,
  }
  /** @param {Invitation["menu"]} m */
  const add = (m) => {
    const v = normMenuVal(m)
    const keys = ["carne", "pescado", "vegetariano", "infantil"]
    if (!v || !keys.includes(v)) out.empty++
    else out[v]++
  }
  for (const g of list) {
    if (g.status !== "confirmed") continue
    add(g.menu)
    if (g.plusOne) add(g.plusOneMenu || "")
  }
  return out
}

function computeStats(list) {
  const total = list.length
  const confirmedList = list.filter((i) => i.status === "confirmed")
  const pending = list.filter((i) => i.status === "pending").length
  const sent = list.filter((i) => i.status === "sent").length
  const preconfirmed = list.filter((i) => i.status === "preconfirmed").length
  const declined = list.filter((i) => i.status === "declined").length
  const enviados = list.filter((i) =>
    ["sent", "preconfirmed", "confirmed", "declined"].includes(i.status),
  ).length
  const totalAttendees =
    confirmedList.length +
    confirmedList.filter((i) => i.plusOne).length
  const plusOneAmongConfirmed = confirmedList.filter((i) => i.plusOne).length
  return {
    total,
    confirmed: confirmedList.length,
    preconfirmed,
    pending,
    sent,
    declined,
    enviados,
    totalAttendees,
    plusOneAmongConfirmed,
    menuCounts: cateringMenuTotals(list),
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

  const refreshInvitationsFromServer = useCallback(async () => {
    try {
      const r = await fetch("/api/guests")
      const data = r.ok ? await r.json() : null
      const remote = normalizeInvitations(data?.invitations)
      if (remote.length > 0) {
        saveToStorage(remote)
        setInvitations(remote)
      }
    } catch {
      /* silencioso */
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

  /** @param {string} id @param {Partial<Invitation>} patch */
  const patchInvitation = useCallback(
    (id, patch) => {
      persist((prev) =>
        prev.map((i) => {
          if (i.id !== id) return i
          const merged = /** @type {Invitation} */ ({ ...i })
          if ("menu" in patch) merged.menu = normMenuVal(patch.menu)
          if ("plusOneMenu" in patch && patch.plusOneMenu != null)
            merged.plusOneMenu = merged.plusOne
              ? normMenuVal(patch.plusOneMenu)
              : ""
          if ("dietary" in patch && patch.dietary != null)
            merged.dietary = String(patch.dietary).slice(0, 500)
          if ("email" in patch && patch.email != null)
            merged.email = String(patch.email).slice(0, 120)
          if ("phone" in patch && patch.phone != null)
            merged.phone = String(patch.phone).slice(0, 40)
          if ("plusOneName" in patch && patch.plusOneName != null)
            merged.plusOneName = String(patch.plusOneName).slice(0, 200)
          if ("rsvpReceived" in patch && patch.rsvpReceived != null)
            merged.rsvpReceived = Boolean(patch.rsvpReceived)
          if ("rsvpAt" in patch && patch.rsvpAt != null)
            merged.rsvpAt =
              typeof patch.rsvpAt === "string"
                ? patch.rsvpAt.slice(0, 80)
                : ""
          if ("tableId" in patch) {
            const t = patch.tableId
            merged.tableId =
              t == null || t === ""
                ? null
                : typeof t === "string"
                  ? t.slice(0, 80)
                  : null
            if (merged.tableId === null) {
              merged.seatIndex = null
              merged.plusOneSeatIndex = null
              merged.plusOneTableId = null
            } else if (
              !("seatIndex" in patch) &&
              !("plusOneSeatIndex" in patch)
            ) {
              merged.seatIndex = null
              merged.plusOneSeatIndex = null
            }
          }
          if ("plusOneTableId" in patch) {
            const t = patch.plusOneTableId
            merged.plusOneTableId =
              t == null || t === ""
                ? null
                : typeof t === "string"
                  ? t.slice(0, 80)
                  : null
          }
          if ("seatIndex" in patch) {
            const s = patch.seatIndex
            if (s == null || s === "") merged.seatIndex = null
            else {
              const n = Number(s)
              merged.seatIndex =
                Number.isInteger(n) && n >= 0 && n <= 29 ? n : null
            }
          }
          if ("plusOneSeatIndex" in patch) {
            const s = patch.plusOneSeatIndex
            if (s == null || s === "") {
              merged.plusOneSeatIndex = null
              merged.plusOneTableId = null
            } else {
              const n = Number(s)
              merged.plusOneSeatIndex =
                Number.isInteger(n) && n >= 0 && n <= 29 ? n : null
              if (merged.plusOneSeatIndex === null) merged.plusOneTableId = null
            }
          }
          if ("status" in patch && patch.status != null) {
            if (STATUSES.includes(patch.status))
              merged.status = /** @type {InviteStatus} */ (patch.status)
          }
          if ("plusOne" in patch && patch.plusOne != null) {
            merged.plusOne = Boolean(patch.plusOne)
            if (!merged.plusOne) {
              merged.plusOneMenu = ""
              merged.plusOneSeatIndex = null
              merged.plusOneTableId = null
            }
          }
          if ("name" in patch && patch.name != null)
            merged.name = String(patch.name).slice(0, 499)
          if ("slug" in patch && patch.slug != null)
            merged.slug = String(patch.slug).slice(0, 299)
          return merged
        }),
      )
    },
    [persist],
  )

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
        error:
          "Ya existe un invitado con esta URL. Cambia el nombre o revisa la lista.",
      }
    }

    const inv = /** @type {Invitation} */ ({
      id: newId(),
      name: `${fn} ${ln}`.replace(/\s+/g, " ").trim(),
      slug,
      plusOne,
      status: "pending",
      createdAt: new Date().toISOString(),
      menu: "",
      plusOneMenu: "",
      dietary: "",
      rsvpReceived: false,
      rsvpAt: "",
      tableId: null,
      seatIndex: null,
      plusOneSeatIndex: null,
      plusOneTableId: null,
      email: "",
      phone: "",
      plusOneName: "",
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
        const nextOne = !i.plusOne
        return {
          ...i,
          plusOne: nextOne,
          plusOneMenu: nextOne ? i.plusOneMenu : "",
          plusOneSeatIndex: nextOne ? i.plusOneSeatIndex : null,
          plusOneTableId: nextOne ? i.plusOneTableId : null,
        }
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
      "preconfirmed",
      "confirmed",
      "declined",
    ])
    persist((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i
        const idx = order.indexOf(i.status)
        const ns = order[(idx + 1) % order.length]
        return { ...i, status: ns }
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
    patchInvitation,
    refreshInvitationsFromServer,
    persistInvitations: persist,
  }
}
