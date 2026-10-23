-- Execute somente após salvar backup das tabelas.
-- Mantém dados existentes sem dono (NULL), que ficam invisíveis para contas novas.
-- Nunca atribua registros antigos automaticamente a quem primeiro se cadastrar.

alter table public.lancamentos
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

create index if not exists idx_lancamentos_usuario_data
  on public.lancamentos (user_id, data desc);

-- A tabela limites_mensais já existe na versão do app com limite por mês.
alter table public.limites_mensais
  add column if not exists user_id uuid references auth.users(id) on delete cascade;

-- Antes havia uma UNIQUE(mes, ano), que impediria contas diferentes
-- de definirem limites para o mesmo mês. Removemos APENAS essa restrição.
alter table public.limites_mensais
  drop constraint if exists limites_mensais_mes_ano_key;

create unique index if not exists idx_limites_usuario_mes_ano
  on public.limites_mensais (user_id, mes, ano);

-- A API usa chave secreta, por isso RLS deve estar habilitado e
-- o cliente NÃO tem permissão de acessar estas tabelas diretamente.
alter table public.lancamentos enable row level security;
alter table public.limites_mensais enable row level security;
revoke all on table public.lancamentos from anon, authenticated;
revoke all on table public.limites_mensais from anon, authenticated;
grant select, insert, update, delete on public.lancamentos to service_role;
grant select, insert, update, delete on public.limites_mensais to service_role;

-- OPCIONAL, EXECUTE DEPOIS MANUALMENTE e só para os dados que pertence à conta:
-- update public.lancamentos set user_id = 'UUID-DA-CONTA' where user_id is null;
-- update public.limites_mensais set user_id = 'UUID-DA-CONTA' where user_id is null;
-- O UUID pode ser consultado em Supabase > Authentication > Users.
