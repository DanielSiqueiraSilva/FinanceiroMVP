-- Extra defense in depth for newly exposed planning tables.
do $$
declare t text;
begin
  foreach t in array array[
    'finance_accounts','finance_cards','finance_goals','finance_goal_contributions',
    'finance_budgets','finance_recurring_rules','finance_recurring_posts'
  ] loop
    execute format('revoke all on public.%I from anon, public', t);
  end loop;
end $$;

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
    -- For the current month, never turn an upcoming bill into a booked expense.
    if v_month = v_start and v_month + (v_day - 1) > current_date then
      continue;
    end if;
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
