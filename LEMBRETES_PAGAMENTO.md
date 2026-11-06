# Lembretes de pagamento — FinanceiroMVP

## Funcionalidades
- Na página **Início**, abaixo do cartão financeiro, existe a seção **Lembretes de pagamento**.
- Cadastre descrição, dia/mês/ano e valor opcional (por exemplo, Conta de água, 28/11/2026).
- Marque o pagamento como pago/reabra, exclua o lembrete e ative/desative envio por e-mail em cada item.
- Um lembrete é **um evento único na data escolhida**. Não cria lançamento financeiro e não se repete nos meses seguintes.
- A partir de 09h, horário de Brasília, no dia escolhido, o Supabase cria **uma** notificação na central do site, mesmo que ele esteja fechado. Ela aparece na próxima visita ou via Realtime se a página estiver aberta.
- Apenas lembretes com a opção de e-mail ativada podem gerar e-mail. Não enviamos propaganda, informações de outros usuários ou notificações financeiras comuns por e-mail.

## Banco e segurança
Arquivo `database/payment_reminders.sql` cria:
- `public.payment_reminders`: RLS habilitada e políticas que restringem SELECT/INSERT/UPDATE/DELETE ao usuário autenticado.
- `public.payment_reminder_events`: fila de eventos sem acesso aos clientes e chave única por lembrete e vencimento, prevenindo duplicatas.
- `app_private.queue_due_payment_reminders()`: agenda notificações no dia de vencimento.
- `public.claim_payment_reminder_emails()`, `public.finalize_payment_reminder_email()` e `public.verify_payment_reminder_scheduler()`: RPCs de uso exclusivo do service_role.
- Dois jobs Cron: geração de notificações na hora cheia e tentativa de envio de e-mails a cada hora no minuto 10.
- Um segredo aleatório do agendador no Supabase Vault, jamais no navegador.

## Serviço de e-mail — ATIVAÇÃO NECESSÁRIA
A função `supabase/functions/send-payment-reminders/index.ts` está preparada para Resend.
**Para que os e-mails sejam realmente enviados**, o administrador deve configurar no projeto Supabase principal, em Edge Functions → Secrets:
- `RESEND_API_KEY`: chave secreta da conta Resend.
- `PAYMENT_REMINDER_FROM_EMAIL`: remetente autorizado/verificado no Resend, por exemplo `FinanceiroMVP <avisos@seudominio.com>`.

Não colocar nenhum destes valores em variáveis `EXPO_PUBLIC_*`, no GitHub ou no cliente web. Os segredos `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` são disponibilizados pelo runtime Supabase.

Enquanto o serviço de envio não estiver configurado, a Edge Function responde 503 sem retirar os e-mails da fila. Os avisos na **central do site** continuam funcionando.

## Validação
1. Fazer login, cadastrar lembrete futuro e atualizar a página. Confirmar que continua salvo.
2. Alternar mês e criar outro lembrete; conferir dia, mês e ano corretos.
3. Testar marcar pago, reabrir, excluir e habilitar/desabilitar e-mail.
4. Verificar RLS com duas contas: cada conta deve consultar apenas seus lembretes.
5. Com conta de teste e provedor de e-mail autorizado, validar envio na data de vencimento, estado da fila e ausência de duplicação.
6. Não enviar e-mails reais sem endereço/remetente verificado e consentimento do usuário.

**Nota:** este recurso envia alertas por e-mail, não push nativo do navegador/sistema operacional. Push nativo exige permissão, assinatura push e uma infraestrutura separada.
