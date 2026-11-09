-- FinanceiroMVP financial flow v2: separate expenses, account movements and card settlements.
-- Non-destructive: current records, summaries and user wallets remain intact.
alter table public.lancamentos
  add constraint finance_card_only_expense check (card_id is null or tipo = 'despesa');
alter table public.finance_recurring_rules
  add constraint finance_recurring_card_only_expense check (card_id is null or kind = 'despesa');

create table public.finance_account_transfers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  from_account_id uuid not null,
  to_account_id uuid not null,
  amount numeric(14,2) not null check (amount > 0 and amount <= 999999999999),
  transfer_date date not null default current_date check (transfer_date between date '2000-01-01' and date '2100-12-31'),
  created_at timestamptz not null default now(),
  check (from_account_id <> to_account_id),
  foreign key (user_id, from_account_id) references public.finance_accounts(user_id,id),
  foreign key (user_id, to_account_id) references public.finance_accounts(user_id,id)
);
create index finance_transfers_user_date on public.finance_account_transfers(user_id,transfer_date desc);

create table public.finance_card_payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  card_id uuid not null,
  account_id uuid not null,
  amount numeric(14,2) not null check (amount > 0 and amount <= 999999999999),
  paid_on date not null default current_date check (paid_on between date '2000-01-01' and date '2100-12-31'),
  created_at timestamptz not null default now(),
  foreign key (user_id, card_id) references public.finance_cards(user_id,id),
  foreign key (user_id, account_id) references public.finance_accounts(user_id,id)
);
create index finance_card_payments_user_date on public.finance_card_payments(user_id,paid_on desc);

alter table public.finance_account_transfers enable row level security;
alter table public.finance_card_payments enable row level security;
revoke all on public.finance_account_transfers,public.finance_card_payments from public,anon;
grant select,insert,delete on public.finance_account_transfers,public.finance_card_payments to authenticated;
create policy finance_transfers_select on public.finance_account_transfers for select to authenticated using (user_id = (select auth.uid()));
create policy finance_transfers_insert on public.finance_account_transfers for insert to authenticated with check (user_id = (select auth.uid()));
create policy finance_transfers_delete on public.finance_account_transfers for delete to authenticated using (user_id = (select auth.uid()));
create policy finance_card_payments_select on public.finance_card_payments for select to authenticated using (user_id = (select auth.uid()));
create policy finance_card_payments_insert on public.finance_card_payments for insert to authenticated with check (user_id = (select auth.uid()));
create policy finance_card_payments_delete on public.finance_card_payments for delete to authenticated using (user_id = (select auth.uid()));

-- Account balance: account opening reference + all recorded linked income/expense,
-- plus transfers, minus card payments. Card purchases do not reduce bank cash twice.
create function public.finance_account_overview()
returns table (
  account_id uuid, income_total numeric, expense_total numeric,
  transfer_in numeric, transfer_out numeric, card_paid numeric,
  estimated_balance numeric
)
language sql stable security invoker set search_path = ''
as $$
 select a.id,
  coalesce(t.income,0),coalesce(t.expense,0),
  coalesce(incoming.amount,0),coalesce(outgoing.amount,0),coalesce(payments.amount,0),
  (a.opening_balance + coalesce(t.income,0) - coalesce(t.expense,0)
    + coalesce(incoming.amount,0) - coalesce(outgoing.amount,0) - coalesce(payments.amount,0))::numeric
 from public.finance_accounts a
 left join lateral (
   select sum(case when l.tipo='receita' then l.valor else 0 end) as income,
          sum(case when l.tipo='despesa' then l.valor else 0 end) as expense
   from public.lancamentos l where l.user_id = a.user_id and l.account_id = a.id
 ) t on true
 left join lateral (
   select sum(x.amount) as amount from public.finance_account_transfers x
   where x.user_id = a.user_id and x.to_account_id = a.id
 ) incoming on true
 left join lateral (
   select sum(x.amount) as amount from public.finance_account_transfers x
   where x.user_id = a.user_id and x.from_account_id = a.id
 ) outgoing on true
 left join lateral (
   select sum(x.amount) as amount from public.finance_card_payments x
   where x.user_id = a.user_id and x.account_id = a.id
 ) payments on true
 where a.user_id = (select auth.uid())
$$;

-- Card balance covers recorded purchases not yet marked as paid in this app.
-- It is NOT an official bank invoice or a bank-synced available credit limit.
create function public.finance_card_overview()
returns table (card_id uuid, purchases_total numeric, payments_total numeric, unpaid_total numeric)
language sql stable security invoker set search_path = ''
as $$
 select c.id, coalesce(p.amount,0)::numeric, coalesce(pay.amount,0)::numeric,
 greatest(0,coalesce(p.amount,0) - coalesce(pay.amount,0))::numeric
 from public.finance_cards c
 left join lateral (
   select sum(l.valor) as amount from public.lancamentos l
   where l.user_id = c.user_id and l.card_id = c.id and l.tipo = 'despesa'
 ) p on true
 left join lateral (
   select sum(x.amount) as amount from public.finance_card_payments x
   where x.user_id = c.user_id and x.card_id = c.id
 ) pay on true
 where c.user_id = (select auth.uid())
