# Oceafin — Etapa 4: fluxo financeiro integrado (UI)

Esta etapa não altera schema SQL, API, saldo no banco, RLS ou identidades:
são aprimoramentos de interface e validação na origem do registro.

## Como os fluxos se conectam
1. Cadastro de contas e cartões mantém a lógica e os valores existentes.
2. A tela explica a diferença entre saldo inicial, resultados do mês,
   saldo estimado de contas e compras pendentes em cartão.
3. Operações de transferência, pagamento de cartão e vinculação foram
   organizadas em etapas selecionáveis, evitando exibir todos os formulários.
4. Transferência entre contas não cria receitas/despesas; apenas ajusta
   estimativas na contabilidade interna, pela RPC já existente.
5. Pagamento do cartão diminui saldo de conta e pendente registrado, **não**
   cria nova despesa. A RPC existente aplica proteção contra excesso,
   com bloqueio transacional.
6. Vínculo de lançamento com cartão é restrito a despesas; receitas só
   podem ser vinculadas a contas.
7. Campos não são apagados em caso de erro no registro. Botões têm
   bloqueio adicional contra toques rápidos duplicados e confirmação
   explícita antes de escrever transferências ou pagamentos.

## Critérios de segurança
- A autenticação e RLS existentes continuam sendo a fonte da autorização.
- Os novos validadores de frontend são auxiliares; RPCs continuam
  autoritativas sobre pagamentos e transferências.
- Não há integração bancária real, transferência monetária externa ou
  pagamento de fatura pelo aplicativo.
- Nesta etapa não foi usado banco real para teste de escrita.

## Validação
`npx tsc --noEmit`, lint dos módulos de validação,
`node --experimental-strip-types --test tools/tests/oceafin-finance-flow.test.mjs`,
testes backend existentes e `npm run build:web`.
Testes visuais e de ponta a ponta em staging com dados fictícios ainda
devem ser concluídos antes de mesclar o PR na main.
