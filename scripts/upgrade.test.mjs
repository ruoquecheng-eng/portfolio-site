import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {searchDocuments,highlightSegments,searchSnippet,readSearchState,searchStateUrl,writeSearchHistory,shouldFocusSearch,searchTypes} from '../src/scripts/browse.js';
import {searchBody,makeSearchIndex,searchTypeFromRoute} from './editorial.mjs';
const read = p => readFile(new URL(`../dist/${p}`, import.meta.url), 'utf8');
test('pure: search requires every token and ranks title above body',()=>{
  const docs=[{title:'Other',keywords:'',summary:'',text:'NetSage TLS'},{title:'NetSage',keywords:'TLS',summary:'',text:''}];
  assert.equal(searchDocuments(docs,'NETSAGE TLS')[0].title,'NetSage');
  assert.equal(searchDocuments(docs,'NetSage missing').length,0);
  assert.equal(searchDocuments(docs,'  ').length,0);
  assert.equal(searchDocuments([{title:'张量研究',keywords:'tensor',summary:'',text:''}],'张量')[0].title,'张量研究');
});

test('pure: type facets combine with every-token matching and support browsing one type',()=>{
  const docs=[
    {type:'projects',title:'NetSage',keywords:'TLS',text:'Local DNS diagnostics'},
    {type:'research',title:'TLS research',text:'NetSage comparison'},
    {type:'resume',title:'Resume',text:'NetSage TLS'},
    {type:'materials',title:'Materials',text:'NetSage TLS'},
    {type:'pages',title:'Home',text:'NetSage TLS'}
  ];
  assert.equal(searchDocuments(docs,'NETSAGE TLS','all').length,5);
  for(const type of searchTypes.filter(type=>type!=='all')) {
    assert.deepEqual(searchDocuments(docs,'NetSage TLS',type),docs.filter(doc=>doc.type===type));
    assert.deepEqual(searchDocuments(docs,'',type),docs.filter(doc=>doc.type===type));
    assert.deepEqual(searchDocuments(docs,'NetSage missing',type),[]);
  }
  assert.deepEqual(searchDocuments(docs,'NetSage','invalid'),searchDocuments(docs,'NetSage'));
  assert.deepEqual(searchDocuments([{type:'research',title:'非均匀超图张量谱'}],'超图 张量','research').map(doc=>doc.title),['非均匀超图张量谱']);
});

test('pure: snippets select matching body context and prioritize a window containing all terms',()=>{
  const intro='General portfolio context. '.repeat(20);
  const text=`${intro}DNS appears alone. ${intro}NetSage diagnoses DNS and TLS locally. ${intro}`;
  const snippet=searchSnippet({text,summary:'An unrelated summary'},'DNS TLS');
  assert.match(snippet,/NetSage diagnoses DNS and TLS locally/);
  assert.ok(!snippet.includes('unrelated summary'));
  assert.ok(snippet.startsWith('…')&&snippet.endsWith('…'));
  assert.ok(snippet.length<=222);
  const zh=searchSnippet({text:`${'模型研究。'.repeat(90)}非均匀超图的张量谱分析${'模型研究。'.repeat(90)}`,summary:'无关摘要'},'超图 张量',90);
  assert.match(zh,/非均匀超图的张量谱分析/);
  assert.ok(zh.length<=92);
  const longTerm='x'.repeat(160);
  assert.ok(searchSnippet({text:`${intro}${longTerm} ${intro}`},longTerm).includes(longTerm),'a long matched term is not truncated out of its snippet');
  assert.equal(searchSnippet({text:'Body without a term',summary:'Title-only result context'},'keyword'),'Title-only result context');
});

test('pure: highlighting preserves literal hostile text, overlapping terms, Unicode and case',()=>{
  const text='<img src=x onerror=alert(1)> ＮｅｔＳａｇｅ TLS 超图张量 cafe\u0301';
  const parts=highlightSegments(text,'<img NETSAGE tls 超图 张量 café');
  assert.equal(parts.map(part=>part.text).join(''),text);
  assert.deepEqual(parts.filter(part=>part.match).map(part=>part.text),['<img','ＮｅｔＳａｇｅ','TLS','超图张量','cafe\u0301']);
  assert.deepEqual(highlightSegments('NetSage NetSage','Net Netsage'),[
    {text:'NetSage',match:true},{text:' ',match:false},{text:'NetSage',match:true}
  ]);
  assert.deepEqual(highlightSegments('Literal <script>',''),[{text:'Literal <script>',match:false}]);
});

