import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

/**
 * Executada APENAS pelo job Supabase Cron a cada hora.
 * A autorização exige um segredo aleatório guardado no Supabase Vault,
 * validado em RPC service_role. Não recebe destinatários do cliente.
 */
const response = (status: number, message: string) =>
  new Response(JSON.stringify({ message }), {
    status, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[char] ?? char));
}
type ClaimedEmail = {
  event_id: string;
  title: string;
  due_date: string;
  recipient: string;
};

Deno.serve(async req => {
  if (req.method !== "POST") return response(405, "Método inválido.");
  const secret = req.headers.get("x-reminder-secret");
  if (!secret || secret.length !== 64) return response(401, "Não autorizado.");

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) return response(503, "Serviço indisponível.");
  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // O segredo não é armazenado na função e não passa para logs.
  const { data: verified, error: verificationError } = await admin
    .rpc("verify_payment_reminder_scheduler", { p_secret: secret });
  if (verificationError || verified !== true) return response(403, "Não autorizado.");

  const resendKey = Deno.env.get("RESEND_API_KEY");
  const sender = Deno.env.get("PAYMENT_REMINDER_FROM_EMAIL");
  // Sem provedor autorizado NÃO retirar e-mails da fila nem indicar sucesso.
  if (!resendKey || !sender) {
    return response(503, "Serviço de e-mail ainda não configurado.");
  }

  const { data, error: claimError } = await admin
    .rpc("claim_payment_reminder_emails", { p_batch: 15 });
  if (claimError) {
    console.error("[payment-reminders] Erro ao obter fila:", claimError.code);
    return response(500, "Falha no processamento da fila.");
  }

  const events = (data ?? []) as ClaimedEmail[];
  let sent = 0;
  let failed = 0;
  for (const event of events) {
    const title = escapeHtml(String(event.title).slice(0, 100));
    const [year, month, day] = String(event.due_date).split("-");
    const displayDate = `${day}/${month}/${year}`;
    const subject = `Lembrete de pagamento: ${String(event.title).slice(0, 85)}`;
    const html = `<main style="font-family:Arial,sans-serif;max-width:580px;margin:auto;color:#172033">
      <h2 style="color:#6D28D9">Lembrete de pagamento · FinanMVP</h2>
      <p>Você cadastrou um lembrete para hoje, <strong>${escapeHtml(displayDate)}</strong>:</p>
      <p style="font-size:18px"><strong>${title}</strong></p>
      <p>Confira o pagamento no seu controle financeiro.</p>
      <p style="font-size:12px;color:#6B7280">E-mail essencial autorizado no cadastro do lembrete.
      Você pode desativar o envio ou marcar a conta como paga no FinanMVP.</p>
    </main>`;
    let success = false;
    try {
      const sentResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${resendKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: sender,
          to: [event.recipient],
          subject,
          html,
          // Reenvios após instabilidade não devem criar um e-mail diferente.
          // Resend usa esta chave para deduplicar tentativas equivalentes.
          tags: [{ name: "type", value: "payment-reminder" }],
        }),
      });
      success = sentResponse.ok;
      if (!success) console.error("[payment-reminders] Provedor recusou envio:", sentResponse.status);
    } catch {
      console.error("[payment-reminders] Erro temporário de rede do provedor.");
    }
    const { error: updateError } = await admin.rpc("finalize_payment_reminder_email", {
      p_event_id: event.event_id, p_success: success,
    });
    if (updateError) console.error("[payment-reminders] Falha ao atualizar status:", updateError.code);
    if (success) sent++; else failed++;
  }
  return response(200, `Processados: ${events.length}, enviados: ${sent}, falhas: ${failed}.`);
});
