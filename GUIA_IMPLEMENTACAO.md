# FinanMVP — implementação financeira

Este pacote contém somente os arquivos que precisam ser **adicionados ou substituídos** no repositório `FinanceiroMVP`.

## 1. O que existe hoje no projeto original

A branch `main` analisada possui:

- Expo + React Native + TypeScript;
- Expo Router com entrada em `src/app/index.tsx`;
- uma única tela funcional, que cadastra despesas apenas em memória;
- componentes de tema/navegação do template Expo em `src/components`;
- hooks de tema em `src/hooks`;
- nenhuma pasta de serviços de API financeira;
- nenhum backend e nenhuma integração com Supabase na branch pública analisada.

O `package.json` atual já contém o necessário para a interface. Por isso a implementação financeira do frontend **não adiciona nenhuma biblioteca**.

## 2. O que muda

### Frontend

Substituir:

- `src/app/index.tsx`

Adicionar:

- `src/types/finance.ts`
- `src/services/finance-api.ts`
- `src/components/finance/SummaryCard.tsx`
- `src/components/finance/PeriodSelector.tsx`
- `src/components/finance/TransactionForm.tsx`
- `src/components/finance/TransactionItem.tsx`
- `.env.example`

### Backend

Adicionar a pasta `backend/` completa. Ela é implantada como um projeto separado na Vercel, usando `backend` como **Root Directory**.

Nenhuma senha do Supabase fica no Expo.

## 3. Estrutura final relevante

```text
FinanceiroMVP/
├─ assets/
├─ scripts/
├─ src/
│  ├─ app/
│  │  └─ index.tsx
│  ├─ components/
│  │  ├─ finance/
│  │  │  ├─ PeriodSelector.tsx
│  │  │  ├─ SummaryCard.tsx
│  │  │  ├─ TransactionForm.tsx
│  │  │  └─ TransactionItem.tsx
│  │  └─ ... componentes existentes do Expo
│  ├─ constants/
│  ├─ hooks/
│  ├─ services/
│  │  └─ finance-api.ts
│  ├─ types/
│  │  └─ finance.ts
│  └─ global.css
├─ backend/
│  ├─ api/
│  │  ├─ _lib/
│  │  │  └─ supabase.js
│  │  ├─ lancamentos/
│  │  │  ├─ index.js
│  │  │  └─ [id].js
│  │  └─ resumo.js
│  ├─ supabase/
│  │  └─ schema.sql
│  ├─ .env.example
│  └─ package.json
├─ .env.example
├─ app.json
├─ package.json
└─ tsconfig.json
```

## 4. Funcionamento do frontend

A tela principal possui quatro blocos:

1. seletor de mês e ano;
2. resumo com saldo, receitas e despesas;
3. formulário para cadastrar ou editar um lançamento;
4. lista dos lançamentos do período com botões de edição e exclusão.

Ao cadastrar, editar ou excluir, o aplicativo chama novamente a lista e o resumo. Assim, os totais ficam sincronizados com o banco.

O frontend usa apenas `fetch`, que já existe no React Native. Não foi adicionado Axios, Redux, biblioteca de formulário ou biblioteca de datas.

## 5. Endpoints do backend

Com o backend publicado, ficam disponíveis:

```text
GET    /api/lancamentos?mes=9&ano=2026
POST   /api/lancamentos
GET    /api/lancamentos/:id
PUT    /api/lancamentos/:id
DELETE /api/lancamentos/:id
GET    /api/resumo?mes=9&ano=2026
```

### Corpo de POST/PUT

```json
{
  "descricao": "Supermercado",
  "categoria": "Alimentação",
  "valor": 150.5,
  "data": "2026-09-11",
  "tipo": "despesa"
}
```

`tipo` aceita somente `receita` ou `despesa`.

## 6. Banco de dados no Supabase

No painel do Supabase:

1. crie um projeto;
2. abra **SQL Editor**;
3. copie todo o conteúdo de `backend/supabase/schema.sql`;
4. execute o script.

A tabela criada é `public.lancamentos`, com:

- `id`: UUID;
- `descricao`: texto;
- `categoria`: texto;
- `valor`: numeric(12,2);
- `data`: date;
- `tipo`: receita/despesa;
- `created_at`;
- `updated_at`.

O script habilita Row Level Security e remove acesso direto de `anon` e `authenticated`. O aplicativo móvel não recebe a chave secreta do Supabase; somente o backend da Vercel a utiliza.

## 7. Variáveis de ambiente da Vercel

Crie um projeto na Vercel apontando para o mesmo GitHub e defina **Root Directory = `backend`**.