test('pure: route-derived index types preserve locale, public-body extraction and exclusions',()=>{
  const routes=['/','/projects/','/projects/netsage/','/research/','/research/hypergraph-tensor/','/resume/','/materials/','/about/','/search/','/projects/high-speed-rail/demo/','/assets/paper.pdf'];
  const records=routes.flatMap(route=>['en','zh-CN'].map(locale=>({
    route:locale==='en'?route:`/zh${route}`,file:`${locale==='en'?'':'zh/'}${route.slice(1)}index.html`,
    html:'<meta name="description" content="Public summary"><main><h1>Public title</h1><p>Public body &amp; sources</p><nav>Navigation only</nav><script>Secret script</script><form>202512802</form><button>Hidden control</button><figure>Image-only detail</figure></main><footer>Outside main</footer>'
  })));
  for(const locale of ['en','zh-CN']) {
    const index=makeSearchIndex(records,locale,{basePath:'/portfolio/'});
    assert.equal(index.length,8);
    assert.deepEqual(index.map(doc=>doc.type),['pages','projects','projects','research','research','resume','materials','pages']);
    assert.ok(index.every(doc=>doc.locale===locale&&doc.url.startsWith(`/portfolio/${locale==='zh-CN'?'zh/':''}`)));
    assert.ok(index.every(doc=>doc.text==='Public title Public body & sources'));
    assert.doesNotMatch(JSON.stringify(index),/202512802|Secret script|Navigation only|Image-only detail|Outside main|\.pdf/);
    assert.equal(index.find(doc=>doc.type==='materials').type,searchTypeFromRoute('/zh/materials/'));
  }
  assert.equal(searchTypeFromRoute('/projectsmith/'),'pages');
});

test('pure: search controls retain the single form-submit and named facet contracts',()=>{
  const form=searchBody.match(/<form\b[\s\S]*?<\/form>/)[0];
  assert.equal((form.match(/<button\b/g)||[]).length,1);
  assert.match(form,/type="submit"/);
  assert.doesNotMatch(form,/search-clear|data-query/);
  for(const type of searchTypes)assert.match(searchBody,new RegExp(`name="search-type" value="${type}"`));
  assert.match(searchBody,/class="search-tools" hidden/);
  assert.match(searchBody,/class="button-secondary search-clear" type="button"/);
  assert.match(searchBody,/data-query="NetSage"/);
  for(const id of ['search-form','search-query','search-status','search-results','search-retry'])assert.ok(searchBody.includes(`id="${id}"`));
});

test('pure: search URLs restore facets, limit queries and preserve both fields across languages',()=>{
  const state={query:'超图 TLS <img>',type:'research'};
  for(const url of ['https://example.test/portfolio/search/?ref=kept#results','https://example.test/portfolio/zh/search/?ref=kept#results']) {
    const next=searchStateUrl(url,state);
    assert.deepEqual(readSearchState(next),state);
    assert.equal(next.searchParams.get('ref'),'kept');
    assert.equal(next.hash,'#results');
    const cleared=searchStateUrl(next,{query:'',type:'all'});
    assert.ok(!cleared.searchParams.has('q')&&!cleared.searchParams.has('type'));
  }
  assert.deepEqual(readSearchState('https://example.test/search/?q=%20TLS%20&type=unknown'),{query:'TLS',type:'all'});
  assert.equal(readSearchState(`https://example.test/search/?q=${'x'.repeat(200)}`).query.length,160);
});

// A minimal browser-history model exercises actual pushes/replacements rather
// than just checking that the source subscribes to popstate.
function historyFixture(url) {
  const entries=[{url,state:{otherFeature:'kept'}}];let position=0;
  return {
    get url(){return entries[position].url;},get length(){return entries.length;},
    get state(){return entries[position].state;},
    pushState(state,unused,next){entries.splice(++position);entries.push({url:next,state});},
    replaceState(state,unused,next){entries[position]={url:next,state};},
    back(){position=Math.max(0,position-1);return readSearchState(this.url);},
    forward(){position=Math.min(entries.length-1,position+1);return readSearchState(this.url);}
  };
}

test('pure: submitted queries and explicit facets are meaningfully restored by Back and Forward',()=>{
  const history=historyFixture('https://example.test/portfolio/search/');
  const first={query:'NetSage',type:'all'},second={query:'NetSage',type:'projects'},third={query:'CUMCM',type:'projects'};
  for(const state of [first,second,third])writeSearchHistory(history,history.url,state);
  assert.equal(history.length,4);
  assert.deepEqual(history.back(),second);assert.deepEqual(history.back(),first);
  assert.deepEqual(history.forward(),second);assert.deepEqual(history.forward(),third);
  assert.equal(history.state.otherFeature,'kept');
  writeSearchHistory(history,history.url,third);
  assert.equal(history.length,4,'duplicate submits do not add duplicate entries');
  writeSearchHistory(history,history.url,{query:'',type:'all'});
  assert.deepEqual(history.back(),third,'clear preserves the committed prior search');
  assert.deepEqual(history.forward(),{query:'',type:'all'});
});

