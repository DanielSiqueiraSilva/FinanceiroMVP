# Oceafin — etapa 1: identidade e temas

Nova marca e design tokens em `src/design/tokens.ts`; o O com ondas é compartilhado
entre os cabeçalhos e o login. A ponte de cores em `useAccessibleStyles` é
temporária e deverá ser substituída por tokens semânticos tela a tela.

## Compatibilidade preservada
- Nenhuma migração SQL, alteração no backend ou operação em dados reais.
- Mantidos Expo slug, scheme, identificador do Android e IDs de Supabase.
- Mantida a chave de preferências `@finanmvp:acessibilidade:v1`
  para não perder a escolha de tema já salva.
- Ícones PNG de instalação e efeitos Liquid Glass estão fora desta primeira etapa.

## Testes
Rodar `npm ci --ignore-scripts`, `npx tsc --noEmit`, `npm run lint`,
`node --test backend/tests/*.test.mjs` e `npm run build:web`.
Validar visualmente login, dashboard, tema claro/escuro/sistema, troca de tema
em duas abas, atualização de página, 360/390/768/1024/1440 px e teclado.
Usar dados fictícios para testar as operações financeiras.
