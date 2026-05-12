/**
 * Envía un evento de analytics al servidor (Vercel KV).
 * Silencioso si falla (p. ej. npm run dev sin proxy a /api).
 *
 * @param {string | null} slug
 * @param {"view" | "open"} event
 */
export async function trackEvent(slug, event) {
  if (!slug || typeof slug !== "string" || !slug.includes("-")) return
  try {
    const r = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event }),
    })
    if (!r.ok) return
  } catch {
    /* silencioso */
  }
}
