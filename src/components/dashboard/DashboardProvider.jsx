import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useInvitations } from "../../hooks/useInvitations"

/** @typedef {{ id:string, name:string, capacity:number, notes:string, shape:string, x:number, y:number, rotation:number }} TableRow */
/** @typedef {{ id:string, title:string, category:string, dueAt:string, done:boolean, doneAt:string, notes:string }} TaskRow */

/**
 * Mesa donde está colocado el +1 (si no hay `plusOneTableId`, misma que el titular).
 * @param {import("../../hooks/useInvitations.js").Invitation} r
 */
function plusOneEffectiveTable(r) {
  if (!r.plusOne || typeof r.plusOneSeatIndex !== "number") return null
  if (r.plusOneTableId != null && r.plusOneTableId !== "") return r.plusOneTableId
  return r.tableId
}

/** Confirmado o invitación aún sin RSVP: puede usar asiento en el plano. */
function invitationCanOccupySeatInMap(r) {
  const s = r.status
  return s === "confirmed" || s === "pending" || s === "sent"
}

function newSeedId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
}

/** Primera vez: KV vacío para tareas → sembramos checklist útil para la pareja */
function buildTaskSeedList() {
  /** @type {Array<[string,string]>} */
  const rows = [
    ["finca", "Confirmar detalles y horarios con La Batipuerta"],
    ["catering", "Enviar conteo confirmado + menús al catering / finca"],
    ["papeleria", "Repartir últimos enlaces WhatsApp pendientes"],
    ["ropa", "Revisión traje / vestido y accesorios"],
    ["decoracion", "Flores / detalles de mesa coordenados"],
    ["logistica", "Parking, taxis y llegada desde fuera"],
    ["regalos", "Lista regalos IBAN revisada"],
    ["finca", "Mapa QR de mesas (si imprimís carteles)"],
    ["papeleria", "Recoger música / playlists"],
    ["catering", "Recogida alérgenos finales día -3"],
    ["logistica", "Briefing equipo día B"],
    ["otros", "Revisión panel /dashboard estadísticas RSVP"],
    ["papeleria", "Plantilla texto agradecimientos posteriores"],
  ]
  return rows.map(([category, title]) => ({
    id: newSeedId("t"),
    title,
    category,
    dueAt: "",
    done: false,
    doneAt: "",
    notes: "",
  }))
}

/** @type {React.Context<any>} */
export const DashboardContext = createContext(null)

export function useDashboard() {
  const ctx = useContext(DashboardContext)
  if (!ctx) throw new Error("useDashboard debe usarse dentro del DashboardProvider")
  return ctx
}

