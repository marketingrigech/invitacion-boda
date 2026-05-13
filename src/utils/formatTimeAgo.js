/** @param {string | undefined | null} iso */
export function formatTimeAgo(iso) {
  if (!iso || typeof iso !== "string") return ""
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ""
  let d = Date.now() - t
  if (d < 0) d = 0
  const m = Math.floor(d / 60000)
  if (m < 1) return "hace un momento"
  if (m < 60) return `hace ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `hace ${h} h`
  const days = Math.floor(h / 24)
  return `hace ${days} día${days !== 1 ? "s" : ""}`
}
