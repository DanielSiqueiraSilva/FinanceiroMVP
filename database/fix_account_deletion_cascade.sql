-- Correção não destrutiva: impedir que um DELETE em cascata de auth.users
-- tente criar uma notificação para um usuário que já deixou de existir.
-- Mantém os avisos normais de exclusão/edição de lançamentos e de limites.
create or replace function app_private.notify_financial_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  owner_id uuid;
  notification_title text;
  notification_description text;
begin
  if tg_op = 'DELETE' then
    owner_id := old.user_id;
  else
    owner_id := new.user_id;
  end if;
  if owner_id is null then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  -- Ao excluir auth.users, a FK de lancamentos executa ON DELETE CASCADE.
  -- Nesse momento o usuário já não existe: a notificação anterior tentava
  -- inserir outro registro com FK inválida e abortava a exclusão da conta.
  if not exists (select 1 from auth.users where id = owner_id) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_table_name = 'lancamentos' then
    if tg_op = 'INSERT' then
      notification_title := 'Lançamento cadastrado';
      notification_description := 'Um novo lançamento foi registrado na sua conta.';
    elsif tg_op = 'UPDATE' then
      notification_title := 'Lançamento atualizado';
      notification_description := 'Um lançamento da sua conta foi atualizado.';
    else
      notification_title := 'Lançamento excluído';
      notification_description := 'Um lançamento foi excluído da sua conta.';
    end if;
  elsif tg_table_name = 'limites_mensais' then
    notification_title := 'Limite mensal atualizado';
    notification_description := 'O limite financeiro de um mês foi salvo.';
  else
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  insert into public.notification_items (user_id, category, title, description)
  values (owner_id, 'finance', notification_title, notification_description);
  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;
revoke all on function app_private.notify_financial_change() from public, anon, authenticated;
