# Arquitetura

O projeto está separado em frontend, backend e banco de dados.

```text
Usuário
  ↓
Frontend
  ↓
Backend
  ↓
Supabase
```

## Frontend

O frontend fica na pasta `src` e foi feito com Expo/React Native. Ele é responsável pelas telas, formulários, filtros e chamadas para a API.

O arquivo que concentra as chamadas para o backend é:

```text
src/services/finance-api.ts
```

## Backend

O backend fica na pasta `backend`. As rotas ficam dentro de:

```text
backend/api
```

Ele recebe as requisições do frontend, valida os dados principais e chama o Supabase.

## Banco

O banco usado é o Supabase com PostgreSQL. O frontend não deve chamar o banco diretamente, porque a chave secreta precisa ficar protegida no backend.

Fluxo esperado:

```text
Frontend → Backend → Supabase
```

## Variáveis de ambiente

Frontend:

```env
EXPO_PUBLIC_FINANCE_API_URL=
```

Backend:

```env
SUPABASE_URL=
SUPABASE_SECRET_KEY=
ALLOWED_ORIGIN=
```
