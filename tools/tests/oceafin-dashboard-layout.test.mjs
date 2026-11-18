import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

const root = resolve('dist');
const output = resolve('visual-artifacts');
mkdirSync(output, {recursive:true});
const types = {
  '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json',
  '.svg':'image/svg+xml', '.png':'image/png', '.woff2':'font/woff2',
};
const server = createServer((request,response) => {
  const relative = normalize(decodeURIComponent((request.url || '/').split('?')[0]))
    .replace(/^\/+/,'');
  if (relative.startsWith('..')) return response.writeHead(403).end();
  let path = join(root,relative);
  if (!extname(path)) {
    if (existsSync(join(path,'index.html'))) path=join(path,'index.html');
    else if (existsSync(path+'.html')) path+='.html';
    else path=join(root,'index.html');
  }
  if (!existsSync(path)) return response.writeHead(404).end();
  response.setHeader('Content-Type',types[extname(path)]||'application/octet-stream');
  response.end(readFileSync(path));
});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const address=server.address();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let failed=0;
const rect=locator=>locator.boundingBox();
try {
  for(const theme of ['light','dark']) {
    for(const width of [320,390,768,1024,1440]) {
      const context=await browser.newContext({
        viewport:{width,height:840},colorScheme:theme,
        reducedMotion:'reduce',deviceScaleFactor:1,
      });
      const page=await context.newPage();
      const errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      const label=theme+'-'+width;
      try {
        await page.goto('http://127.0.0.1:'+address.port+'/ocean-layout-qa',
          {waitUntil:'domcontentloaded',timeout:40000});
        const dashboard=page.getByTestId('oceafin-prototype-dashboard');
        await dashboard.waitFor({timeout:25000});
        await page.getByTestId('oceafin-dashboard-quick-actions').waitFor();
        await page.waitForTimeout(700);
        const summary=await rect(page.getByTestId('oceafin-dashboard-summary'));
        const hero=await rect(page.getByTestId('oceafin-prototype-hero'));
        const receipts=await rect(page.getByTestId('oceafin-stat-receita'));
        const expenses=await rect(page.getByTestId('oceafin-stat-despesa'));
        const quick=await rect(page.getByTestId('oceafin-dashboard-quick-actions'));
        const flows=await rect(page.getByTestId('oceafin-dashboard-flow-reminders'));
        const rootBox=await rect(dashboard);
        assert.ok(summary&&hero&&receipts&&expenses&&quick&&flows&&rootBox,
          'Missing dashboard layout boxes');
        const actualWidth=await page.evaluate(()=>document.documentElement.scrollWidth);
        assert.ok(actualWidth<=width+3,
          'Horizontal overflow '+actualWidth+' at '+width);
        const wide=rootBox.width>=720;
        if(wide) {
          assert.ok(receipts.x>=hero.x+hero.width-3,
            'Desktop receipt card must be beside the balance');
          assert.ok(Math.abs(hero.y-receipts.y)<5,
            'Desktop cards must start at the same vertical position');
          assert.ok(Math.abs((hero.y+hero.height)-(expenses.y+expenses.height))<16,
            'Desktop summary cards must end on the same line');
        } else {
          assert.ok(Math.abs(receipts.y-expenses.y)<5,
            'Mobile receipt and expense cards must be in one row');
          assert.ok(receipts.y>=hero.y+hero.height-2,
            'Mobile financial cards overlap the hero');
          assert.ok(receipts.y-(hero.y+hero.height)<32,
            'Unexpected mobile empty gap after hero');
        }
        const summaryBottom=Math.max(hero.y+hero.height,receipts.y+receipts.height,expenses.y+expenses.height);
        assert.ok(quick.y>=summaryBottom-3&&quick.y-summaryBottom<42,
          'Quick actions must follow the financial summary');
        assert.ok(flows.y>=quick.y+quick.height-4&&flows.y-(quick.y+quick.height)<48,
          'Graph and reminders must follow quick actions without empty gaps');
        assert.deepEqual(errors,[],'Browser runtime errors');
        await page.screenshot({path:output+'/dashboard-'+label+'.png',fullPage:true});
        console.log('PASS dashboard '+label+' layout='+(wide?'wide':'compact'));
      } catch(e) {
        failed++;
        console.error('FAIL dashboard '+label+': '+String(e));
        if(errors.length)console.error('Page errors: '+errors.slice(0,3).join('; '));
        await page.screenshot({path:output+'/error-dashboard-'+label+'.png',fullPage:true}).catch(()=>{});
      } finally {await context.close()}
    }
  }
} finally {await browser.close();server.close()}
if(failed)process.exitCode=1;