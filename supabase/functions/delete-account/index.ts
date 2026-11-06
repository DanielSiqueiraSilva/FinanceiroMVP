import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.118.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
  "Cache-Control": "no-store",
};

function respond(status: number, message: string) {
  return new Response(JSON.stringify({ message }), { status, headers: cors });
}

/**
 * Exclusão definitiva da PRÓPRIA conta.
 *
 * A service_role fica exclusivamente nos secrets do runtime Supabase:
 * nunca é enviada ao navegador.
 *
 * Segurança: token JWT validado por getUser, senha confirmada novamente
 * via Auth (sem confiar em user_id vindo do cliente), e confirmação textual.
 */
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return respond(405, "Método não permitido.");

  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!url || !serviceKey || !publicKey) {
    return respond(503, "Exclusão indisponível temporariamente. Contate o suporte.");
  }

  const tokenHeader = req.headers.get("Authorization") ?? "";
  if (!/^Bearer\s+\S+$/i.test(tokenHeader)) return respond(401, "Entre na conta para continuar.");
  const token = tokenHeader.replace(/^Bearer\s+/i, "").trim();

  let payload: unknown;
  try { payload = await req.json(); }
  catch { return respond(400, "Dados de confirmação inválidos."); }

  if (!payload || typeof payload !== "object") return respond(400, "Confirmação inválida.");
  const { password, confirmation } = payload as Record<string, unknown>;
  if (confirmation !== "EXCLUIR" || typeof password !== "string" ||
      password.length < 6 || password.length > 256) {
    return respond(400, "Digite EXCLUIR e informe sua senha atual.");
  }

  try {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: { user }, error: sessionError } = await admin.auth.getUser(token);
    if (sessionError || !user || !user.email) return respond(401, "Sessão inválida ou expirada. Entre novamente.");

    // Este cliente possui apenas a chave pública; a senha nunca é registrada.
    const verifier = createClient(url, publicKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: verified, error: passwordError } = await verifier.auth.signInWithPassword({
      email: user.email, password,
    });
    if (passwordError || verified.user?.id !== user.id) {
      return respond(403, "Senha incorreta. Sua conta não foi excluída.");
    }

    // Não aceitar ids do payload; o alvo vem sempre do JWT validado.
    const { error: deletionError } = await admin.auth.admin.deleteUser(user.id);
    if (deletionError) {
      console.error("[delete-account] Auth recusou exclusão:", deletionError.code ?? "unknown");
      return respond(500, "Não foi possível excluir a conta. Tente novamente ou contate o suporte.");
    }

    return respond(200, "Conta excluída com sucesso.");
  } catch {
    return respond(500, "Não foi possível concluir a exclusão. Tente novamente.");
  }
});
