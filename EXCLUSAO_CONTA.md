# Exclusão segura de conta — FinanceiroMVP

## Problema identificado
As tabelas `public.lancamentos`, `public.limites_mensais` e `public.notification_items` têm FKs para `auth.users(id)` com `ON DELETE CASCADE`. Contudo, o gatilho `app_private.notify_financial_change()` tentava criar uma nova notificação ao apagar lançamentos. Uma exclusão em cascata de `auth.users` podia disparar esse gatilho quando o usuário já não existia, causando erro de chave estrangeira e abortando a operação.

## Correção aplicada
A função verifica se o usuário ainda existe antes de registrar a notificação. Exclusões comuns de lançamentos continuam gerando avisos; exclusões de usuários não criam avisos de conta já eliminada. SQL: `database/fix_account_deletion_cascade.sql`.

## Exclusão da própria conta
- Configurações → Excluir minha conta → digitar senha atual e a palavra exata **EXCLUIR**.
- `supabase/functions/delete-account/index.ts` é executada no servidor Supabase, com verificação do JWT, nova verificação da senha e chamada administrativa `auth.admin.deleteUser(user.id)`.
- O usuário-alvo vem do token validado, nunca de um parâmetro controlado pelo navegador.
- Chaves privilegiadas permanecem exclusivamente no servidor.
- A exclusão do usuário é **irreversível** e provoca `ON DELETE CASCADE` das informações financeiras e notificações do usuário. Credenciais biométricas/WebAuthn vinculadas ao Auth também são removidas.
- A tela encerra a sessão e remove o desbloqueio local do dispositivo após retorno de sucesso.

## Limitações e validação
- Esta primeira versão exige que o usuário possua senha. Fluxo de contas sem senha exigiria reautenticação alternativa.
- Não há acesso para um usuário apagar contas de outras pessoas.
- Não foi executado DELETE em usuários reais para testar. A correção do gatilho e as referências CASCADE foram verificadas com consultas não destrutivas. Testar exclusão ponta-a-ponta apenas com conta de teste criada para essa finalidade, explicitamente autorizada.
- A exclusão administrativa via Supabase Dashboard também beneficia-se da correção do gatilho.
- Arquivos em buckets Storage exigem tratamento separado, caso passem a ser usados. Na inspeção do banco, não havia objetos Storage com proprietário.
- A função exige JWT válido (verify_jwt=true). Não configurar service_role no cliente web/nativo.
