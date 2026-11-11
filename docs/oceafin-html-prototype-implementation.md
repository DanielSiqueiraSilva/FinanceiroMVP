# Implementação do protótipo Oceafin HTML — versão integrada

Fonte de verdade: arquivo `oceafin_prototipo_interativo.html` criado e
aprovado na conversa. O HTML original é uma **demonstração independente**;
nenhum dado fictício do HTML é usado na aplicação autenticada.

## Mapeamento do protótipo para a aplicação

| Interação visual no HTML | Implementação integrada |
| --- | --- |
| Sidebar com lente líquida e estados | `OceanSidebar`, separação Contas/Cartões e menus completos |
| Dock mobile de cinco posições e + | `OceanBottomNavigation`: Início, Análises, +, Planejar, Perfil/Mais |
| Alternar tema claro/escuro | `AccessibilityContext.setTheme` + tokens existentes |
| Selecionar ano e mês | `PeriodSelector` existente com calendário de 12 meses |
| Saldo oceânico | `OceanHero prototype` usando `finance_account_overview` |
| Receitas e despesas | Resumo financeiro do mês carregado pela API existente |
| Alternar gráfico de receitas e despesas | `FlowBars` com 4 intervalos derivados dos lançamentos reais |
| Próximos vencimentos | `PaymentReminders compact` com expansão e marcar pago |
| Meta de emergência | Primeira meta ativa registrada, progresso com `goalProgress` |
| Orçamento do mês | Gasto mensal e limite real, edição em `MonthlyOverview` expandido |
| Lançamentos filtráveis | Abas Todos/Receitas/Despesas e formulários CRUD existentes |
| + Receita/Despesa/Transferência/Compra no cartão | Bottom sheet com destinos reais e validações existentes |
| Ocultar valores | Máscara de saldos, gastos, pendências, lembretes e gráficos |

## Decisões de segurança

- Não copiar cadastro ou lançamentos de demonstração do HTML.
- Não usar HTML como iframe: os componentes são Expo/React Native Web,
  reutilizáveis e responsivos.
- Transferências não criam receitas ou despesas; o app não movimenta dinheiro em banco.
- Marcar um lembrete como pago altera somente `payment_reminders.is_paid`,
  não gera um lançamento.
- Planejamento e saldos são estimativas baseadas em registros existentes.
- Autenticação, Supabase, RLS e API financeira não foram alterados.
- A opção "Reiniciar" do HTML foi omitida: em produção poderia sugerir exclusão
  de dados reais; no app os dados permanecem persistidos.
- Controle Desktop/Celular artificial do HTML foi substituído pelo layout
  responsivo real; teste de viewport fica apenas na homologação.
- A rota `design-audit` usa dados sintéticos, existe só na branch de QA
  e deverá ser **removida antes do merge em produção**.

## Evidência
As capturas de QA são geradas por GitHub Actions em 320, 360, 390,
768, 1024 e 1440 px nos dois temas, incluindo login, navegação, filtros,
botão + e uma seleção na sidebar. Testes financeiros automatizados
e export web continuam obrigatórios.

## Pendente
Testes manuais autenticados em homologação, leitores de tela e comparação
visual fina com todos os estados do HTML em navegadores reais.
