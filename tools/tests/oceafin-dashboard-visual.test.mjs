import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve, extname, normalize } from 'node:path';
import { chromium } from 'playwright';

/** QA-only route uses synthetic finance data. Does not access a real user account. */
const root = resolve('dist');
const screenshots = resolve('visual-artifacts');
mkdirSync(screenshots, { recursive: true });
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.svg':'image/svg+xml', '.png':'image/png',
  '.ico':'image/x-icon', '.woff2':'font/woff2', '.json':'application/json' };
const server=createServer((req,res)=>{
  const route=normalize(decodeURIComponent((req.url||'/').split('?')[0])).replace(/^\/+/, '');
  if(route.startsWith('..')) return res.writeHead(403).end();
  let p=join(root,route);
  if(!extname(p)){
    if(existsSync(join(p,'index.html')))p=join(p,'index.html');
    else if(existsSync(p+'.html'))p += '.html';
    else p=join(root,'index.html');
  }
  if(!existsSync(p))return res.writeHead(404).end();
  res.setHeader('Content-Type',types[extname(p)]||'application/octet-stream');
  res.end(readFileSync(p));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const {port}=server.address();
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
let failures=0;
try {
  for(const theme of ['light','dark']) for(const width of [320,360,390,768,1024,1440]) {
    const ctx=await browser.newContext({viewport:{width,height:820},
      colorScheme:theme,reducedMotion:'reduce'});
    const page=await ctx.newPage();
    const errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    const tag=theme+'-'+width;
    try {
      await page.goto('http://127.0.0.1:'+port+'/design-audit',{
        waitUntil:'domcontentloaded',timeout:45000,
      });
      await page.getByTestId('oceafin-prototype-dashboard').waitFor({timeout:15000});
      await page.getByText('Saldo disponível').first().waitFor();
      await page.waitForTimeout(700);
      const sizes=await page.evaluate(()=>({doc:document.documentElement.scrollWidth,
        inner:window.innerWidth}));
      assert.ok(sizes.doc<=width+3, 'Horizontal overflow '+sizes.doc+' at '+tag);
      assert.deepEqual(errors,[],'Javascript errors at '+tag);
      const expenses=page.getByRole('tab',{name:'Despesas'});
      await expenses.click();
      const selectedColor=await expenses.evaluate(el=>getComputedStyle(el).backgroundColor);
      assert.equal(selectedColor,'rgb(7, 204, 222)','Chart selection must be visually active');
      await page.getByRole('button',{name:'Ocultar valores financeiros'}).click();
      await page.getByText('R$ •••••').first().waitFor({timeout:5000});
      if(width<900){
        await page.getByRole('button',{name:'Adicionar movimentação'}).click();
        await page.getByRole('button',{name:'Receita',exact:true}).click();
        await page.waitForFunction(() => {
          const node=document.querySelector('[data-testid="audit-nav-state"]');
          return node?.textContent?.includes('receita');
        }, { timeout: 5000 });
      } else {
        await page.getByRole('button',{name:'Recolher menu lateral'}).click();
        await page.getByRole('button',{name:'Expandir menu lateral'}).waitFor();
      }
      assert.deepEqual(errors,[],'Interaction JS errors at '+tag);
      await page.screenshot({path:screenshots+'/dashboard-'+tag+'.png',fullPage:true});
      console.log('PASS dashboard '+tag+' width='+sizes.doc);
    } catch(e){
      failures++;
      console.error('FAIL dashboard '+tag+': '+String(e));
      if(errors.length)console.error('JS errors',errors.slice(0,3));
      await page.screenshot({path:screenshots+'/ERROR-dashboard-'+tag+'.png',fullPage:true}).catch(()=>{});
    } finally {await ctx.close();}
  }
} finally { await browser.close();server.close();}
if(failures) process.exitCode=1;
