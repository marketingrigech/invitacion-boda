/**
 * Servidor CRM mínimo en `npm run dev` cuando no hay `VITE_API_PROXY` / `API_PROXY`.
 * Persiste en `.vite-dev-api.json` para no perder mesas entre recargas.
 * En producción o con proxy configurado este plugin no se carga.
 */
import fs from "node:fs"
import path from "node:path"

const STORE_FILE = ".vite-dev-api.json"
const MAX_GUESTS = 400
const MAX_TABLES = 60
const MAX_TASKS = 200

const RSVP_RL_MS = 5_000

function storePath() {
  return path.join(process.cwd(), STORE_FILE)
}

/** @typedef {{ invitations: unknown[], tables: unknown[], tasks: unknown[] }} DevStore */

/** @returns {DevStore} */
function emptyStore() {
  return { invitations: [], tables: [], tasks: [] }
}

/** @type {DevStore} */
let mem = emptyStore()

function loadDisk() {
  const p = storePath()
  try {
    if (!fs.existsSync(p)) {
      mem = emptyStore()
      return
    }
    const raw = fs.readFileSync(p, "utf8")
    const j = JSON.parse(raw)
    mem = {
      invitations: Array.isArray(j.invitations) ? j.invitations : [],
      tables: Array.isArray(j.tables) ? j.tables : [],
      tasks: Array.isArray(j.tasks) ? j.tasks : [],
    }
  } catch {
    mem = emptyStore()
  }
}

/** @type {ReturnType<typeof setTimeout> | null} */
let saveTimer = null
function persistSoon() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    try {
      fs.writeFileSync(storePath(), JSON.stringify(mem), "utf8")
    } catch (e) {
      console.warn("[vite-dev-api] no se pudo guardar:", e?.message || e)
    }
  }, 200)
}

/** @param {import('http').IncomingMessage} req */
function readBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = []
    req.on("data", (c) => chunks.push(c))
    req.on("end", () =>
      resolve(Buffer.concat(chunks).toString("utf8")),
    )
    req.on("error", reject)
  })
}

/** @param {import('http').ServerResponse} res @param {number} code @param {unknown} body */
function sendJson(res, code, body) {
  res.statusCode = code
  res.setHeader("Cache-Control", "no-store")
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(body))
}

/** @type { Map<string, number> } */
const rsvpLastBySlug = new Map()

/** @param {string} url */
function matchApi(url) {
  const base = (url.split("?")[0] || "").replace(/\/+$/, "") || "/"
  if (!base.startsWith("/api")) return null
  const slug = base
  if (
    slug === "/api/guests" ||
    slug === "/api/tables" ||
    slug === "/api/tasks"
  )
    return slug
  if (slug === "/api/rsvp") return slug
  if (slug === "/api/analytics") return slug
  if (slug === "/api/track") return slug
  return null
}

/**
 * RSVP simplificado para dev (misma forma de respuesta que producción).
 * @param {Record<string, unknown>} body
 */
