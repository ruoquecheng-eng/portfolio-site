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
      if(screenshotDir&&width!==768&&['/zh/','/zh/projects/','/zh/research/','/zh/resume/','/zh/search/','/zh/materials/','/zh/projects/commlab/'].includes(route))await page.screenshot({path:path.join(screenshotDir,`${route.replaceAll('/','_')}-${width}.png`)});
    }
    await context.close();
  }
  for(const locale of ['','zh/']){
    const context=await browser.newContext({viewport:{width:360,height:900},reducedMotion:'reduce'}),page=await context.newPage();
    await page.goto(`${base}/${locale}projects/`);
    await page.locator('input[value="modeling"]').check();
    await page.reload();
    assert.equal(await page.locator('input[value="modeling"]').isChecked(),true);flows++;
    await page.locator('[data-project-category]:visible .text-link').first().click();await page.goBack();
    assert.equal(await page.locator('input[value="modeling"]').isChecked(),true);flows++;
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
    assert.ok(await page.locator('.print-button').evaluate(el=>el.getBoundingClientRect().width<300));flows++;
    const pdf=await page.locator('.resume-download').getAttribute('href');
    assert.equal((await page.request.get(new URL(pdf,page.url()).href)).status(),200);flows++;
    const resumeVersion=new URL(pdf,page.url()).searchParams.get('v');
    assert.ok(resumeVersion,'Resume downloads must request the current PDF version');
    await page.goto(`${base}/${locale}materials/`);
    assert.equal(await page.locator('.material-card').count(),9);
    const materialResume=page.locator(`.material-card a[download][href*="resume-${locale?'zh':'en'}.pdf"]`);
    assert.equal(new URL(await materialResume.getAttribute('href'),page.url()).searchParams.get('v'),resumeVersion);
    assert.equal(await page.locator('.material-source a').count(),9);flows++;
    await page.goto(`${base}/${locale}search/?q=237.423&type=projects`);
    await page.waitForFunction(()=>document.querySelector('#search-results li'));
    assert.ok((await page.locator('#search-results a').allTextContents()).length>0);
    for(const href of await page.locator('#search-results a').evaluateAll(links=>links.map(a=>a.href)))assert.ok(new URL(href).pathname.includes('/projects/'));
    assert.ok((await page.locator('.search-result-snippet mark').allTextContents()).includes('237.423'));flows++;
    await page.locator('input[name="search-type"][value="all"]').check();
    await page.goBack();
    await page.waitForFunction(()=>document.querySelector('input[name="search-type"][value="projects"]').checked);
    assert.equal(new URL(page.url()).searchParams.get('type'),'projects');
    const translatedSearch=new URL(await page.locator('.language-switcher a:not([aria-current="page"])').getAttribute('href'),page.url());
    assert.equal(translatedSearch.searchParams.get('q'),'237.423');assert.equal(translatedSearch.searchParams.get('type'),'projects');
    await page.goForward();
    await page.waitForFunction(()=>document.querySelector('input[name="search-type"][value="all"]').checked);flows++;
    await page.locator('.search-clear').click();
    assert.equal(await page.locator('#search-query').inputValue(),'');
    assert.equal(new URL(page.url()).searchParams.has('q'),false);
    assert.equal(new URL(page.url()).searchParams.has('type'),false);
    assert.equal(await page.locator('#search-results li').count(),0);flows++;
    await page.locator('.search-suggestions [data-query="NetSage"]').click();
    await page.waitForFunction(()=>document.querySelector('#search-results li'));
    assert.equal(await page.locator('#search-query').inputValue(),'NetSage');flows++;
    await page.locator('.search-clear').click();
    await page.locator('#search-query').dispatchEvent('compositionstart');
    await page.locator('#search-query').fill(locale?'张量':'tensor');
    // This interval exceeds the input debounce: unfinished composition must not search.
    await page.waitForTimeout(250);
    assert.equal(new URL(page.url()).searchParams.has('q'),false);
    await page.locator('#search-query').dispatchEvent('compositionend');
    await page.waitForFunction(()=>document.querySelector('#search-results li'));flows++;
    if(screenshotDir)await page.screenshot({path:path.join(screenshotDir,`search-matches-${locale?'zh':'en'}.png`)});
    await context.close();
  }
  for(const locale of ['','zh/']){
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',permissions:['clipboard-read','clipboard-write']});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(`${base}/${locale}projects/commlab/`);
    assert.equal(await page.locator('.back-to-top:visible').count(),0);
    await page.locator('.page-contents summary').click();
    const link=page.locator('.page-contents nav a').nth(2),hash=await link.getAttribute('href');
    await link.click();
    await page.waitForFunction(hash=>document.querySelector(`.page-contents a[href="${hash}"]`)?.getAttribute('aria-current')==='location',hash);
    assert.equal(await page.locator('.page-contents [aria-current="location"]').count(),1);flows++;
    await page.locator(`${hash} + .section-copy`).click();
    await page.waitForFunction(()=>[...document.querySelectorAll('.section-copy-status')].some(el=>/copied|已复制/.test(el.textContent)));
    assert.equal(new URL(await page.evaluate(()=>navigator.clipboard.readText())).hash,hash);flows++;
    await page.reload();
    await page.waitForFunction(hash=>document.querySelector(`.page-contents a[href="${hash}"]`)?.getAttribute('aria-current')==='location',hash);flows++;
    await page.emulateMedia({media:'print'});
    assert.equal(await page.locator('.section-copy:visible,.back-to-top:visible').count(),0);flows++;
    await page.emulateMedia({media:'screen'});
    await page.locator('.back-to-top').click();
    await page.waitForFunction(()=>scrollY<3);
    assert.ok(await page.evaluate(()=>['H1','MAIN'].includes(document.activeElement.tagName)));flows++;
    await page.keyboard.press('/');
    await page.waitForURL(`**/${locale}search/#search-query`);
    await page.locator('#search-query').waitFor({state:'visible'});
    assert.ok(await page.locator('#search-query').evaluate(el=>el===document.activeElement));
    await page.locator('#search-query').fill('NetSage');await page.keyboard.press('/');
    assert.equal(await page.locator('#search-query').inputValue(),'NetSage/');flows++;
    await context.close();
  }
  const denied=await browser.newContext({reducedMotion:'reduce'}),fallbackPage=await denied.newPage();
  await fallbackPage.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:()=>Promise.reject(new Error('Clipboard denied for test'))}}));
  await fallbackPage.goto(`${base}/zh/projects/radio-localization/?from=qa`);
  assert.equal(await fallbackPage.locator('.page-contents').count(),0);
  await fallbackPage.locator('.radio-section-nav a[href="#results"]').click();
  await fallbackPage.locator('#results .section-copy').first().click();
  const fallbackInput=fallbackPage.locator('.section-copy-fallback input:visible');
  await fallbackInput.waitFor({state:'visible'});
  const sharedUrl=new URL(await fallbackInput.inputValue());assert.equal(sharedUrl.hash,'#results');assert.equal(sharedUrl.search,'');
  assert.ok(await fallbackInput.evaluate(el=>el.readOnly&&el.selectionEnd-el.selectionStart===el.value.length));flows++;
  if(screenshotDir)await fallbackPage.screenshot({path:path.join(screenshotDir,'section-link-fallback.png')});
  await denied.close();
  const offline=await browser.newContext(),p=await offline.newPage();
  await p.route('**/search-index-en.json',r=>r.abort());await p.goto(`${base}/search/?q=NetSage`);
  await p.locator('#search-retry').waitFor({state:'visible'});await p.unroute('**/search-index-en.json');await p.locator('#search-retry').click();
  await p.waitForFunction(()=>document.querySelector('#search-results li'));flows++;await offline.close();
  const nojs=await browser.newContext({javaScriptEnabled:false}),plain=await nojs.newPage();
  await plain.setViewportSize({width:360,height:900});
  await plain.goto(`${base}/projects/`);assert.equal(await plain.locator('[data-project-category]:visible').count(),6);assert.equal(await plain.locator('[data-project-filter]:visible').count(),0);flows++;
  assert.ok(await plain.locator('.site-nav').isVisible());assert.equal(await plain.locator('.nav-toggle:visible').count(),0);flows++;
  await plain.goto(`${base}/zh/materials/`);assert.equal(await plain.locator('.material-card').count(),9);flows++;
  await nojs.close();
  const keyboard=await browser.newContext({viewport:{width:360,height:900}}),kp=await keyboard.newPage();
  await kp.goto(`${base}/projects/`);await kp.locator('.nav-toggle').click();
  await kp.locator('.site-nav a').first().focus();await kp.locator('input[value="all"]').focus();
  await kp.waitForFunction(()=>document.querySelector('.nav-toggle').getAttribute('aria-expanded')==='false');flows++;await keyboard.close();
  const dark=await browser.newContext({colorScheme:'dark',reducedMotion:'reduce'}),dp=await dark.newPage();
  await dp.goto(`${base}/zh/projects/commlab/`);assert.equal(await dp.locator('html').getAttribute('data-theme'),'dark');
  assert.equal(await dp.locator('.page-contents').count(),1);flows++;
  await dp.locator('.media-zoom').first().click();assert.ok(await dp.locator('dialog').isVisible());await dp.keyboard.press('Escape');assert.ok(!await dp.locator('dialog').isVisible());flows++;
  if(screenshotDir)await dp.screenshot({path:path.join(screenshotDir,'dark-commlab.png')});
  for(const route of ['/zh/materials/','/zh/search/?q=237.423&type=projects']){
    await dp.goto(base+route);assert.equal(await dp.locator('html').getAttribute('data-theme'),'dark');
    if(route.includes('/search/'))await dp.locator('.search-result-snippet mark').first().waitFor();
    else assert.equal(await dp.locator('.material-card').count(),9);
    assert.ok(await dp.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));flows++;
  }
  await dp.goto(`${base}/zh/missing-page-for-qa/`);
  assert.equal(await dp.locator('html').getAttribute('lang'),'zh-CN');
  for(const [label,route] of [['材料','materials/'],['搜索','search/']]){
    assert.ok((await dp.locator('.site-nav').getByRole('link',{name:label,exact:true}).getAttribute('href')).endsWith(`/zh/${route}`));
  }
  flows++;await dark.close();
  assert.deepEqual(errors,[]);console.log(`PASS ${layouts} responsive pages; ${flows} browsing, recovery, no-JS and dark-mode flows; no page errors.`);
}finally{await browser.close();server?.kill();}