Em **Project > Settings > Environment Variables**, cadastre:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxx
ALLOWED_ORIGIN=*
```

`SUPABASE_SECRET_KEY` é privada e deve ficar marcada como variável sensível.

Se o seu projeto Supabase ainda estiver usando a chave legada, o código também aceita:

```text
SUPABASE_SERVICE_ROLE_KEY=...
```

Não use as duas se não for necessário.

Para Expo Web em produção, você pode trocar `ALLOWED_ORIGIN=*` pelo domínio exato do frontend web. Em app Android/iOS, CORS não funciona da mesma forma que no navegador.

## 8. Variável de ambiente do Expo

Na raiz do projeto, crie `.env` a partir de `.env.example`:

```text
EXPO_PUBLIC_FINANCE_API_URL=https://SEU-BACKEND.vercel.app
```

Essa URL pode ficar no aplicativo porque não é uma credencial privada. A chave secreta do Supabase jamais deve usar o prefixo `EXPO_PUBLIC_`.

Para desenvolvimento local:

- Expo Web / iOS Simulator: `http://localhost:3000`;
- celular físico: use o IP local do computador, por exemplo `http://192.168.0.10:3000`;
- Android Emulator padrão: normalmente `http://10.0.2.2:3000`.

## 9. Teste local

### Backend

Na pasta `backend`, crie `.env.local` ou use as variáveis importadas pela Vercel CLI.

Exemplo:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxx
ALLOWED_ORIGIN=*
```

Depois execute:

```bash
npx vercel dev
```

A API ficará normalmente em `http://localhost:3000`.

Teste no navegador/Postman/curl:

```bash
curl "http://localhost:3000/api/resumo?mes=9&ano=2026"
```

Cadastro:

```bash
curl -X POST "http://localhost:3000/api/lancamentos" \
  -H "Content-Type: application/json" \
  -d '{"descricao":"Salário","categoria":"Trabalho","valor":3500,"data":"2026-09-11","tipo":"receita"}'
```

### Expo

Na raiz:

```bash
npm install
npm run lint
npx tsc --noEmit
npx expo start
```

Se estiver usando celular físico, o celular e o computador devem conseguir acessar a mesma rede quando a API estiver local.

## 10. Deploy na Vercel

1. envie os arquivos para o GitHub;
2. entre na Vercel;
3. escolha **Add New Project**;
4. importe `FinanceiroMVP`;
5. configure **Root Directory** como `backend`;
6. adicione `SUPABASE_URL`, `SUPABASE_SECRET_KEY` e `ALLOWED_ORIGIN`;
7. faça o deploy;
8. copie a URL final, por exemplo `https://financeiro-mvp-api.vercel.app`;
9. coloque essa URL no `.env` do Expo em `EXPO_PUBLIC_FINANCE_API_URL`;
10. reinicie o Expo depois de alterar o `.env`.

## 11. Teste após deploy

Abra primeiro:

```text
https://SEU-BACKEND.vercel.app/api/resumo?mes=9&ano=2026
```

O retorno esperado é semelhante a:

```json
{
  "saldo": 0,
  "totalReceitas": 0,
  "totalDespesas": 0,
  "quantidadeLancamentos": 0,
  "mes": 9,
  "ano": 2026
}
```

Depois execute o Expo apontando para a URL publicada e teste:

- cadastrar receita;
- cadastrar despesa;
- editar;
- excluir;
- mudar o mês;
- mudar de dezembro para janeiro e vice-versa;
- fechar a API ou alterar temporariamente a URL para conferir a mensagem de erro.

## 12. Comandos em ordem

Na raiz do clone existente:

```bash
# 1. copie os arquivos deste pacote para o seu repositório

# 2. dependências do frontend (as mesmas que o projeto já possui)
npm install

# 3. validar o frontend
npm run lint
npx tsc --noEmit

# 4. iniciar o backend local
cd backend
npx vercel dev

# 5. em outro terminal, voltar à raiz e iniciar o Expo
cd ..
npx expo start
```

Deploy via Git/Vercel:

```bash
git add .
git commit -m "feat: adicionar modulo financeiro com API e Supabase"
git push origin main
```

A Vercel pode fazer o deploy automaticamente após o push quando o projeto estiver conectado ao repositório.

## 13. Decisões técnicas para explicar na prova

**Por que não usei Axios?**  
Porque `fetch` já existe no React Native e atende todo o CRUD, evitando uma dependência desnecessária.

**Por que backend separado dentro de `backend/`?**  
Para não misturar credenciais e código servidor com o aplicativo Expo. Na Vercel, basta definir `backend` como diretório raiz.

**Por que o Expo não acessa o Supabase diretamente?**  
Porque o requisito é manter a credencial privilegiada fora do aplicativo. O fluxo é Expo → API Vercel → Supabase.

**Como os totais se atualizam?**  
Depois de POST, PUT ou DELETE, o app recarrega `/api/lancamentos` e `/api/resumo` para o mês/ano atual.

**Por que mês/ano são enviados para a API?**  
O banco filtra apenas o período necessário, reduzindo dados enviados e mantendo o cálculo do resumo centralizado no backend.

