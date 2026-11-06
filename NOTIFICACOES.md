# Central de notificações e sons — FinanceiroMVP

## O que existe
- Sino no cabeçalho com contador de **não lidas**.
- Avisos persistidos no Supabase, exclusivos do usuário autenticado, com histórico paginado.
- Atualização automática por Supabase Realtime/Postgres Changes, enquanto o site estiver aberto e conectado.
- Notificações geradas no banco por cadastro/edição/exclusão de lançamentos e gravação de limites mensais.
- Feedback visual temporário para confirmações e falhas, sem alterar o desenho da área financeira.
- Tons curtos e originais usando Web Audio API, sem bibliotecas nem arquivos de áudio.
- Preferências por usuário e navegador em Configurações → Notificações e sons.

## Requisitos de banco
Executar **uma vez** no projeto Supabase **FinanApp** a SQL versionada em `database/notifications_realtime.sql`, de preferência como migration `notifications_realtime`.
A SQL cria `public.notification_items`, índices, RLS, grants restritos, triggers financeiros e habilita a tabela na publication `supabase_realtime`.
Nunca executar no projeto `FinanApp-TESTE` sem adaptar primeiro, pois ele tem esquema diferente (não inclui `user_id` nas tabelas financeiras).
**Segurança:** clientes autenticados podem apenas ver as próprias notificações e marcar `is_read`; nenhum cliente pode criar avisos arbitrários diretamente. O banco insere via triggers internos.
Acesso a avisos de sistema e mensagens: futuro backend confiável poderá inserir linhas com `category='system' | 'warning' | 'message'` e `user_id` do destinatário.

## Testes
1. Entrar com e-mail/senha ou Passkey e abrir o sino. Sem mensagens, a central deve informar que está vazia.
2. Cadastrar, editar e excluir lançamento; os avisos devem aparecer sem atualizar a página.
3. Salvar limite; validar aviso de limite atualizado.
4. Abrir outra aba/autenticar a mesma conta em outro dispositivo e alterar um lançamento: o primeiro recebe via Realtime.
5. Marcar aviso como lido e atualizar a página: o estado persiste no Supabase.
6. Entrar com outra conta: não pode ler avisos da primeira (RLS).
7. Configurações: som inicialmente desligado; ligar e testar o som, desativar categorias, fechar e reabrir o site.
8. Testar modo claro/escuro/sistema, fontes do Aa, VLibras, Passkeys, Safari e Android Chrome.
9. Testar Web Preview/produção via Expo 58 e checar erro de console.

## Limitações honestas
- O FinanceiroMVP **não tem módulo de chat/mensagens** hoje. As categorias já existem, mas não inventamos mensagens recebidas.
- Sem Service Worker + Web Push e permissão explícita, não há notificação do sistema operacional com a aba fechada. Este recurso cobre avisos **enquanto o site está aberto**.
- Navegadores móveis podem bloquear áudio automático. A pessoa precisa habilitar sons e interagir com a página; só então o som será reproduzido se permitido.
- Preferências de sons são por dispositivo/navegador, não sincronizadas entre computadores.
- Não são reproduzidos sons no Expo Go/nativo nesta fase. O foco solicitado é o site.
