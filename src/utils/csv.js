/**
 * @param {unknown} cell
 * @returns {string}
 */
export function escapeCsvCell(cell) {
  const s = cell == null ? "" : String(cell)
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/**
 * @param {string[]} headers
 * @param {unknown[][]} rows
 * @returns {string}
 */
export function toCsv(headers, rows) {
  const bom = "\uFEFF"
  const h = headers.map(escapeCsvCell).join(";")
  const body = rows
    .map((r) =>
      headers.map((_h, i) => escapeCsvCell(r[i])).join(";"),
    )
    .join("\r\n")
  return bom + h + "\r\n" + body
}

/**
 * @param {string} filename
 * @param {string} content
 */
export function downloadCsv(filename, content) {
  const blob = new Blob([content], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename.endsWith(".csv") ? filename : `${filename}.csv`
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
