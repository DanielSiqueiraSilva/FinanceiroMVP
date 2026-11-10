# Oceafin V2 — identidade, layout e navegação orgânica

Fonte de verdade: OCEAFIN_DESIGN_SYSTEM_HANDOFF.md (enviado na conversa)
e prancha visual Oceafin de 09/11/2026.

## Política de implementação
- A marca usa símbolo O e onda integrada, com gradientes navy/azul/turquesa.
  SVG escalável derivado do conceito da prancha, ainda sujeito à comparação
  visual fina com a arte original; não é exportação automática do brandboard.
- Superfícies: Glass Navigation (16px), Glass Floating (18px),
  Soft Glass (8px), áreas de formulário/tabela opacas.
- Web: backdrop-filter com fallback visível. iOS 26+: efeito nativo
  via expo-glass-effect. Em Android/iOS antigo, fallback sólido para garantir
  contraste até implementação/validação de blur nativo multiplataforma.
- Movimento reduzido desliga deformações; nunca atrasa a troca de conteúdo.
- Não alterar RPCs, autenticação, RLS, banco nem fluxos de dados.

## Restrições e pendências
- Precisa validar visualmente a logo derivada ao lado da prancha.
- Fontes Manrope/Inter via Google Fonts na web; demais plataformas usarão
  fonte do sistema até inclusão de assets de fonte com licença e testes.
- O CSS de glass é progressivo: navegadores sem backdrop-filter usam fundo
  semitransparente com contraste e borda, não refração obrigatória.

## Preparação para publicação na main

- QA visual automatizado em Chromium concluído com sucesso antes da remoção da
  rota temporária: 320, 360, 390, 768, 1024, 1440 px, em claro e escuro.
  Evidências e capturas: GitHub Actions execução 42733505541.
- A rota pública temporária `src/app/design-preview.tsx` e seu script de teste
  foram retirados do pacote de publicação. O CI bloqueia nova exposição.
- Atenção: uma aprovação de testes automatizados não substitui revisão
  autenticada de contas, cartões e operações com dados fictícios, nem
  comparação visual exata com a prancha e testes nativos.
- Sem alteração de modelos de banco, RLS, APIs ou registros financeiros.
