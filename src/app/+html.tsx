
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
        {/* Executado antes da hidratação: evita que o tema padrão sobrescreva
            a aparência salva enquanto o JavaScript do React está carregando. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function () {
              try {
                var raw = window.localStorage.getItem('@finanmvp:acessibilidade:v1');
                var value = raw ? JSON.parse(raw) : null;
                var choice = value && (value.theme === 'light' || value.theme === 'dark')
                  ? value.theme : 'system';
                var systemDark = window.matchMedia &&
                  window.matchMedia('(prefers-color-scheme: dark)').matches;
                var resolved = choice === 'dark' || (choice === 'system' && systemDark)
                  ? 'dark' : 'light';
                var root = document.documentElement;
                root.setAttribute('data-finance-theme', resolved);
                root.style.colorScheme = resolved;
                root.style.backgroundColor = resolved === 'dark' ? '#0B1220' : '#F7F5FA';
              } catch (_) {
                var fallback = window.matchMedia &&
                  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                document.documentElement.setAttribute('data-finance-theme', fallback);
                document.documentElement.style.colorScheme = fallback;
                document.documentElement.style.backgroundColor =
                  fallback === 'dark' ? '#0B1220' : '#F7F5FA';
              }
            })();`
          }}
        />
        <style>{`
          :root { --finance-page-bg: #F7F5FA; color-scheme: light; }
          :root[data-finance-theme="dark"] {
            --finance-page-bg: #0B1220; color-scheme: dark;
          }
          html, body { background-color: var(--finance-page-bg); }
          :root[data-finance-theme-ready="true"] body,
          :root[data-finance-theme-ready="true"] body * {
            transition-property: background-color, border-color, color;
            transition-duration: 180ms;
            transition-timing-function: ease-in-out;
          }
          @media (prefers-reduced-motion: reduce) {
            :root[data-finance-theme-ready="true"] body,
            :root[data-finance-theme-ready="true"] body * {
              transition-duration: 0ms !important;
            }
          }
        `}</style>
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

