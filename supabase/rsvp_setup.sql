-- Ejecuta esto en Supabase: SQL Editor → New query → Run
-- Crea la tabla de confirmaciones y permite inserción pública (solo insert, con anon key).

create table if not exists public.rsvp (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  full_name text not null,
  email text not null,
  plus_one boolean not null default false
);

create index if not exists rsvp_created_at_idx on public.rsvp (created_at desc);

alter table public.rsvp enable row level security;

-- Solo inserción anónima (la web no lee filas; los ves en Table Editor o exportando)
drop policy if exists "Permitir inserción pública de RSVP" on public.rsvp;
create policy "Permitir inserción pública de RSVP"
  on public.rsvp
  for insert
  to anon
  with check (true);

-- Opcional: bloquear lectura pública (por defecto sin policy no hay select para anon)
-- Si quisieras que anon no lea, no crees policy de select.
