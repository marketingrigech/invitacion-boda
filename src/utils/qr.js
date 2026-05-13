import QRCode from "qrcode"

/**
 * @param {HTMLCanvasElement} canvas
 * @param {string} text
 */
export async function renderQrToCanvas(canvas, text) {
  await QRCode.toCanvas(canvas, text, {
    margin: 1,
    width: 260,
    color: { dark: "#471421", light: "#FFFCF9" },
    errorCorrectionLevel: "M",
  })
}

/**
 * @param {string} text
 * @param {string} filename
 */
export async function downloadQrAsPng(text, filename) {
  const dataUrl = await QRCode.toDataURL(text, {
    margin: 1,
    width: 520,
    color: { dark: "#471421", light: "#FFFCF9" },
    errorCorrectionLevel: "M",
  })
  const a = document.createElement("a")
  a.href = dataUrl
  a.download = filename.endsWith(".png") ? filename : `${filename}.png`
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}
