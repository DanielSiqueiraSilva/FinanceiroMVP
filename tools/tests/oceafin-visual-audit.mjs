/**
 * Browser-level smoke test for the DEMO-ONLY /design-preview route.
 * All financial values are fake. No authentication or production database.
 * CI starts a local server from Expo's static web export.
 */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { extname, resolve, join, normalize } from 'node:path';
import { chromium } from 'playwright';

const directory = resolve('dist');
const screenshotDir = resolve('visual-artifacts');
mkdirSync(screenshotDir, { recursive: true });
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const server = createServer((req, res) => {
  const route = decodeURIComponent((req.url || '/').split('?')[0]);
  const clean = normalize(route).replace(/^\/+/, '');
  if (clean.startsWith('..')) { res.writeHead(403).end(); return; }
  let path = join(directory, clean);
  if (!extname(path)) {
    if (existsSync(join(path, 'index.html'))) path = join(path, 'index.html');
    else if (existsSync(path + '.html')) path += '.html';
    else path = join(directory, 'index.html');
  }
  if (!existsSync(path)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', contentTypes[extname(path)] || 'application/octet-stream');
  res.end(readFileSync(path));
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const { port } = server.address();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
let failures = 0;
try {
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 820 }, colorScheme: theme,
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(String(error.message)));
      const tag = theme + '-' + width;
      try {
        await page.goto('http://127.0.0.1:' + port + '/design-preview', {
          waitUntil: 'networkidle', timeout: 45000,
        });
        await page.getByTestId('oceafin-design-preview').waitFor({ timeout: 15000 });
        await page.getByText('Saldo disponível').first().waitFor();
        const box = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          windowWidth: window.innerWidth,
          pageText: document.body.textContent || '',
        }));
        assert.ok(box.documentWidth <= width + 2,
          'Horizontal overflow: ' + box.documentWidth + 'px on ' + tag);
        assert.ok(box.pageText.includes('Visão geral'), 'Dashboard absent on ' + tag);
        assert.deepEqual(errors, [], 'JavaScript errors on ' + tag);
        if (width < 900) {
          await page.getByRole('button', { name: 'Adicionar movimentação' }).click();
          await page.getByText('O que você deseja registrar?').waitFor();
          await page.getByRole('button', { name: 'Transferência' }).click();
          await page.getByText('Seção selecionada: contas').waitFor();
          assert.deepEqual(errors, [], 'Navigation JavaScript errors on ' + tag);
        } else {
          const collapse = page.getByRole('button', { name: 'Recolher menu lateral' });
          await collapse.click();
          await page.getByRole('button', { name: 'Expandir menu lateral' }).waitFor();
        }
        await page.screenshot({ path: screenshotDir + '/' + tag + '.png', fullPage: true });
        console.log('PASS ' + tag + ' width ' + box.documentWidth);
      } catch (error) {
        failures++;
        console.error('FAIL ' + tag + ': ' + String(error));
        if (errors.length) console.error('JS:', errors.slice(0, 5));
        await page.screenshot({
          path: screenshotDir + '/ERROR-' + tag + '.png', fullPage: true,
        }).catch(() => {});
      } finally { await context.close(); }
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (failures) process.exitCode = 1;
