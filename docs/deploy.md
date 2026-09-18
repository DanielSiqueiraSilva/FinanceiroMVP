# Deploy

O deploy precisa ser feito em duas partes: backend e frontend.

## Backend

O backend está na pasta `backend`.

Configuração sugerida:

```text
Root Directory: backend
Build Command: npm install
Start Command: npm start
```

Variáveis necessárias:

```env
SUPABASE_URL=https://SEU-PROJETO.supabase.co
SUPABASE_SECRET_KEY=sb_secret_xxxxxxxxxxxxxxxxx
ALLOWED_ORIGIN=*
```

Uma rota simples para testar depois de publicar:

```text
/api/resumo?mes=9&ano=2026
```

## Frontend

O frontend fica na raiz do projeto.

Configuração sugerida:

```text
Build Command: npm run build
Output Directory: dist
```

Variável necessária:

```env
EXPO_PUBLIC_FINANCE_API_URL=https://URL-DO-BACKEND
```

## Banco

No Supabase, é preciso executar o script:

```text
backend/supabase/schema.sql
```

Depois disso, o backend deve receber a URL do projeto e a chave secreta pelas variáveis de ambiente.

## Cuidados

- Não subir `.env` para o GitHub.
- Conferir se o frontend está apontando para a URL correta do backend.
- Testar a API antes de testar a tela.
