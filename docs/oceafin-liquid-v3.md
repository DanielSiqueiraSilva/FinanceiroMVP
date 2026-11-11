# Oceafin — refinamento Liquid Glass V3

Referência: OCEAFIN_PROMPT_MESTRE_IMPLEMENTACAO_VISUAL.md e
OCEAFIN_DESIGN_SYSTEM_HANDOFF.md (pacote 10/11/2026).

## Auditoria e escopo
- React Native 0.88 / Expo 58 / Expo Router / RN Web.
- Glass web anterior já tinha backdrop-filter, mas não verificava suporte,
  alta transparência reduzida ou destaque de bordas.
- Navegação V2 usava dois retângulos animados que podiam se separar.
- Botões principais ainda tinham estilos locais sem componentes compartilhados.
- Backend, Supabase, autenticação e dados não são alterados.

## Material
`OceanGlass` aplica desfoque de fundo quando o navegador suporta, e
respectivo suporte a -webkit-backdrop-filter; distingue materiais navigation,
floating, button, soft e solid. Possui reflexos leves, fallback opaco e respeita
contraste/transparência reduzida. No iOS nativo usa APIs verificadas do
expo-glass-effect; dispositivos sem suporte recebem alternativa sem blur.

## Controles
`OceanButton`, `OceanIconButton` e `OceanSegmentedControl` são a
base compartilhada de hover/foco/pressed/disabled/loading/selected. Botão
destrutivo tem cor semântica independente de ações confirmatórias.

## Limitações para QA
Os efeitos dependem do browser e da versão iOS. Testar o vidro *sobre conteúdo*
em telas autenticadas e não deduzir qualidade visual somente do build.
