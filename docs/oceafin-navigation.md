# Oceafin — Etapa 2: navegação adaptativa

A sidebar (desktop, a partir de 900 px) oferece o estado expandido (244 px)
e recolhido (78 px). O menu colapsado mantém títulos acessíveis, enquanto o
menu inferior do celular mantém três destinos principais e um menu Mais
para todas as seções restantes.

Os componentes estão isolados em `src/components/navigation/OceanNavigation.tsx`.
O destaque selecionado é animado com opacidade. A sidebar anima a largura
sem alterar o estado financeiro da aplicação.

## Acessibilidade e performance
- Usa `AccessibilityInfo.isReduceMotionEnabled` e escuta mudanças de preferência.
- Identifica itens selecionados e expõe expandido/recolhido.
- Sem blur obrigatório: superfícies translúcidas/opacas compatíveis com web/nativo.
- Menu Mais permite fechar antes de navegar e contém todos os destinos existentes.

## Validação
`npx tsc --noEmit`, `npm run build:web`, `node --test backend/tests/*.test.mjs`.
Testar navegação por teclado, foco, estados selecionados, tablets e celulares
com tamanhos diversos, leitura de tela, zoom e movimento reduzido.
O lint completo é auditado separadamente devido à dívida técnica anterior.