$$;

create function public.finance_record_transfer(
  p_from uuid,p_to uuid,p_amount numeric,p_date date default current_date
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
 if v_user is null then raise exception 'Login necessário' using errcode='42501'; end if;
 if p_from is null or p_to is null or p_from=p_to or p_amount is null
   or p_amount <= 0 or p_amount > 999999999999 or p_date is null
   or p_date < date '2000-01-01' or p_date > current_date then
   raise exception 'Dados inválidos para transferência' using errcode='22023';
 end if;
 if (select count(*) from public.finance_accounts where user_id=v_user and id in (p_from,p_to) and active)=2 then
  insert into public.finance_account_transfers(user_id,from_account_id,to_account_id,amount,transfer_date)
   values(v_user,p_from,p_to,p_amount,p_date) returning id into v_id;
 else
  raise exception 'Contas ativas não encontradas' using errcode='22023';
 end if;
 return v_id;
end $$;

create function public.finance_record_card_payment(
 p_card uuid,p_account uuid,p_amount numeric,p_date date default current_date
) returns uuid
language plpgsql security invoker set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_id uuid; v_purchases numeric; v_paid numeric;
begin
 if v_user is null then raise exception 'Login necessário' using errcode='42501'; end if;
 if p_card is null or p_account is null or p_amount is null or p_amount <= 0
   or p_amount > 999999999999 or p_date is null or p_date < date '2000-01-01'
   or p_date > current_date then
   raise exception 'Dados inválidos para pagamento' using errcode='22023';
 end if;
 if not exists(select 1 from public.finance_accounts where user_id=v_user and id=p_account and active)
   or not exists(select 1 from public.finance_cards where user_id=v_user and id=p_card and active) then
  raise exception 'Conta ou cartão não encontrado' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('card_payment:'||v_user::text||':'||p_card::text,0));
 select coalesce(sum(valor),0) into v_purchases from public.lancamentos
   where user_id=v_user and card_id=p_card and tipo='despesa';
 select coalesce(sum(amount),0) into v_paid from public.finance_card_payments
   where user_id=v_user and card_id=p_card;
 if p_amount > greatest(0,v_purchases-v_paid) then
  raise exception 'Pagamento maior que compras pendentes registradas' using errcode='22023';
 end if;
 insert into public.finance_card_payments(user_id,card_id,account_id,amount,paid_on)
   values(v_user,p_card,p_account,p_amount,p_date) returning id into v_id;
 return v_id;
end $$;

-- Explicitly post a forecast before its due date on user request.
-- Same idempotency key and advisory lock as finance_apply_recurring.
create function public.finance_confirm_recurring(p_rule uuid,p_month date)
returns boolean
language plpgsql security invoker set search_path = ''
as $$
declare v_user uuid := auth.uid(); v_month date := date_trunc('month',p_month)::date;
  v_start date := date_trunc('month',current_date)::date; v_rule public.finance_recurring_rules%rowtype;
  v_day integer; v_tx uuid;
begin
 if v_user is null then raise exception 'Login necessário' using errcode='42501'; end if;
 if p_rule is null or p_month is null or v_month > v_start
   or v_month < (v_start - interval '12 months')::date then
  raise exception 'Período inválido' using errcode='22023';
 end if;
 select * into v_rule from public.finance_recurring_rules
 where id=p_rule and user_id=v_user and active and start_month <= v_month
   and (end_month is null or end_month >= v_month);
 if not found then raise exception 'Recorrência ativa não encontrada' using errcode='22023'; end if;
 perform pg_catalog.pg_advisory_xact_lock(
   pg_catalog.hashtextextended(v_user::text||':'||p_rule::text||':'||v_month::text,0));
 if exists (select 1 from public.finance_recurring_posts
   where user_id=v_user and rule_id=p_rule and month_start=v_month) then
  return false;
 end if;
 v_day := least(v_rule.day_of_month,
   extract(day from (v_month + interval '1 month - 1 day'))::integer);
 insert into public.lancamentos(user_id,tipo,descricao,categoria,valor,data,account_id,card_id)
  values(v_user,v_rule.kind,v_rule.description,v_rule.category,v_rule.amount,
   v_month + (v_day-1),v_rule.account_id,v_rule.card_id) returning id into v_tx;
 insert into public.finance_recurring_posts(user_id,rule_id,month_start,transaction_id)
  values(v_user,v_rule.id,v_month,v_tx);
 return true;
end $$;

revoke all on function public.finance_account_overview(),public.finance_card_overview(),
  public.finance_record_transfer(uuid,uuid,numeric,date),
  public.finance_record_card_payment(uuid,uuid,numeric,date),
  public.finance_confirm_recurring(uuid,date) from public, anon;
grant execute on function public.finance_account_overview(),public.finance_card_overview(),
  public.finance_record_transfer(uuid,uuid,numeric,date),
  public.finance_record_card_payment(uuid,uuid,numeric,date),
  public.finance_confirm_recurring(uuid,date) to authenticated;