export default function DashboardProvider({ children }) {
  const invitationsApi = useInvitations()
  const {
    invitations,
    syncReady,
    stats,
    patchInvitation,
    updateStatus,
    refreshInvitationsFromServer,
    persistInvitations,
    ...invitationRest
  } = invitationsApi

  /** @type {Record<string, Record<string,string>> } */
  const [analytics, setAnalytics] = useState({})

  /** @type {TableRow[]} */
  const [tables, setTables] = useState([])
  /** @type {TaskRow[]} */
  const [tasks, setTasks] = useState([])
  /** @type {'idle'|'savingTables'|'savingTasks'} */
  const [saveState, setSaveState] = useState("idle")

  useEffect(() => {
    fetch("/api/tables")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) =>
        Array.isArray(d.tables) ? setTables(d.tables) : setTables([]),
      )
      .catch(() => setTables([]))

    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : {}))
      .then(async (d) => {
        let list = Array.isArray(d.tasks) ? d.tasks : []
        if (list.length === 0) {
          list = buildTaskSeedList()
          try {
            await fetch("/api/tasks", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tasks: list }),
            })
          } catch {
            /* noop */
          }
        }
        setTasks(list)
      })
      .catch(() => setTasks([]))
  }, [])

  const loadAnalytics = useCallback(() => {
    fetch("/api/analytics")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data) => {
        if (data && typeof data === "object" && !Array.isArray(data))
          setAnalytics(data)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadAnalytics()
    const t = setInterval(loadAnalytics, 30_000)
    return () => clearInterval(t)
  }, [loadAnalytics])

  useEffect(() => {
    refreshInvitationsFromServer()
    const t = setInterval(refreshInvitationsFromServer, 45_000)
    return () => clearInterval(t)
  }, [refreshInvitationsFromServer])

  const kvTotals = useMemo(() => {
    let totalViews = 0
    let totalOpens = 0
    let totalClicks = 0
    let totalConfirms = 0
    for (const k of Object.values(analytics)) {
      if (!k || typeof k !== "object") continue
      totalViews += Number(/** @type {any} */ (k).views) || 0
      totalOpens += Number(/** @type {any} */ (k).opens) || 0
      totalClicks += Number(/** @type {any} */ (k).clicks) || 0
      totalConfirms += Number(/** @type {any} */ (k).confirms) || 0
    }
    return { totalViews, totalOpens, totalClicks, totalConfirms }
  }, [analytics])

  const saveTablesToServer = useCallback(async (/** @type {TableRow[]} */ next) => {
    setTables(next)
    setSaveState("savingTables")
    try {
      await fetch("/api/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tables: next }),
      })
    } catch {
      /* noop */
    } finally {
      setSaveState("idle")
    }
  }, [])

  const saveTasksToServer = useCallback(async (/** @type {TaskRow[]} */ next) => {
    setTasks(next)
    setSaveState("savingTasks")
    try {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: next }),
      })
    } catch {
      /* noop */
    } finally {
      setSaveState("idle")
    }
  }, [])

  /** @param {string} guestId @param {'titular'|'plusOne'|'all'} part */
  const releaseInvitationSeat = useCallback(
    (guestId, part) => {
      persistInvitations((prev) =>
        prev.map((r) => {
          if (r.id !== guestId) return r
          if (part === "all")
            return {
              ...r,
              tableId: null,
              seatIndex: null,
              plusOneSeatIndex: null,
              plusOneTableId: null,
            }
          if (part === "titular") {
            const n = { ...r, seatIndex: null }
            const plusOnSameTable =
              n.plusOne &&
              typeof n.plusOneSeatIndex === "number" &&
              (n.plusOneTableId == null ||
                n.plusOneTableId === "" ||
                n.plusOneTableId === r.tableId)
            if (plusOnSameTable) {
              n.plusOneSeatIndex = null
              n.plusOneTableId = null
            }
            const titPlaced = typeof n.seatIndex === "number"
            const plusPlaced =
              n.plusOne && typeof n.plusOneSeatIndex === "number"
            if (!titPlaced && !plusPlaced) n.tableId = null
            return n
          }
          if (part === "plusOne") {
            const n = {
              ...r,
              plusOneSeatIndex: null,
              plusOneTableId: null,
            }
            const titPlaced = typeof n.seatIndex === "number"
            if (!titPlaced) n.tableId = null
            return n
          }
          return r
        }),
      )
    },
    [persistInvitations],
  )

  /** @typedef {'titular' | 'plusOne'} SeatPartyRole */

  const assignGuestSeat = useCallback(
    /**
     * @param {string} guestId
     * @param {string | null} tableIdOrNonNull
     * @param {'auto' | number} seatMode
     * @param {SeatPartyRole} [seatRoleArg]
     */
    (guestId, tableIdOrNonNull, seatMode, seatRoleArg = "titular") => {
      const seatRole = seatRoleArg === "plusOne" ? "plusOne" : "titular"
      if (tableIdOrNonNull == null) return

      persistInvitations((prev) => {
        const gi = prev.findIndex(
          (x) => x.id === guestId && invitationCanOccupySeatInMap(x),
        )
        if (gi < 0) return prev
        const mine = prev[gi]
        if (seatRole === "plusOne" && !mine.plusOne) return prev

        const tbl = tables.find((t) => t.id === tableIdOrNonNull)
        if (!tbl) return prev
        const cap = tbl.capacity

        const titularChangingTable =
          seatRole === "titular" &&
          mine.tableId != null &&
          mine.tableId !== "" &&
          mine.tableId !== tableIdOrNonNull

        /** @type {Set<number>} */
        const occ = new Set()
        for (const r of prev) {
          if (!invitationCanOccupySeatInMap(r)) continue
          const skipT = r.id === guestId && seatRole === "titular"
          const skipP = r.id === guestId && seatRole === "plusOne"
          if (
            !skipT &&
            r.tableId === tableIdOrNonNull &&
            typeof r.seatIndex === "number" &&
            r.seatIndex >= 0 &&
            r.seatIndex < cap
          )
            occ.add(r.seatIndex)
          const pTable = plusOneEffectiveTable(r)
          if (
            r.plusOne &&
            !skipP &&
            pTable === tableIdOrNonNull &&
            typeof r.plusOneSeatIndex === "number" &&
            r.plusOneSeatIndex >= 0 &&
            r.plusOneSeatIndex < cap
          )
            occ.add(r.plusOneSeatIndex)
        }

        const firstVacant = () => {
          for (let s = 0; s < cap; s++) if (!occ.has(s)) return s
          return undefined
        }

        const firstFreeSeat = (/** @type {Set<number>} */ bag, forbid) => {
          for (let j = 0; j < cap; j++)
            if (j !== forbid && !bag.has(j)) return j
          return undefined
        }

        /** @type {number | undefined} */
        let S
        /** @type {null | { id: string; party: SeatPartyRole; seatIndex: number }} */
        let displaced = null

        if (seatMode === "auto") {
          S = firstVacant()
          if (S === undefined) return prev
        } else if (typeof seatMode === "number") {
          if (seatMode < 0 || seatMode >= cap) return prev
          S = seatMode
          if (occ.has(S)) {
            const occDup = new Set(occ)
            occDup.delete(S)
            const owner = prev.find((row) => {
              if (!invitationCanOccupySeatInMap(row)) return false
              if (
                row.tableId === tableIdOrNonNull &&
                typeof row.seatIndex === "number" &&
                row.seatIndex === S
              )
                return true
              const pt = plusOneEffectiveTable(row)
              return (
                row.plusOne &&
                pt === tableIdOrNonNull &&
                typeof row.plusOneSeatIndex === "number" &&
                row.plusOneSeatIndex === S
              )
            })
            if (!owner) return prev
            const party =
              owner.tableId === tableIdOrNonNull &&
              typeof owner.seatIndex === "number" &&
              owner.seatIndex === S
                ? /** @type {SeatPartyRole} */ ("titular")
                : "plusOne"
            const alt = firstFreeSeat(occDup, S)
            if (alt === undefined) return prev
            displaced = { id: owner.id, party, seatIndex: alt }
          }
        } else {
          return prev
        }

        return prev.map((r) => {
          if (displaced && r.id === displaced.id) {
            if (displaced.party === "titular")
              return { ...r, seatIndex: displaced.seatIndex }
            return { ...r, plusOneSeatIndex: displaced.seatIndex }
          }
          if (r.id === guestId) {
            if (seatRole === "titular") {
              const base = { ...r, tableId: tableIdOrNonNull }
              if (titularChangingTable) {
                const plusSharesTitularTable =
                  !mine.plusOne ||
                  typeof mine.plusOneSeatIndex !== "number" ||
                  mine.plusOneTableId == null ||
                  mine.plusOneTableId === "" ||
                  mine.plusOneTableId === mine.tableId
                let nextPlusOneSeat = mine.plusOneSeatIndex
                let nextPlusOneTbl = mine.plusOneTableId
                if (plusSharesTitularTable) {
                  nextPlusOneSeat = null
                  nextPlusOneTbl = null
                }
                if (
                  nextPlusOneSeat != null &&
                  nextPlusOneTbl != null &&
                  nextPlusOneTbl !== "" &&
                  nextPlusOneTbl === tableIdOrNonNull
                ) {
                  nextPlusOneTbl = null
                }
                return {
                  ...base,
                  seatIndex: /** @type {number} */ (S),
                  plusOneSeatIndex: nextPlusOneSeat,
                  plusOneTableId: nextPlusOneTbl,
                }
              }
              return { ...base, seatIndex: /** @type {number} */ (S) }
            }
            let /** @type {string | null} */ nextPlusOneTableId
            if (r.tableId == null || r.tableId === "") {
              nextPlusOneTableId = tableIdOrNonNull
            } else if (r.tableId === tableIdOrNonNull) {
              nextPlusOneTableId = null
            } else {
              nextPlusOneTableId = tableIdOrNonNull
            }
            return {
              ...r,
              plusOneSeatIndex: /** @type {number} */ (S),
              plusOneTableId: nextPlusOneTableId,
            }
          }
          return r
        })
      })
    },
    [persistInvitations, tables],
  )

  /** Desasigna toda la invitación de mesa, o coloca titular con primera plaza libre. */
  const assignGuestToTable = useCallback(
    (guestId, tableIdOrNull) => {
      if (tableIdOrNull == null || tableIdOrNull === "")
        releaseInvitationSeat(guestId, "all")
      else assignGuestSeat(guestId, tableIdOrNull, "auto", "titular")
    },
    [assignGuestSeat, releaseInvitationSeat],
  )

  const value = useMemo(
    () => ({
      ...invitationRest,
      invitations,
      syncReady,
      stats,
      analytics,
      kvTotals,
      tables,
      tasks,
      saveTablesToServer,
      saveTasksToServer,
      patchInvitation,
      updateStatus,
      assignGuestToTable,
      assignGuestSeat,
      releaseInvitationSeat,
      persistInvitations,
      refreshInvitationsFromServer,
      loadAnalytics,
      saveState,
    }),
    [
      invitationRest,
      invitations,
      syncReady,
      stats,
      analytics,
      kvTotals,
      tables,
      tasks,
      saveTablesToServer,
      saveTasksToServer,
      patchInvitation,
      updateStatus,
      assignGuestToTable,
      assignGuestSeat,
      releaseInvitationSeat,
      persistInvitations,
      refreshInvitationsFromServer,
      loadAnalytics,
      saveState,
    ],
  )

  return (
    <DashboardContext.Provider value={value}>{children}</DashboardContext.Provider>
  )
}
