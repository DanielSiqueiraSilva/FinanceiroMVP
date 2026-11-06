-- Carteiras compartilhadas: agregados auditáveis e notificações sem duplicatas.
-- Aplique depois de shared_wallets_v1.sql e shared_wallets_v1_1.sql.
create or replace function public.shared_wallet_totals(p_wallet uuid)
returns table(total_receitas numeric, total_despesas numeric, saldo numeric, quantidade bigint)
language sql stable security definer set search_path = ''
as $$
  select coalesce(sum(t.amount) filter(where t.type='receita'),0),
         coalesce(sum(t.amount) filter(where t.type='despesa'),0),
         coalesce(sum(case when t.type='receita' then t.amount else -t.amount end),0),
         count(t.id)
  from public.shared_wallet_transactions t
  where t.wallet_id=p_wallet
    and app_private.wallet_is_member(p_wallet,(select auth.uid()))
$$;
revoke all on function public.shared_wallet_totals(uuid) from public,anon;
grant execute on function public.shared_wallet_totals(uuid) to authenticated;

-- Não gerar notificação de confirmação para quem executou a ação.
create or replace function app_private.shared_notification_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare person record; wallet_name text; actor uuid; target_wallet uuid;
begin
  if tg_table_name='shared_wallet_invitations' then
    if tg_op='INSERT' or (tg_op='UPDATE' and new.status='pending') then
      select name into wallet_name from public.shared_wallets where id=new.wallet_id;
      perform app_private.shared_notify(new.invited_user_id,'system','Convite para carteira',
        'Você recebeu um convite para participar de '||coalesce(wallet_name,'uma carteira')||'.');
    elsif tg_op='UPDATE' and new.status is distinct from old.status and new.status in ('accepted','declined') then
      perform app_private.shared_notify(new.invited_by,'system',
        case when new.status='accepted' then 'Convite aceito' else 'Convite recusado' end,
        'Uma pessoa respondeu ao convite de carteira compartilhada.');
    end if;
  elsif tg_table_name='shared_wallet_members' then
    if tg_op='DELETE' then
      if not exists(select 1 from public.shared_wallets where id=old.wallet_id) then return old; end if;
      if old.user_id is distinct from auth.uid() then
        perform app_private.shared_notify(old.user_id,'warning','Acesso à carteira encerrado',
          'Você saiu ou foi removido de uma carteira compartilhada.');
      end if;
      for person in select user_id from public.shared_wallet_members
        where wallet_id=old.wallet_id and user_id<>old.user_id
          and user_id is distinct from auth.uid() loop
        perform app_private.shared_notify(person.user_id,'system','Participante removido',
          'Um participante saiu ou foi removido da carteira.');
      end loop;
    elsif tg_op='INSERT' and new.role='member' then
      for person in select user_id from public.shared_wallet_members
        where wallet_id=new.wallet_id and user_id<>new.user_id
          and user_id<>(select owner_id from public.shared_wallets where id=new.wallet_id)
          and user_id is distinct from auth.uid() loop
        perform app_private.shared_notify(person.user_id,'system','Novo participante',
          'Uma pessoa ingressou na carteira compartilhada.');
      end loop;
    end if;
  elsif tg_table_name='shared_wallet_transactions' then
    target_wallet := case when tg_op='DELETE' then old.wallet_id else new.wallet_id end;
    actor := case when tg_op='DELETE' then auth.uid() else coalesce(new.updated_by,new.created_by) end;
    select name into wallet_name from public.shared_wallets where id=target_wallet;
    if wallet_name is null then
      if tg_op='DELETE' then return old; end if;
      return new;
    end if;
    for person in select user_id from public.shared_wallet_members
      where wallet_id=target_wallet and user_id is distinct from actor loop
      perform app_private.shared_notify(person.user_id,'finance','Movimentação compartilhada',
        'Um lançamento foi '||case when tg_op='INSERT' then 'adicionado' when tg_op='UPDATE' then 'alterado'
          else 'excluído' end||' em '||wallet_name||'.');
    end loop;
  elsif tg_table_name='shared_wallet_messages' then
    select name into wallet_name from public.shared_wallets where id=new.wallet_id;
    for person in select user_id from public.shared_wallet_members
      where wallet_id=new.wallet_id and user_id is distinct from new.sender_id loop
      perform app_private.shared_notify(person.user_id,'message','Nova mensagem em carteira',
        'Nova mensagem em '||coalesce(wallet_name,'uma carteira compartilhada')||'.');
    end loop;
  elsif tg_table_name='shared_wallets' and tg_op='DELETE' then
    if exists(select 1 from auth.users where id=old.owner_id) then
      for person in select user_id from public.shared_wallet_members
        where wallet_id=old.id and user_id<>old.owner_id loop
        perform app_private.shared_notify(person.user_id,'warning','Carteira encerrada',
          'A carteira '||old.name||' foi encerrada pelo proprietário.');
      end loop;
    end if;
    return old;
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function app_private.shared_notification_trigger() from public,anon,authenticated;
