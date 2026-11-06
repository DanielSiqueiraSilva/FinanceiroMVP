# Carteiras Compartilhadas e Chat — FinanceiroMVP

**Estado: Pull Request em revisão, não publicar sem aprovação explícita.**

## Resumo da arquitetura

O login Supabase Auth, a sessão protegida, as finanças pessoais, o tema, a barra de acessibilidade e a central de notificações não foram substituídos. A nova aba **Carteiras Compartilhadas** usa o mesmo React Native, Expo Router, TypeScript e Vercel já existentes.

- Frontend: src/components/shared/SharedWallets.tsx e WalletDetails.tsx.
- Cliente da API: src/services/shared-wallets-api.ts.
- Backend Node/Vercel: backend/api/carteiras/ e backend/api/_lib/shared.js.
- Banco: PostgreSQL com seis tabelas isoladas, RLS e funções RPC para convites, remoção e encerramento.
- Segurança: novos endpoints validam JWT por Supabase Auth e retransmitem o token individual ao PostgREST. A operação passa por RLS, sem usar a chave administrativa para ler/escrever as novas tabelas.
- Papéis: proprietário administra convites, participantes e encerramento; membro aceito pode registrar e modificar movimentos e trocar mensagens.
- Mensagens: somente texto, até 1200 caracteres, no máximo oito mensagens a cada 30 segundos por pessoa/carteira. O banco atribui autor e horário para impedir falsificação.
- Chat: últimas 100 mensagens ao entrar, histórico anterior paginado em blocos de 80; marcação de leitura e contagem de não lidas. Saldos são calculados no banco para TODO o histórico.
- Realtime: Postgres Changes com canais privados protegidos por realtime.messages RLS e verificação por linha de origem. Ao remover um participante, RLS recusa novos dados, a notificação privada tenta fechar a interface imediatamente e o frontend revalida a carteira a cada 10 segundos como contingência. Conexões já estabelecidas possuem permissões de canal em cache, mas o Postgres Changes consulta RLS para cada evento.
- Notificações: triggers inserem avisos nas categorias já existentes; apenas outros participantes recebem avisos de movimentação/mensagem, para não repetir confirmações locais.
- Exclusão de conta: rotina anterior não foi alterada. O banco possui referência do proprietário com ON DELETE CASCADE, portanto uma futura exclusão da conta proprietária encerra as carteiras dessa pessoa. Testar com conta descartável antes de publicar.

## Migrations e ambientes

**Produção FinanApp — projeto hgyuhvqlekyxsuaysfsf:** nenhuma migration nova aplicada e nenhuma conta alterada. A main permanece intacta.

**TESTE FinanApp-TESTE — projeto jznjlyenngbvgbrnrkzc:** migrations aplicadas na ordem:

1. database/shared_wallets_v1.sql — seis tabelas, índices, FK, RLS, triggers, convites e limites.
2. database/shared_wallets_v1_1.sql — caixa de convites, total de não lidas, reinvites e eventos.
3. database/shared_wallets_v1_2.sql — saldos completos e notificações sem duplicatas do autor.
4. database/shared_wallets_v1_3.sql — trava falsificação de horário de mensagens/transações.
5. database/shared_wallets_v1_4.sql — políticas de entrada nos canais Realtime privados.

O ambiente TESTE não possuía public.notification_items, então foi aplicada **somente nele** database/testing/shared_wallet_notifications_fixture.sql. Nunca aplicar essa fixture na produção (que já possui a tabela).

As migrations são aditivas: nenhuma altera dados das tabelas pessoais lancamentos ou limites_mensais.

## Endpoints

Base: EXPO_PUBLIC_FINANCE_API_URL, que deve apontar ao backend Vercel correspondente ao MESMO Supabase.

- GET /api/carteiras — lista das carteiras, caixa de convites e contadores de não lidas.
- POST /api/carteiras — cria carteira ou responde convite (action=respond).
- GET /api/carteiras/:id — detalhes, membros, finanças, saldo no banco e últimas mensagens.
- PATCH /api/carteiras/:id — edita nome/descrição (somente proprietário).
- DELETE /api/carteiras/:id — encerra carteira com confirmação (somente proprietário).
- POST /api/carteiras/:id/actions — convite, sair, remover participante, criar/editar/apagar lançamento, enviar texto e marcar leitura.
- GET /api/carteiras/:id/history?kind=messages&before=... — página anterior do histórico; kind=transactions também é aceito.

