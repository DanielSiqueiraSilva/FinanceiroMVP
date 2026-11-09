-- Early confirmation books a transaction today, rather than recording a future-dated cash movement.
create or replace function public.finance_confirm_recurring(p_rule uuid,p_month date)
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
   least(v_month + (v_day-1),current_date),v_rule.account_id,v_rule.card_id) returning id into v_tx;
 insert into public.finance_recurring_posts(user_id,rule_id,month_start,transaction_id)
  values(v_user,v_rule.id,v_month,v_tx);
 return true;
end $$;

revoke all on function public.finance_confirm_recurring(uuid,date) from public, anon;
grant execute on function public.finance_confirm_recurring(uuid,date) to authenticated;
