# Oceafin — Etapa 3: Dashboard Premium

## Entregas
- `OceanDashboard.tsx`: layout responsivo com hierarquia de resumo, receitas,
  despesas, saldos estimados, compras pendentes, atalhos, orçamento,
  recorrências, gastos por categoria e lançamentos recentes.
- `dashboard-data.ts`: seletores puros de categorias, histórico e contas/cartões.
- `FinanceWorkspace.tsx` passa os dados existentes, sem editar consultas ou APIs.
- Texto do orçamento ajustado de "Fatura atual" para "Despesas do mês":
  orçamento não é fatura de cartão.

## Semântica financeira preservada
- Resultado do período é `resumo.saldo`, não saldo bancário.
- Contas são estimativas das funções de overview existentes no backend.
- Cartões apresentam compras registradas ainda não marcadas como pagas.
- Previsões de recorrência ficam separadas de movimentações contabilizadas.
- Na ausência de dados do planejamento, não são inventados saldos zero.

## Segurança
Sem mudanças em SQL, permissões, rotas API ou registros reais.
A versão pública na `main` permanece intacta. Preview visual e interação
com leitor de tela ainda precisam de avaliação manual.

## Testes
`npx tsc --noEmit`, lint do novo dashboard, testes puros com Node 22,
testes backend e `npm run build:web`.
Também verificar 360/390/768/1024/1440 px, modo claro/escuro,
zoom 200%, textos longos, BRL grande e movimento reduzido.
