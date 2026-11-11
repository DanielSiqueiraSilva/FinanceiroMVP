import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

/** Audits the real Expo login route: no credentials or live financial writes. */
const root = resolve('dist');
const screenshots = resolve('visual-artifacts');
mkdirSync(screenshots, { recursive: true });
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};
const server = createServer((request, response) => {
  const relative = normalize(decodeURIComponent((request.url || '/').split('?')[0]))
    .replace(/^\/+/, '');
  if (relative.startsWith('..')) return response.writeHead(403).end();
  let path = join(root, relative);
  if (!extname(path)) {
    if (existsSync(join(path, 'index.html'))) path = join(path, 'index.html');
    else if (existsSync(path + '.html')) path += '.html';
    else path = join(root, 'index.html');
  }
  if (!existsSync(path)) return response.writeHead(404).end();
  response.setHeader('Content-Type', types[extname(path)] || 'application/octet-stream');
  response.end(readFileSync(path));
});
await new Promise(ok => server.listen(0, '127.0.0.1', ok));
const address = server.address();
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
let failures = 0;
try {
  for (const theme of ['light', 'dark']) {
    for (const width of [320, 360, 390, 768, 1024, 1440]) {
      const context = await browser.newContext({
        viewport: { width, height: 820 }, colorScheme: theme,
        reducedMotion: 'reduce', deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', error => pageErrors.push(error.message));
      const label = theme + '-' + width;
      try {
        await page.goto('http://127.0.0.1:' + address.port + '/', {
          waitUntil: 'domcontentloaded', timeout: 40000,
        });
        const glass = page.getByTestId('oceafin-login-glass');
        await glass.waitFor({ timeout: 22000 });
        await page.getByRole('button', { name: 'Entrar com e-mail e senha' })
          .waitFor({ timeout: 5000 });
        await page.waitForTimeout(600);
        const info = await page.evaluate(() => {
          const glass = document.querySelector('[data-testid="oceafin-login-glass"]');
          const style = glass ? getComputedStyle(glass) : null;
          return {
            width: document.documentElement.scrollWidth,
            windowWidth: innerWidth,
            blur: style?.backdropFilter || style?.webkitBackdropFilter || 'none',
            background: style?.backgroundColor || '',
          };
        });
        assert.ok(info.width <= width + 3, 'Horizontal overflow: ' + info.width);
        assert.ok(/blur\(/.test(info.blur), 'No rendered backdrop blur: ' + info.blur);
        assert.deepEqual(pageErrors, [], 'React/JS errors');
        const button = page.getByRole('button', { name: 'Entrar com e-mail e senha' });
        await button.focus();
        assert.equal(await button.evaluate(el => el === document.activeElement), true,
          'Primary button cannot receive keyboard focus');
        await page.screenshot({
          path: screenshots + '/login-' + label + '.png', fullPage: true,
        });
        console.log('PASS ' + label + ' document=' + info.width + ' blur=' + info.blur);
      } catch (error) {
        failures++;
        console.error('FAIL ' + label + ': ' + String(error));
        if (pageErrors.length) console.error('Page errors:', pageErrors.slice(0, 3));
        await page.screenshot({
          path: screenshots + '/error-' + label + '.png', fullPage: true,
        }).catch(() => {});
      } finally {
        await context.close();
      }
    }
  }
} finally {
  await browser.close();
  server.close();
}
if (failures) process.exitCode = 1;
