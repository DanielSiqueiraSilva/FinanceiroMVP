-- Hardening de auditoria: timestamps sempre atribuídos pelo banco.
-- Sem isso, um cliente poderia falsificar created_at e escapar do rate limit.
create or replace function app_private.wallet_limit_messages()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.sender_id is distinct from auth.uid() then
    raise exception 'Remetente inválido' using errcode='42501';
  end if;
  if new.body is null or char_length(btrim(new.body))<1 or char_length(new.body)>1200 then
    raise exception 'Mensagem inválida' using errcode='22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(new.sender_id::text || new.wallet_id::text,0));
  if (select count(*) from public.shared_wallet_messages
      where sender_id=new.sender_id and wallet_id=new.wallet_id
        and created_at>now()-interval '30 seconds')>=8 then
    raise exception 'Muitas mensagens. Aguarde alguns segundos.' using errcode='22023';
  end if;
  new.created_at:=now();
  new.sender_name:=coalesce(app_private.wallet_display_name(new.sender_id),'Participante');
  return new;
end;
$$;
revoke all on function app_private.wallet_limit_messages() from public,anon,authenticated;

create or replace function app_private.wallet_audit_transaction()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op='INSERT' then
    if new.created_by is distinct from auth.uid() then
      raise exception 'Autor inválido' using errcode='42501'; end if;
    new.updated_by:=new.created_by;
    new.created_by_name:=coalesce(app_private.wallet_display_name(new.created_by),'Participante');
    new.updated_by_name:=new.created_by_name;
    new.created_at:=now();
    new.updated_at:=new.created_at;
  else
    if new.wallet_id is distinct from old.wallet_id
       or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at
       or new.created_by_name is distinct from old.created_by_name then
      raise exception 'Auditoria imutável' using errcode='42501'; end if;
    if new.updated_by is distinct from auth.uid() then
      raise exception 'Editor inválido' using errcode='42501'; end if;
    new.updated_by_name:=coalesce(app_private.wallet_display_name(auth.uid()),'Participante');
    new.updated_at:=now();
  end if;
  return new;
end;
$$;
revoke all on function app_private.wallet_audit_transaction() from public,anon,authenticated;
