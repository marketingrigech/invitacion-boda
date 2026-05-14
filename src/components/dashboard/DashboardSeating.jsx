import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { downloadCsv, toCsv } from "../../utils/csv"
import FadeInSection from "../shared/FadeInSection"
import DeleteTableConfirmModal from "./DeleteTableConfirmModal"
import { useDashboard } from "./DashboardProvider"

const VB_W = 1600
const VB_H = 960

const MAP_MIN_ZOOM = 0.2
const MAP_MAX_ZOOM = 4.5

/** @param {SVGElement} svg @param {number} cx @param {number} cy */
function svgPoint(svg, cx, cy) {
  const pt = svg.createSVGPoint()
  pt.x = cx
  pt.y = cy
  const ctm = svg.getScreenCTM()
  return ctm ? pt.matrixTransform(ctm.inverse()) : { x: 0, y: 0 }
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n))
}

/** @param {string} name @param {number} [max] */
function truncateMapLabel(name, max = 13) {
  const t = String(name || "").trim()
  if (!t) return "—"
  if (t.length <= max) return t
  return `${t.slice(0, Math.max(1, max - 1))}…`
}

/** @param {import("../../hooks/useInvitations.js").Invitation} inv */
function companionLabel(inv) {
  const p = inv.plusOneName?.trim()
  return p ? p : `Acompañante (${inv.name})`
}

/** Pendiente o invitación enviada: en plano van en ámbar hasta confirmar asistencia. */
function isAwaitingInviteRsvp(inv) {
  return inv.status === "pending" || inv.status === "sent"
}

/** Puede colocarse en el plano (confirmado, pre-confirmación o aún sin RSVP definitivo). */
function invitationCanOccupySeat(inv) {
  const s = inv.status
  return s === "confirmed" || s === "preconfirmed" || s === "pending" || s === "sent"
}

/** Etiqueta breve del estado de invitación (pestaña «Sin confirmar»). */
function inviteStatusLabel(inv) {
  const s = inv.status
  if (s === "pending") return "Pendiente"
  if (s === "sent") return "Enviada"
  if (s === "preconfirmed") return "Pre-confirmación"
  if (s === "declined") return "No asiste"
  return String(s)
}

/** Apariencia del chip en la pestaña «Sin confirmar». */
function unconfirmedChipWrapClass(inv, role) {
  if (role === "plusOne")
    return "border-wine/15 bg-cream/70 text-wine-dark"
  if (inv.status === "declined")
    return "border-rose-200 bg-rose-50/70 text-rose-950"
  if (inv.status === "preconfirmed")
    return "border-sky-300/90 bg-sky-100/70 text-sky-950"
  if (inv.status === "sent")
    return "border-violet-300/90 bg-violet-100/70 text-violet-950"
  return "border-amber-200/90 bg-amber-50/50 text-wine-dark"
}

/**
 * Mesa donde está el +1 (si no hay `plusOneTableId`, la del titular).
 * @param {import("../../hooks/useInvitations.js").Invitation} inv
 */
function plusOneEffectiveTable(inv) {
  if (!inv.plusOne || typeof inv.plusOneSeatIndex !== "number") return null
  if (inv.plusOneTableId != null && inv.plusOneTableId !== "")
    return inv.plusOneTableId
  return inv.tableId
}

/**
 * Primera línea (nombre propio): titular o acompañante.
 * @param {import("../../hooks/useInvitations.js").Invitation} inv
 * @param {'titular' | 'plusOne'} role
 */
function seatPrimaryLine(inv, role) {
  if (role === "titular") return inv.name?.trim() || "—"
  const named = inv.plusOneName?.trim()
  if (named) return named
  const tit = inv.name?.trim() || "—"
  return `(+1) ${tit}`
}

/**
 * Segunda línea solo +1 (de quién es el acompañante). Omitir cuando no hay nombre de +1 pero ya mostramos «(+1) titular».
 */
function seatPlusOneDeLine(inv) {
  const tit = inv.name?.trim() || "—"
  return `+1 de ${tit}`
}

/**
 * Tooltip / título compacto para un asiento ocupado (+1 incluye vínculo con titular).
 */
function seatHoverFullTitle(inv, role, tableName, seatHuman) {
  if (role === "titular")
    return `${inv.name?.trim() || "—"} · Mesa «${tableName}» · Asiento ${seatHuman}`
  const named = !!(inv.plusOneName?.trim())
  const main = seatPrimaryLine(inv, role)
  const who = named ? `${main} · ${seatPlusOneDeLine(inv)}` : main
  return `${who} · Mesa «${tableName}» · Asiento ${seatHuman}`
}

/**
 * @param {import("../../hooks/useInvitations.js").Invitation} inv
 * @param {'titular' | 'plusOne'} role
 */
function isInfantilSeat(inv, role) {
  return role === "titular"
    ? inv.menu === "infantil"
    : inv.plusOneMenu === "infantil"
}

/**
 * @param {import("../../hooks/useInvitations.js").Invitation} inv
 * @param {'titular' | 'plusOne'} role
 */
function seatBlobFill(inv, role) {
  if (inv.status === "pending") return "#f59e0b"
  if (inv.status === "sent") return "#7c3aed"
  if (inv.status === "preconfirmed") return "#38bdf8"
  if (isInfantilSeat(inv, role)) return "#16a34a"
  if (role === "plusOne") return "#7c3aed"
  return "#0369a1"
}

/**
 * Una letra visible en el círculo del plano (inicial del nombre mostrado).
 * @param {import("../../hooks/useInvitations.js").Invitation} inv
 * @param {'titular' | 'plusOne'} role
 */
function guestSeatLetter(inv, role) {
  const line = seatPrimaryLine(inv, role).trim() || "—"
  const m = line.match(/[A-Za-zÀ-ÿÁÉÍÓÚÜÑáéíóúüñ0-9]/)
  if (m) return m[0].toLocaleUpperCase("es")
  return "·"
}

/** @param {{ capacity: number }} t @param {string} shapeRaw */
function tableGeom(t, shapeRaw) {
  const cap = t.capacity || 8
  const base = clamp(cap * 6.85 + 64, 94, 148)
  if (shapeRaw === "square") {
    const s = base * 1.06
    return { rx: s, ry: s, orbitX: s + 54, orbitY: s + 54 }
  }
  if (shapeRaw === "rectangular") {
    const rx = base * 1.26
    const ry = base * 0.9
    return { rx, ry, orbitX: rx + 52, orbitY: ry + 52 }
  }
  if (shapeRaw === "honor") {
    /** Mesa de honor: más ancha que la rectangular, protagonista en el plano. */
    const rx = base * 1.48
    const ry = base * 0.98
    return { rx, ry, orbitX: rx + 58, orbitY: ry + 54 }
  }
  return { rx: base, ry: base, orbitX: base + 56, orbitY: base + 56 }
}

/**
 * Caja para etiqueta (nombre + ratio) dentro de la forma de la mesa.
 * @param {string} shapeRaw
 */
function tableLabelBox(shapeRaw, rx, ry) {
  const m = Math.min(rx, ry)
  if (shapeRaw === "round") {
    const side = 2 * m * 0.86
    return { w: side, h: side }
  }
  if (shapeRaw === "square") {
    return { w: 2 * rx * 0.82, h: 2 * ry * 0.8 }
  }
  if (shapeRaw === "honor") {
    return { w: 2 * rx * 0.82, h: 2 * ry * 0.7 }
  }
  return { w: 2 * rx * 0.82, h: 2 * ry * 0.72 }
}

/**
 * @param {string | undefined} name
 * @param {number} boxW
 */
function tableNameFontPx(name, boxW) {
  const t = String(name ?? "").trim()
  const len = t.length
  const fromW = Math.min(26, Math.max(10, boxW / 5.2))
  let k = 1
  if (len > 48) k = 0.52
  else if (len > 36) k = 0.62
  else if (len > 28) k = 0.72
  else if (len > 20) k = 0.82
  else if (len > 12) k = 0.92
  return Math.round(Math.max(10, fromW * k))
}

