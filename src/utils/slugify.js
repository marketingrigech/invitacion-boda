/**
 * Genera el segmento de URL para la invitación.
 * Reglas alineadas con `Invitation.jsx`: `_` dentro del grupo, `-` entre nombres y apellidos.
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
export function buildSlug(firstName, lastName) {
  const normalize = (str) =>
    str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\u00f1/g, "n")
      .replace(/\u00d1/g, "N")
      .trim()

  const groupify = (str) => normalize(str).split(/\s+/).filter(Boolean).join("_")

  const g1 = groupify(firstName)
  const g2 = groupify(lastName)
  if (!g1 || !g2) return ""
  return `${g1}-${g2}`
}
