create table if not exists public.limites_mensais (
  id uuid primary key default gen_random_uuid(),
  mes integer not null check (mes between 1 and 12),
  ano integer not null check (ano between 2000 and 2100),
  valor numeric(12,2) not null default 0 check (valor >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (mes, ano)
);

alter table public.limites_mensais enable row level security;
revoke all on table public.limites_mensais from anon, authenticated;
grant select, insert, update, delete on table public.limites_mensais to service_role;