**Como erros são tratados?**  
Há validação no formulário e também no backend. Erros HTTP ou falhas de conexão viram mensagens visíveis no aplicativo sem derrubar a tela.

## 14. Observação de segurança

Esta arquitetura protege corretamente a **credencial do banco**, mas ainda não implementa login/autorização por usuário. Para uma prova/MVP de uso controlado ela atende ao escopo solicitado. Para disponibilização pública multiusuário, o próximo passo seria adicionar autenticação (por exemplo Supabase Auth) e associar cada lançamento a um usuário, com autorização no backend.

## 12. Publicar o frontend Expo Web na Vercel

O projeto original já possui em `app.json`:

```json
"web": {
  "output": "static",
  "favicon": "./assets/images/favicon.png"
}
```

Portanto, não é necessário alterar a configuração do Expo para gerar a versão web.

Este pacote adiciona um `vercel.json` na raiz do projeto:

```json
{
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist",
  "devCommand": "npx expo start --web",
  "cleanUrls": true,
  "framework": null
}
```

### Criar o projeto do frontend na Vercel

No painel da Vercel:

1. clique em **Add New > Project**;
2. importe o mesmo repositório `FinanceiroMVP`;
3. neste projeto do frontend, deixe **Root Directory** apontando para a raiz do repositório;
4. a Vercel usará o `vercel.json` da raiz;
5. em **Settings > Environment Variables**, cadastre:

```text
EXPO_PUBLIC_FINANCE_API_URL=https://SEU-BACKEND.vercel.app
```

Essa variável precisa existir durante o build do Expo Web, pois o endereço da API pública será incluído no bundle do navegador. Ela não deve conter segredo algum.

Depois faça o deploy. O frontend ficará em uma URL parecida com:

```text
https://financeiro-mvp.vercel.app
```

### Projeto do backend na Vercel

O backend continua sendo um segundo projeto da Vercel apontando para o mesmo GitHub, mas com:

```text
Root Directory = backend
```

Variáveis do backend:

```text
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxx
ALLOWED_ORIGIN=https://financeiro-mvp.vercel.app
```

Durante os primeiros testes, `ALLOWED_ORIGIN=*` também funciona. Depois que souber a URL definitiva do frontend, prefira colocar o domínio exato.

### Arquitetura publicada

```text
Navegador / celular
       |
       v
Expo Web / React Native
https://financeiro-mvp.vercel.app
       |
       | HTTPS / fetch
       v
API financeira
https://financeiro-mvp-api.vercel.app
       |
       v
Supabase PostgreSQL
```

O usuário acessa apenas o site. O frontend conhece somente o endereço público da API. A chave secreta do Supabase permanece exclusivamente no backend.

## 13. Testar a versão web localmente antes do deploy

Para desenvolvimento normal:

```bash
npm install
npx expo start --web
```

Para testar exatamente o bundle de produção:

```bash
npx expo export --platform web
npx serve dist
```

Se você não tiver `serve` instalado, pode executar sem instalação global:

```bash
npx serve dist
```

Antes do teste, configure na raiz do projeto:

```text
EXPO_PUBLIC_FINANCE_API_URL=http://localhost:3000
```

ou use a API já publicada:

```text
EXPO_PUBLIC_FINANCE_API_URL=https://SEU-BACKEND.vercel.app
```

## 14. Ordem recomendada para colocar tudo online

1. Criar o projeto no Supabase.
2. Executar `backend/supabase/schema.sql` no SQL Editor.
3. Criar o projeto **backend** na Vercel com Root Directory `backend`.
4. Configurar `SUPABASE_URL` e `SUPABASE_SECRET_KEY` no backend.
5. Fazer deploy e testar `https://SEU-BACKEND.vercel.app/api/resumo?mes=9&ano=2026`.
6. Criar o projeto **frontend** na Vercel apontando para a raiz do mesmo repositório.
7. Configurar `EXPO_PUBLIC_FINANCE_API_URL=https://SEU-BACKEND.vercel.app` no frontend.
8. Fazer deploy do frontend.
9. Copiar a URL definitiva do frontend e atualizar `ALLOWED_ORIGIN` no projeto backend.
10. Fazer novo deploy do backend depois da alteração do CORS, se necessário.
11. Abrir a URL do frontend em um navegador e cadastrar, editar e excluir lançamentos.

## 15. O que explicar na prova sobre a versão web

Uma explicação simples é:

> O mesmo projeto Expo funciona no Android, iOS e navegador. Para a versão web, o Expo gera arquivos estáticos de produção dentro da pasta `dist`. A Vercel hospeda esses arquivos e fornece uma URL pública com HTTPS. O navegador chama uma segunda aplicação na Vercel, que é a API financeira. Somente essa API possui a chave secreta necessária para acessar o PostgreSQL no Supabase.

Assim você não mantém dois frontends diferentes e pode demonstrar o sistema diretamente pelo navegador.
