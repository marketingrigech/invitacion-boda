import { kv } from "@vercel/kv"

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store")
  if (req.method !== "GET") {
    res.status(405).end()
    return
  }

  try {
    const result = {}
    for await (const key of kv.scanIterator({ match: "inv:*" })) {
      if (typeof key !== "string" || !key.startsWith("inv:")) continue
      const slug = key.slice(4)
      const data = (await kv.hgetall(key)) ?? {}
      result[slug] = data
    }
    res.status(200).json(result)
  } catch (e) {
    console.error("[analytics]", e)
    res.status(500).json({})
  }
}
