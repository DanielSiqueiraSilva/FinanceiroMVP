-- Migration complementar: funções de consulta privada, revogação e correções de reinvite.
-- A migração inicial deve ter sido aplicada antes. Somente no banco de TESTE neste PR.

create or replace function public.shared_wallet_inbox()
returns table(
  id uuid, wallet_id uuid, wallet_name text, invited_by_name text,
  status text, created_at timestamptz, expires_at timestamptz
)
language sql stable security definer set search_path = ''
as $$
  select i.id,i.wallet_id,w.name,
    coalesce(app_private.wallet_display_name(i.invited_by),'Participante'),
    i.status,i.created_at,i.expires_at
  from public.shared_wallet_invitations i
  join public.shared_wallets w on w.id=i.wallet_id
  where i.invited_user_id=(select auth.uid()) and i.status='pending'
  and i.expires_at>now()
  order by i.created_at desc limit 100
$$;
revoke all on function public.shared_wallet_inbox() from public, anon;
grant execute on function public.shared_wallet_inbox() to authenticated;

create or replace function public.shared_wallet_unread_counts()
returns table(wallet_id uuid, unread bigint)
language sql stable security definer set search_path = ''
as $$
  select m.wallet_id,
         (select count(*) from public.shared_wallet_messages msg
          where msg.wallet_id=m.wallet_id
            and msg.sender_id is distinct from auth.uid()
            and msg.created_at>coalesce(rd.last_read_at,'2000-01-01'::timestamptz)) as unread
  from public.shared_wallet_members m
  left join public.shared_wallet_message_reads rd
    on rd.wallet_id=m.wallet_id and rd.user_id=m.user_id
  where m.user_id=(select auth.uid())
$$;
revoke all on function public.shared_wallet_unread_counts() from public, anon;
grant execute on function public.shared_wallet_unread_counts() to authenticated;

-- Revisão do convite: permitir convidar novamente ex-participantes que
-- aceitaram no passado e depois saíram, sem permitir spam de convites.
create or replace function public.shared_wallet_invite(p_wallet uuid,p_email text)
returns public.shared_wallet_invitations
language plpgsql security definer set search_path = ''
as $$
declare
  recipient uuid;
  result public.shared_wallet_invitations;
begin
  if not app_private.wallet_is_owner(p_wallet,auth.uid()) then
    raise exception 'Somente o proprietário pode convidar' using errcode='42501'; end if;
  if p_email is null or char_length(btrim(p_email)) not between 3 and 254
     or p_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'E-mail inválido' using errcode='22023'; end if;
  -- Serializa convites à mesma carteira e aceitações de forma segura.
  perform 1 from public.shared_wallets where id=p_wallet for update;
  if (select count(*) from public.shared_wallet_invitations i
      join public.shared_wallets w on w.id=i.wallet_id
      where w.owner_id=auth.uid() and i.updated_at>now()-interval '1 hour') >= 25 then
    raise exception 'Limite de convites atingido' using errcode='22023'; end if;
  select id into recipient from auth.users where lower(email)=lower(btrim(p_email)) limit 1;
  if recipient is null then raise exception 'Não foi encontrada uma conta com esse e-mail' using errcode='22023'; end if;
  if recipient=auth.uid() then raise exception 'Você já é proprietário da carteira' using errcode='22023'; end if;
  if exists(select 1 from public.shared_wallet_members where wallet_id=p_wallet and user_id=recipient) then
    raise exception 'Este usuário já participa da carteira' using errcode='22023'; end if;
  if (select count(*) from public.shared_wallet_members where wallet_id=p_wallet)>=20 then
    raise exception 'Limite de participantes atingido' using errcode='22023'; end if;
  insert into public.shared_wallet_invitations(wallet_id,invited_user_id,invited_by,status,expires_at)
  values(p_wallet,recipient,auth.uid(),'pending',now()+interval '7 days')
  on conflict(wallet_id,invited_user_id) do update set
    status='pending',invited_by=excluded.invited_by,updated_at=now(),
    expires_at=now()+interval '7 days'
  where public.shared_wallet_invitations.status in ('declined','accepted')
    and public.shared_wallet_invitations.updated_at<now()-interval '10 minutes'
  returning * into result;
  if result.id is null then raise exception 'Convite pendente ou recente. Tente mais tarde.' using errcode='22023'; end if;
  return result;
end;
$$;
revoke all on function public.shared_wallet_invite(uuid,text) from public,anon;
grant execute on function public.shared_wallet_invite(uuid,text) to authenticated;

create or replace function public.shared_wallet_respond(p_invite uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare inv public.shared_wallet_invitations;
begin
  select * into inv from public.shared_wallet_invitations where id=p_invite for update;
  if inv.id is null or inv.invited_user_id is distinct from auth.uid()
      or inv.status<>'pending' or inv.expires_at<now()
    then raise exception 'Convite inválido ou expirado' using errcode='42501'; end if;
  perform 1 from public.shared_wallets where id=inv.wallet_id for update;
  if not found then raise exception 'Carteira não encontrada' using errcode='42501'; end if;
  if p_accept then
    if (select count(*) from public.shared_wallet_members where wallet_id=inv.wallet_id)>=20 then
      raise exception 'Carteira atingiu o limite de participantes' using errcode='22023'; end if;
    insert into public.shared_wallet_members(wallet_id,user_id,role,display_name)
    values(inv.wallet_id,auth.uid(),'member',
      coalesce(app_private.wallet_display_name(auth.uid()),'Participante'))
    on conflict(wallet_id,user_id) do nothing;
    insert into public.shared_wallet_message_reads(wallet_id,user_id)
    values(inv.wallet_id,auth.uid()) on conflict do nothing;
  end if;
  update public.shared_wallet_invitations
  set status=case when p_accept then 'accepted' else 'declined' end,
      updated_at=now() where id=inv.id;
  return true;
end;
$$;
revoke all on function public.shared_wallet_respond(uuid,boolean) from public,anon;
grant execute on function public.shared_wallet_respond(uuid,boolean) to authenticated;

-- A exclusão em cascata de uma carteira NÃO envia avisos de remoção separados
-- para cada participante: o aviso de encerramento já é emitido pelo pai.
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
      perform app_private.shared_notify(old.user_id,'warning','Acesso à carteira encerrado',
        'Você saiu ou foi removido de uma carteira compartilhada.');
      for person in select user_id from public.shared_wallet_members
        where wallet_id=old.wallet_id and user_id<>old.user_id loop
        perform app_private.shared_notify(person.user_id,'system','Participante removido',
          'Um participante saiu ou foi removido da carteira.');
      end loop;
    elsif tg_op='INSERT' and new.role='member' then
      for person in select user_id from public.shared_wallet_members
        where wallet_id=new.wallet_id and user_id<>new.user_id
          and user_id<>(select owner_id from public.shared_wallets where id=new.wallet_id) loop
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
