-- FinanceiroMVP | Finance planning v1. All information is private per authenticated user.
-- Non-destructive and backwards-compatible: existing finance API continues to work.
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 70),
  kind text not null default 'bank' check (kind in ('bank','cash','investment')),
  opening_balance numeric(14,2) not null default 0 check (abs(opening_balance) <= 999999999999),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id,id)
);
create table if not exists public.finance_cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 70),
  credit_limit numeric(14,2) not null default 0 check (credit_limit >= 0),
  closing_day integer not null default 1 check (closing_day between 1 and 28),
  due_day integer not null default 10 check (due_day between 1 and 28),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (user_id,id)
);
create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 90),
  target_amount numeric(14,2) not null check (target_amount > 0),
  saved_initial numeric(14,2) not null default 0 check (saved_initial >= 0),
  active boolean not null default true,
  target_date date,
  created_at timestamptz not null default now(),
  unique (user_id,id)
);
create table if not exists public.finance_goal_contributions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal_id uuid not null,
  amount numeric(14,2) not null check (amount > 0),
  note text not null default '' check (char_length(note) <= 140),
  recorded_at date not null default current_date,
  created_at timestamptz not null default now(),
  foreign key (user_id,goal_id) references public.finance_goals(user_id,id) on delete cascade
);
create index if not exists finance_goal_contributions_owner_idx on public.finance_goal_contributions(user_id,goal_id,recorded_at);
create table if not exists public.finance_budgets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  year integer not null check (year between 2000 and 2100),
  month integer not null check (month between 1 and 12),
  category text not null check (char_length(btrim(category)) between 1 and 70),
  amount numeric(14,2) not null check (amount > 0),
  created_at timestamptz not null default now(),
  unique(user_id,year,month,category)
);
create table if not exists public.finance_recurring_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(btrim(description)) between 2 and 120),
  category text not null check (char_length(btrim(category)) between 1 and 70),
  kind text not null check (kind in ('receita','despesa')),
  amount numeric(14,2) not null check (amount > 0),
  day_of_month integer not null check (day_of_month between 1 and 31),
  start_month date not null check (extract(day from start_month) = 1),
  end_month date check (end_month is null or (extract(day from end_month) = 1 and end_month >= start_month)),
  active boolean not null default true,
  account_id uuid,
  card_id uuid,
  created_at timestamptz not null default now(),
  check (account_id is null or card_id is null),
  unique(user_id,id),
  foreign key(user_id,account_id) references public.finance_accounts(user_id,id),
  foreign key(user_id,card_id) references public.finance_cards(user_id,id)
);
-- Additional fields are nullable to avoid breaking the existing finance API and records.
alter table public.lancamentos add column if not exists account_id uuid;
alter table public.lancamentos add column if not exists card_id uuid;
do $$ begin
  if not exists (select 1 from pg_constraint where conname='lancamentos_owner_id_unique') then
    alter table public.lancamentos add constraint lancamentos_owner_id_unique unique (user_id,id);
  end if;
  if not exists (select 1 from pg_constraint where conname='lancamentos_account_user_fk') then
    alter table public.lancamentos add constraint lancamentos_account_user_fk
      foreign key(user_id,account_id) references public.finance_accounts(user_id,id);
  end if;
  if not exists (select 1 from pg_constraint where conname='lancamentos_card_user_fk') then
    alter table public.lancamentos add constraint lancamentos_card_user_fk
      foreign key(user_id,card_id) references public.finance_cards(user_id,id);
  end if;
  if not exists (select 1 from pg_constraint where conname='lancamentos_one_payment_source') then
    alter table public.lancamentos add constraint lancamentos_one_payment_source
      check (account_id is null or card_id is null);
  end if;
end $$;
create table if not exists public.finance_recurring_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  rule_id uuid not null,
  month_start date not null check (extract(day from month_start) = 1),
  transaction_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id,rule_id,month_start),
  foreign key(user_id,rule_id) references public.finance_recurring_rules(user_id,id),
  foreign key(user_id,transaction_id) references public.lancamentos(user_id,id) on delete cascade
);
create index if not exists finance_recurring_posts_owner_month on public.finance_recurring_posts(user_id,month_start);

alter table public.finance_accounts enable row level security;
alter table public.finance_cards enable row level security;
alter table public.finance_goals enable row level security;
alter table public.finance_goal_contributions enable row level security;
alter table public.finance_budgets enable row level security;
alter table public.finance_recurring_rules enable row level security;
alter table public.finance_recurring_posts enable row level security;

-- Ownership does not rely on user_metadata; never allow user_id reassignment.
do $$
declare t text;
begin
  foreach t in array array[
    'finance_accounts','finance_cards','finance_goals','finance_goal_contributions',
    'finance_budgets','finance_recurring_rules','finance_recurring_posts'
  ] loop
    execute format('grant select, insert, update on table public.%I to authenticated',t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',t||'_read',t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',t||'_insert',t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',t||'_update',t);
  end loop;
end $$;
-- People can delete accidental goal contributions; the rest is archived/disabled rather than deleted.
grant delete on public.finance_goal_contributions to authenticated;
create policy finance_goal_contributions_delete on public.finance_goal_contributions
  for delete to authenticated using (user_id = (select auth.uid()));

-- The existing API uses a service credential. Restricted direct access is added
-- only for the user's own records, for linking transactions and recurring bookkeeping.
grant select, insert, update on public.lancamentos to authenticated;
create policy finance_planner_read_own on public.lancamentos
  for select to authenticated using (user_id = (select auth.uid()));
create policy finance_planner_insert_own on public.lancamentos
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy finance_planner_update_own on public.lancamentos
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- SECURITY INVOKER respects all RLS and GRANT rules. Idempotent per rule & month.
-- This creates bookkeeping entries only; it never charges a bank or credit card.
create or replace function public.finance_apply_recurring(p_month date default current_date)
returns integer
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_month date := date_trunc('month', p_month)::date;
  v_start date := date_trunc('month', current_date)::date;
  v_rule record;
  v_tx uuid;
  v_day integer;
  v_count integer := 0;
begin
  if v_user is null then
    raise exception 'Login necessário.' using errcode = '42501';
  end if;
  if p_month is null or v_month < (v_start - interval '12 months')::date
    or v_month > v_start then
    raise exception 'Escolha um mês válido, até o mês atual.' using errcode = '22023';
  end if;
  for v_rule in
    select * from public.finance_recurring_rules
    where user_id = v_user and active
      and start_month <= v_month
      and (end_month is null or end_month >= v_month)
  loop
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(v_user::text || ':' || v_rule.id::text || ':' || v_month::text, 0)
    );
    if exists (
      select 1 from public.finance_recurring_posts
      where user_id = v_user and rule_id = v_rule.id and month_start = v_month
    ) then
      continue;
    end if;
    v_day := least(
      v_rule.day_of_month,
      extract(day from (v_month + interval '1 month - 1 day'))::integer
    );
    insert into public.lancamentos (
      user_id,tipo,descricao,categoria,valor,data,account_id,card_id
    ) values (
      v_user,v_rule.kind,v_rule.description,v_rule.category,v_rule.amount,
      v_month + (v_day - 1),v_rule.account_id,v_rule.card_id
    ) returning id into v_tx;
    insert into public.finance_recurring_posts(user_id,rule_id,month_start,transaction_id)
    values(v_user,v_rule.id,v_month,v_tx);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$function$;
revoke all on function public.finance_apply_recurring(date) from public, anon;
grant execute on function public.finance_apply_recurring(date) to authenticated;