function newTableId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `tbl-${crypto.randomUUID()}`
  return `tbl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** @param {number} idx */
function defaultSpot(idx) {
  const cols = 4
  const col = idx % cols
  const row = Math.floor(idx / cols)
  return { x: 240 + col * 380, y: 200 + row * 290 }
}

export default function DashboardSeating() {
  const {
    invitations,
    tables,
    saveTablesToServer,
    assignGuestSeat,
    releaseInvitationSeat,
    persistInvitations,
  } = useDashboard()

  const svgRef = useRef(/** @type {SVGSVGElement | null} */ (null))
  const tablesRef = useRef(tables)
  /** @type {React.MutableRefObject<{ id: string; dx: number; dy: number } | null>} */
  const tableGrabRef = useRef(null)
  const [tableLive, setTableLive] = useState(/** @type {null | { id: string; x: number; y: number }} */ (null))

  /** Zoom/pan del lienzo (viewBox): x,y = esquina superior izquierda en coords mundo. */
  const [mapView, setMapView] = useState(
    /** @type {{ zoom: number; x: number; y: number }} */ ({
      zoom: 1,
      x: 0,
      y: 0,
    }),
  )
  const mapViewRef = useRef(mapView)
  mapViewRef.current = mapView

  /** Tooltip en asiento (posición viewport): sin el retraso del <title> nativo del SVG. */
  const [seatHoverTip, setSeatHoverTip] = useState(
    /** @type {{ x: number; y: number; text: string } | null} */ (null),
  )

  /** Mantén pulsado Espacio y arrastra, o botón central del ratón, para desplazar el plano. */
  const [spacePan, setSpacePan] = useState(false)
  const [mapPanning, setMapPanning] = useState(false)
  /** Escritorio: oculta columnas invitados + «Esta mesa» para dar todo el ancho al lienzo. */
  const [soloPlano, setSoloPlano] = useState(false)
  /** @type {React.MutableRefObject<{ cx: number; cy: number; vx: number; vy: number; zoom: number } | null>} */
  const mapPanGrabRef = useRef(null)
  const mapMoveHoverClearRef = useRef(0)

  /** @type {[string | null, React.Dispatch<React.SetStateAction<string | null>>]} */
  const [selectedTableId, setSelectedTableId] = useState(null)
  const [guestQuery, setGuestQuery] = useState("")
  /** @type {['sin-mesa' | 'con-mesa' | 'sin-confirmar', React.Dispatch<React.SetStateAction<'sin-mesa' | 'con-mesa' | 'sin-confirmar'>>]} */
  const [guestListTab, setGuestListTab] = useState(
    /** @type {'sin-mesa' | 'con-mesa' | 'sin-confirmar'} */ ("sin-mesa"),
  )
  /** Parpadeo en el plano: mesa + índice de asiento (0-based) + token para reiniciar animación */
  const [seatGlow, setSeatGlow] = useState(
    /** @type {null | { tableId: string; slot: number; token: number }} */ (null),
  )
  /** Invitado resaltado en la lista compacta (con mesa) */
  const [listPulseKey, setListPulseKey] = useState(/** @type {string | null} */ (null))
  /** Alias tras refactors/HMR para código que siga usando el nombre antiguo */
  const seatedDetailKey = listPulseKey
  const setSeatedDetailKey = setListPulseKey
  /** @type {[null | { invitationId: string; role: 'titular' | 'plusOne' }, React.Dispatch<React.SetStateAction<null | { invitationId: string; role: 'titular' | 'plusOne' }>>]} */
  const [pickSeat, setPickSeat] = useState(null)
  /** Mover desde el plano: 1.er clic selecciona, 2.o clic en destino confirma (el arrastre HTML5 suele fallar en SVG). */
  const [mapMovePick, setMapMovePick] = useState(
    /** @type {null | { invitationId: string; role: 'titular' | 'plusOne'; fromTableId: string; fromSlot: number }} */ (
      null
    ),
  )
  /** Asiento bajo el cursor mientras hay un «mover» activo (vista previa gris). */
  const [mapMoveHover, setMapMoveHover] = useState(
    /** @type {null | { tableId: string; slot: number }} */ (null),
  )
  /** Arrastre desde bolita en táctil (pulsación larga + soltar en otro asiento). */
  const [seatBlobDrag, setSeatBlobDrag] = useState(
    /** @type {null | { invitationId: string; role: 'titular' | 'plusOne'; fromTableId: string; fromSlot: number; x: number; y: number; label: string }} */ (
      null
    ),
  )
  /** @type {React.MutableRefObject<{ pointerId: number; startX: number; startY: number; timer: number; target: Element } | null>} */
  const seatTouchPressRef = useRef(null)
  /** Limpia listeners globales del arrastre táctil (también Esc). */
  const touchDragListenersRef = useRef(/** @type {null | (() => void)} */ (null))
  /** Tras arrastrar, evitar que dispare el modo «clic para mover». */
  const suppressSeatClickUntilRef = useRef(0)
  /** @type {React.MutableRefObject<(clientX: number, clientY: number) => null | { tableId: string; slot: number }>} */
  const findSeatSlotAtClientRef = useRef(() => /** @type {null | { tableId: string; slot: number }} */ (null))
  /** Edición de la mesa seleccionada en el panel derecho */
  const [editTableName, setEditTableName] = useState("")
  const [editTableCap, setEditTableCap] = useState("10")
  const [editTableShape, setEditTableShape] = useState(
    /** @type {'round' | 'square' | 'rectangular' | 'honor'} */ ("round"),
  )
  /** Panel derecha: ocupantes ↔ datos mesa */
  const [tablePanelTab, setTablePanelTab] = useState(
    /** @type {'ocupantes' | 'mesa'} */ ("ocupantes"),
  )
  /** Menú compacto (exportar / imprimir) junto al título del canvas */
  const [canvasMenuOpen, setCanvasMenuOpen] = useState(false)
  const canvasMenuRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [deleteTableModal, setDeleteTableModal] = useState(
    /** @type {null | { id: string; name: string; guestCount: number }} */ (null),
  )

  useEffect(() => {
    function onEsc(e) {
      if (e.key !== "Escape") return
      touchDragListenersRef.current?.()
      touchDragListenersRef.current = null
      const pr = seatTouchPressRef.current
      if (pr?.timer) window.clearTimeout(pr.timer)
      seatTouchPressRef.current = null
      setSeatBlobDrag(null)
      setMapMovePick(null)
      setMapMoveHover(null)
      setSeatHoverTip(null)
      setCanvasMenuOpen(false)
    }
    function onKeyDownSpace(e) {
      if (e.code !== "Space" || e.repeat) return
      const t = e.target
      if (
        t instanceof HTMLElement &&
        t.closest("input, textarea, select, [contenteditable=\"true\"]")
      )
        return
      e.preventDefault()
      setSpacePan(true)
    }
    function onKeyUpSpace(e) {
      if (e.code !== "Space") return
      setSpacePan(false)
    }
    function onBlur() {
      setSpacePan(false)
      setSeatHoverTip(null)
      if (mapPanGrabRef.current) {
        mapPanGrabRef.current = null
        setMapPanning(false)
      }
    }
    window.addEventListener("keydown", onEsc)
    window.addEventListener("keydown", onKeyDownSpace)
    window.addEventListener("keyup", onKeyUpSpace)
    window.addEventListener("blur", onBlur)
    return () => {
      window.removeEventListener("keydown", onEsc)
      window.removeEventListener("keydown", onKeyDownSpace)
      window.removeEventListener("keyup", onKeyUpSpace)
      window.removeEventListener("blur", onBlur)
    }
  }, [])

  useEffect(() => {
    if (!seatGlow) return
    const t = window.setTimeout(() => setSeatGlow(null), 4200)
    return () => window.clearTimeout(t)
  }, [seatGlow])

  useEffect(() => {
    setListPulseKey(null)
    touchDragListenersRef.current?.()
    touchDragListenersRef.current = null
    const pr = seatTouchPressRef.current
    if (pr?.timer) window.clearTimeout(pr.timer)
    seatTouchPressRef.current = null
    setSeatBlobDrag(null)
    setMapMovePick(null)
    setMapMoveHover(null)
    setSeatHoverTip(null)
  }, [guestQuery, guestListTab])

  useEffect(() => {
    if (!mapMovePick && !seatBlobDrag) setMapMoveHover(null)
    return () => {
      window.clearTimeout(mapMoveHoverClearRef.current)
    }
  }, [mapMovePick, seatBlobDrag])

  useEffect(() => {
    if (!canvasMenuOpen) return
    function onDocDown(/** @type {MouseEvent} */ e) {
      const el = canvasMenuRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) {
        setCanvasMenuOpen(false)
      }
    }
    document.addEventListener("mousedown", onDocDown)
    return () => document.removeEventListener("mousedown", onDocDown)
  }, [canvasMenuOpen])

  useEffect(() => {
    tablesRef.current = tables
  }, [tables])

  useEffect(() => {
    function onMove(e) {
      const grab = tableGrabRef.current
      const svg = svgRef.current
      if (!grab || !svg) return
      const p = svgPoint(svg, e.clientX, e.clientY)
      const nx = clamp(p.x - grab.dx, 40, VB_W - 40)
      const ny = clamp(p.y - grab.dy, 40, VB_H - 40)
      setTableLive({ id: grab.id, x: nx, y: ny })
    }
    function onUp() {
      const grab = tableGrabRef.current
      if (!grab) {
        setTableLive(null)
        return
      }
      tableGrabRef.current = null
      setTableLive((live) => {
        /** Evita llamar saveTablesToServer dentro del updater: React prohíbe actualizar DashboardProvider así. */
        if (live && live.id === grab.id) {
          const { id: tid, x, y } = live
          queueMicrotask(() => {
            saveTablesToServer(
              tablesRef.current.map((tb) =>
                tb.id === tid ? { ...tb, x, y } : tb,
              ),
            )
          })
        }
        return null
      })
    }
    window.addEventListener("mousemove", onMove)
    window.addEventListener("mouseup", onUp)
    return () => {
      window.removeEventListener("mousemove", onMove)
      window.removeEventListener("mouseup", onUp)
    }
  }, [saveTablesToServer])

  /** Pan del lienzo: pointer capture en el SVG para que el movimiento vaya pegado al dedo/ratón. */
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    /** @param {PointerEvent} e */
    function onPointerMove(e) {
      if (!mapPanGrabRef.current) return
      const pg = mapPanGrabRef.current
      const rect = svg.getBoundingClientRect()
      const vbW = VB_W / pg.zoom
      const vbH = VB_H / pg.zoom
      const nx = pg.vx - (e.clientX - pg.cx) * (vbW / rect.width)
      const ny = pg.vy - (e.clientY - pg.cy) * (vbH / rect.height)
      const next = { zoom: pg.zoom, x: nx, y: ny }
      mapViewRef.current = next
      setMapView(next)
    }
    /** @param {PointerEvent} e */
    function endPan(e) {
      if (!mapPanGrabRef.current) return
      mapPanGrabRef.current = null
      setMapPanning(false)
      try {
        svg.releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
    }
    function onLostCapture() {
      if (mapPanGrabRef.current) {
        mapPanGrabRef.current = null
        setMapPanning(false)
      }
    }
    svg.addEventListener("pointermove", onPointerMove)
    svg.addEventListener("pointerup", endPan)
    svg.addEventListener("pointercancel", endPan)
    svg.addEventListener("lostpointercapture", onLostCapture)
    return () => {
      svg.removeEventListener("pointermove", onPointerMove)
      svg.removeEventListener("pointerup", endPan)
      svg.removeEventListener("pointercancel", endPan)
      svg.removeEventListener("lostpointercapture", onLostCapture)
    }
  }, [])

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    /** @param {WheelEvent} e */
    function onWheel(e) {
      const r = svg.getBoundingClientRect()
      if (
        e.clientX < r.left ||
        e.clientX > r.right ||
        e.clientY < r.top ||
        e.clientY > r.bottom
      )
        return
      const v = mapViewRef.current
      const ctrlZoom = e.ctrlKey || e.metaKey
      if (ctrlZoom) {
        e.preventDefault()
        const p = svgPoint(svg, e.clientX, e.clientY)
        const raw = -e.deltaY
        const factor = raw > 0 ? 1.09 : 1 / 1.09
        const newZoom = clamp(v.zoom * factor, MAP_MIN_ZOOM, MAP_MAX_ZOOM)
        if (newZoom === v.zoom) return
        const nx = p.x - (p.x - v.x) * (v.zoom / newZoom)
        const ny = p.y - (p.y - v.y) * (v.zoom / newZoom)
        const next = { zoom: newZoom, x: nx, y: ny }
        mapViewRef.current = next
        setMapView(next)
        return
      }
      e.preventDefault()
      const vbW = VB_W / v.zoom
      const vbH = VB_H / v.zoom
      const dWorldX = (e.deltaX / r.width) * vbW
      const dWorldY = (e.deltaY / r.height) * vbH
      const next = { zoom: v.zoom, x: v.x + dWorldX, y: v.y + dWorldY }
      mapViewRef.current = next
      setMapView(next)
    }
    svg.addEventListener("wheel", onWheel, { passive: false })
    return () => svg.removeEventListener("wheel", onWheel)
  }, [])

  const seatableInvitations = useMemo(
    () => invitations.filter((i) => invitationCanOccupySeat(i)),
    [invitations],
  )

  /** Personas (titular / +1) que aún no tienen plaza numérica en el plano */
  const openSeatRows = useMemo(() => {
    /** @type {Array<{ g: (typeof seatableInvitations)[0]; role: 'titular' | 'plusOne'; key: string }>} */
    const rows = []
    for (const g of seatableInvitations) {
      if (typeof g.seatIndex !== "number")
        rows.push({ g, role: "titular", key: `${g.id}-t` })
      if (
        g.plusOne &&
        !(typeof g.plusOneSeatIndex === "number")
      )
        rows.push({ g, role: "plusOne", key: `${g.id}-p` })
    }
    return rows
  }, [seatableInvitations])

  /** Invitaciones que aún no están confirmadas (vista general). */
  const unconfirmedInvitations = useMemo(
    () => invitations.filter((i) => i.status !== "confirmed"),
    [invitations],
  )

  /** Filas titular / +1 previsto para la pestaña «Sin confirmar». */
  const unconfirmedRows = useMemo(() => {
    /** @type {Array<{ g: (typeof unconfirmedInvitations)[0]; role: 'titular' | 'plusOne'; key: string }>} */
    const rows = []
    for (const g of unconfirmedInvitations) {
      rows.push({ g, role: "titular", key: `${g.id}-t` })
      if (g.plusOne) rows.push({ g, role: "plusOne", key: `${g.id}-p` })
    }
    return rows
  }, [unconfirmedInvitations])

  /** Titular / +1 con plaza en el plano (mesa + asiento numéricos) */
  const seatedSeatRows = useMemo(() => {
    /** @type {Array<{ g: (typeof seatableInvitations)[0]; role: 'titular' | 'plusOne'; key: string; seat: number; tableId: string }>} */
    const rows = []
    for (const g of seatableInvitations) {
      if (g.tableId && typeof g.seatIndex === "number")
        rows.push({
          g,
          role: "titular",
          key: `${g.id}-t`,
          seat: g.seatIndex,
          tableId: g.tableId,
        })
      if (g.plusOne && typeof g.plusOneSeatIndex === "number") {
        const tid = plusOneEffectiveTable(g)
        if (tid)
          rows.push({
            g,
            role: "plusOne",
            key: `${g.id}-p`,
            seat: g.plusOneSeatIndex,
            tableId: tid,
          })
      }
    }
    return rows
  }, [seatableInvitations])

  const qLower = guestQuery.trim().toLowerCase()
  const filteredSinMesaRows = useMemo(() => {
    if (!qLower) return openSeatRows
    return openSeatRows.filter(({ g }) => {
      if (g.name.toLowerCase().includes(qLower)) return true
      const comp = companionLabel(g).toLowerCase()
      if (comp.includes(qLower)) return true
      return false
    })
  }, [openSeatRows, qLower])

  const filteredUnconfirmedRows = useMemo(() => {
    if (!qLower) return unconfirmedRows
    return unconfirmedRows.filter(({ g }) => {
      if (g.name.toLowerCase().includes(qLower)) return true
      return companionLabel(g).toLowerCase().includes(qLower)
    })
  }, [unconfirmedRows, qLower])

  /** Invitados con mesa, agrupados por mesa (orden = mesas del plano, luego huérfanos). */
  const seatedGrouped = useMemo(() => {
    /** @type {Map<string, typeof seatedSeatRows>} */
    const by = new Map()
    for (const row of seatedSeatRows) {
      const tid = row.tableId
      if (!tid) continue
      if (!by.has(tid)) by.set(tid, [])
      by.get(tid).push(row)
    }
    /** @type {Array<{ tableId: string; name: string; rows: typeof seatedSeatRows }>} */
    const blocks = []
    for (const t of tables) {
      const rows = by.get(t.id)
      if (!rows?.length) continue
      by.delete(t.id)
      rows.sort((a, b) => a.seat - b.seat)
      blocks.push({ tableId: t.id, name: t.name, rows })
    }
    for (const [tableId, rows] of by) {
      if (!rows.length) continue
      rows.sort((a, b) => a.seat - b.seat)
      blocks.push({
        tableId,
        name: tables.find((x) => x.id === tableId)?.name ?? "(mesa borrada)",
        rows,
      })
    }
    return blocks
  }, [tables, seatedSeatRows])

  const seatedGroupedFiltered = useMemo(() => {
    if (!qLower) return seatedGrouped
    return seatedGrouped
      .map((blk) => ({
        ...blk,
        rows: blk.rows.filter(({ g }) => {
          if (g.name.toLowerCase().includes(qLower)) return true
          return companionLabel(g).toLowerCase().includes(qLower)
        }),
      }))
      .filter((blk) => blk.rows.length > 0)
  }, [seatedGrouped, qLower])

  /** Lista plana «con mesa» filtrada (por búsqueda); antes se mezclaba con «sin mesa» en filteredGuestListRows. */
  const filteredGuestListRowsConMesa = useMemo(() => {
    if (!qLower) return seatedSeatRows
    return seatedSeatRows.filter(({ g }) => {
      if (g.name.toLowerCase().includes(qLower)) return true
      return companionLabel(g).toLowerCase().includes(qLower)
    })
  }, [seatedSeatRows, qLower])

  /** Nombres antiguos tras refactors — evitan ReferenceError si queda JSX o HMR pegajoso. */
  const filteredOpenSeats = filteredSinMesaRows

  /** @type {(row: (typeof seatedSeatRows)[number]) => void} */
  const locateSeatOnMap = (row) => {
    const tid = row.tableId
    const slot = typeof row.seat === "number" ? row.seat : -1
    if (!tid || slot < 0) return
    setSelectedTableId(tid)
    setSeatGlow((prev) => ({
      tableId: tid,
      slot,
      token: (prev?.token ?? 0) + 1,
    }))
  }

  const seatedPersonCount = useMemo(
    () =>
      seatableInvitations.reduce((n, g) => {
        let c = 0
        if (typeof g.seatIndex === "number") c++
        if (g.plusOne && typeof g.plusOneSeatIndex === "number") c++
        return n + c
      }, 0),
    [seatableInvitations],
  )

  /** @param {string} tableId */
  const guestsAt = (tableId) =>
    seatableInvitations.filter(
      (g) =>
        g.tableId === tableId || plusOneEffectiveTable(g) === tableId,
    )

  /** @param {string} tableId */
  const tableRoster = (tableId) => {
    /** @type {Array<{ g: (typeof seatableInvitations)[0]; role: 'titular' | 'plusOne'; seat: number }>} */
    const rows = []
    for (const g of guestsAt(tableId)) {
      if (
        g.tableId === tableId &&
        typeof g.seatIndex === "number"
      )
        rows.push({ g, role: "titular", seat: g.seatIndex })
      if (
        g.plusOne &&
        plusOneEffectiveTable(g) === tableId &&
        typeof g.plusOneSeatIndex === "number"
      )
        rows.push({ g, role: "plusOne", seat: g.plusOneSeatIndex })
    }
    return rows.sort((a, b) => a.seat - b.seat)
  }

  useEffect(() => {
    const t = tables.find((x) => x.id === selectedTableId)
    if (!t || !selectedTableId) return
    setEditTableName(t.name)
    setEditTableCap(String(Math.max(1, t.capacity ?? 10)))
    const s = t.shape ?? "round"
    setEditTableShape(
      s === "square"
        ? "square"
        : s === "rectangular"
          ? "rectangular"
          : s === "honor"
            ? "honor"
            : "round",
    )
  }, [selectedTableId, tables])

  useEffect(() => {
    setTablePanelTab("ocupantes")
  }, [selectedTableId])

  const persistEditedTable = () => {
    if (!selectedTableId) return
    const cap = Math.min(30, Math.max(1, Number(editTableCap) || 10))
    const roster = tableRoster(selectedTableId)
    const maxSeat = roster.reduce((m, r) => Math.max(m, r.seat), -1)
    if (maxSeat >= 0 && cap < maxSeat + 1) {
      window.alert(
        `Hay personas en el asiento ${maxSeat + 1}. La capacidad debe ser al menos ${maxSeat + 1}, o mueve antes a otros sitios.`,
      )
      return
    }
    const nameTrim = editTableName.trim() || "Mesa"
    const shapeRaw =
      editTableShape === "square"
        ? "square"
        : editTableShape === "rectangular"
          ? "rectangular"
          : editTableShape === "honor"
            ? "honor"
            : "round"
    saveTablesToServer(
      tables.map((tb) =>
        tb.id === selectedTableId
          ? { ...tb, name: nameTrim, capacity: cap, shape: shapeRaw }
          : tb,
      ),
    )
  }

  /** @param {string} shape */
  const addTable = (shape) => {
    const spot = defaultSpot(tables.length)
    const t = {
      id: newTableId(),
      name:
        shape === "honor"
          ? "Mesa de honor"
          : shape === "round"
          ? "Mesa redonda"
          : shape === "square"
            ? "Mesa cuadrada"
            : "Mesa rectangular",
      capacity: Math.min(
        30,
        Math.max(1, shape === "honor" ? 12 : 10),
      ),
      notes: "",
      shape,
      x: spot.x,
      y: spot.y,
      rotation: 0,
    }
    saveTablesToServer([...tables, t])
  }

  /** @param {string} id */
  const executeRemoveTable = (id) => {
    persistInvitations((prev) =>
      prev.map((inv) => {
        let next = { ...inv }
        if (next.tableId === id) {
          next.tableId = null
          next.seatIndex = null
          const plusShares =
            next.plusOne &&
            (next.plusOneTableId == null ||
              next.plusOneTableId === "" ||
              next.plusOneTableId === id)
          if (plusShares) {
            next.plusOneSeatIndex = null
            if (next.plusOneTableId === id) next.plusOneTableId = null
          }
        }
        if (next.plusOneTableId === id) {
          next.plusOneSeatIndex = null
          next.plusOneTableId = null
        }
        return next
      }),
    )
    saveTablesToServer(tables.filter((t) => t.id !== id))
    setSelectedTableId((s) => (s === id ? null : s))
  }

  /** Abre el modal de confirmación antes de borrar la mesa. */
  const requestRemoveTable = (id) => {
    const t = tables.find((x) => x.id === id)
    setDeleteTableModal({
      id,
      name: t?.name?.trim() || "Mesa",
      guestCount: guestsAt(id).length,
    })
  }

  /** Drag desde la lista izquierda o panel de ocupantes: marca titular vs +1 */
  const handleDragStartSeatNeeder =
    /** @type {(invitationId: string, role: 'titular' | 'plusOne') => React.DragEventHandler<HTMLElement>} */
    (invitationId, role) =>
    (e) => {
      e.dataTransfer.effectAllowed = "move"
      e.dataTransfer.setData("text/guest-id", invitationId)
      e.dataTransfer.setData("text/seat-role", role === "plusOne" ? "plusOne" : "titular")
    }

  const exportMesasCsv = () => {
    const headers = [
      "Mesa",
      "Forma",
      "Capacidad",
      "Asientos_detalle",
      "Cuenta_asignados",
    ]
    const rows = tables.map((tbl) => {
      const pieces = []
      for (const x of guestsAt(tbl.id)) {
        if (x.tableId === tbl.id && typeof x.seatIndex === "number")
          pieces.push(`${x.name} (titular #${x.seatIndex + 1})`)
        if (
          x.plusOne &&
          plusOneEffectiveTable(x) === tbl.id &&
          typeof x.plusOneSeatIndex === "number"
        )
          pieces.push(`${companionLabel(x)} (+1 #${x.plusOneSeatIndex + 1})`)
      }
      const shape = tbl.shape ?? "round"
      const formaCsv = shape === "honor" ? "mesa_de_honor" : shape
      const seatedHere = [...guestsAt(tbl.id)].reduce((acc, x) => {
        let k = 0
        if (x.tableId === tbl.id && typeof x.seatIndex === "number") k++
        if (
          x.plusOne &&
          plusOneEffectiveTable(x) === tbl.id &&
          typeof x.plusOneSeatIndex === "number"
        )
          k++
        return acc + k
      }, 0)
      return [
        tbl.name,
        formaCsv,
        String(tbl.capacity),
        pieces.join(" | "),
        String(seatedHere),
      ]
    })
    downloadCsv("mesas-boda.csv", toCsv(headers, rows))
  }

  /** @type {(e: React.MouseEvent, t: Record<string, unknown>) => void} */
  const onTableBackdropDown = (e, t) => {
    if (e.button !== 0) return
    const svg = svgRef.current
    if (!svg) return
    e.preventDefault()
    e.stopPropagation()
    setSelectedTableId(/** @type {string} */ (t.id))
    const tx = typeof t.x === "number" ? t.x : 200
    const ty = typeof t.y === "number" ? t.y : 180
    const p = svgPoint(svg, e.clientX, e.clientY)
    tableGrabRef.current = {
      id: /** @type {string} */ (t.id),
      dx: p.x - tx,
      dy: p.y - ty,
    }
    setTableLive({ id: /** @type {string} */ (t.id), x: tx, y: ty })
  }

  /** @param {typeof tables[number]} tbl */
  const posOf = (tbl) => {
    const live =
      tableLive?.id === tbl.id ? tableLive : { x: tbl.x ?? 180, y: tbl.y ?? 160 }
    return { cx: live.x, cy: live.y }
  }

  /** ¿Hay un hueco de asiento bajo el puntero (coords pantalla)? */
  const findSeatSlotAtClient = useCallback(
    (clientX, clientY) => {
      const svg = svgRef.current
      if (!svg) return null
      const p = svgPoint(svg, clientX, clientY)
      const HIT_R = 54
      let best = /** @type {null | { tableId: string; slot: number }} */ (null)
      let bestD = Infinity
      for (const tbl of tables) {
        const shape = tbl.shape ?? "round"
        const { orbitX, orbitY } = tableGeom(tbl, shape)
        const cap = tbl.capacity
        const { cx, cy } = posOf(tbl)
        const rotDeg = tbl.rotation ?? 0
        const rad = (rotDeg * Math.PI) / 180
        const cos = Math.cos(rad)
        const sin = Math.sin(rad)
        for (let slot = 0; slot < cap; slot++) {
          const θ = -Math.PI / 2 + (slot * 2 * Math.PI) / Math.max(cap, 1)
          const sx = orbitX * Math.cos(θ)
          const sy = orbitY * Math.sin(θ)
          const wx = cx + sx * cos - sy * sin
          const wy = cy + sx * sin + sy * cos
          const d = Math.hypot(p.x - wx, p.y - wy)
          if (d < HIT_R && d < bestD) {
            bestD = d
            best = { tableId: tbl.id, slot }
          }
        }
      }
      return best
    },
    [tables, tableLive],
  )

  findSeatSlotAtClientRef.current = findSeatSlotAtClient

  const mapMoveBannerLine = useMemo(() => {
    if (!mapMovePick) return null
    const g = seatableInvitations.find((x) => x.id === mapMovePick.invitationId)
    if (!g) return "Elige otro asiento · Esc cierra."
    if (mapMovePick.role === "titular") {
      const n = g.name?.trim() || "—"
      return `«${n}» · clic en otro asiento para mover · × o «Quitar» para dejar sin mesa · Esc`
    }
    const who = seatPrimaryLine(g, "plusOne")
    return `«${who}» · clic destino para mover · × o «Quitar» para quitar +1 · Esc`
  }, [mapMovePick, seatableInvitations])

  const seatBlobDragBannerLine = useMemo(() => {
    if (!seatBlobDrag) return null
    const g = seatableInvitations.find((x) => x.id === seatBlobDrag.invitationId)
    if (!g) return "Suelta en otro asiento · Esc para cancelar"
    if (seatBlobDrag.role === "titular") {
      const n = g.name?.trim() || "—"
      return `«${n}» · arrastra y suelta en otro asiento · Esc`
    }
    const who = seatPrimaryLine(g, "plusOne")
    return `«${who}» · suelta en otro asiento · Esc`
  }, [seatBlobDrag, seatableInvitations])

  const mapViewBox = useMemo(() => {
    const w = VB_W / mapView.zoom
    const h = VB_H / mapView.zoom
    return `${mapView.x} ${mapView.y} ${w} ${h}`
  }, [mapView])

  /** Cambios de posición o lista de mesas → volver a encajar el plano en el lienzo. */
  const tablesLayoutKey = useMemo(() => {
    if (!tables.length) return ""
    return tables
      .map(
        (t) =>
          `${t.id}:${Math.round(Number(t.x) || 0)}:${Math.round(Number(t.y) || 0)}:${t.capacity ?? 8}:${t.shape ?? "round"}`,
      )
      .sort()
      .join("|")
  }, [tables])

  const fitMapToTables = useCallback(() => {
    if (!tables.length) return
    const pad = 96
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const t of tables) {
      const shape = t.shape ?? "round"
      const { orbitX, orbitY } = tableGeom(t, shape)
      const orbit = Math.max(orbitX, orbitY) + 52
      const cx = typeof t.x === "number" ? t.x : 200
      const cy = typeof t.y === "number" ? t.y : 200
      minX = Math.min(minX, cx - orbit)
      minY = Math.min(minY, cy - orbit)
      maxX = Math.max(maxX, cx + orbit)
      maxY = Math.max(maxY, cy + orbit)
    }
    const contentW = maxX - minX + pad * 2
    const contentH = maxY - minY + pad * 2
    const midX = (minX + maxX) / 2
    const midY = (minY + maxY) / 2
    const z = clamp(
      Math.min(VB_W / contentW, VB_H / contentH),
      MAP_MIN_ZOOM,
      MAP_MAX_ZOOM,
    )
    const x = midX - VB_W / z / 2
    const y = midY - VB_H / z / 2
    const next = { zoom: z, x, y }
    mapViewRef.current = next
    setMapView(next)
  }, [tables])

  useEffect(() => {
    if (tables.length === 0 || !tablesLayoutKey) return
    const id = requestAnimationFrame(() => fitMapToTables())
    return () => cancelAnimationFrame(id)
  }, [tables.length, tablesLayoutKey, fitMapToTables])

  const zoomMapBy = useCallback((factor) => {
    const svg = svgRef.current
    if (!svg) return
    const rect = svg.getBoundingClientRect()
    const p = svgPoint(svg, rect.left + rect.width / 2, rect.top + rect.height / 2)
    setMapView((v) => {
      const newZoom = clamp(v.zoom * factor, MAP_MIN_ZOOM, MAP_MAX_ZOOM)
      if (newZoom === v.zoom) return v
      const nx = p.x - (p.x - v.x) * (v.zoom / newZoom)
      const ny = p.y - (p.y - v.y) * (v.zoom / newZoom)
      const next = { zoom: newZoom, x: nx, y: ny }
      mapViewRef.current = next
      return next
    })
  }, [])

  const resetMapView = useCallback(() => {
    const next = { zoom: 1, x: 0, y: 0 }
    mapViewRef.current = next
    setMapView(next)
  }, [])

  const handleMapBackdropPointerDown = useCallback(
    /** @param {React.PointerEvent<SVGRectElement>} */ (e) => {
      if (
        e.pointerType === "mouse" &&
        (e.button === 1 || (e.button === 0 && spacePan))
      ) {
        e.preventDefault()
        e.stopPropagation()
        const v = mapViewRef.current
        mapPanGrabRef.current = {
          cx: e.clientX,
          cy: e.clientY,
          vx: v.x,
          vy: v.y,
          zoom: v.zoom,
        }
        setMapPanning(true)
        const svg = svgRef.current
        if (svg && typeof svg.setPointerCapture === "function") {
          try {
            svg.setPointerCapture(e.pointerId)
          } catch {
            /* ignore */
          }
        }
        return
      }
      if (e.pointerType === "mouse" && e.button === 0 && !spacePan) {
        setSelectedTableId(null)
        touchDragListenersRef.current?.()
        touchDragListenersRef.current = null
        const pr = seatTouchPressRef.current
        if (pr?.timer) window.clearTimeout(pr.timer)
        seatTouchPressRef.current = null
        setSeatBlobDrag(null)
        setMapMovePick(null)
        setMapMoveHover(null)
      }
    },
    [spacePan],
  )

  /** Clic en el círculo del asiento: 1.er clic elige personas, 2.o clic en cualquier plaza la mueve o intercambia. */
  const handleSeatMapClick =
    (tblId, slot, occupant) => (/** @type {React.MouseEvent<SVGCircleElement>} */ e) => {
      e.stopPropagation()
      if (Date.now() < suppressSeatClickUntilRef.current) return
      if (occupant) {
        const same =
          mapMovePick &&
          mapMovePick.invitationId === occupant.inv.id &&
          mapMovePick.role === occupant.role &&
          mapMovePick.fromTableId === tblId &&
          mapMovePick.fromSlot === slot
        if (same) {
          setMapMovePick(null)
          setMapMoveHover(null)
          return
        }
        if (mapMovePick) {
          assignGuestSeat(mapMovePick.invitationId, tblId, slot, mapMovePick.role)
          setMapMovePick(null)
          setMapMoveHover(null)
          return
        }
        setMapMovePick({
          invitationId: occupant.inv.id,
          role: occupant.role,
          fromTableId: tblId,
          fromSlot: slot,
        })
        return
      }
      if (mapMovePick) {
        assignGuestSeat(mapMovePick.invitationId, tblId, slot, mapMovePick.role)
        setMapMovePick(null)
        setMapMoveHover(null)
      }
    }

  return (
    <div
      className="flex min-h-0 flex-1 flex-col gap-2 lg:min-h-0 lg:flex-1"
      id="dashboard-seating-print"
    >
      {/* Móvil: lista → canvas → ocupantes; escritorio: lista izquierda | plano centro | ocupantes derecha (sticky lateral). */}
      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:min-h-0 lg:flex-row lg:items-stretch">
        <FadeInSection
          className={`no-print relative order-1 flex min-h-[min(380px,calc(100dvh-12rem))] w-full shrink-0 flex-col rounded-xl border border-wine/40 bg-white/95 p-3 shadow-md backdrop-blur-[2px] lg:sticky lg:top-[5.75rem] lg:z-30 lg:order-1 lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)] lg:w-[13.5rem] xl:w-[14.5rem] 2xl:w-[15.5rem] ${soloPlano ? "lg:hidden" : ""}`}
          delay="50ms"
        >
          <p className="text-base font-semibold text-wine-dark">Invitados</p>
          <div
            className="no-print mt-2 grid grid-cols-3 gap-0.5 rounded-lg border border-sand bg-cream/50 p-0.5 text-[10px] font-semibold sm:text-[11px]"
            role="tablist"
            aria-label="Filtrar lista de invitados"
          >
            <button
              type="button"
              role="tab"
              aria-selected={guestListTab === "sin-confirmar"}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 leading-tight transition-colors ${
                guestListTab === "sin-confirmar"
                  ? "bg-white text-wine-dark shadow-sm"
                  : "text-wine/70 hover:text-wine-dark"
              }`}
              onClick={() => {
                setGuestListTab("sin-confirmar")
                setPickSeat(null)
                setSeatGlow(null)
                setListPulseKey(null)
              }}
            >
              <span className="text-center">Sin confirmar</span>
              <span
                className={`tabular-nums text-[13px] ${
                  unconfirmedRows.length ? "text-amber-900" : "text-wine/55"
                }`}
              >
                {unconfirmedRows.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={guestListTab === "sin-mesa"}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 leading-tight transition-colors ${
                guestListTab === "sin-mesa"
                  ? "bg-white text-wine-dark shadow-sm"
                  : "text-wine/70 hover:text-wine-dark"
              }`}
              onClick={() => {
                setGuestListTab("sin-mesa")
                setSeatGlow(null)
                setListPulseKey(null)
              }}
            >
              <span>Sin mesa</span>
              <span
                className={`tabular-nums text-[13px] ${
                  openSeatRows.length ? "text-amber-900" : "text-wine/55"
                }`}
              >
                {openSeatRows.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={guestListTab === "con-mesa"}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 leading-tight transition-colors ${
                guestListTab === "con-mesa"
                  ? "bg-white text-wine-dark shadow-sm"
                  : "text-wine/70 hover:text-wine-dark"
              }`}
              onClick={() => {
                setGuestListTab("con-mesa")
                setPickSeat(null)
                setSeatGlow(null)
                setListPulseKey(null)
              }}
            >
              <span>Con mesa</span>
              <span className="tabular-nums text-[13px] text-wine/70">
                {seatedSeatRows.length}
              </span>
            </button>
          </div>
          <div
            className="no-print mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10px] leading-tight text-wine/75"
            aria-label="Leyenda en el plano: pendiente o enviada, titular, acompañante, menú infantil"
          >
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-amber-500"
                aria-hidden
              />
              Sin confirmar
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-sky-600"
                aria-hidden
              />
              Titular
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-violet-600"
                aria-hidden
              />
              +1
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span
                className="h-2 w-2 shrink-0 rounded-full bg-green-600"
                aria-hidden
              />
              Infantil
            </span>
          </div>
          <input
            type="search"
            value={guestQuery}
            onChange={(e) => setGuestQuery(e.target.value)}
            placeholder="Buscar…"
            className="no-print mt-2 w-full rounded-lg border border-sand px-3 py-2 text-sm"
          />
          {guestListTab === "sin-confirmar" ? (
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto lg:overflow-y-scroll">
              <div className="flex flex-wrap gap-1.5">
                {filteredUnconfirmedRows.map((row) => {
                  const { g, role, key } = row
                  const infant = isInfantilSeat(g, role)
                  const shown = truncateMapLabel(seatPrimaryLine(g, role), 16)
                  const chipTitle = `${seatPrimaryLine(g, role)}${role === "plusOne" ? " (+1)" : ""} · ${inviteStatusLabel(g)}${g.dietary?.trim() ? ` · ${g.dietary}` : ""}`

                  if (g.status === "declined") {
                    const wrap = unconfirmedChipWrapClass(g, role)
                    return (
                      <div
                        key={key}
                        title={chipTitle}
                        className={`inline-flex max-w-[11.5rem] select-none flex-col gap-0 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight ${wrap} ${
                          infant ? "ring-1 ring-green-400/55" : ""
                        }`}
                      >
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <span className="truncate">{shown}</span>
                          {g.dietary?.trim() && role === "titular" ? (
                            <span className="shrink-0 text-amber-700" aria-hidden>
                              ⚠
                            </span>
                          ) : null}
                        </span>
                        {role === "titular" ? (
                          <span className="text-[9px] font-normal leading-tight text-wine/60">
                            {inviteStatusLabel(g)}
                          </span>
                        ) : (
                          <span className="text-[9px] font-normal text-wine/45">
                            +1
                          </span>
                        )}
                      </div>
                    )
                  }

                  const titularNeedsSeat =
                    role === "titular" && typeof g.seatIndex !== "number"
                  const plusNeedsSeat =
                    role === "plusOne" &&
                    g.plusOne &&
                    typeof g.plusOneSeatIndex !== "number"
                  const needsSeat = titularNeedsSeat || plusNeedsSeat

                  const tableIdForRow =
                    role === "titular" ? g.tableId : plusOneEffectiveTable(g)
                  const seatIdx =
                    role === "titular" ? g.seatIndex : g.plusOneSeatIndex
                  const hasSeat =
                    !!tableIdForRow && typeof seatIdx === "number"

                  if (needsSeat) {
                    const picked =
                      pickSeat?.invitationId === g.id && pickSeat.role === role
                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-pressed={picked}
                        title={chipTitle}
                        onDragStart={handleDragStartSeatNeeder(g.id, role)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return
                          e.preventDefault()
                          setPickSeat(
                            picked ? null : { invitationId: g.id, role },
                          )
                        }}
                        onClick={() =>
                          setPickSeat(
                            picked ? null : { invitationId: g.id, role },
                          )
                        }
                        className={`inline-flex max-w-[11.5rem] cursor-grab select-none flex-col gap-0 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-wine-dark/70 ${
                          picked
                            ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400"
                            : isAwaitingInviteRsvp(g)
                              ? "border-amber-400/90 bg-amber-50/95 text-amber-950"
                              : infant
                                ? "border-green-700/45 bg-green-50/90 text-green-950"
                                : "border-wine/25 bg-cream/80 text-wine-dark"
                        }`}
                      >
                        <span className="inline-flex min-w-0 items-center gap-1">
                          <span className="truncate">{shown}</span>
                          {g.dietary?.trim() && role === "titular" ? (
                            <span className="shrink-0 text-amber-700" aria-hidden>
                              ⚠
                            </span>
                          ) : null}
                        </span>
                        <span className="text-[9px] font-normal leading-tight text-wine/60">
                          {inviteStatusLabel(g)}
                          {role === "plusOne" ? " · +1" : ""}
                        </span>
                      </div>
                    )
                  }

                  if (hasSeat) {
                    const seatedRow = {
                      g,
                      role,
                      key,
                      seat: /** @type {number} */ (seatIdx),
                      tableId: /** @type {string} */ (tableIdForRow),
                    }
                    const blkName =
                      tables.find((t) => t.id === tableIdForRow)?.name ?? "Mesa"
                    const dn = seatPrimaryLine(g, role)
                    const chipShown =
                      role === "plusOne"
                        ? `${truncateMapLabel(dn, 14)} · ${seatIdx + 1}+`
                        : `${truncateMapLabel(dn, 13)} · ${seatIdx + 1}`
                    const fullTitle = seatHoverFullTitle(
                      g,
                      role,
                      blkName,
                      String(seatIdx + 1),
                    )
                    const active = listPulseKey === row.key
                    return (
                      <div
                        key={key}
                        role="button"
                        tabIndex={0}
                        draggable
                        aria-pressed={active}
                        title={fullTitle}
                        onDragStart={handleDragStartSeatNeeder(g.id, role)}
                        onKeyDown={(e) => {
                          if (e.key !== "Enter" && e.key !== " ") return
                          e.preventDefault()
                          const on = !(listPulseKey === key)
                          setListPulseKey(on ? key : null)
                          if (on) locateSeatOnMap(seatedRow)
                          else setSeatGlow(null)
                        }}
                        onClick={() => {
                          const on = !(listPulseKey === key)
                          setListPulseKey(on ? key : null)
                          if (on) locateSeatOnMap(seatedRow)
                          else setSeatGlow(null)
                        }}
                        className={`inline-flex max-w-[11.5rem] cursor-grab select-none flex-col gap-0 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-wine-dark/70 ${
                          active
                            ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400"
                            : isAwaitingInviteRsvp(g)
                              ? "border-amber-400/90 bg-amber-50/95 text-amber-950"
                              : infant
                                ? "border-green-700/45 bg-green-50/90 text-green-950"
                                : "border-wine/25 bg-cream/80 text-wine-dark"
                        }`}
                      >
                        <span className="min-w-0 truncate">{chipShown}</span>
                        <span className="text-[9px] font-normal leading-tight text-wine/55">
                          {inviteStatusLabel(g)}
                        </span>
                      </div>
                    )
                  }

                  return null
                })}
              </div>
            </div>
          ) : guestListTab === "sin-mesa" ? (
            <div className="mt-2 min-h-0 flex-1 overflow-y-auto lg:overflow-y-scroll">
              <div className="flex flex-wrap gap-1.5">
                {filteredSinMesaRows.map((row) => {
                  const { g, role, key } = row
                  const picked =
                    pickSeat?.invitationId === g.id && pickSeat.role === role
                  const infant = isInfantilSeat(g, role)
                  const shown = truncateMapLabel(seatPrimaryLine(g, role), 16)
                  const chipTitle = `${seatPrimaryLine(g, role)}${role === "plusOne" ? " (+1)" : ""}${g.dietary?.trim() ? ` · ${g.dietary}` : ""}`
                  return (
                    <div
                      key={key}
                      role="button"
                      tabIndex={0}
                      draggable
                      aria-pressed={picked}
                      title={chipTitle}
                      onDragStart={handleDragStartSeatNeeder(g.id, role)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return
                        e.preventDefault()
                        setPickSeat(
                          picked ? null : { invitationId: g.id, role },
                        )
                      }}
                      onClick={() =>
                        setPickSeat(
                          picked ? null : { invitationId: g.id, role },
                        )
                      }
                      className={`inline-flex cursor-grab select-none items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-wine-dark/70 ${
                        picked
                          ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400"
                          : isAwaitingInviteRsvp(g)
                            ? "border-amber-400/90 bg-amber-50/95 text-amber-950"
                            : infant
                              ? "border-green-700/45 bg-green-50/90 text-green-950"
                              : "border-wine/25 bg-cream/80 text-wine-dark"
                      }`}
                    >
                      {shown}
                      {g.dietary?.trim() ? (
                        <span className="text-amber-700" aria-hidden>
                          ⚠
                        </span>
                      ) : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="mt-2 min-h-0 flex-1 space-y-2 overflow-y-auto lg:overflow-y-scroll">
              {seatedGroupedFiltered.map((blk) => (
                <div
                  key={blk.tableId}
                  className="rounded-lg border border-sand/90 bg-white/55 px-2 py-2 shadow-sm"
                >
                  <p className="truncate text-[11px] font-bold uppercase tracking-wider text-wine/55">
                    {blk.name}{" "}
                    <span className="font-normal normal-case text-wine/45">
                      ({blk.rows.length})
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {blk.rows.map((row) => {
                      const { g, role, key } = row
                      const infant = isInfantilSeat(g, role)
                      const dn = seatPrimaryLine(g, role)
                      const chipShown =
                        role === "plusOne"
                          ? `${truncateMapLabel(dn, 14)} · ${row.seat + 1}+`
                          : `${truncateMapLabel(dn, 13)} · ${row.seat + 1}`
                      const fullTitle = seatHoverFullTitle(g, role, blk.name, String(row.seat + 1))
                      const active = listPulseKey === row.key
                      return (
                        <div
                          key={key}
                          role="button"
                          tabIndex={0}
                          draggable
                          aria-pressed={active}
                          title={fullTitle}
                          onDragStart={handleDragStartSeatNeeder(g.id, role)}
                          onKeyDown={(e) => {
                            if (e.key !== "Enter" && e.key !== " ") return
                            e.preventDefault()
                            const on = !(listPulseKey === key)
                            setListPulseKey(on ? key : null)
                            if (on) locateSeatOnMap(row)
                            else setSeatGlow(null)
                          }}
                          onClick={() => {
                            const on = !(listPulseKey === key)
                            setListPulseKey(on ? key : null)
                            if (on) locateSeatOnMap(row)
                            else setSeatGlow(null)
                          }}
                          className={`cursor-grab select-none rounded-md border px-2 py-1 text-[11px] font-semibold leading-tight outline-none transition-shadow active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-wine-dark/70 ${
                            active
                              ? "border-amber-500 bg-amber-50 text-amber-950 ring-2 ring-amber-400"
                              : isAwaitingInviteRsvp(g)
                                ? "border-amber-400/90 bg-amber-50/95 text-amber-950"
                                : infant
                                  ? "border-green-700/45 bg-green-50/90 text-green-950"
                                  : "border-wine/25 bg-cream/80 text-wine-dark"
                          }`}
                        >
                          {chipShown}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          {guestListTab === "sin-confirmar" &&
            filteredUnconfirmedRows.length === 0 &&
            unconfirmedRows.length > 0 && (
              <p className="mt-3 text-xs text-wine/60">
                Nadie coincide con la búsqueda.
              </p>
            )}
          {guestListTab === "sin-mesa" &&
            filteredSinMesaRows.length === 0 &&
            openSeatRows.length > 0 && (
              <p className="mt-3 text-xs text-wine/60">
                Nadie coincide con la búsqueda.
              </p>
            )}
          {guestListTab === "con-mesa" &&
            seatedGroupedFiltered.length === 0 &&
            seatedGrouped.length > 0 && (
              <p className="mt-3 text-xs text-wine/60">
                Nadie coincide con la búsqueda.
              </p>
            )}
          {guestListTab === "sin-confirmar" && unconfirmedRows.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-800">
              Todos los invitados figuran como confirmados.
            </p>
          ) : null}
          {guestListTab === "sin-mesa" && openSeatRows.length === 0 ? (
            <p className="mt-3 text-sm text-emerald-800">Todas las plazas están asignadas.</p>
          ) : null}
          {guestListTab === "con-mesa" && seatedSeatRows.length === 0 ? (
            <p className="mt-3 text-[10px] text-wine/60">Sin asientos en mapa · Coloca desde «Sin mesa» o sobre verdes.</p>
          ) : null}

          {pickSeat &&
          (guestListTab === "sin-mesa" || guestListTab === "sin-confirmar") ? (
            <div className="mt-4 border-t border-sand pt-4 lg:hidden">
              <label className="text-xs font-semibold uppercase tracking-wide text-wine-dark">
                Colocar esta persona (primera plaza libre en la mesa):
                <select
                  className="mt-1 block w-full min-h-[44px] rounded-lg border border-sand bg-white px-2 text-sm"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value
                    if (v)
                      assignGuestSeat(
                        pickSeat.invitationId,
                        v,
                        "auto",
                        pickSeat.role,
                      )
                    setPickSeat(null)
                  }}
                >
                  <option value="">— Mesa —</option>
                  {tables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} (cap. {t.capacity})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ) : null}
        </FadeInSection>

        <FadeInSection
          className="relative order-2 flex min-h-[min(520px,calc(100dvh-7rem))] flex-1 min-w-0 flex-col overflow-hidden rounded-xl border border-wine/35 bg-slate-100/90 shadow-inner lg:order-2 lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)] lg:min-h-[calc(100dvh-5rem)]"
          delay="40ms"
        >
          <div className="no-print pointer-events-auto absolute right-2 top-2 z-10" ref={canvasMenuRef}>
            <button
              type="button"
              className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border border-wine/25 bg-white/95 text-wine shadow-sm outline-none hover:bg-cream focus-visible:ring-2 focus-visible:ring-wine/40 ${
                canvasMenuOpen ? "bg-cream ring-2 ring-wine/25" : ""
              }`}
              aria-expanded={canvasMenuOpen}
              aria-haspopup="menu"
              aria-label="Acciones del canvas"
              onClick={() => setCanvasMenuOpen((o) => !o)}
            >
              <svg
                className="h-[18px] w-[18px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
              </svg>
            </button>
            {canvasMenuOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full z-40 mt-1 min-w-[12.5rem] rounded-lg border border-wine/20 bg-white py-1 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm font-semibold text-wine hover:bg-cream"
                  onClick={() => {
                    exportMesasCsv()
                    setCanvasMenuOpen(false)
                  }}
                >
                  Exportar CSV
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="block w-full px-3 py-2 text-left text-sm font-semibold text-wine hover:bg-cream"
                  onClick={() => {
                    window.print()
                    setCanvasMenuOpen(false)
                  }}
                >
                  Imprimir
                </button>
              </div>
            ) : null}
          </div>
          {soloPlano ? (
            <div className="no-print pointer-events-auto absolute left-2 top-2 z-10 rounded-lg border border-wine/20 bg-white/95 px-2 py-1.5 text-[10px] leading-tight text-wine-dark shadow-sm">
              <span className="tabular-nums">
                <strong>{seatedPersonCount}</strong>
                <span className="font-normal text-wine/65"> con mesa</span>
              </span>
              <span className="mx-1 text-wine/30">·</span>
              <span className="tabular-nums">
                <strong
                  className={
                    openSeatRows.length ? "text-amber-900" : "text-wine-dark"
                  }
                >
                  {openSeatRows.length}
                </strong>
                <span className="font-normal text-wine/65"> sin mesa</span>
              </span>
            </div>
          ) : null}
          <div className="no-print pointer-events-auto absolute bottom-3 right-3 z-10 flex max-w-[calc(100%-1rem)] flex-wrap items-center justify-end gap-0.5 rounded-xl border border-wine/30 bg-white/95 px-1 py-1 shadow-md sm:max-w-none">
            <button
              type="button"
              title="Alejar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-wine-dark hover:bg-cream"
              onClick={() => zoomMapBy(1 / 1.15)}
            >
              −
            </button>
            <span className="min-w-[3.25rem] shrink-0 px-1 text-center text-[11px] font-semibold tabular-nums text-wine-dark">
              {Math.round(mapView.zoom * 100)}%
            </span>
            <button
              type="button"
              title="Acercar"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg font-semibold text-wine-dark hover:bg-cream"
              onClick={() => zoomMapBy(1.15)}
            >
              +
            </button>
            <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-wine/15 sm:block" aria-hidden />
            <button
              type="button"
              title="Encajar todas las mesas"
              className="rounded-lg px-2 py-2 text-[11px] font-semibold text-wine hover:bg-cream disabled:opacity-40"
              disabled={tables.length === 0}
              onClick={fitMapToTables}
            >
              Encajar
            </button>
            <button
              type="button"
              title="100 % y origen"
              className="rounded-lg px-2 py-2 text-[11px] font-semibold text-wine hover:bg-cream"
              onClick={resetMapView}
            >
              1:1
            </button>
            <span className="mx-0.5 hidden h-6 w-px shrink-0 bg-wine/15 md:block" aria-hidden />
            <button
              type="button"
              title={
                soloPlano
                  ? "Volver a mostrar invitados y panel de mesa"
                  : "Ocultar paneles laterales y usar todo el ancho para el plano"
              }
              className={`rounded-lg px-2.5 py-2 text-[11px] font-semibold hover:bg-cream ${
                soloPlano
                  ? "bg-wine text-cream hover:bg-wine-dark"
                  : "text-wine"
              }`}
              onClick={() => setSoloPlano((s) => !s)}
            >
              {soloPlano ? "Paneles" : "Solo plano"}
            </button>
          </div>

          <div
            id="seating-add-floating"
            className="no-print pointer-events-auto absolute bottom-3 left-3 z-10 flex max-w-[calc(100%-1rem)] flex-row flex-wrap items-center gap-0.5 rounded-xl border border-wine/30 bg-white/95 px-1 py-1 shadow-md sm:left-4 sm:max-w-none"
            aria-label="Añadir mesa al plano"
          >
            <button
              type="button"
              title="Añadir mesa redonda (rápido)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-wine text-lg font-semibold leading-none text-cream hover:bg-wine-dark"
              onClick={() => addTable("round")}
            >
              +
            </button>
            <span
              className="mx-0.5 h-6 w-px shrink-0 bg-wine/15"
              aria-hidden
            />
            <button
              type="button"
              title="Mesa redonda"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-wine-dark hover:bg-cream"
              onClick={() => addTable("round")}
            >
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <circle cx="16" cy="16" r="9" />
                <circle cx="16" cy="5.5" r="1.35" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="26.5" cy="16" r="1.35" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="16" cy="26.5" r="1.35" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="5.5" cy="16" r="1.35" fill="currentColor" stroke="none" className="text-wine/45" />
              </svg>
            </button>
            <button
              type="button"
              title="Mesa rectangular"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-wine-dark hover:bg-cream"
              onClick={() => addTable("rectangular")}
            >
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <rect x="4" y="11" width="24" height="10" rx="2" />
                <circle cx="9" cy="9" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="16" cy="9" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="23" cy="9" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="9" cy="23" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="16" cy="23" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="23" cy="23" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
              </svg>
            </button>
            <button
              type="button"
              title="Mesa cuadrada"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-wine-dark hover:bg-cream"
              onClick={() => addTable("square")}
            >
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
                <rect x="8" y="8" width="16" height="16" rx="2" />
                <circle cx="16" cy="6.2" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="25.8" cy="16" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="16" cy="25.8" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
                <circle cx="6.2" cy="16" r="1.2" fill="currentColor" stroke="none" className="text-wine/45" />
              </svg>
            </button>
            <span
              className="mx-0.5 h-6 w-px shrink-0 bg-wine/15"
              aria-hidden
            />
            <button
              type="button"
              title="Mesa de honor (rectangular amplia · 12 plazas)"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-700/45 bg-amber-50/90 text-amber-900 shadow-sm hover:bg-amber-100"
              onClick={() => addTable("honor")}
            >
              <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden>
                <rect x="3" y="11" width="26" height="12" rx="2.5" stroke="#B8860B" strokeWidth="1.35" fill="#FFFBF5" />
                <path
                  fill="#B8860B"
                  d="M10 11V8.2c0-.5.4-.9.9-.9.4 0 .7.2.8.6l.8 2.4.8-2.4c.1-.4.4-.6.8-.6.5 0 .9.4.9.9V11h-4zm6.8 0V7.4c0-.5.4-.9.9-.9.4 0 .7.3.8.6l.6 1.5.6-1.5c.1-.4.4-.6.8-.6.5 0 .9.4.9.9V11h-4zM23 11V8.1c0-.5.4-.9.9-.9s.9.4.9.9V11h-1.8z"
                />
                <circle cx="8" cy="21" r="1.15" fill="currentColor" className="text-wine/45" stroke="none" />
                <circle cx="16" cy="21" r="1.15" fill="currentColor" className="text-wine/45" stroke="none" />
                <circle cx="24" cy="21" r="1.15" fill="currentColor" className="text-wine/45" stroke="none" />
              </svg>
            </button>
          </div>

          {mapMovePick && mapMoveBannerLine ? (
            <div className="no-print sticky top-0 z-20 mx-2 mb-1 mt-2 flex flex-shrink-0 flex-wrap items-center gap-2 rounded-lg border border-amber-600/55 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-950 shadow-sm">
              <span className="min-w-0 flex-1 leading-snug">{mapMoveBannerLine}</span>
              <button
                type="button"
                className="shrink-0 inline-flex h-8 items-center justify-center gap-1 rounded-lg border border-red-800/35 bg-white px-2.5 py-1 text-[11px] font-semibold text-red-800 hover:bg-red-50"
                title="Quitar a esta persona del plano de mesas"
                aria-label="Quitar a esta persona del plano de mesas"
                onClick={() => {
                  releaseInvitationSeat(
                    mapMovePick.invitationId,
                    mapMovePick.role === "plusOne" ? "plusOne" : "titular",
                  )
                  setMapMovePick(null)
                  setMapMoveHover(null)
                }}
              >
                <span className="text-base font-bold leading-none" aria-hidden>
                  ×
                </span>
                <span className="hidden sm:inline">Quitar</span>
              </button>
              <button
                type="button"
                className="shrink-0 rounded-lg border border-amber-800/35 bg-white px-2 py-1 text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                onClick={() => setMapMovePick(null)}
              >
                Cancelar
              </button>
            </div>
          ) : null}

          {seatBlobDrag && seatBlobDragBannerLine ? (
            <div className="no-print sticky top-0 z-20 mx-2 mb-1 mt-2 flex flex-shrink-0 flex-wrap items-center gap-2 rounded-lg border border-sky-600/45 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-950 shadow-sm">
              <span className="min-w-0 flex-1 leading-snug">{seatBlobDragBannerLine}</span>
            </div>
          ) : null}

          <div className="relative min-h-0 flex-1 overflow-auto overscroll-contain">
            <svg
              ref={svgRef}
              role="img"
              aria-label="Plano de mesas"
              viewBox={mapViewBox}
              preserveAspectRatio="xMidYMid meet"
              style={{ fontFamily: "Arial, Helvetica, sans-serif" }}
              className={`block h-full w-full min-h-[min(420px,58dvh)] min-w-0 touch-none select-none lg:min-h-full ${
                mapPanning ? "cursor-grabbing" : spacePan ? "cursor-grab" : ""
              }`}
            >
            <defs>
              <pattern id="seat-dot-grid" width="22" height="22" patternUnits="userSpaceOnUse">
                <circle cx="2" cy="2" r="1.2" fill="#c4b8b0" fillOpacity="0.45" />
              </pattern>
            </defs>
            <rect
              width={VB_W}
              height={VB_H}
              fill="url(#seat-dot-grid)"
              className={mapPanning ? "cursor-grabbing" : spacePan ? "cursor-grab" : "cursor-default"}
              onPointerDown={handleMapBackdropPointerDown}
            />

            {tables.map((tbl) => {
              const shape = tbl.shape ?? "round"
              const { rx, ry, orbitX, orbitY } = tableGeom(tbl, shape)
              const { cx, cy } = posOf(tbl)
              const cap = tbl.capacity
              const guests = guestsAt(tbl.id)
              /** @type {Record<number, { inv: (typeof guests)[0]; role: 'titular' | 'plusOne' }>} */
              const bySeat = {}
              for (const g of guests) {
                if (
                  g.tableId === tbl.id &&
                  typeof g.seatIndex === "number" &&
                  g.seatIndex >= 0 &&
                  g.seatIndex < cap
                )
                  bySeat[g.seatIndex] = { inv: g, role: "titular" }
                if (
                  g.plusOne &&
                  plusOneEffectiveTable(g) === tbl.id &&
                  typeof g.plusOneSeatIndex === "number" &&
                  g.plusOneSeatIndex >= 0 &&
                  g.plusOneSeatIndex < cap
                )
                  bySeat[g.plusOneSeatIndex] = { inv: g, role: "plusOne" }
              }
              const seatedCount = Object.keys(bySeat).length

              const readDragRole = (/** @type {React.DragEvent} */ e) =>
                e.dataTransfer.getData("text/seat-role") === "plusOne"
                  ? "plusOne"
                  : "titular"

              /** @type {React.DragEventHandler<SVGCircleElement>} */
              const droppable = (slot) => (e) => {
                e.preventDefault()
                e.stopPropagation()
                const id = e.dataTransfer.getData("text/guest-id")
                if (!id) return
                assignGuestSeat(id, tbl.id, slot, readDragRole(e))
                setMapMovePick(null)
                setMapMoveHover(null)
              }

              const innerShape =
                shape === "round" ? (
                  <circle
                    r={Math.min(rx, ry)}
                    className="seat-plan-table-drag cursor-grab fill-white/95 stroke-wine-dark/55"
                    strokeWidth={2}
                    onMouseDown={(e) => onTableBackdropDown(e, tbl)}
                  />
                ) : shape === "square" ? (
                  <rect
                    x={-rx}
                    y={-ry}
                    width={rx * 2}
                    height={ry * 2}
                    rx={10}
                    className="seat-plan-table-drag cursor-grab fill-white/95 stroke-wine-dark/55"
                    strokeWidth={2}
                    onMouseDown={(e) => onTableBackdropDown(e, tbl)}
                  />
                ) : shape === "honor" ? (
                  <g>
                    <rect
                      x={-rx - 3}
                      y={-ry - 3}
                      width={rx * 2 + 6}
                      height={ry * 2 + 6}
                      rx={17}
                      fill="none"
                      stroke="#B8860B"
                      strokeWidth={2.5}
                      className="seat-plan-table-drag cursor-grab"
                      onMouseDown={(e) => onTableBackdropDown(e, tbl)}
                    />
                    <rect
                      x={-rx}
                      y={-ry}
                      width={rx * 2}
                      height={ry * 2}
                      rx={14}
                      className="seat-plan-table-drag cursor-grab fill-[#fff9f2] stroke-wine-dark/60"
                      strokeWidth={2}
                      onMouseDown={(e) => onTableBackdropDown(e, tbl)}
                    />
                  </g>
                ) : (
                  <rect
                    x={-rx}
                    y={-ry}
                    width={rx * 2}
                    height={ry * 2}
                    rx={14}
                    className="seat-plan-table-drag cursor-grab fill-white/95 stroke-wine-dark/55"
                    strokeWidth={2}
                    onMouseDown={(e) => onTableBackdropDown(e, tbl)}
                  />
                )

              const centerHit = shape === "round" ? Math.min(rx, ry) * 0.55 : Math.min(rx, ry) * 0.42

              const haloR =
                Math.min(280, Math.max(orbitX + 14, orbitY + 14, rx + 28, ry + 28) + 24)

              const labelBox = tableLabelBox(shape, rx, ry)
              const nameFontPx = tableNameFontPx(tbl.name, labelBox.w)
              const ratioFontPx = Math.max(15, Math.round(nameFontPx * 0.72))

              return (
                <g key={tbl.id} transform={`translate(${cx},${cy}) rotate(${tbl.rotation ?? 0})`}>
                  {seatGlow?.tableId === tbl.id ? (
                    <circle
                      cx={0}
                      cy={0}
                      r={haloR}
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth={2.5}
                      strokeOpacity={0.9}
                      className="pointer-events-none seat-map-blink-ring"
                    />
                  ) : null}
                  {innerShape}
                  <circle
                    r={centerHit}
                    fill="transparent"
                    className="cursor-grab"
                    onMouseDown={(e) => onTableBackdropDown(e, tbl)}
                    onDragOver={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      const id = e.dataTransfer.getData("text/guest-id")
                      if (!id) return
                      assignGuestSeat(id, tbl.id, "auto", readDragRole(e))
                      setMapMovePick(null)
                      setMapMoveHover(null)
                    }}
                  />
                  <foreignObject
                    x={-labelBox.w / 2}
                    y={-labelBox.h / 2}
                    width={labelBox.w}
                    height={labelBox.h}
                    className="pointer-events-none"
                  >
                    <div
                      xmlns="http://www.w3.org/1999/xhtml"
                      className="flex h-full w-full flex-col items-center justify-center text-center font-semibold leading-snug text-wine-dark"
                      style={{
                        pointerEvents: "none",
                        overflow: "hidden",
                        padding: "3px",
                        fontSize: nameFontPx,
                        wordBreak: "break-word",
                        overflowWrap: "anywhere",
                        hyphens: "auto",
                      }}
                    >
                      <span
                        style={{
                          display: "-webkit-box",
                          WebkitLineClamp: 4,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {tbl.name}
                      </span>
                      <span
                        className="shrink-0 font-semibold tabular-nums text-wine-dark/75"
                        style={{ fontSize: ratioFontPx, marginTop: "0.2em" }}
                      >
                        {seatedCount}/{cap}
                      </span>
                    </div>
                  </foreignObject>

                  {Array.from({ length: cap }).map((_, slot) => {
                    const θ = -Math.PI / 2 + (slot * 2 * Math.PI) / Math.max(cap, 1)
                    const sx = orbitX * Math.cos(θ)
                    const sy = orbitY * Math.sin(θ)
                    const occupant = bySeat[slot]
                    const tipTable = tbl.name
                    const slotHuman = String(slot + 1)
                    const seatPickSource =
                      (mapMovePick &&
                        mapMovePick.fromTableId === tbl.id &&
                        mapMovePick.fromSlot === slot) ||
                      (seatBlobDrag &&
                        seatBlobDrag.fromTableId === tbl.id &&
                        seatBlobDrag.fromSlot === slot)

                    const fromMapMoveSource =
                      !!mapMovePick &&
                      mapMovePick.fromTableId === tbl.id &&
                      mapMovePick.fromSlot === slot
                    const fromBlobDragSource =
                      !!seatBlobDrag &&
                      seatBlobDrag.fromTableId === tbl.id &&
                      seatBlobDrag.fromSlot === slot

                    const isMovePreview =
                      !!(mapMovePick || seatBlobDrag) &&
                      mapMoveHover?.tableId === tbl.id &&
                      mapMoveHover.slot === slot &&
                      !fromMapMoveSource &&
                      !fromBlobDragSource

                    const hoverTitleSvg = occupant
                      ? seatHoverFullTitle(
                          occupant.inv,
                          occupant.role,
                          tipTable,
                          slotHuman,
                        )
                      : seatBlobDrag
                        ? `Suelta aquí · Asiento ${slotHuman} · ${tipTable}`
                        : mapMovePick
                          ? `Clic aquí · Asiento ${slotHuman} · ${tipTable} (destino)`
                          : `Asiento libre ${slotHuman} · ${tipTable}`

                    return (
                      <g key={slot}>
                        {occupant ? (
                          <>
                            {isMovePreview ? (
                              <circle
                                cx={sx}
                                cy={sy}
                                r={32}
                                fill="#475569"
                                fillOpacity={0.4}
                                className="pointer-events-none"
                              />
                            ) : null}
                            <circle
                              cx={sx}
                              cy={sy}
                              r={29}
                              fill={seatBlobFill(occupant.inv, occupant.role)}
                              fillOpacity={0.92}
                              stroke="#fff"
                              strokeWidth={2.5}
                              style={{ pointerEvents: "none" }}
                            />
                            <text
                              textAnchor="middle"
                              dominantBaseline="middle"
                              x={sx}
                              y={sy}
                              fill="#fff"
                              className="pointer-events-none"
                              style={{
                                pointerEvents: "none",
                                fontSize: 17,
                                fontWeight: 700,
                              }}
                            >
                              {guestSeatLetter(occupant.inv, occupant.role)}
                            </text>
                            {occupant.inv.dietary?.trim() ? (
                              <text
                                x={sx + 26}
                                y={sy - 24}
                                className="fill-amber-500 text-[17px]"
                                style={{ pointerEvents: "none" }}
                                aria-hidden
                              >
                                ⚠
                              </text>
                            ) : null}
                          </>
                        ) : (
                          <>
                            {isMovePreview ? (
                              <circle
                                cx={sx}
                                cy={sy}
                                r={28}
                                fill="#64748b"
                                fillOpacity={0.5}
                                className="pointer-events-none"
                              />
                            ) : null}
                            <circle
                              cx={sx}
                              cy={sy}
                              r={26}
                              fill="#ecfdf5"
                              stroke="#059669"
                              strokeWidth={2}
                              strokeDasharray="4 4"
                              style={{ pointerEvents: "none" }}
                            />
                            <text
                              x={sx}
                              y={sy + 40}
                              textAnchor="middle"
                              fill="#78716c"
                              className="pointer-events-none text-[10px] font-semibold uppercase"
                              style={{ fontSize: 10, pointerEvents: "none" }}
                            >
                              {slot + 1}
                            </text>
                          </>
                        )}
                        {seatPickSource ? (
                          <circle
                            cx={sx}
                            cy={sy}
                            r={52}
                            fill="none"
                            stroke={
                              seatBlobDrag &&
                              seatBlobDrag.fromTableId === tbl.id &&
                              seatBlobDrag.fromSlot === slot
                                ? "#0284c7"
                                : "#d97706"
                            }
                            strokeWidth={2.75}
                            strokeDasharray="7 4"
                            className="pointer-events-none seat-map-blink-ring"
                            opacity={0.95}
                          />
                        ) : null}
                        {seatGlow &&
                        seatGlow.tableId === tbl.id &&
                        seatGlow.slot === slot &&
                        occupant ? (
                          <g
                            pointerEvents="none"
                            key={`seat-pulse-${seatGlow.token}-${tbl.id}-${slot}`}
                          >
                            <circle
                              cx={sx}
                              cy={sy}
                              r={43}
                              fill="rgba(253,186,116,0.32)"
                              stroke="#ea580c"
                              strokeWidth={3.5}
                              className="seat-map-blink-ring"
                            />
                          </g>
                        ) : null}
                        <circle
                          cx={sx}
                          cy={sy}
                          r={48}
                          fill="transparent"
                          className={
                            occupant
                              ? mapMovePick
                                ? "cursor-pointer"
                                : "cursor-grab active:cursor-grabbing"
                              : "cursor-copy"
                          }
                          style={{ pointerEvents: "auto" }}
                          draggable={!!occupant}
                          onDragStart={
                            occupant
                              ? (e) => {
                                  e.stopPropagation()
                                  handleDragStartSeatNeeder(
                                    occupant.inv.id,
                                    occupant.role,
                                  )(e)
                                }
                              : undefined
                          }
                          onDragEnd={() => {
                            suppressSeatClickUntilRef.current = Date.now() + 320
                            setMapMoveHover(null)
                          }}
                          onDragOver={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                          }}
                          onDrop={droppable(slot)}
                          onMouseDown={(e) => e.stopPropagation()}
                          onPointerDown={(e) => {
                            if (!occupant) return
                            if (e.pointerType === "mouse") return
                            if (e.button !== 0) return
                            const prev = seatTouchPressRef.current
                            if (prev?.timer) window.clearTimeout(prev.timer)
                            const target = e.currentTarget
                            const pointerId = e.pointerId
                            const startX = e.clientX
                            const startY = e.clientY
                            const invId = occupant.inv.id
                            const role = occupant.role
                            const fromTableId = tbl.id
                            const fromSlot = slot
                            const timer = window.setTimeout(() => {
                              seatTouchPressRef.current = null
                              try {
                                target.setPointerCapture(pointerId)
                              } catch {
                                /* ignore */
                              }
                              setMapMovePick(null)
                              setMapMoveHover(null)
                              suppressSeatClickUntilRef.current =
                                Date.now() + 900
                              setSeatBlobDrag({
                                invitationId: invId,
                                role,
                                fromTableId,
                                fromSlot,
                                x: startX,
                                y: startY,
                                label: guestSeatLetter(
                                  occupant.inv,
                                  occupant.role,
                                ),
                              })
                              const payload = {
                                pointerId,
                                target,
                                invitationId: invId,
                                role,
                                fromTableId,
                                fromSlot,
                              }
                              const removeListeners = () => {
                                window.removeEventListener(
                                  "pointermove",
                                  onMove,
                                )
                                window.removeEventListener(
                                  "pointerup",
                                  onEnd,
                                )
                                window.removeEventListener(
                                  "pointercancel",
                                  onEnd,
                                )
                                touchDragListenersRef.current = null
                                try {
                                  target.releasePointerCapture(pointerId)
                                } catch {
                                  /* ignore */
                                }
                              }
                              touchDragListenersRef.current = removeListeners
                              const onMove = (ev) => {
                                if (ev.pointerId !== pointerId) return
                                setSeatBlobDrag((d) =>
                                  d
                                    ? {
                                        ...d,
                                        x: ev.clientX,
                                        y: ev.clientY,
                                      }
                                    : null,
                                )
                                const hit = findSeatSlotAtClientRef.current(
                                  ev.clientX,
                                  ev.clientY,
                                )
                                if (
                                  hit &&
                                  (hit.tableId !== fromTableId ||
                                    hit.slot !== fromSlot)
                                )
                                  setMapMoveHover({
                                    tableId: hit.tableId,
                                    slot: hit.slot,
                                  })
                                else setMapMoveHover(null)
                              }
                              const onEnd = (ev) => {
                                if (ev.pointerId !== pointerId) return
                                removeListeners()
                                const hit = findSeatSlotAtClientRef.current(
                                  ev.clientX,
                                  ev.clientY,
                                )
                                if (
                                  hit &&
                                  (hit.tableId !== fromTableId ||
                                    hit.slot !== fromSlot)
                                )
                                  assignGuestSeat(
                                    payload.invitationId,
                                    hit.tableId,
                                    hit.slot,
                                    payload.role,
                                  )
                                setSeatBlobDrag(null)
                                setMapMoveHover(null)
                              }
                              window.addEventListener("pointermove", onMove)
                              window.addEventListener("pointerup", onEnd)
                              window.addEventListener(
                                "pointercancel",
                                onEnd,
                              )
                            }, 420)
                            seatTouchPressRef.current = {
                              pointerId,
                              startX,
                              startY,
                              timer,
                              target,
                            }
                          }}
                          onPointerUp={(e) => {
                            const pr = seatTouchPressRef.current
                            if (
                              pr &&
                              e.pointerId === pr.pointerId &&
                              pr.timer
                            ) {
                              window.clearTimeout(pr.timer)
                              seatTouchPressRef.current = null
                            }
                          }}
                          onPointerCancel={(e) => {
                            const pr = seatTouchPressRef.current
                            if (
                              pr &&
                              e.pointerId === pr.pointerId &&
                              pr.timer
                            ) {
                              window.clearTimeout(pr.timer)
                              seatTouchPressRef.current = null
                            }
                          }}
                          onPointerEnter={(e) => {
                            setSeatHoverTip({
                              x: e.clientX,
                              y: e.clientY,
                              text: hoverTitleSvg,
                            })
                            if (!mapMovePick && !seatBlobDrag) return
                            window.clearTimeout(mapMoveHoverClearRef.current)
                            setMapMoveHover({ tableId: tbl.id, slot })
                          }}
                          onPointerMove={(e) => {
                            const pr = seatTouchPressRef.current
                            if (
                              pr &&
                              e.pointerId === pr.pointerId &&
                              pr.timer
                            ) {
                              const d = Math.hypot(
                                e.clientX - pr.startX,
                                e.clientY - pr.startY,
                              )
                              if (d > 14) {
                                window.clearTimeout(pr.timer)
                                seatTouchPressRef.current = null
                              }
                            }
                            setSeatHoverTip((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    x: e.clientX,
                                    y: e.clientY,
                                  }
                                : null,
                            )
                          }}
                          onPointerLeave={() => {
                            setSeatHoverTip(null)
                            window.clearTimeout(mapMoveHoverClearRef.current)
                            mapMoveHoverClearRef.current = window.setTimeout(
                              () => setMapMoveHover(null),
                              45,
                            )
                          }}
                          onClick={handleSeatMapClick(tbl.id, slot, occupant)}
                        />
                        {mapMovePick &&
                        occupant &&
                        mapMovePick.invitationId === occupant.inv.id &&
                        mapMovePick.role === occupant.role &&
                        mapMovePick.fromTableId === tbl.id &&
                        mapMovePick.fromSlot === slot ? (
                          <g
                            style={{ cursor: "pointer" }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onMouseDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation()
                              releaseInvitationSeat(
                                mapMovePick.invitationId,
                                mapMovePick.role === "plusOne"
                                  ? "plusOne"
                                  : "titular",
                              )
                              setMapMovePick(null)
                              setMapMoveHover(null)
                            }}
                          >
                            <circle
                              cx={sx + 38}
                              cy={sy - 38}
                              r={16}
                              className="fill-white stroke-red-800/70"
                              strokeWidth={2}
                            />
                            <text
                              x={sx + 38}
                              y={sy - 33}
                              textAnchor="middle"
                              className="pointer-events-none fill-red-700 font-bold"
                              style={{ fontSize: 22 }}
                            >
                              ×
                            </text>
                            <title>Quitar de esta mesa</title>
                          </g>
                        ) : null}
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>

          {seatHoverTip ? (
            <div
              role="tooltip"
              className="no-print pointer-events-none fixed z-[100] max-w-[min(18rem,calc(100vw-1.25rem))] rounded-lg border border-wine/18 bg-white/97 px-3 py-1.5 text-left text-xs font-semibold leading-snug text-wine-dark shadow-[0_6px_24px_-4px_rgba(80,30,40,0.22)]"
              style={{
                left: seatHoverTip.x + 14,
                top: seatHoverTip.y + 14,
              }}
            >
              {seatHoverTip.text}
            </div>
          ) : null}

          {seatBlobDrag ? (
            <div
              aria-hidden
              className="no-print pointer-events-none fixed z-[110] flex h-14 w-14 items-center justify-center rounded-full border-2 border-white text-lg font-bold text-white shadow-xl"
              style={{
                left: seatBlobDrag.x - 28,
                top: seatBlobDrag.y - 28,
                touchAction: "none",
                backgroundColor: (() => {
                  const dg = seatableInvitations.find(
                    (i) => i.id === seatBlobDrag.invitationId,
                  )
                  return dg
                    ? seatBlobFill(dg, seatBlobDrag.role)
                    : "#0369a1"
                })(),
              }}
            >
              {seatBlobDrag.label}
            </div>
          ) : null}

          {tables.length === 0 ? (
            <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-wine/60 no-print">
              Añade una mesa y arrastra invitados a los asientos verdes. En bolitas ocupadas puedes arrastrar con el ratón o mantener pulsado (móvil) y soltar en otro asiento.
            </p>
          ) : null}
          </div>
        </FadeInSection>

        <FadeInSection
          className={`no-print relative order-3 flex min-h-[min(320px,calc(100dvh-12rem))] w-full shrink-0 flex-col rounded-xl border border-wine/40 bg-white/95 p-3 shadow-md backdrop-blur-[2px] lg:sticky lg:top-[5.75rem] lg:z-30 lg:order-3 lg:h-[calc(100dvh-5rem)] lg:max-h-[calc(100dvh-5rem)] lg:w-[13.5rem] xl:w-[14.5rem] 2xl:w-[15.5rem] ${soloPlano ? "lg:hidden" : ""}`}
          delay="70ms"
        >
          <p className="text-base font-semibold text-wine-dark">Esta mesa</p>
          <p className="mt-0.5 text-[10px] leading-snug text-wine/60">
            Clic en el centro de una mesa en el plano. Pestañas <strong>Ocupantes</strong> / <strong>Mesa</strong>.
          </p>
          {!selectedTableId ? (
            <p className="mt-3 flex flex-1 items-center rounded-lg border border-dashed border-sand bg-cream/40 px-3 py-5 text-center text-xs text-wine/55">
              Haz clic en el centro de una mesa.
            </p>
          ) : (
            <div className="mt-2 flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-amber-400/70 bg-gradient-to-br from-amber-50 to-white px-2 py-2 text-sm text-amber-950 shadow-sm">
              <div className="flex items-start gap-2 border-b border-amber-800/10 pb-2">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-semibold leading-snug text-wine-dark">
                    {tables.find((x) => x.id === selectedTableId)?.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold tabular-nums text-wine-dark/80">
                    {tableRoster(selectedTableId).length}/
                    {tables.find((x) => x.id === selectedTableId)?.capacity}{" "}
                    sentados
                  </p>
                </div>
                <div className="flex shrink-0 items-start gap-0.5 pt-0.5">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-red-700 hover:bg-red-50"
                    title="Eliminar mesa"
                    aria-label="Eliminar mesa"
                    onClick={() => requestRemoveTable(selectedTableId)}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-wine hover:bg-white/80"
                    title="Cerrar"
                    aria-label="Cerrar panel de mesa"
                    onClick={() => setSelectedTableId(null)}
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden
                    >
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div
                className="flex rounded-md border border-sand bg-white/85 p-0.5 text-[11px] font-semibold shadow-sm"
                role="tablist"
                aria-label="Contenido de la mesa"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={tablePanelTab === "ocupantes"}
                  className={`min-h-[34px] flex-1 rounded px-2 py-1.5 transition-colors ${
                    tablePanelTab === "ocupantes"
                      ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-500/35"
                      : "text-wine/70 hover:text-wine-dark"
                  }`}
                  onClick={() => setTablePanelTab("ocupantes")}
                >
                  Ocupantes
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tablePanelTab === "mesa"}
                  className={`min-h-[34px] flex-1 rounded px-2 py-1.5 transition-colors ${
                    tablePanelTab === "mesa"
                      ? "bg-amber-100 text-amber-950 shadow-sm ring-1 ring-amber-500/35"
                      : "text-wine/70 hover:text-wine-dark"
                  }`}
                  onClick={() => setTablePanelTab("mesa")}
                >
                  Mesa
                </button>
              </div>

              {tablePanelTab === "ocupantes" ? (
                <div className="flex min-h-0 flex-1 flex-col gap-1.5">
                  <p className="text-[9px] leading-snug text-wine/55">
                    Clic fila: ver en el plano · Arrastra · Icono papelera: quitar del asiento.
                  </p>
                  <div className="flex min-h-0 flex-1 flex-col rounded-md border border-sand/60 bg-white/80 px-1.5 py-1.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-wine/65">
                      Sentados ({tableRoster(selectedTableId).length})
                    </p>
                    {tableRoster(selectedTableId).length === 0 ? (
                      <p className="mt-1.5 text-xs text-wine/55">
                        Nadie en esta mesa aún.
                      </p>
                    ) : (
                      <ul className="mt-1.5 min-h-0 flex-1 space-y-1.5 overflow-y-auto">
                        {tableRoster(selectedTableId).map((row) => {
                          const tName =
                            tables.find((x) => x.id === selectedTableId)?.name ??
                            ""
                          return (
                            <li
                              key={`${row.g.id}-${row.role}-${row.seat}`}
                              role="button"
                              tabIndex={0}
                              draggable
                              onDragStart={handleDragStartSeatNeeder(
                                row.g.id,
                                row.role,
                              )}
                              onKeyDown={(e) => {
                                if (e.key !== "Enter" && e.key !== " ")
                                  return
                                e.preventDefault()
                                locateSeatOnMap({
                                  g: row.g,
                                  role: row.role,
                                  key: `${row.g.id}-${row.role}`,
                                  seat: row.seat,
                                })
                              }}
                              onClick={() =>
                                locateSeatOnMap({
                                  g: row.g,
                                  role: row.role,
                                  key: `${row.g.id}-${row.role}`,
                                  seat: row.seat,
                                })
                              }
                              className="flex cursor-grab items-center justify-between gap-1 rounded-md border border-sand bg-white px-2 py-1.5 active:cursor-grabbing"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-xs font-medium text-wine-dark">
                                  {seatPrimaryLine(row.g, row.role)}
                                </p>
                                <p className="truncate text-[9px] text-wine/55">
                                  {row.role === "plusOne" && row.g.plusOneName?.trim() ? (
                                    <span>{seatPlusOneDeLine(row.g)} · </span>
                                  ) : null}
                                  «{tName}» · n.º {row.seat + 1}
                                  {row.g.dietary?.trim() ? (
                                    <span className="text-amber-800">{` · ${row.g.dietary.trim()}`}</span>
                                  ) : null}
                                </p>
                              </div>
                              <button
                                type="button"
                                className="shrink-0 rounded-md p-1 text-wine hover:bg-wine hover:text-cream"
                                title="Quitar del asiento"
                                aria-label={`Quitar a ${seatPrimaryLine(row.g, row.role)} del asiento`}
                                onClick={(ev) => {
                                  ev.stopPropagation()
                                  releaseInvitationSeat(row.g.id, row.role)
                                }}
                              >
                                <svg
                                  className="h-3.5 w-3.5"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  aria-hidden
                                >
                                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6" />
                                </svg>
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              ) : (
                <div className="min-h-0 flex-1 space-y-2 overflow-y-auto">
                  <div className="space-y-1.5 rounded-md border border-sand/80 bg-white/90 p-2 text-wine-dark">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-wine/65">
                      Datos
                    </p>
                    <label className="block text-[10px] font-medium text-wine/75">
                      Nombre
                      <input
                        value={editTableName}
                        onChange={(e) => setEditTableName(e.target.value)}
                        className="mt-0.5 block w-full rounded-md border border-sand px-2 py-1.5 text-xs text-wine-dark"
                        autoComplete="off"
                      />
                    </label>
                    <div className="flex flex-wrap gap-2">
                      <label className="block min-w-[3.5rem] text-[10px] font-medium text-wine/75">
                        Plazas
                        <input
                          type="number"
                          min={1}
                          max={30}
                          value={editTableCap}
                          onChange={(e) => setEditTableCap(e.target.value)}
                          className="mt-0.5 block w-full rounded-md border border-sand px-2 py-1.5 text-xs"
                        />
                      </label>
                      <label className="block min-w-[110px] flex-1 text-[10px] font-medium text-wine/75">
                        Forma
                        <select
                          value={editTableShape}
                          onChange={(e) =>
                            setEditTableShape(
                              /** @type {'round'|'square'|'rectangular'|'honor'} */ (
                                e.target.value
                              ),
                            )
                          }
                          className="mt-0.5 block w-full min-h-[34px] rounded-md border border-sand bg-white px-2 py-1 text-xs"
                        >
                          <option value="round">Redonda</option>
                          <option value="square">Cuadrada</option>
                          <option value="rectangular">Rectangular</option>
                          <option value="honor">Mesa de honor</option>
                        </select>
                      </label>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                      <button
                        type="button"
                        className="rounded-md border border-wine/50 bg-wine px-3 py-1.5 text-[11px] font-semibold text-cream hover:bg-wine-dark"
                        onClick={persistEditedTable}
                      >
                        Guardar
                      </button>
                      <button
                        type="button"
                        className="text-[10px] text-wine underline hover:no-underline"
                        onClick={() => {
                          const t = tables.find((x) => x.id === selectedTableId)
                          if (!t) return
                          setEditTableName(t.name)
                          setEditTableCap(String(Math.max(1, t.capacity ?? 10)))
                          const s = t.shape ?? "round"
                          setEditTableShape(
                            s === "square"
                              ? "square"
                              : s === "rectangular"
                                ? "rectangular"
                                : s === "honor"
                                  ? "honor"
                                  : "round",
                          )
                        }}
                      >
                        Deshacer
                      </button>
                    </div>
                    <p className="text-[9px] leading-snug text-wine/50">
                      Capacidad ≥ ocupados. Si mueves titular de mesa, revisa +1.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </FadeInSection>
      </div>

      <DeleteTableConfirmModal
        open={Boolean(deleteTableModal)}
        tableName={deleteTableModal?.name ?? ""}
        guestCount={deleteTableModal?.guestCount ?? 0}
        onCancel={() => setDeleteTableModal(null)}
        onConfirm={() => {
          if (!deleteTableModal) return
          executeRemoveTable(deleteTableModal.id)
          setDeleteTableModal(null)
        }}
      />
    </div>
  )
}
