/**
 * Atualiza apenas o ponto de entrada da tela financeira, sem substituir
 * seu index.tsx por uma versão antiga (preserva meses, gráficos, Libras etc).
 * Execute na raiz: node tools/aplicar-no-index.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';
const filename = 'src/app/index.tsx';
const old = readFileSync(filename, 'utf8');
if (old.includes('ProtectedFinance')) {
  console.log('O index.tsx já está protegido. Nenhuma alteração necessária.');
  process.exit(0);
}
const originalExport = /export\s+default\s+function\s+([A-Za-z_$][\w$]*)\s*\(/;
const match = old.match(originalExport);
if (!match) {
  console.error('Não encontrei "export default function Nome(". Não alterei o arquivo. Mostre o index.tsx para integrar manualmente.');
  process.exit(1);
}
const originalName = match[1];
let updated = old.replace(originalExport, `function ${originalName}(`);
updated = `import { ProtectedFinance } from '../components/auth/ProtectedFinance';\n` + updated;
updated += `\n// Proteção da tela: desmonta todo o financeiro quando a sessão termina.\nexport default function FinanceiroProtegido() {\n  return <ProtectedFinance><${originalName} /></ProtectedFinance>;\n}\n`;
writeFileSync(filename, updated);
console.log(`Sessão integrada em ${filename}. O componente anterior (${originalName}) foi preservado.`);
