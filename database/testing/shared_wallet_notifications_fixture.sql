-- SOMENTE AMBIENTE DE TESTE FinanApp-TESTE.
-- Esse ambiente difere da produção e ainda não possui a central de notificações.
-- Adiciona uma tabela compatível para executar testes integrais das carteiras.
-- Não aplicar na produção: lá notification_items já existe.
create table if not exists public.notification_items(
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null check (category in ('finance','message','warning','system')),
  title text not null check (char_length(title) between 1 and 120),
  description text not null default '' check (char_length(description)<=300),
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.notification_items enable row level security;
revoke all on public.notification_items from public,anon,authenticated;
grant select, update(is_read) on public.notification_items to authenticated;
create policy shared_test_notification_read on public.notification_items
  for select to authenticated using (user_id=(select auth.uid()));
create policy shared_test_notification_update on public.notification_items
  for update to authenticated using (user_id=(select auth.uid()))
  with check (user_id=(select auth.uid()));
create index if not exists shared_test_notification_recent_idx
  on public.notification_items(user_id,created_at desc);
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime')
     and not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
       and schemaname='public' and tablename='notification_items')
  then alter publication supabase_realtime add table public.notification_items; end if;
end $$;
