export const normalize = value => String(value).normalize('NFKC').toLocaleLowerCase().trim();
export function searchDocuments(documents,query) {
  const tokens=normalize(query).split(/\s+/).filter(Boolean);
  if(!tokens.length)return [];
  return documents.map((doc,index)=>{
    const fields=[doc.title,doc.keywords,doc.summary,doc.text].map(normalize);
    if(!tokens.every(token=>fields.some(f=>f.includes(token))))return null;
    const score=tokens.reduce((sum,token)=>sum+(fields[0].includes(token)?12:0)+(fields[1].includes(token)?6:0)+(fields[2].includes(token)?3:0)+(fields[3].includes(token)?1:0),0);
    return {doc,score,index};
  }).filter(Boolean).sort((a,b)=>b.score-a.score||a.index-b.index).map(r=>r.doc);
}

if(typeof document!=='undefined') {
  const zh=document.documentElement.lang==='zh-CN';
  const filter=document.querySelector('[data-project-filter]');
  if(filter) {
    const items=[...document.querySelectorAll('[data-project-category]')];
    const update=()=>{
      const category=filter.querySelector('input:checked').value;
      items.forEach(item=>item.hidden=category!=='all'&&item.dataset.projectCategory!==category);
      filter.querySelector('[data-filter-count]').textContent=zh?`显示 ${items.filter(i=>!i.hidden).length} 个项目`:`Showing ${items.filter(i=>!i.hidden).length} projects`;
      for(const selector of ['.project-index-page','.supporting-projects']) {
        const section=document.querySelector(selector);
        if(section)section.hidden=![...section.querySelectorAll('[data-project-category]')].some(i=>!i.hidden);
      }
    };
    filter.hidden=false;filter.addEventListener('change',update);update();
  }
  const form=document.getElementById('search-form');
  if(form) {
    const input=document.getElementById('search-query'),status=document.getElementById('search-status'),results=document.getElementById('search-results'),retry=document.getElementById('search-retry');
    let indexPromise,timer,revision=0;
    const indexUrl=new URL(`../search-index-${zh?'zh-CN':'en'}.json`,import.meta.url);
    function loadIndex(){return indexPromise??=fetch(indexUrl,{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('Index unavailable');return r.json();}).then(data=>{if(!Array.isArray(data))throw Error('Invalid index');return data;});}
    async function render(updateUrl=true) {
      const current=++revision,query=input.value.trim().slice(0,160);
      if(updateUrl){const url=new URL(location.href);query?url.searchParams.set('q',query):url.searchParams.delete('q');history.replaceState(null,'',url);}
      results.replaceChildren();retry.hidden=true;
      if(!query){status.textContent=zh?'输入关键词，搜索当前语言版本的内容。':'Enter a keyword to search this language version.';return;}
      status.textContent=zh?'正在搜索…':'Searching…';
      try {
        const docs=await loadIndex();if(current!==revision)return;
        const matches=searchDocuments(docs,query);
        status.textContent=matches.length?(zh?`找到 ${matches.length} 条结果`:`${matches.length} results found`):(zh?'没有找到结果。试试项目名称、缩写或更短的关键词。':'No results. Try a project name, abbreviation, or shorter keyword.');
        for(const doc of matches){
          const url=new URL(doc.url,location.origin);
          if(url.origin!==location.origin||!url.pathname.startsWith(new URL('../',import.meta.url).pathname))continue;
          const li=document.createElement('li'),h=document.createElement('h2'),a=document.createElement('a'),p=document.createElement('p');
          a.href=url.href;a.textContent=doc.title;p.textContent=doc.summary;
          h.append(a);li.append(h,p);results.append(li);
        }
      }catch {
        if(current!==revision)return;
        status.textContent=zh?'搜索暂时不可用。请检查网络后重试，或从导航浏览项目与研究。':'Search is unavailable. Check your connection and retry, or browse Projects and Research.';
        retry.hidden=false;indexPromise=undefined;
      }
    }
    input.value=new URLSearchParams(location.search).get('q')?.slice(0,160)||'';
    form.addEventListener('submit',event=>{event.preventDefault();clearTimeout(timer);render();});
    input.addEventListener('input',()=>{revision++;clearTimeout(timer);timer=setTimeout(()=>render(),150);});
    retry.addEventListener('click',()=>render());
    window.addEventListener('popstate',()=>{input.value=new URLSearchParams(location.search).get('q')?.slice(0,160)||'';render(false);});
    render(false);
  }
}
