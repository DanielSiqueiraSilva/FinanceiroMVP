-- FinanceiroMVP: notificações persistentes, isoladas por usuário e Realtime.
-- Aplicação: migration name notifications_realtime. Seguro para usuários existentes.
-- Esta migração cria apenas objetos novos e triggers de notificação.
create table if not exists public.notification_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('finance', 'message', 'warning', 'system')),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description) <= 300),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notification_items_user_created_idx
  on public.notification_items(user_id, created_at desc);

alter table public.notification_items enable row level security;
revoke all on table public.notification_items from public, anon, authenticated;
grant select, update(is_read) on table public.notification_items to authenticated;

drop policy if exists notification_items_read_own on public.notification_items;
create policy notification_items_read_own on public.notification_items
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists notification_items_mark_own on public.notification_items;
create policy notification_items_mark_own on public.notification_items
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Função privilegiada só para os triggers; não fica exposta pela API.
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create or replace function app_private.notify_financial_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  notification_title text;
  notification_description text;
begin
  if tg_op = 'DELETE' then
    owner_id := old.user_id;
  else
    owner_id := new.user_id;
  end if;
  if owner_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'lancamentos' then
    if tg_op = 'INSERT' then
      notification_title := 'Lançamento cadastrado';
      notification_description := 'Um novo lançamento foi registrado na sua conta.';
    elsif tg_op = 'UPDATE' then
      notification_title := 'Lançamento atualizado';
      notification_description := 'Um lançamento da sua conta foi atualizado.';
    else
      notification_title := 'Lançamento excluído';
      notification_description := 'Um lançamento foi excluído da sua conta.';
    end if;
  elsif tg_table_name = 'limites_mensais' then
    notification_title := 'Limite mensal atualizado';
    notification_description := 'O limite financeiro de um mês foi salvo.';
  else
    return null;
  end if;

  insert into public.notification_items (user_id, category, title, description)
  values (owner_id, 'finance', notification_title, notification_description);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function app_private.notify_financial_change() from public, anon, authenticated;

drop trigger if exists notification_lancamentos on public.lancamentos;
create trigger notification_lancamentos
after insert or update or delete on public.lancamentos
for each row execute function app_private.notify_financial_change();

drop trigger if exists notification_limites_mensais on public.limites_mensais;
create trigger notification_limites_mensais
after insert or update on public.limites_mensais
for each row execute function app_private.notify_financial_change();

-- Supabase Realtime (Postgres Changes) publica somente a tabela de notificações.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public' and tablename = 'notification_items'
    )
  then
    alter publication supabase_realtime add table public.notification_items;
  end if;
end $$;

comment on table public.notification_items is
  'Histórico de avisos do FinanceiroMVP, com leitura privada por usuário.';
