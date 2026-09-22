import {chromium} from 'playwright';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:net';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
let server,base=process.env.QA_BASE;
if(!base){
  const socket=createServer();await new Promise(r=>socket.listen(0,'127.0.0.1',r));const port=socket.address().port;await new Promise(r=>socket.close(r));
  server=spawn(process.execPath,['scripts/serve.mjs','--port',String(port)],{cwd:root,stdio:'ignore',windowsHide:true});base=`http://127.0.0.1:${port}${config.basePath}`;
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
}
base=base.replace(/\/$/,'');
const browser=await chromium.launch({headless:true});
const errors=[];let layouts=0,flows=0;
const screenshotDir=process.env.QA_SCREENSHOTS;
if(screenshotDir)await mkdir(screenshotDir,{recursive:true});
try{
  const sitemap=await readFile(path.join(root,'dist/sitemap.xml'),'utf8');
  const routes=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>new URL(m[1]).pathname.slice(config.basePath.replace(/\/$/,'').length));
  for(const width of [360,768,1440]){
    const context=await browser.newContext({viewport:{width,height:1000},colorScheme:'light',reducedMotion:'reduce'});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    for(const route of routes){
      const response=await page.goto(base+route);assert.equal(response.status(),200,route);
      await page.evaluate(async()=>{for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode().catch(()=>{})));});
      assert.ok(await page.locator('h1:visible').first().isVisible(),route);
      const state=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,broken:[...document.images].filter(i=>!i.naturalWidth).length}));
      assert.equal(state.overflow,false,`Overflow: ${route} ${width}`);assert.equal(state.broken,0,`Image: ${route}`);layouts++;
      if(screenshotDir&&width!==768&&['/zh/','/zh/projects/','/zh/research/','/zh/resume/','/zh/search/','/zh/projects/commlab/'].includes(route))await page.screenshot({path:path.join(screenshotDir,`${route.replaceAll('/','_')}-${width}.png`)});
    }
    await context.close();
  }
  for(const locale of ['','zh/']){
    const context=await browser.newContext({viewport:{width:360,height:900},reducedMotion:'reduce'}),page=await context.newPage();
    await page.goto(`${base}/${locale}projects/`);
    for(const category of ['engineering','modeling','design','all']){
      await page.locator(`input[value="${category}"]`).check();
      assert.equal(await page.locator('[data-project-category]:visible').count(),category==='all'?6:2);
      assert.ok(await page.locator('.experience-section').isVisible());flows++;
    }
    await page.goto(`${base}/${locale}search/?q=NetSage`);
    await page.waitForFunction(()=>document.querySelector('#search-results li'));
    assert.match(await page.locator('#search-results a').first().getAttribute('href'),/netsage/);flows++;
    const alternate=page.locator('.language-switcher a:not([aria-current="page"])');
    assert.equal(new URL(await alternate.getAttribute('href'),page.url()).searchParams.get('q'),'NetSage');flows++;
    for(const query of ['NETSAGE TLS',locale?'张量':'tensor','CUMCM']){
      await page.locator('#search-query').fill(query);await page.locator('#search-form button').click();
      await page.waitForFunction(()=>document.querySelector('#search-results li'));
      assert.ok(await page.locator('#search-results li').count()>0);flows++;
    }
    await page.reload();await page.waitForFunction(()=>document.querySelector('#search-results li'));
    await page.locator('#search-results a').first().click();await page.goBack();
    await page.waitForFunction(()=>document.querySelector('#search-results li'));assert.equal(await page.locator('#search-query').inputValue(),'CUMCM');flows++;
    await page.locator('#search-query').fill('<img src=x onerror=alert(1)>');await page.locator('#search-form button').click();
    assert.equal(await page.locator('#search-results img').count(),0);assert.equal(await page.locator('#search-results li').count(),0);flows++;
    await page.locator('#search-query').fill('');await page.locator('#search-form button').click();
    assert.equal(new URL(page.url()).searchParams.has('q'),false);assert.equal(await page.locator('#search-results li').count(),0);flows++;
    await page.goto(`${base}/${locale}resume/`);
    const pdf=await page.locator('.resume-download').getAttribute('href');
    assert.equal((await page.request.get(new URL(pdf,page.url()).href)).status(),200);flows++;
    await context.close();
  }
  const offline=await browser.newContext(),p=await offline.newPage();
  await p.route('**/search-index-en.json',r=>r.abort());await p.goto(`${base}/search/?q=NetSage`);
  await p.locator('#search-retry').waitFor({state:'visible'});await p.unroute('**/search-index-en.json');await p.locator('#search-retry').click();
  await p.waitForFunction(()=>document.querySelector('#search-results li'));flows++;await offline.close();
  const nojs=await browser.newContext({javaScriptEnabled:false}),plain=await nojs.newPage();
  await plain.goto(`${base}/projects/`);assert.equal(await plain.locator('[data-project-category]:visible').count(),6);assert.equal(await plain.locator('[data-project-filter]:visible').count(),0);flows++;await nojs.close();
  const dark=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce'}),dp=await dark.newPage();
  await dp.goto(`${base}/zh/projects/commlab/`);assert.equal(await dp.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await dp.locator('.page-contents').count(),1);flows++;
  await dp.locator('.media-zoom').first().click();assert.ok(await dp.locator('dialog').isVisible());await dp.keyboard.press('Escape');assert.ok(!await dp.locator('dialog').isVisible());flows++;
  if(screenshotDir)await dp.screenshot({path:path.join(screenshotDir,'dark-commlab.png')});await dark.close();
  assert.deepEqual(errors,[]);console.log(`PASS ${layouts} responsive pages; ${flows} browsing, recovery, no-JS and dark-mode flows; no page errors.`);
}finally{await browser.close();server?.kill();}
