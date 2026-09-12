create extension if not exists pgcrypto;

create table if not exists public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  descricao text not null check (char_length(trim(descricao)) > 0),
  categoria text not null check (char_length(trim(categoria)) > 0),
  valor numeric(12,2) not null check (valor > 0),
  data date not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_lancamentos_data
  on public.lancamentos (data desc);

create index if not exists idx_lancamentos_tipo
  on public.lancamentos (tipo);

alter table public.lancamentos enable row level security;

-- O aplicativo móvel NÃO acessa esta tabela diretamente.
-- O backend da Vercel usa uma chave secreta do Supabase.
revoke all on table public.lancamentos from anon, authenticated;
grant select, insert, update, delete on table public.lancamentos to service_role;
