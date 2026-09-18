# Banco e API

O projeto usa Supabase como banco em nuvem. A API do backend acessa o Supabase e o frontend consome essa API.

## Tabelas

### `lancamentos`

Guarda as receitas e despesas cadastradas.

Campos principais:

- `id`
- `descricao`
- `categoria`
- `valor`
- `data`
- `tipo`
- `created_at`
- `updated_at`

### `limites_mensais`

Guarda o limite de gastos de cada mês.

Campos principais:

- `id`
- `mes`
- `ano`
- `valor`
- `created_at`
- `updated_at`

## Rotas principais

```text
GET    /api/lancamentos?mes=9&ano=2026
POST   /api/lancamentos
GET    /api/lancamentos/:id
PUT    /api/lancamentos/:id
DELETE /api/lancamentos/:id
GET    /api/resumo?mes=9&ano=2026
GET    /api/limite?mes=9&ano=2026
PUT    /api/limite
```

## Exemplo de lançamento

```json
{
  "descricao": "Supermercado",
  "categoria": "Alimentação",
  "valor": 150.5,
  "data": "2026-09-18",
  "tipo": "despesa"
}
```

## Erros

Quando alguma validação falha, a API retorna uma mensagem em JSON com `error`. Isso ajuda o frontend a mostrar o problema para o usuário.
