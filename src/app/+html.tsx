
import {
  ScrollViewStyleReset,
  useServerDocumentContext,
} from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function RootHtml({ children }: PropsWithChildren) {
  const {
    htmlAttributes,
    bodyAttributes,
    headNodes,
    bodyNodes,
  } = useServerDocumentContext();

  return (
    <html {...htmlAttributes} lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
        {/* O botão próprio do VLibras fica oculto: o acesso é pelo painel Aa.
            Escondemos APENAS o acionador, nunca o intérprete/janela. */}
        <style>{`
          [vw-access-button],
          .vw-access-button {
            opacity: 0 !important;
            visibility: hidden !important;
            pointer-events: none !important;
          }
        `}</style>
        {headNodes}
      </head>
      <body {...bodyAttributes}>
        {children}
        {bodyNodes}
        <script
          src="https://vlibras.gov.br/app/vlibras-plugin.js"
          defer
        />
      </body>
    </html>
  );
}

