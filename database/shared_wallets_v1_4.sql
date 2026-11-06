-- Canais privados Realtime: autorização de entrada baseada na carteira e conta.
-- Além disso, cada evento Postgres Changes passa por RLS da tabela de origem.
-- A política de conexão é cacheada pelo Realtime; RLS dos dados continua
-- necessária para revogação no fluxo de novos eventos.
grant select on realtime.messages to authenticated;
create policy "finanmvp_shared_wallet_realtime_read"
on realtime.messages for select to authenticated using (
  (
    (select realtime.topic()) ~ '^shared-wallet-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and app_private.wallet_is_member(
      substring((select realtime.topic()) from 15)::uuid,
      (select auth.uid())
    )
  ) or (
    (select realtime.topic()) ~ '^wallet-list-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    and substring((select realtime.topic()) from 13) = (select auth.uid())::text
  )
);
-- Não concedemos INSERT em realtime.messages: esta versão usa apenas
-- Postgres Changes, não Broadcast ou Presence de conteúdo privado.
