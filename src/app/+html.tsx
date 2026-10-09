import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/** HTML usado apenas na versão Web estática do Expo Router. */
export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="light dark" />
        <ScrollViewStyleReset />
      </head>
      <body>
        {children}
        {/* Widget oficial com tradução de texto selecionado para Libras (Web). */}
        <script src="https://vlibras.gov.br/app/vlibras-plugin.js" defer />
      </body>
    </html>
  );
}
