/** Dominio público de la invitación (enlaces WhatsApp, QR, copiar). Override: VITE_PUBLIC_INVITE_URL */
const CANONICAL_PUBLIC_INVITE_ORIGIN = "https://boda-lis-juanjo.vercel.app"

/** @returns {string} */
export function getPublicInviteOrigin() {
  const env = /** @type {unknown} */ (import.meta.env.VITE_PUBLIC_INVITE_URL)
  if (typeof env === "string" && env.trim().length > 0) return env.replace(/\/$/, "")
  return CANONICAL_PUBLIC_INVITE_ORIGIN
}

/**
 * @param {string} slug
 * @param {boolean} plusOne
 */
export function invitePath(slug, plusOne) {
  const suffix = plusOne ? "+1" : ""
  return `/${slug}${suffix}`
}

/**
 * @param {string} slug
 * @param {boolean} plusOne
 */
export function fullInviteUrl(slug, plusOne) {
  return `${getPublicInviteOrigin()}${invitePath(slug, plusOne)}`
}

/**
 * @param {string} guestName - nombre corto solo para saludo opcional (nombre de pila si lo tenemos por separado; aquí usamos el slug name no disp)
 * @param {string} inviteUrl - URL absoluta personalizada
 */
export function buildInviteMessage(guestName, inviteUrl) {
  const who = typeof guestName === "string" && guestName.trim() ? guestName.trim() : "Hola"
  return `${who}, ¿qué tal? 💌 Hemos preparado vuestra invitación personalizada a nuestra boda. Aquí os dejamos el enlace único por si lo queréis guardar:\n\n${inviteUrl}\n\nCon muchísimo cariño — Lis & Juanjo`
}

/**
 * @param {{ name?: string }} guest
 */
export function openWhatsAppInviteForGuest(guest) {
  const name = typeof guest?.name === "string" ? guest.name.split(/\s+/)[0] ?? "" : ""
  const slug = typeof guest.slug === "string" ? guest.slug : ""
  const plusOne = Boolean(guest.plusOne)
  const url = fullInviteUrl(slug, plusOne)
  const text = buildInviteMessage(name, url)
  window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer")
}
