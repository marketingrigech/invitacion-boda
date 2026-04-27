import { createClient } from "@supabase/supabase-js"

// Mismo proyecto que el almacenamiento de imágenes; la clave anon la obtienes en:
// Supabase → Project Settings → API → Project API keys (anon, public)
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://sobdpvsovjixsvpsfmvr.supabase.co"
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? ""

export const supabase =
  supabaseAnonKey.length > 0 ? createClient(supabaseUrl, supabaseAnonKey) : null

export const isRsvpConfigured = () => Boolean(supabase)
