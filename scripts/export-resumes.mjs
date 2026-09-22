import {chromium} from 'playwright';
import {spawn,execFileSync} from 'node:child_process';
import {createServer} from 'node:net';
import {mkdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(path.join(root,'site.config.json'),'utf8'));
const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));
const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
const server=spawn(process.execPath,['scripts/serve.mjs','--port',String(port)],{cwd:root,stdio:'ignore',windowsHide:true});
const base=`http://127.0.0.1:${port}${config.basePath}`;
let browser;
try {
  let ready=false;
  for(let i=0;i<100;i++){try{if((await fetch(base)).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,100));}
  if(!ready)throw Error('Resume preview server did not start');
  browser=await chromium.launch({headless:true});
  const output=path.join(root,'dist/assets/documents');await mkdir(output,{recursive:true});
  for(const [locale,prefix] of [['en',''],['zh','zh/']]) {
    const page=await browser.newPage({locale:locale==='zh'?'zh-CN':'en-US',colorScheme:'light'});
    await page.goto(`${base}${prefix}resume/`,{waitUntil:'networkidle'});
    await page.evaluate(async()=>{await document.fonts.ready;for(const i of document.images)i.loading='eager';await Promise.all([...document.images].map(i=>i.decode()));});
    await page.evaluate(origin=>{
      for(const anchor of document.querySelectorAll('a[href]')){
        const url=new URL(anchor.href);
        if(url.origin===location.origin)anchor.href=origin+url.pathname+url.search+url.hash;
      }
    },config.canonicalOrigin);
    const file=path.join(output,`resume-${locale}.pdf`);
    await page.pdf({path:file,format:'A4',preferCSSPageSize:true,printBackground:true,tagged:true});
    const info=execFileSync('pdfinfo',[file],{encoding:'utf8'});
    const links=execFileSync('pdfinfo',['-url',file],{encoding:'utf8'});
    if(/127\.0\.0\.1|localhost/.test(links))throw Error(`${locale} PDF contains preview-only links`);
    if(!/^Pages:\s+1\s*$/m.test(info))throw Error(`${locale} resume must remain exactly one page`);
    const text=execFileSync('pdftotext',[file,'-'],{encoding:'utf8'});
    for(const term of ['NetSage','CommLab','3.7129','19/118','Connected-Diagram','Critical Cubic','Beyond Vertex','lbrswne','ruoquecheng-eng',locale==='zh'?'四川吉星海':'Sichuan Jixinghai'])if(!text.replace(/\s+/g,'').includes(term.replace(/\s+/g,'')))throw Error(`${locale} PDF is missing ${term}`);
    if(locale==='zh'?!text.includes('国赛')&&!text.includes('全国大学生数学建模竞赛'):!text.includes('CUMCM'))throw Error(`${locale} PDF missing modeling competition`);
    console.log(`Verified ${path.relative(root,file)}: 1 page, key content present`);
    await page.close();
  }
}finally{await browser?.close();server.kill();}
