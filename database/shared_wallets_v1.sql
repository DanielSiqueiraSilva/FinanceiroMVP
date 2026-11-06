-- FinanceiroMVP · Carteiras Compartilhadas v1
-- Migration aditiva. Não toca lançamentos pessoais, limites ou rotinas de exclusão.
-- Testar no Supabase de TESTE primeiro. Não aplicar em produção sem aprovação.
create schema if not exists app_private;
revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;

create table if not exists public.shared_wallets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 80),
  description text not null default '' check (char_length(description) <= 300),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_wallets_owner_idx on public.shared_wallets(owner_id);

create table if not exists public.shared_wallet_members (
  wallet_id uuid not null references public.shared_wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  display_name text not null default 'Participante' check (char_length(display_name) <= 80),
  joined_at timestamptz not null default now(),
  primary key(wallet_id,user_id)
);
create index if not exists shared_wallet_members_user_idx on public.shared_wallet_members(user_id,wallet_id);

create table if not exists public.shared_wallet_invitations (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.shared_wallets(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  status text not null default 'pending' check(status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  unique(wallet_id, invited_user_id)
);
create index if not exists wallet_invitations_inbox_idx
  on public.shared_wallet_invitations(invited_user_id,status,created_at desc);

create table if not exists public.shared_wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.shared_wallets(id) on delete cascade,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_by_name text not null default 'Participante' check(char_length(created_by_name) <= 80),
  updated_by_name text not null default 'Participante' check(char_length(updated_by_name) <= 80),
  type text not null check(type in ('receita','despesa')),
  amount numeric(12,2) not null check(amount > 0 and amount <= 100000000),
  category text not null check (char_length(btrim(category)) between 1 and 60),
  description text not null check (char_length(btrim(description)) between 1 and 120),
  entry_date date not null check (entry_date between date '2000-01-01' and date '2100-12-31'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists shared_wallet_tx_wallet_date_idx
  on public.shared_wallet_transactions(wallet_id,entry_date desc,created_at desc);

create table if not exists public.shared_wallet_messages (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid not null references public.shared_wallets(id) on delete cascade,
  sender_id uuid references auth.users(id) on delete set null,
  sender_name text not null default 'Participante' check(char_length(sender_name) <= 80),
  body text not null check (char_length(btrim(body)) between 1 and 1200),
  created_at timestamptz not null default now()
);
create index if not exists shared_wallet_msg_wallet_time_idx
  on public.shared_wallet_messages(wallet_id,created_at desc,id desc);
create index if not exists shared_wallet_msg_sender_time_idx
  on public.shared_wallet_messages(sender_id,created_at desc);

create table if not exists public.shared_wallet_message_reads (
  wallet_id uuid not null references public.shared_wallets(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(wallet_id,user_id)
);

-- Predicados SECURITY DEFINER de leitura restrita, sem consultar tabela com
-- RLS recursivamente. O argumento p_user nunca é controlado por clientes:
-- RLS chama SEMPRE com auth.uid() e não concedemos EXECUTE direto.
create or replace function app_private.wallet_is_member(p_wallet uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user is not null and exists (
    select 1 from public.shared_wallet_members m
    where m.wallet_id=p_wallet and m.user_id=p_user
  );
$$;
revoke all on function app_private.wallet_is_member(uuid,uuid) from public, anon;
grant execute on function app_private.wallet_is_member(uuid,uuid) to authenticated;

create or replace function app_private.wallet_is_owner(p_wallet uuid, p_user uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_user is not null and exists (
    select 1 from public.shared_wallets w
    where w.id=p_wallet and w.owner_id=p_user
  );
$$;
revoke all on function app_private.wallet_is_owner(uuid,uuid) from public, anon;
grant execute on function app_private.wallet_is_owner(uuid,uuid) to authenticated;

-- Auxiliar de exibição, nunca utilizado para autorização.
create or replace function app_private.wallet_display_name(p_user uuid)
returns text language sql stable security definer set search_path = ''
as $$
  select left(coalesce(nullif(btrim(u.raw_user_meta_data->>'full_name'), ''),
              nullif(split_part(u.email,'@',1),''), 'Participante'), 80)
  from auth.users u where u.id=p_user
$$;
revoke all on function app_private.wallet_display_name(uuid) from public,anon,authenticated;

create or replace function app_private.wallet_create_owner()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.shared_wallet_members(wallet_id,user_id,role,display_name)
  values(new.id,new.owner_id,'owner',
    coalesce(app_private.wallet_display_name(new.owner_id),'Participante'));
  insert into public.shared_wallet_message_reads(wallet_id,user_id) values(new.id,new.owner_id);
  return new;
end;
$$;
drop trigger if exists shared_wallet_new_owner on public.shared_wallets;
create trigger shared_wallet_new_owner after insert on public.shared_wallets
for each row execute function app_private.wallet_create_owner();

create or replace function app_private.wallet_audit_transaction()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if tg_op='INSERT' then
    if new.created_by is distinct from auth.uid() then raise exception 'Autor inválido' using errcode='42501'; end if;
    new.updated_by := new.created_by;
    new.created_by_name := coalesce(app_private.wallet_display_name(new.created_by),'Participante');
    new.updated_by_name := new.created_by_name;
  else
    if new.wallet_id is distinct from old.wallet_id or new.created_by is distinct from old.created_by
       or new.created_at is distinct from old.created_at or new.created_by_name is distinct from old.created_by_name then
      raise exception 'Campos de auditoria não podem ser alterados' using errcode='42501';
    end if;
    if new.updated_by is distinct from auth.uid() then raise exception 'Editor inválido' using errcode='42501'; end if;
    new.updated_by_name := coalesce(app_private.wallet_display_name(auth.uid()),'Participante');
    new.updated_at := now();
  end if;
  return new;
end;
$$;
drop trigger if exists shared_wallet_transaction_audit on public.shared_wallet_transactions;
create trigger shared_wallet_transaction_audit before insert or update on public.shared_wallet_transactions
for each row execute function app_private.wallet_audit_transaction();

create or replace function app_private.wallet_limit_messages()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.sender_id is distinct from auth.uid() then raise exception 'Remetente inválido' using errcode='42501'; end if;
  if new.body is null or char_length(btrim(new.body))<1 or char_length(new.body)>1200
     then raise exception 'Mensagem inválida' using errcode='22023'; end if;
  -- Bloqueio por remetente: impede envios simultâneos de contornarem o limite.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.sender_id::text || new.wallet_id::text, 0));
  if (select count(*) from public.shared_wallet_messages
      where sender_id=new.sender_id and wallet_id=new.wallet_id and created_at > now()-interval '30 seconds') >= 8
     then raise exception 'Muitas mensagens. Aguarde alguns segundos.' using errcode='22023'; end if;
  new.sender_name := coalesce(app_private.wallet_display_name(new.sender_id),'Participante');
  return new;
end;
$$;
drop trigger if exists shared_wallet_message_rate on public.shared_wallet_messages;
create trigger shared_wallet_message_rate before insert on public.shared_wallet_messages
for each row execute function app_private.wallet_limit_messages();

-- RLS: consulta apenas membros aceitos; convites somente dono e destinatário.
alter table public.shared_wallets enable row level security;
alter table public.shared_wallet_members enable row level security;
alter table public.shared_wallet_invitations enable row level security;
alter table public.shared_wallet_transactions enable row level security;
alter table public.shared_wallet_messages enable row level security;
alter table public.shared_wallet_message_reads enable row level security;
revoke all on public.shared_wallets, public.shared_wallet_members,
 public.shared_wallet_invitations, public.shared_wallet_transactions,
 public.shared_wallet_messages, public.shared_wallet_message_reads from public,anon,authenticated;
grant select, insert, delete on public.shared_wallets to authenticated;
grant update(name,description) on public.shared_wallets to authenticated;
grant select on public.shared_wallet_members,public.shared_wallet_invitations to authenticated;
grant select,insert,update,delete on public.shared_wallet_transactions to authenticated;
grant select,insert on public.shared_wallet_messages to authenticated;
grant select,insert,update(last_read_at) on public.shared_wallet_message_reads to authenticated;

create policy wallet_read on public.shared_wallets for select to authenticated
using (app_private.wallet_is_member(id,(select auth.uid())));
create policy wallet_create on public.shared_wallets for insert to authenticated
with check (owner_id=(select auth.uid()));
create policy wallet_edit on public.shared_wallets for update to authenticated
using (owner_id=(select auth.uid())) with check (owner_id=(select auth.uid()));
create policy wallet_close on public.shared_wallets for delete to authenticated
using (owner_id=(select auth.uid()));

create policy wallet_members_read on public.shared_wallet_members for select to authenticated
using (app_private.wallet_is_member(wallet_id,(select auth.uid())));

create policy wallet_invites_read on public.shared_wallet_invitations for select to authenticated
using (invited_user_id=(select auth.uid())
  or app_private.wallet_is_owner(wallet_id,(select auth.uid())));

create policy wallet_tx_read on public.shared_wallet_transactions for select to authenticated
using (app_private.wallet_is_member(wallet_id,(select auth.uid())));
create policy wallet_tx_add on public.shared_wallet_transactions for insert to authenticated
with check (app_private.wallet_is_member(wallet_id,(select auth.uid()))
 and created_by=(select auth.uid()) and updated_by=(select auth.uid()));
create policy wallet_tx_edit on public.shared_wallet_transactions for update to authenticated
using (app_private.wallet_is_member(wallet_id,(select auth.uid())))
with check (app_private.wallet_is_member(wallet_id,(select auth.uid()))
 and updated_by=(select auth.uid()));
create policy wallet_tx_remove on public.shared_wallet_transactions for delete to authenticated
using (app_private.wallet_is_member(wallet_id,(select auth.uid())));

create policy wallet_msg_read on public.shared_wallet_messages for select to authenticated
using (app_private.wallet_is_member(wallet_id,(select auth.uid())));
create policy wallet_msg_send on public.shared_wallet_messages for insert to authenticated
with check (app_private.wallet_is_member(wallet_id,(select auth.uid()))
 and sender_id=(select auth.uid()));

create policy wallet_reads_read on public.shared_wallet_message_reads for select to authenticated
using (user_id=(select auth.uid())
 and app_private.wallet_is_member(wallet_id,(select auth.uid())));
create policy wallet_reads_write on public.shared_wallet_message_reads for insert to authenticated
with check (user_id=(select auth.uid())
 and app_private.wallet_is_member(wallet_id,(select auth.uid()))
 and last_read_at<=now()+interval '5 seconds');
create policy wallet_reads_update on public.shared_wallet_message_reads for update to authenticated
using (user_id=(select auth.uid())
 and app_private.wallet_is_member(wallet_id,(select auth.uid())))
with check (user_id=(select auth.uid())
 and app_private.wallet_is_member(wallet_id,(select auth.uid()))
 and last_read_at<=now()+interval '5 seconds');

-- Operações sensíveis são funções atômicas. O token do usuário via PostgREST
-- define auth.uid(). Nenhuma função recebe user_id do usuário corrente.
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
  if (select count(*) from public.shared_wallet_invitations i
      join public.shared_wallets w on w.id=i.wallet_id
      where w.owner_id=auth.uid() and i.updated_at>now()-interval '1 hour') >= 25 then
    raise exception 'Limite de convites atingido' using errcode='22023'; end if;
  select id into recipient from auth.users where lower(email)=lower(btrim(p_email)) limit 1;
  if recipient is null then raise exception 'Não foi encontrada uma conta com esse e-mail' using errcode='22023'; end if;
  if recipient=auth.uid() then raise exception 'Você já é proprietário da carteira' using errcode='22023'; end if;
  if app_private.wallet_is_member(p_wallet,recipient) then
    raise exception 'Este usuário já participa da carteira' using errcode='22023'; end if;
  if (select count(*) from public.shared_wallet_members where wallet_id=p_wallet)>=20 then
    raise exception 'Limite de participantes atingido' using errcode='22023'; end if;
  insert into public.shared_wallet_invitations(wallet_id,invited_user_id,invited_by,status,expires_at)
  values(p_wallet,recipient,auth.uid(),'pending',now()+interval '7 days')
  on conflict(wallet_id,invited_user_id) do update set
    status='pending',invited_by=excluded.invited_by,updated_at=now(),
    expires_at=now()+interval '7 days'
  where public.shared_wallet_invitations.status='declined'
    and public.shared_wallet_invitations.updated_at<now()-interval '10 minutes'
  returning * into result;
  if result.id is null then raise exception 'Convite pendente. Aguarde a resposta.' using errcode='22023'; end if;
  return result;
end;
$$;
revoke all on function public.shared_wallet_invite(uuid,text) from public,anon;
grant execute on function public.shared_wallet_invite(uuid,text) to authenticated;

create or replace function public.shared_wallet_respond(p_invite uuid,p_accept boolean)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare inv public.shared_wallet_invitations; result boolean;
begin
  select * into inv from public.shared_wallet_invitations where id=p_invite for update;
  if inv.id is null or inv.invited_user_id is distinct from auth.uid()
      or inv.status<>'pending' or inv.expires_at<now()
    then raise exception 'Convite inválido ou expirado' using errcode='42501'; end if;
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
  update public.shared_wallet_invitations set status=case when p_accept then 'accepted' else 'declined' end,
    updated_at=now() where id=inv.id;
  return true;
end;
$$;
revoke all on function public.shared_wallet_respond(uuid,boolean) from public,anon;
grant execute on function public.shared_wallet_respond(uuid,boolean) to authenticated;

create or replace function public.shared_wallet_remove_member(p_wallet uuid,p_user uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if not app_private.wallet_is_owner(p_wallet,auth.uid()) or p_user=auth.uid()
    then raise exception 'Operação não autorizada' using errcode='42501'; end if;
  delete from public.shared_wallet_members
  where wallet_id=p_wallet and user_id=p_user and role='member';
  if not found then raise exception 'Participante não encontrado' using errcode='22023'; end if;
  return true;
end;
$$;
revoke all on function public.shared_wallet_remove_member(uuid,uuid) from public,anon;
grant execute on function public.shared_wallet_remove_member(uuid,uuid) to authenticated;

create or replace function public.shared_wallet_leave(p_wallet uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if app_private.wallet_is_owner(p_wallet,auth.uid()) then
    raise exception 'O proprietário deve encerrar a carteira, não sair' using errcode='42501'; end if;
  delete from public.shared_wallet_members where wallet_id=p_wallet and user_id=auth.uid() and role='member';
  if not found then raise exception 'Você não participa da carteira' using errcode='42501'; end if;
  return true;
end;
$$;
revoke all on function public.shared_wallet_leave(uuid) from public,anon;
grant execute on function public.shared_wallet_leave(uuid) to authenticated;

-- Inserir avisos somente se a tabela de notificações existir no ambiente.
create or replace function app_private.shared_notify(p_user uuid,p_category text,p_title text,p_detail text)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_user is null or to_regclass('public.notification_items') is null
    or not exists (select 1 from auth.users where id=p_user) then return; end if;
  execute 'insert into public.notification_items (user_id,category,title,description)
           values ($1,$2,$3,$4)'
  using p_user,p_category,left(p_title,120),left(p_detail,300);
end;
$$;
revoke all on function app_private.shared_notify(uuid,text,text,text) from public,anon,authenticated;

create or replace function app_private.shared_notification_trigger()
returns trigger language plpgsql security definer set search_path = ''
as $$
declare
  person record;
  wallet_name text;
  actor uuid;
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
      perform app_private.shared_notify(old.user_id,'warning','Acesso à carteira encerrado',
        'Você saiu ou foi removido de uma carteira compartilhada.');
      for person in select user_id from public.shared_wallet_members
        where wallet_id=old.wallet_id and user_id<>old.user_id loop
        perform app_private.shared_notify(person.user_id,'system','Participante removido',
          'Um participante saiu ou foi removido da carteira.');
      end loop;
    elsif tg_op='INSERT' and new.role='member' then
      for person in select user_id from public.shared_wallet_members
        where wallet_id=new.wallet_id and user_id<>new.user_id and user_id<>(
           select owner_id from public.shared_wallets where id=new.wallet_id) loop
        perform app_private.shared_notify(person.user_id,'system','Novo participante',
          'Uma pessoa ingressou na carteira compartilhada.');
      end loop;
    end if;
  elsif tg_table_name='shared_wallet_transactions' then
    if tg_op='DELETE' then
      actor := auth.uid();
      select name into wallet_name from public.shared_wallets where id=old.wallet_id;
    else
      actor := coalesce(new.updated_by,new.created_by);
      select name into wallet_name from public.shared_wallets where id=new.wallet_id;
    end if;
    -- Ao encerrar carteira/excluir conta, cascata não gera dezenas de avisos.
    if wallet_name is null then
      if tg_op='DELETE' then return old; end if;
      return new;
    end if;
    for person in select user_id from public.shared_wallet_members
      where wallet_id=coalesce(new.wallet_id,old.wallet_id) and user_id is distinct from actor loop
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
drop trigger if exists shared_wallet_notify_invitations on public.shared_wallet_invitations;
create trigger shared_wallet_notify_invitations after insert or update on public.shared_wallet_invitations
for each row execute function app_private.shared_notification_trigger();
drop trigger if exists shared_wallet_notify_members on public.shared_wallet_members;
create trigger shared_wallet_notify_members after insert or delete on public.shared_wallet_members
for each row execute function app_private.shared_notification_trigger();
drop trigger if exists shared_wallet_notify_transactions on public.shared_wallet_transactions;
create trigger shared_wallet_notify_transactions after insert or update or delete on public.shared_wallet_transactions
for each row execute function app_private.shared_notification_trigger();
drop trigger if exists shared_wallet_notify_messages on public.shared_wallet_messages;
create trigger shared_wallet_notify_messages after insert on public.shared_wallet_messages
for each row execute function app_private.shared_notification_trigger();
drop trigger if exists shared_wallet_notify_close on public.shared_wallets;
create trigger shared_wallet_notify_close before delete on public.shared_wallets
for each row execute function app_private.shared_notification_trigger();

-- Publicação para Postgres Changes; SELECT por evento respeita RLS.
-- DELETE contém apenas PK com REPLICA IDENTITY DEFAULT: sem corpo privado.
do $$
declare tab text;
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach tab in array ARRAY['shared_wallets','shared_wallet_members','shared_wallet_invitations',
      'shared_wallet_transactions','shared_wallet_messages','shared_wallet_message_reads'] loop
      if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
          and schemaname='public' and tablename=tab) then
        execute format('alter publication supabase_realtime add table public.%I', tab);
      end if;
    end loop;
  end if;
end $$;