Todas as rotas exigem Authorization: Bearer (token do Supabase). Uma pessoa não pode escolher outro user_id para escalar acesso.

## Configuração de preview e publicação

No frontend Vercel: manter EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY e EXPO_PUBLIC_FINANCE_API_URL. No backend Vercel: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY (ou SUPABASE_SERVICE_ROLE_KEY para compatibilidade) e ALLOWED_ORIGINS. Chaves secretas nunca entram no código nem em variáveis EXPO_PUBLIC_.

Para validar a preview contra o ambiente de TESTE, configurar tanto a preview Expo Web como a preview do backend para o MESMO Supabase de teste, usando apenas o painel de segredos da Vercel. O esquema antigo do banco de teste não tem user_id nas tabelas pessoais; portanto, nesse preview, validar a aba nova e não tentar migrar nem usar os dados pessoais como se fossem iguais aos de produção.

Antes da publicação, conferir a publication supabase_realtime para as seis tabelas novas, a tabela notification_items e a política finanmvp_shared_wallet_realtime_read em realtime.messages. Para liberar o recurso em produção, obter aprovação explícita, aplicar as cinco migrations ao banco principal, verificar as grants/RLS e atualizar o deploy a partir da branch testada.

## Testes

### Já validados no projeto TESTE

- Schema com seis tabelas e RLS habilitada em todas.
- Índices, triggers e 15 políticas RLS registrados.
- Publication Realtime contém as seis tabelas novas.
- Usuário anônimo não possui permissão SELECT nas seis tabelas.
- A fixture isolada permite testar notificações sem mudar o schema pessoal de teste.
- Testes de validação do backend e checagem de tipos/build são executados pelo workflow GitHub Actions Validate shared wallets.

### Cenários que EXIGEM duas contas reais (não declarados aprovados)

O ambiente TESTE possui atualmente apenas **uma** conta registrada. Sem uma segunda conta de teste e sessão distinta não é possível validar honestamente o cenário completo.

1. Criar duas contas descartáveis reais A e B, fazer login em navegadores/perfis separados.
2. A cria Casa e envia convite ao e-mail cadastrado de B; B visualiza e aceita.
3. B entra na carteira, vê membros e cria despesa de R$ 80; A vê a atualização via Realtime e o saldo se ajusta.
4. B manda mensagem; A recebe, o sino/histórico atualiza, o som segue a preferência e a mensagem permanece após F5.
5. Testar convite recusado, duplicado e reenviado após saída; testar marcar leitura e carregamento do histórico antigo.
6. Antes da aceitação, tentar ler/alterar dados da carteira via UUID de A usando token de B: deve resultar vazio/403/404.
7. A remove B. A partir daí, o mesmo token de B não consegue consultar ou inserir novos dados; a interface fecha a carteira ao detectar a revogação.
8. B sai de outra carteira; proprietário confirma ENCERRAR e verifica que a carteira e o chat não ficam acessíveis.
9. Enviar 9 mensagens em 30 segundos, tentar forjar sender_id e created_at: a 9ª deve ser recusada e os campos de auditoria devem ser confiáveis.
10. Testar acessibilidade, modo claro/escuro/sistema, celular, computador, desconexão e reconexão.
11. Confirmar que os lançamentos pessoais de A e B continuam segregados da carteira.

### Bloqueios/limitações

- Vercel retornou **build-rate-limit**, não é sucesso de build nem diagnóstico de erro de código. A validação de código foi transferida ao GitHub Actions.
- O teste E2E entre dois navegadores ainda depende da segunda conta real no Supabase de TESTE e configuração de preview coerente.
- O histórico é paginado para não carregar um chat enorme de uma vez.
- Esta versão não inclui anexos, áudio, imagens, chamadas ou push externo.
