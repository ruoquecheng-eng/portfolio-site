import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import test from 'node:test';
import {searchDocuments} from '../src/scripts/browse.js';
const read = p => readFile(new URL(`../dist/${p}`, import.meta.url), 'utf8');
test('search requires every token and ranks title above body',()=>{
  const docs=[{title:'Other',keywords:'',summary:'',text:'NetSage TLS'},{title:'NetSage',keywords:'TLS',summary:'',text:''}];
  assert.equal(searchDocuments(docs,'NETSAGE TLS')[0].title,'NetSage');
  assert.equal(searchDocuments(docs,'NetSage missing').length,0);
  assert.equal(searchDocuments(docs,'  ').length,0);
  assert.equal(searchDocuments([{title:'张量研究',keywords:'tensor',summary:'',text:''}],'张量')[0].title,'张量研究');
});
test('localized search pages and safe local indexes are generated', async () => {
  for (const [locale,prefix] of [['en',''],['zh-CN','zh/']]) {
    const html=await read(`${prefix}search/index.html`);
    assert.match(html,/id="search-form"/);
    const index=JSON.parse(await read(`search-index-${locale}.json`));
    assert.ok(index.length>=10);
    assert.ok(index.every(d=>d.locale===locale && !/\/demo\/|\.pdf|\.zip/.test(d.url)));
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
