# Passkeys no FinanceiroMVP (Web)

Implementação experimental em `feature/passkeys-web`. **Não mesclar em `main` sem testar localmente e em domínio definitivo.**

## Objetivo
Permitir login por chave de acesso (Face ID, digital, PIN ou chave de segurança, conforme o dispositivo), mantendo e-mail/senha.

## Configuração obrigatória no Supabase
1. No **mesmo** projeto Supabase que autentica o site, abra **Authentication → Passkeys**.
2. Habilite **Enable Passkey authentication**.
3. **Relying Party Display Name:** `FinanceiroMVP`.
4. **Relying Party ID:** hostname exato e estável do site, **sem** `https://` e **sem** barra final. Exemplo ilustrativo: `app.exemplo.com`.
5. **Relying Party Origins:** origem completa com HTTPS correspondente, por exemplo `https://app.exemplo.com`.
6. Se for usar localhost, a origem de loopback precisa estar autorizada e o RP ID precisa ser compatível com essa origem. Para o teste final, prefira o domínio permanente.
7. **Atenção:** mudar o RP ID invalida as passkeys cadastradas anteriormente.
8. Não inclua chaves secretas no frontend. A publicação web precisa das variáveis públicas do **mesmo** Supabase configurado.

## Uso
1. Entre com e-mail/senha em uma conta com e-mail confirmado.
2. No perfil, selecione **Ativar Face ID / digital neste dispositivo**, e conclua o diálogo seguro.
3. Saia da conta pelo botão **Sair**.
4. Na tela de login selecione **Entrar com chave de acesso (Face ID / digital)**.
5. Para gerenciar as chaves, faça login e use **Remover** no perfil.

A verificação pode solicitar PIN, senha do dispositivo ou chave física em vez de Face ID/digital. O FinanceiroMVP não recebe biometria bruta.

## Verificações de release
- `npm install`
- `npx tsc --noEmit`
- `npx expo-doctor`
- `npx expo export --platform web --clear`
- Testar login/senha, cadastro, passkey, cancelamento, logout e acesso protegido no Safari iOS e navegador Android.
- Testar execução no Expo Go (biometria nativa segue sendo um recurso separado).
- Testar as páginas e backend financeiro na Vercel.
- Fazer deploy inicialmente em preview, mas **não** tentar cadastrar passkeys se o domínio preview não fizer parte das origens autorizadas.
- Confirmar domínio final antes de cadastrar chaves reais.

## Observações de segurança
O Supabase emite a sessão ao verificar o desafio WebAuthn; o frontend só libera as finanças após receber a sessão validada. A validação de tokens financeiros continua obrigatória no backend.
Passkeys do Supabase estão em fase **experimental** e podem exigir ajustes após upgrades.
Documentação: https://supabase.com/docs/guides/auth/passkeys
