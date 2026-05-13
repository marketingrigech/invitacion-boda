/** Igual criterio que InvitationRoute para analytics: slug estable del primer segmento. */
export function extractSlugFromLocation() {
  if (typeof window === "undefined") return null
  try {
    const rawPath = decodeURIComponent(window.location.pathname)
    let segment = rawPath.replace(/^\//, "").split("/")[0] ?? ""
    if (!segment) return null
    if (segment.endsWith("+1")) segment = segment.slice(0, -2)
    segment = segment.trim()
    if (!segment.includes("-")) return null
    if (!/^[A-Za-z0-9_-]+$/.test(segment)) return null
    return segment
  } catch {
    return null
  }
}