test('pure: debounced drafts replace themselves while preserving prior committed search',()=>{
  const history=historyFixture('https://example.test/search/?q=NetSage&type=projects');
  const previous=readSearchState(history.url);
  writeSearchHistory(history,history.url,{query:'CU',type:'projects'},false);
  writeSearchHistory(history,history.url,{query:'CUMCM',type:'projects'},false);
  assert.equal(history.length,2);
  assert.equal(history.state.portfolioSearch.draft,true);
  assert.deepEqual(history.back(),previous);
  assert.deepEqual(history.forward(),{query:'CUMCM',type:'projects'});
  writeSearchHistory(history,history.url,readSearchState(history.url));
  assert.equal(history.state.portfolioSearch.draft,false);
  assert.equal(history.length,2,'submit confirms the existing draft');
  writeSearchHistory(history,history.url,{query:'CUMCM',type:'research'});
  assert.equal(history.length,3);
  assert.deepEqual(history.back(),{query:'CUMCM',type:'projects'});
  assert.deepEqual(history.back(),previous);
  writeSearchHistory(history,history.url,{query:'TLS',type:'all'});
  assert.equal(history.length,2,'a new commit after Back discards the forward branch');
  assert.deepEqual(history.forward(),{query:'TLS',type:'all'});
});

test('pure: facets, suggestions and clear preserve a pending draft for Back and Forward',()=>{
  for(const next of [{query:'CUMCM',type:'research'},{query:'NetSage',type:'projects'},{query:'',type:'all'}]) {
    const history=historyFixture('https://example.test/search/?q=TLS&type=projects');
    const draft={query:'CUMCM',type:'projects'};
    writeSearchHistory(history,history.url,draft,false);
    writeSearchHistory(history,history.url,next,true,true);
    assert.equal(history.length,3);
    assert.deepEqual(history.back(),draft);
    assert.equal(history.state.portfolioSearch.draft,false,'the prior draft is preserved as a confirmed state');
    assert.deepEqual(history.forward(),next);
    assert.deepEqual(history.back(),draft);
    assert.deepEqual(history.back(),{query:'TLS',type:'projects'});
  }
});

test('pure: slash focus respects editable elements, composition and modifier shortcuts',()=>{
  const event={key:'/',target:{closest:()=>null}};
  assert.equal(shouldFocusSearch(event),true);
  for(const key of ['ctrlKey','metaKey','altKey','shiftKey','defaultPrevented','isComposing'])assert.equal(shouldFocusSearch({...event,[key]:true}),false);
  assert.equal(shouldFocusSearch({...event,target:{closest:()=>({})}}),false);
  assert.equal(shouldFocusSearch({...event,key:'x'}),false);
});
test('localized search pages and safe local indexes are generated', async () => {
  for (const [locale,prefix] of [['en',''],['zh-CN','zh/']]) {
    const html=await read(`${prefix}search/index.html`);
    assert.match(html,/id="search-form"/);
    assert.match(html,/name="search-type" value="materials"/);
    assert.match(html,/search-clear/);
    const index=JSON.parse(await read(`search-index-${locale}.json`));
    assert.ok(index.length>=10);
    assert.ok(index.every(d=>d.locale===locale && !/\/demo\/|\.pdf|\.zip/.test(d.url)));
    assert.ok(index.every(d=>searchTypes.includes(d.type)&&d.type!=='all'));
    assert.ok(index.some(d=>d.type==='materials'));
    assert.ok(!JSON.stringify(index).includes('202512802'));
    assert.ok(index.some(d=>d.keywords.includes('CUMCM')));
  }
});
test('project categories, PDF downloads and revised home order exist',async()=>{
  for(const prefix of ['', 'zh/']) {
    const projects=await read(`${prefix}projects/index.html`);
    assert.match(projects,/data-project-filter/);
    assert.equal((projects.match(/data-project-category=/g)||[]).length,6);
    const resume=await read(`${prefix}resume/index.html`);
    assert.match(resume,new RegExp(`resume-${prefix?'zh':'en'}\\.pdf`));
    const home=await read(`${prefix}index.html`);
    assert.ok(home.indexOf('projects/radio-localization/')<home.indexOf('projects/battery-rul/'));
    assert.match(home,/home-resume/);
    assert.match(projects,/material-size/);
  }
});
