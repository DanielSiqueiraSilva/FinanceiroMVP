-- Permite que o proprietário veja a carteira recém-criada durante INSERT ... RETURNING.
-- A associação como membro é criada pelo trigger AFTER INSERT.
-- Demais usuários continuam restritos aos membros autorizados.
drop policy if exists wallet_read on public.shared_wallets;
create policy wallet_read on public.shared_wallets
for select to authenticated
using (
  owner_id = (select auth.uid())
  or app_private.wallet_is_member(id, (select auth.uid()))
);
