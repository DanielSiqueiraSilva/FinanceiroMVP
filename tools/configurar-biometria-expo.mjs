import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const file = 'app.json';
if (!existsSync(file) || existsSync('app.config.js') || existsSync('app.config.ts')) {
  console.error('Não modifiquei a configuração: ajuste manualmente os plugins em app.config.* ou confira o app.json.');
  process.exitCode = 1;
} else {
  const cfg = JSON.parse(readFileSync(file, 'utf8'));
  if (!cfg.expo) throw new Error('app.json não possui a propriedade expo.');
  const plugins = cfg.expo.plugins ?? [];
  for (const [name, props] of [
    ['expo-local-authentication', { faceIDPermission: 'Permitir que o FinanMVP use o Face ID para confirmar sua identidade.' }],
    ['expo-secure-store', { faceIDPermission: 'Permitir que o FinanMVP proteja o acesso às suas finanças por Face ID.', configureAndroidBackup: true }],
  ]) {
    if (!plugins.some(x => (typeof x === 'string' ? x : x[0]) === name)) plugins.push([name, props]);
  }
  cfg.expo.plugins = plugins;
  writeFileSync(file, JSON.stringify(cfg, null, 2) + '\n');
  console.log('Plugins de biometria/SecureStore adicionados sem excluir os existentes.');
}
