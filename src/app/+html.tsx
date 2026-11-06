
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
                root.setAttribute('data-finance-high-contrast', String(Boolean(value && value.highContrast)));
                root.setAttribute('data-finance-reduce-motion', String(Boolean(value && value.reduceMotion)));
                root.setAttribute('data-finance-focus', String(Boolean(value && value.focusHighlight)));
                root.setAttribute('data-finance-keyboard', String(Boolean(value && value.keyboardNavigation)));
                root.setAttribute('data-finance-text-spacing', String(Boolean(value && value.textSpacing)));
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
          /* O popup de divulgação é distinto do tradutor e não deve flutuar. */
          #vlibras-popup { display: none !important; visibility: hidden !important; }
          :root[data-finance-reduce-motion="true"] *,
          :root[data-finance-reduce-motion="true"] *::before,
          :root[data-finance-reduce-motion="true"] *::after {
            animation-duration: 0.01ms !important;
            transition-duration: 0ms !important;
            scroll-behavior: auto !important;
          }
          :root[data-finance-focus="true"] :is(a, input, button, select, textarea,
            [role="button"], [role="switch"], [role="radio"], [tabindex]):focus-visible {
            outline: 3px solid #A78BFA !important;
            outline-offset: 3px !important;
            box-shadow: 0 0 0 5px rgba(124,58,237,0.22) !important;
          }
          /* O teclado já funciona normalmente: a opção melhora a visibilidade do foco. */
          :root[data-finance-keyboard="true"] :is(a, input, button, select, textarea,
            [role="button"], [role="switch"], [role="radio"], [tabindex]):focus-visible {
            outline: 4px solid #C084FC !important;
            outline-offset: 4px !important;
          }
          :root[data-finance-text-spacing="true"] body {
            letter-spacing: 0.035em !important;
          }
          :root[data-finance-text-spacing="true"] :is(p, label, h1, h2, h3, span, [role="text"]) {
            line-height: 1.6 !important;
          }
          :root[data-finance-high-contrast="true"] :is(input, textarea, select,
            [role="button"], [role="switch"], [role="radio"]) {
            outline-offset: 2px;
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

