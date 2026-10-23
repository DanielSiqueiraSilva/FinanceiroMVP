/**
 * Execute na raiz do FinanceiroMVP: node tools/aplicar-perfil-cabecalho.mjs
 * Substitui apenas o avatar "F" fixo pelo ProfileCard.
 * Não reescreve suas telas, transações ou acessibilidade.
 */
import { readFileSync, writeFileSync } from 'node:fs';

const arquivo = 'src/app/index.tsx';
const codigo = readFileSync(arquivo, 'utf8');
if (codigo.includes('<ProfileCard')) {
  console.log('O perfil já está integrado. Nenhuma alteração feita.');
  process.exit(0);
}
const avatar = /<View\s+style=\{styles\.avatar\}\s*>\s*<Text\s+style=\{styles\.avatarTexto\}\s*>\s*F\s*<\/Text>\s*<\/View>/;
if (!avatar.test(codigo)) {
  console.error('Não encontrei o avatar fixo F no index.tsx. Nada foi alterado; substitua-o manualmente por <ProfileCard />.');
  process.exit(1);
}
let novo = codigo.replace(avatar, '<ProfileCard />');
novo = "import { ProfileCard } from '../components/auth/ProfileCard';\n" + novo;
novo = novo.replace(
  /cabecalho:\s*\{\s*flexDirection:\s*'row',\s*alignItems:\s*'center',\s*justifyContent:\s*'space-between'\s*\}/,
  "cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }"
);
writeFileSync(arquivo, novo);
console.log('Avatar F substituído por ProfileCard em src/app/index.tsx.');
