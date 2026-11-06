-- FinanceiroMVP: lembretes de pagamento e eventos únicos por vencimento.
-- O banco agenda apenas avisos essenciais, por conta, na data escolhida.
create table if not exists public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 2 and 100),
  due_date date not null check (due_date between date '2000-01-01' and date '2100-12-31'),
  amount numeric(12,2) check (amount is null or amount >= 0),
  email_enabled boolean not null default false,
  is_paid boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payment_reminders_user_date_idx
  on public.payment_reminders (user_id, due_date, is_paid);

alter table public.payment_reminders enable row level security;
revoke all on public.payment_reminders from public, anon;
grant select, insert, update, delete on public.payment_reminders to authenticated;

drop policy if exists payment_reminders_select_own on public.payment_reminders;
create policy payment_reminders_select_own on public.payment_reminders
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists payment_reminders_insert_own on public.payment_reminders;
create policy payment_reminders_insert_own on public.payment_reminders
  for insert to authenticated with check (user_id = (select auth.uid()));
drop policy if exists payment_reminders_update_own on public.payment_reminders;
create policy payment_reminders_update_own on public.payment_reminders
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
drop policy if exists payment_reminders_delete_own on public.payment_reminders;
create policy payment_reminders_delete_own on public.payment_reminders
  for delete to authenticated using (user_id = (select auth.uid()));

-- Lote privado: cada lembrete gera no máximo um evento para a data escolhida.
-- O usuário não tem acesso à fila de e-mails (apenas seu histórico normal).
create table if not exists public.payment_reminder_events (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.payment_reminders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  due_date date not null,
  email_status text not null default 'pending'
    check (email_status in ('pending','sending','sent')),
  email_attempts integer not null default 0 check (email_attempts >= 0),
  retry_after timestamptz,
  lease_until timestamptz,
  email_sent_at timestamptz,
  created_at timestamptz not null default now(),
  unique(reminder_id, due_date)
);
create index if not exists payment_events_email_status_idx
  on public.payment_reminder_events(email_status, retry_after, created_at);
alter table public.payment_reminder_events enable row level security;
revoke all on public.payment_reminder_events from public, anon, authenticated;
grant select, update, insert, delete on public.payment_reminder_events to service_role;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

-- A função roda pelo Supabase Cron a cada hora. Após as 09:00 no horário
-- de Brasília, cria uma notificação na central para cada pagamento pendente
-- que vença HOJE, sem duplicá-la nas execuções seguintes.
create or replace function app_private.queue_due_payment_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  total integer := 0;
begin
  if extract(hour from (now() at time zone 'America/Sao_Paulo')) < 9 then
    return 0;
  end if;
  with inserted as (
    insert into public.payment_reminder_events(reminder_id, user_id, due_date)
    select r.id, r.user_id, r.due_date
    from public.payment_reminders r
    where r.is_paid = false
      and r.due_date = (now() at time zone 'America/Sao_Paulo')::date
    on conflict(reminder_id, due_date) do nothing
    returning id, reminder_id, user_id, due_date
  ), notifications as (
    insert into public.notification_items(user_id, category, title, description)
    select i.user_id, 'warning', 'Pagamento vence hoje',
           'Lembrete: ' || left(r.title, 100) || ' vence hoje (' || to_char(i.due_date, 'DD/MM/YYYY') || ').'
    from inserted i
    join public.payment_reminders r on r.id = i.reminder_id
    returning id
  )
  select count(*) into total from notifications;
  return total;
end;
$$;
revoke all on function app_private.queue_due_payment_reminders() from public, anon, authenticated;

-- Somente o serviço interno pode buscar e concluir envios de e-mail.
-- A consulta revalida que a conta ainda está pendente, que a data continua
-- igual e que o usuário autorizou o e-mail.
create or replace function public.claim_payment_reminder_emails(p_batch integer default 15)
returns table(event_id uuid, title text, due_date date, recipient text)
language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;
  return query
  with candidates as (
    select e.id
    from public.payment_reminder_events e
    join public.payment_reminders r on r.id=e.reminder_id
    join auth.users u on u.id=e.user_id
    where e.email_status in ('pending','sending')
      and (e.email_status='pending' or e.lease_until < now())
      and (e.retry_after is null or e.retry_after <= now())
      and e.email_attempts < 4
      and r.due_date=e.due_date and not r.is_paid and r.email_enabled
      and u.email is not null and u.email_confirmed_at is not null
    order by e.created_at, e.id
    for update of e skip locked
    limit greatest(1,least(coalesce(p_batch,15),25))
  ), claimed as (
    update public.payment_reminder_events e
    set email_status='sending', lease_until=now()+interval '7 minutes',
        email_attempts=email_attempts+1
    where e.id in (select c.id from candidates c)
    returning e.id,e.reminder_id,e.user_id,e.due_date
  )
  select c.id, r.title, c.due_date, u.email::text
  from claimed c
  join public.payment_reminders r on r.id=c.reminder_id
  join auth.users u on u.id=c.user_id;
end;
$$;
revoke all on function public.claim_payment_reminder_emails(integer) from public, anon, authenticated;
grant execute on function public.claim_payment_reminder_emails(integer) to service_role;

create or replace function public.finalize_payment_reminder_email(
  p_event_id uuid, p_success boolean
) returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    raise exception 'forbidden';
  end if;
  update public.payment_reminder_events e
  set email_status = case when p_success then 'sent' else 'pending' end,
      email_sent_at = case when p_success then now() else email_sent_at end,
      lease_until = null,
      retry_after = case when p_success then null else now() + interval '90 minutes' end
  where e.id=p_event_id and e.email_status='sending';
end;
$$;
revoke all on function public.finalize_payment_reminder_email(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalize_payment_reminder_email(uuid, boolean) to service_role;

-- Chave aleatória só no Vault, nunca exposta ao cliente web.
-- A Edge Function valida o header fornecido pelo cron via RPC service_role.
create extension if not exists supabase_vault with schema vault;
do $$
begin
  if not exists(select 1 from vault.secrets where name='finanmvp_reminder_scheduler') then
    perform vault.create_secret(encode(gen_random_bytes(32),'hex'), 'finanmvp_reminder_scheduler');
  end if;
end $$;

create or replace function public.verify_payment_reminder_scheduler(p_secret text)
returns boolean
language plpgsql security definer set search_path = ''
as $$
begin
  if current_setting('request.jwt.claim.role', true) is distinct from 'service_role' then
    return false;
  end if;
  return p_secret is not null and length(p_secret)=64 and exists(
    select 1 from vault.decrypted_secrets
    where name='finanmvp_reminder_scheduler' and decrypted_secret=p_secret
  );
end;
$$;
revoke all on function public.verify_payment_reminder_scheduler(text) from public, anon, authenticated;
grant execute on function public.verify_payment_reminder_scheduler(text) to service_role;

-- Cron precisa de apenas um job; a função é idempotente.
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule(
  'finanmvp-pagamentos-vencendo',
  '0 * * * *',
  $cron$select app_private.queue_due_payment_reminders();$cron$
);
