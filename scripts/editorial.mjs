import {stat} from 'node:fs/promises';
import path from 'node:path';
import {netsageShowcase, commlabShowcase, methodShowcase} from './motion-content.mjs';

export const categories = {'netsage':'engineering','commlab':'engineering','battery-rul':'modeling','radio-localization':'modeling'};
const escape = text => String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function enrichBody(body, route, {local,depth,name,radioTitle,radioSummary,radioCompetitionResult,email}) {
  if(route==='/projects/netsage/') body=body.replace('<section class="section netsage-screens"',netsageShowcase+'<section class="section netsage-screens"');
  if(route==='/projects/commlab/') body=body.replace(/<div class="commlab-gallery">[\s\S]*?<\/div>/,commlabShowcase);
  if(route==='/projects/radio-localization/') body=body.replace('<section class="section" id="method">',methodShowcase('radio')+'<section class="section" id="method">');
  if(route==='/projects/battery-rul/') body=body.replace(/<section class="section[^\"]*" id="workflow">/,match=>methodShowcase('battery')+match);
  if(route==='/projects/') {
    body=body.replace('<section class="section project-index-page">',`<section class="section project-filter-bar" hidden data-project-filter><fieldset><legend>Browse projects</legend>${[['all','All'],['engineering','Engineering software'],['modeling','Mathematical modeling'],['design','Design and interaction']].map(([value,label])=>`<label><input type="radio" name="project-category" value="${value}" ${value==='all'?'checked':''}><span>${label}</span></label>`).join('')}</fieldset><p data-filter-count role="status"></p></section><section class="section project-index-page">`);
    body=body.replace(/<article class="project-row">([\s\S]*?)<\/article>/g,(all,inner)=>{
      const slug=inner.match(/projects\/([^/]+)\//)?.[1];
      return `<article class="project-row" data-project-category="${categories[slug]||'design'}">${inner}</article>`;
    }).replace('<article class="project-card">','<article class="project-card" data-project-category="design">').replace('<article class="project-card scenic-card">','<article class="project-card scenic-card" id="scenic-guide" data-project-category="design">');
  }
  if(route==='/resume/')body=body.replace('<button class="button print-button"',`<a class="button resume-download no-print" href="${local(depth,'assets/documents/resume-en.pdf')}" download>Download resume PDF</a><button class="button-secondary print-button"`);
  if(/^\/(projects|research)\/[^/]+\/$/.test(route)) {
    const links=new Map();
    for(const match of body.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>[\s\S]*?<\/a>/g)) {
      const href=match[1];
      const kind=/\.pdf(?:[?#]|$)/i.test(href)?(/certificate/.test(href)?'Certificate':'Paper'):/\.zip(?:[?#]|$)/i.test(href)?'Supporting materials':/^https:\/\/github\.com\/[^/]+\/[^/?#]+\/?$/.test(href)?'Source code':null;
      if(kind&&!links.has(href))links.set(href,kind);
    }
    if(links.size) body=body.replace('</header>',`</header><nav class="section material-actions" aria-label="Project materials">${[...links].map(([href,label])=>`<a class="button-secondary" href="${escape(href)}" target="_blank" rel="noopener">${label}</a>`).join('')}</nav>`);
  }
  return body;
}

export const searchBody = `<section class="page-hero"><div><p class="hero-kicker">Explore the portfolio</p><h1>Search</h1><p>Find projects, research, and experience by topic or keyword.</p></div></section>
<section class="section search-page">
  <form id="search-form" role="search"><label for="search-query">Search this site</label><div class="search-controls"><input id="search-query" name="q" type="search" maxlength="160" autocomplete="off" placeholder="Try NetSage, CUMCM, or tensors"><button class="button" type="submit">Search</button></div></form>
  <div class="search-tools" hidden>
    <fieldset class="search-type-filters"><legend>Result type</legend>${[['all','All'],['projects','Projects'],['research','Research'],['resume','Resume'],['materials','Materials'],['pages','Pages']].map(([value,label])=>`<label><input type="radio" name="search-type" value="${value}" ${value==='all'?'checked':''}><span>${label}</span></label>`).join('')}</fieldset>
    <div class="search-suggestions"><span>Suggested searches</span><button class="button-secondary" type="button" data-query="NetSage">NetSage</button><button class="button-secondary" type="button" data-query="CUMCM">CUMCM</button><button class="button-secondary" type="button" data-query="tensor">Tensors</button></div>
    <button class="button-secondary search-clear" type="button" disabled>Clear search</button>
  </div>
  <p id="search-status" role="status">Enter a keyword to search this language version.</p><button id="search-retry" class="button-secondary" hidden type="button">Retry</button><ol id="search-results"></ol><noscript>Enable JavaScript to search, or use the Projects and Research links in the navigation.</noscript>
</section>`;

export async function annotateMaterials(html,root) {
  const sizes=new Map();
  for(const m of html.matchAll(/href="([^"]*assets\/([^"?#]+\.(?:pdf|zip|docx|pptx)))(?:[?#][^"]*)?"/gi)) {
    if(/resume-(en|zh)\.pdf/.test(m[2]))continue;
    const bytes=(await stat(path.join(root,'src/assets',m[2]))).size;
    sizes.set(m[1],`${path.extname(m[2]).slice(1).toUpperCase()} · ${bytes>=1048576?(bytes/1048576).toFixed(1)+' MB':Math.ceil(bytes/1024)+' KB'}`);
  }
  return html.replace(/<a\b([^>]*href="([^"]+)"[^>]*)>([\s\S]*?)<\/a>/gi,(all,attrs,href,inner)=>sizes.has(href)&&!/<img\b|material-size/.test(inner)?`<a${attrs}>${inner} <small class="material-size">${sizes.get(href)}</small></a>`:all);
}

const clean = html => html.replace(/<(script|style|nav|figure|form|button)\b[^>]*>[\s\S]*?<\/\1>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&(?:amp|quot|#39|lt|gt|nbsp);/g,s=>({'&amp;':'&','&quot;':'"','&#39;':"'",'&lt;':'<','&gt;':'>','&nbsp;':' '})[s]).replace(/\s+/g,' ').trim();
export function searchTypeFromRoute(route) {
  const section=route.replace(/^\/zh(?=\/)/,'').split('/').filter(Boolean)[0];
  return ['projects','research','resume','materials'].includes(section)?section:'pages';
}
export function makeSearchIndex(routes,locale,config) {
  return routes.filter(r=>!r.route.includes('/demo/')&&!r.route.includes('/search/')&&!/\.(?:pdf|zip|docx|pptx)(?:[?#]|$)/i.test(r.route)&&(locale==='zh-CN'?r.file.startsWith('zh/'):!r.file.startsWith('zh/'))).map(r=>{
    const main=r.html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/)?.[1]||'';
    const slug=r.route.split('/').filter(Boolean).at(-1)||'home';
    const keywords={netsage:'NetSage Android DNS TCP TLS HTTP 网络诊断',commlab:'CommLab wireless ISAC 无线 通信 仿真','radio-localization':'CUMCM 国赛 数模 无线电 radio localization','battery-rul':'battery 电池 SOH RUL MILP 数模','hypergraph-tensor':'tensor 张量 hypergraph 超图','high-speed-rail':'railway 高铁 EngineerPlus','connected-diagram-expansions':'Hermite Jensen 数学 渐近','critical-cubic-crossover':'Riemann Jensen 黎曼 渐近',projects:'projects 实习 internship scenic 数字人',resume:'resume 简历 education 教育 internship 实习'}[slug]||'';
    return {locale,type:searchTypeFromRoute(r.route),url:`${config.basePath.replace(/\/$/,'')}${r.route}`,title:clean(r.html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/)?.[1]||''),summary:clean(r.html.match(/<meta name="description" content="([^"]*)"/i)?.[1]||''),keywords,text:clean(main)};
  }).filter(d=>d.title);
}
