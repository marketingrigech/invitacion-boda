import { kv } from "@vercel/kv"

/** Misma constante que en guests.js / rsvp.js */
export const WEDDING_INVITATIONS_KV_KEY = "crm:wedding_invitations"

/**
 * Upstash aplica JSON.parse sobre el resultado de EVAL cuando es un blob JSON válido.
 * Debemos reconstruir un string estable para CAS o la comparación con Redis nunca coincide.
 * @param {unknown} val
 */
function invitationBlobEvalToComparableRaw(val) {
  if (val == null) return ""
  if (typeof val === "string") return val
  if (typeof val === "number" || typeof val === "boolean") return String(val)
  try {
    return JSON.stringify(val)
  } catch {
    return ""
  }
}

const READ_INVITATIONS_RAW = `
local v = redis.call('GET', KEYS[1])
if v == false then return '' end
return v`

const CAS_SET_INVITATIONS = `
local cur = redis.call('GET', KEYS[1])
if cur == false then cur = '' end
if cur ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
return 1`

/** Lista de invitados + confirms en Redis en una sola operación Lua. */
const CAS_RSVP_AND_ANALYTICS = `
local cur = redis.call('GET', KEYS[1])
if cur == false then cur = '' end
if cur ~= ARGV[1] then return 0 end
redis.call('SET', KEYS[1], ARGV[2])
local inv_key = 'inv:' .. ARGV[3]
redis.call('HINCRBY', inv_key, 'confirms', 1)
redis.call('HSET', inv_key, 'last_confirm', ARGV[4])
return 1`

/**
 * @param {typeof kv} store
 */
export async function kvGetInvitationBlobRaw(store, key = WEDDING_INVITATIONS_KV_KEY) {
  /** @type {unknown} */
  const r = await store.eval(READ_INVITATIONS_RAW, [key], [])
  return invitationBlobEvalToComparableRaw(r)
}

/**
 * @param {typeof kv} store
 * @returns {Promise<boolean>}
 */
export async function kvCasSetInvitationBlob(store, key, expectedRaw, nextRaw) {
  /** @type {unknown} */
  const v = await store.eval(CAS_SET_INVITATIONS, [key], [expectedRaw, nextRaw])
  return v === 1 || v === "1" || Number(v) === 1
}

/**
 * @param {typeof kv} store
 */
export async function kvCasApplyRsvpWithAnalytics(
  store,
  key,
  expectedRaw,
  nextInvitationsJson,
  slugSlug,
  confirmIso,
) {
  /** @type {unknown} */
  const v = await store.eval(CAS_RSVP_AND_ANALYTICS, [key], [
    expectedRaw,
    nextInvitationsJson,
    slugSlug,
    confirmIso,
  ])
  return v === 1 || v === "1" || Number(v) === 1
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function jitterSleep() {
  await sleep(8 + Math.floor(Math.random() * 55))
}

/**
 * CAS con backoff ligero.
 * @template T
 * @param {(expectedRaw: string) => Promise<{ ok: true, value: T } | { ok: false, retry: boolean }>} tryCommit
 */
export async function withInvitationCAS(tryCommit) {
  /** @type {unknown} */
  let lastConflict = undefined
  for (let attempt = 0; attempt < 26; attempt++) {
    const expectedRaw = await kvGetInvitationBlobRaw(kv)
    const outcome = await tryCommit(expectedRaw)
    if (outcome.ok) return outcome.value
    if (!outcome.retry) {
      /** @type {any} */
      const o = outcome
      throw Object.assign(new Error("invitation_kv_logical"), {
        detail: o.detail ?? o.error,
      })
    }
    lastConflict = true
    await jitterSleep()
  }
  throw Object.assign(new Error("invitation_kv_exhausted"), {
    detail: lastConflict ? "cas_conflict" : "unknown",
  })
}
