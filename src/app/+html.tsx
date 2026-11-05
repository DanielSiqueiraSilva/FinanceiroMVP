
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