function handleRsvpMerge(body) {
  const MENU_VALUES = new Set(["carne", "pescado", "vegetariano", "infantil", ""])
  const SLUG_RE = /^[A-Za-z0-9_-]{1,220}$/

  const normMenu = (s) => {
    if (s == null || s === "") return ""
    const v = typeof s === "string" ? s.trim().toLowerCase() : ""
    return MENU_VALUES.has(v) ? v : ""
  }
  const normStr = (s, max) =>
    typeof s === "string" ? s.trim().slice(0, max) : ""

  const slug = typeof body.slug === "string" ? body.slug.trim() : ""
  if (!slug || !SLUG_RE.test(slug)) return { ok: false, status: 400, error: "slug" }

  const nowRl = Date.now()
  const prevRl = rsvpLastBySlug.get(slug) ?? 0
  if (nowRl - prevRl < RSVP_RL_MS)
    return { ok: true, status: 200, throttled: true }
  rsvpLastBySlug.set(slug, nowRl)

  const name = normStr(body.name, 500)
  if (!name) return { ok: false, status: 400, error: "name" }

  const plusOne = Boolean(body.plusOne)
  const plusOneName = plusOne ? normStr(body.plusOneName, 200) : ""
  const menu = normMenu(body.menu)
  const plusOneMenu = plusOne ? normMenu(body.plusOneMenu) : ""
  const dietary = normStr(body.dietary, 500)
  const email = normStr(body.email, 120)
  const phone = normStr(body.phone, 40)
  const now = new Date().toISOString()

  const list = /** @type {Record<string, unknown>[]} */ (mem.invitations).slice()

  const idx = list.findIndex(
    (row) => row && typeof row === "object" && String(row.slug) === slug,
  )

  if (idx >= 0) {
    const prev = /** @type {Record<string, unknown>} */ (list[idx])
    const plusOneStored = Boolean(prev.plusOne)
    list[idx] = {
      ...prev,
      name,
      plusOne: plusOneStored ? plusOneStored : plusOne,
      status: "confirmed",
      rsvpReceived: true,
      rsvpAt: now,
      menu,
      plusOneMenu:
        plusOneStored && Boolean(plusOne) ? plusOneMenu : "",
      dietary,
      email: email || String(prev.email || ""),
      phone: phone || String(prev.phone || ""),
      plusOneName:
        plusOneStored && Boolean(plusOne) ? plusOneName : "",
    }
  } else {
    list.push({
      id: `id-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      slug,
      name,
      plusOne,
      plusOneName: plusOne ? plusOneName : "",
      status: "confirmed",
      createdAt: now,
      menu,
      plusOneMenu,
      dietary,
      rsvpReceived: true,
      rsvpAt: now,
      tableId: null,
      email,
      phone,
      seatIndex: null,
      plusOneSeatIndex: null,
    })
  }

  mem.invitations = list.slice(0, MAX_GUESTS)
  persistSoon()
  return { ok: true, status: 200 }
}

export function viteDevApiFallback() {
  let logged = false

  return {
    name: "vite-dev-api-fallback",
    enforce: "pre",
    configureServer(server) {
      loadDisk()
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || req.method == null) return next()

        const hit = matchApi(req.url)
        if (!hit) return next()

        if (!logged) {
          logged = true
          console.info(
            `[vite:dev-api] Sin proxy API: usando CRM local (${path.join(process.cwd(), STORE_FILE)})`,
          )
        }

        try {
          if (hit === "/api/analytics") {
            if (req.method !== "GET") {
              res.statusCode = 405
              return res.end()
            }
            return sendJson(res, 200, {})
          }

          if (hit === "/api/track") {
            if (req.method !== "POST") {
              res.statusCode = 405
              return res.end()
            }
            await readBody(req)
            return sendJson(res, 200, { ok: true })
          }

          if (hit === "/api/guests") {
            if (req.method === "GET")
              return sendJson(res, 200, { invitations: mem.invitations })

            if (req.method === "POST") {
              const rawText = await readBody(req)
              let body = {}
              try {
                body = JSON.parse(rawText || "{}")
              } catch {
                body = {}
              }
              const inv = body.invitations
              if (!Array.isArray(inv))
                return sendJson(res, 400, { ok: false, error: "invitations" })
              mem.invitations = inv.slice(0, MAX_GUESTS)
              persistSoon()
              return sendJson(res, 200, { ok: true })
            }

            res.statusCode = 405
            return res.end()
          }

          if (hit === "/api/tables") {
            if (req.method === "GET")
              return sendJson(res, 200, { tables: mem.tables })

            if (req.method === "POST") {
              const rawText = await readBody(req)
              let body = {}
              try {
                body = JSON.parse(rawText || "{}")
              } catch {
                body = {}
              }
              const tables = body.tables
              if (!Array.isArray(tables))
                return sendJson(res, 400, { ok: false, error: "tables" })
              mem.tables = tables.slice(0, MAX_TABLES)
              persistSoon()
              return sendJson(res, 200, { ok: true })
            }

            res.statusCode = 405
            return res.end()
          }

          if (hit === "/api/tasks") {
            if (req.method === "GET")
              return sendJson(res, 200, { tasks: mem.tasks })

            if (req.method === "POST") {
              const rawText = await readBody(req)
              let body = {}
              try {
                body = JSON.parse(rawText || "{}")
              } catch {
                body = {}
              }
              const tasks = body.tasks
              if (!Array.isArray(tasks))
                return sendJson(res, 400, { ok: false, error: "tasks" })
              mem.tasks = tasks.slice(0, MAX_TASKS)
              persistSoon()
              return sendJson(res, 200, { ok: true })
            }

            res.statusCode = 405
            return res.end()
          }

          if (hit === "/api/rsvp") {
            if (req.method !== "POST") {
              res.statusCode = 405
              return res.end()
            }
            const rawText = await readBody(req)
            let body = {}
            try {
              body = JSON.parse(rawText || "{}")
            } catch {
              body = {}
            }
            const out = handleRsvpMerge(body)
            if (!out.ok)
              return sendJson(res, out.status ?? 400, {
                ok: false,
                error: out.error,
              })
            /** @type {Record<string, unknown>} */
            const payload = { ok: true }
            if (out.throttled) payload.throttled = true
            return sendJson(res, out.status ?? 200, payload)
          }
        } catch (e) {
          console.error("[vite-dev-api]", e)
          return sendJson(res, 500, { ok: false })
        }

        console.warn("[vite-dev-api] ruta /api sin handler:", hit)
        return sendJson(res, 501, { ok: false })
      })
    },
  }
}
