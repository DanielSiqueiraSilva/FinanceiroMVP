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
        await page.getByRole('button', { name: 'Entrar na Oceafin' })
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
        // The approved composition is split on desktop, one focused glass card on mobile.
        const brand = page.getByTestId('oceafin-login-brand-panel');
        const brandDisplay = await brand.evaluate(el => getComputedStyle(el).display);
        const right = page.getByTestId('oceafin-login-glass');
        if (width >= 900) {
          assert.notEqual(brandDisplay,'none','Desktop Ocean Split branding is missing');
          const leftBox = await brand.boundingBox();
          const rightBox = await right.boundingBox();
          assert.ok(leftBox && rightBox && rightBox.x > leftBox.x + leftBox.width - 3,
            'Desktop brand and login card are not side by side');
        } else {
          assert.equal(brandDisplay,'none','Mobile must prioritize the Glass Central card');
        }
        // Oceafin's O-wave logo must be visible and every SVG gradient must be
        // resolvable without collisions between mobile, sidebar, and login copies.
        const logoCheck = await page.locator('[data-testid="oceafin-login-glass"] svg')
          .first().evaluate(svg => {
            const bounds = svg.getBoundingClientRect();
            const ownIds = Array.from(svg.querySelectorAll('linearGradient[id]'))
              .map(node => node.id);
            const fills = Array.from(svg.querySelectorAll('path'))
              .map(node => node.getAttribute('fill') || '')
              .filter(fill => fill.startsWith('url(#'))
              .map(fill => fill.slice(5,-1));
            const all = Array.from(document.querySelectorAll('linearGradient[id]'));
            return { size: [bounds.width,bounds.height], gradients: ownIds.length,
              fills: fills.length,
              valid: fills.every(id => ownIds.includes(id) &&
                all.filter(node => node.id === id).length === 1) };
          });
        assert.ok(logoCheck.size[0] >= 20 && logoCheck.size[1] >= 20,
          'Oceafin O-wave mark is invisible');
        assert.ok(logoCheck.gradients >= 3 && logoCheck.fills >= 3 && logoCheck.valid,
          'Oceafin logo gradient references are missing or duplicated');
        await page.getByRole('button',{name:'Entrar com chave de acesso'}).waitFor();
        await page.getByRole('button',{name:'Mostrar senha'}).click();
        await page.getByRole('button',{name:'Ocultar senha'}).waitFor();
        await page.getByRole('button',{name:'Ocultar senha'}).click();
        await page.getByRole('button',{name:'Criar conta',exact:true}).click();
        await page.getByTestId('oceafin-login-name').waitFor();
        await page.getByRole('button',{name:'Criar minha conta'}).waitFor();
        await page.getByRole('button',{name:'Entrar na conta existente'}).click();
        await page.getByRole('button',{name:'Entrar na Oceafin'}).waitFor();
        assert.deepEqual(pageErrors, [], 'React/JS errors');
        const button = page.getByRole('button', { name: 'Entrar na Oceafin' });
        await button.focus();
        assert.equal(await button.evaluate(el => el === document.activeElement), true,
          'Primary button cannot receive keyboard focus');
        const primaryInk = await button.evaluate(el => {
          const text = [...el.querySelectorAll('*')].reverse().find(node =>
            node.childElementCount === 0 && node.textContent?.trim() ===
            'Entrar na Oceafin');
          if (!text) throw new Error('Primary button label is missing');
          const match = getComputedStyle(text).color.match(/[0-9.]+/g);
          if (!match || match.length < 3) throw new Error('Unreadable computed label color');
          return match.slice(0,3).map(Number);
        });
        if (theme === 'light') {
          assert.ok(Math.max(...primaryInk) < 150,
            'Light theme button must have dark ink, got ' + primaryInk.join(','));
        } else {
          assert.ok(Math.min(...primaryInk) > 195,
            'Dark theme button must have light ink, got ' + primaryInk.join(','));
        }
        const buttonShape = await button.evaluate(el => getComputedStyle(el).borderRadius);
        assert.ok(parseFloat(buttonShape) >= 20,
          'Primary button must retain a rounded liquid-glass shape, got ' + buttonShape);
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
