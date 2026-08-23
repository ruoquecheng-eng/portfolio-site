import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.resolve(projectRoot, process.env.QA_DIST ?? 'dist');
const issues = [];
const allowedPublicPdfs = new Set([
  'assets/documents/subcritical-hyperbolicity-jensen-polynomials-riemann-xi.pdf',
  'assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf',
]);

const requiredPages = new Map([
  ['Home', ['index.html']],
  ['Projects', ['projects/index.html', 'projects.html']],
  ['NetSage case study', ['projects/netsage/index.html', 'projects/netsage.html']],
  ['Battery RUL case study', ['projects/battery-rul/index.html', 'projects/battery-rul.html']],
  ['Research', ['research/index.html', 'research.html']],
  ['Jensen Polynomials research', ['research/jensen-polynomials/index.html', 'research/jensen-polynomials.html']],
  ['Hypergraph Tensor research', ['research/hypergraph-tensor/index.html', 'research/hypergraph-tensor.html']],
  ['Resume', ['resume/index.html', 'resume.html']],
  ['404', ['404.html']],
]);

const requiredAssets = new Map([
  ['robots.txt', ['robots.txt']],
  ['sitemap.xml', ['sitemap.xml']],
  ['favicon', ['favicon.svg', 'favicon.png', 'favicon.ico', 'assets/favicon.svg', 'assets/favicon.png', 'assets/favicon.ico']],
  ['site stylesheet', ['styles/main.css', 'assets/css/site.css', 'assets/css/styles.css', 'assets/site.css', 'assets/styles.css', 'styles.css']],
  ['site script', ['scripts/main.js', 'assets/js/site.js', 'assets/js/main.js', 'assets/site.js', 'assets/main.js', 'script.js']],
  ['NetSage icon', ['assets/images/netsage-icon.webp']],
  ['battery RUL parity figure', ['assets/images/battery-rul-parity.webp']],
  ['battery compatibility figure', ['assets/images/battery-compatibility-graph.webp']],
  ['battery strategy figure', ['assets/images/battery-strategy-comparison.webp']],
  ['battery modeling paper cover', ['assets/images/battery-modeling-paper-cover.webp']],
  ['battery modeling paper', ['assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf']],
  ['high-speed rail image', ['assets/images/high-speed-carriage.webp']],
  ['Scenic Guide visitor interface', ['assets/images/scenic-guide-visitor.webp']],
  ['Jensen manuscript title page', ['assets/images/jensen-manuscript-title-page.png']],
  ['Jensen submitted manuscript', ['assets/documents/subcritical-hyperbolicity-jensen-polynomials-riemann-xi.pdf']],
]);

function relativeName(file) {
  return path.relative(distRoot, file).split(path.sep).join('/');
}

function addIssue(group, message) {
  issues.push({ group, message });
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) {
      addIssue('privacy', `Symbolic link is not allowed in dist: ${relativeName(absolute)}`);
    } else if (entry.isDirectory()) {
      files.push(...await walk(absolute));
    } else if (entry.isFile()) {
      files.push(absolute);
    }
  }
  return files;
}

function firstExisting(candidates, fileSet) {
  return candidates.find((candidate) => fileSet.has(candidate));
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match ? match[1] ?? match[2] ?? match[3] ?? '' : null;
}

function decodeAttribute(value) {
  return value
    .replaceAll('&amp;', '&')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>');
}

function visibleText(html) {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function pageIds(html) {
  const ids = new Set();
  for (const tag of html.match(/<[a-z][^>]*>/gi) ?? []) {
    for (const key of ['id', 'name']) {
      const value = attribute(tag, key);
      if (value) ids.add(value);
    }
  }
  return ids;
}

function extractReferences(html) {
  const references = [];
  const tagPattern = /<(a|link|script|img|source|video|audio|iframe|form)\b[^>]*>/gi;
  for (const match of html.matchAll(tagPattern)) {
    const tag = match[0];
    const element = match[1].toLowerCase();
    const names = element === 'form' ? ['action'] : element === 'video' ? ['src', 'poster'] : ['href', 'src'];
    for (const name of names) {
      const value = attribute(tag, name);
      if (value !== null) references.push({ element, name, value: decodeAttribute(value) });
    }

    const srcset = attribute(tag, 'srcset');
    if (srcset !== null) {
      for (const item of srcset.split(',')) {
        const value = item.trim().split(/\s+/)[0];
        if (value) references.push({ element, name: 'srcset', value: decodeAttribute(value) });
      }
    }
  }
  return references;
}

function isExternal(reference) {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(reference) && !reference.toLowerCase().startsWith('file:');
}

function targetCandidates(sourceFile, rawReference) {
  const hashIndex = rawReference.indexOf('#');
  const queryIndex = rawReference.indexOf('?');
  const cutIndices = [hashIndex, queryIndex].filter((index) => index >= 0);
  const cut = cutIndices.length ? Math.min(...cutIndices) : rawReference.length;
  const rawPath = rawReference.slice(0, cut);
  const rawFragment = hashIndex >= 0 ? rawReference.slice(hashIndex + 1).split('?')[0] : '';
  let decodedPath;
  let fragment;

  try {
    decodedPath = decodeURIComponent(rawPath).replaceAll('\\', '/');
    fragment = decodeURIComponent(rawFragment);
  } catch {
    return { malformed: true, candidates: [], fragment: '' };
  }

  const sourceRelative = relativeName(sourceFile);
  const sourceDirectory = path.posix.dirname(sourceRelative);
  const bases = [];

  if (!decodedPath) {
    bases.push(sourceRelative);
  } else if (decodedPath.startsWith('/')) {
    const rootPath = decodedPath.replace(/^\/+/, '');
    bases.push(rootPath);
    const segments = rootPath.split('/');
    if (segments.length > 1) bases.push(segments.slice(1).join('/'));
  } else {
    bases.push(path.posix.normalize(path.posix.join(sourceDirectory, decodedPath)));
  }

  const candidates = [];
  for (const base of bases) {
    if (!base || base === '.' || base === './') {
      candidates.push('index.html');
      continue;
    }
    if (base === '..' || base.startsWith('../')) {
      candidates.push(base);
      continue;
    }
    candidates.push(base);
    if (base.endsWith('/')) {
      candidates.push(`${base}index.html`);
    } else if (!path.posix.extname(base)) {
      candidates.push(`${base}/index.html`, `${base}.html`);
    }
  }

  return { malformed: false, candidates: [...new Set(candidates)], fragment };
}

function checkMetadata(file, html) {
  const name = relativeName(file);
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i);
  if (!titleMatch || !visibleText(titleMatch[1])) addIssue('metadata', `${name}: missing non-empty <title>`);

  const metas = html.match(/<meta\b[^>]*>/gi) ?? [];
  const metaByName = new Map();
  const metaByProperty = new Map();
  for (const tag of metas) {
    const content = attribute(tag, 'content')?.trim() ?? '';
    const metaName = attribute(tag, 'name')?.toLowerCase();
    const property = attribute(tag, 'property')?.toLowerCase();
    if (metaName) metaByName.set(metaName, content);
    if (property) metaByProperty.set(property, content);
  }
  if (!metaByName.get('description')) addIssue('metadata', `${name}: missing meta description`);

  const canonical = (html.match(/<link\b[^>]*>/gi) ?? []).find((tag) =>
    (attribute(tag, 'rel') ?? '').toLowerCase().split(/\s+/).includes('canonical'));
  const canonicalHref = canonical ? attribute(canonical, 'href') : null;
  if (!canonicalHref || !/^https:\/\//i.test(canonicalHref)) {
    addIssue('metadata', `${name}: missing absolute HTTPS canonical link`);
  }

  for (const property of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image']) {
    if (!metaByProperty.get(property)) addIssue('metadata', `${name}: missing Open Graph ${property}`);
  }

  if (!/<main\b/i.test(html)) addIssue('accessibility', `${name}: missing <main>`);
  const skipLink = (html.match(/<a\b[^>]*>/gi) ?? []).find((tag) => {
    const href = attribute(tag, 'href') ?? '';
    const className = attribute(tag, 'class') ?? '';
    return href.startsWith('#') && /skip/i.test(className);
  });
  if (!skipLink) addIssue('accessibility', `${name}: missing skip link targeting page content`);

  for (const image of html.match(/<img\b[^>]*>/gi) ?? []) {
    const src = attribute(image, 'src') ?? '(unknown source)';
    if (attribute(image, 'alt') === null) addIssue('accessibility', `${name}: image lacks alt attribute: ${src}`);
    const width = attribute(image, 'width');
    const height = attribute(image, 'height');
    if (!width || !height || !/^\d+(?:\.\d+)?$/.test(width) || !/^\d+(?:\.\d+)?$/.test(height)) {
      addIssue('assets', `${name}: image lacks numeric width and height: ${src}`);
    }
  }
}

function checkLinks(file, html, fileSet, htmlByName) {
  const sourceName = relativeName(file);
  for (const reference of extractReferences(html)) {
    const value = reference.value.trim();
    if (!value && reference.element === 'a' && reference.name === 'href') {
      continue;
    }
    if (!value) {
      addIssue('links', `${sourceName}: empty ${reference.name} on <${reference.element}>`);
      continue;
    }
    if (isExternal(value) || value.startsWith('data:')) continue;
    if (value.toLowerCase().startsWith('file:')) {
      addIssue('privacy', `${sourceName}: local file URL exposed: ${value}`);
      continue;
    }

    const resolved = targetCandidates(file, value);
    if (resolved.malformed) {
      addIssue('links', `${sourceName}: malformed URL encoding: ${value}`);
      continue;
    }
    if (resolved.candidates.some((candidate) => candidate === '..' || candidate.startsWith('../'))) {
      addIssue('links', `${sourceName}: link escapes dist: ${value}`);
      continue;
    }

    const target = resolved.candidates.find((candidate) => fileSet.has(candidate));
    if (!target) {
      addIssue('links', `${sourceName}: broken local ${reference.name}: ${value}`);
      continue;
    }

    if (resolved.fragment && target.toLowerCase().endsWith('.html')) {
      const targetHtml = htmlByName.get(target);
      if (targetHtml && !pageIds(targetHtml).has(resolved.fragment)) {
        addIssue('links', `${sourceName}: fragment #${resolved.fragment} not found in ${target}`);
      }
    }
  }
}

function checkSensitiveContent(name, content) {
  const leakPatterns = [
    ['internal marker', /\bTODO\b|NEEDS[_ -]?CONFIRMATION|NOT[_ -]?PUBLIC[_ -]?YET|\bSUPERSEDED\b/i],
    ['absolute Windows path', /(?:^|["'>(\s])(?:[a-zA-Z]:[\\/])[^"'<\r\n]*/m],
    ['private evidence path', /content[\\/]evidence|SOURCES\.json/i],
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['credential assignment', /\b(?:api[_-]?key|client[_-]?secret|password|passwd|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["']?[a-z0-9_./+@=-]{8,}/i],
    ['credential token', /\b(?:sk|ghp|github_pat|xox[baprs])[-_][a-z0-9_-]{12,}\b/i],
  ];

  for (const [label, pattern] of leakPatterns) {
    if (pattern.test(content)) addIssue('privacy', `${name}: leaked ${label}`);
  }
}

function checkResearchAndProjectFacts(pageFiles, htmlByName) {
  const battery = htmlByName.get(pageFiles.get('Battery RUL case study'));
  const batteryText = visibleText(battery ?? '');
  if (!/simulated/i.test(batteryText) || !/semi[- ]empirical/i.test(batteryText)) {
    addIssue('truthfulness', 'Battery RUL page must visibly label the dataset as simulated / semi-empirical');
  }
  const batteryPdfLinks = ((battery ?? '').match(/<a\b[^>]*>/gi) ?? [])
    .map((tag) => attribute(tag, 'href') ?? '')
    .filter((href) => /\.pdf(?:[?#]|$)/i.test(href));
  const batteryPdfPath = 'assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf';
  if (batteryPdfLinks.filter((href) => href.endsWith(batteryPdfPath)).length < 3) {
    addIssue('projects', 'Battery RUL page must link the approved paper from its preview, view action, and download action');
  }
  if (!/Full paper\s*·\s*Chinese\s*·\s*169 pages/i.test(batteryText)) {
    addIssue('projects', 'Battery RUL page is missing the full-paper language and page count');
  }
  if (/result pending|\baward(?:ed)?\b|\bprize\b/i.test(batteryText)) {
    addIssue('truthfulness', 'Battery RUL page must not expose a competition result or award claim');
  }

  const netsage = htmlByName.get(pageFiles.get('NetSage case study')) ?? '';
  if (!/ed692cba/i.test(visibleText(netsage))) {
    addIssue('truthfulness', 'NetSage page is missing verified commit ed692cba');
  }
  const repositoryLink = (netsage.match(/<a\b[^>]*>/gi) ?? []).some((tag) =>
    (attribute(tag, 'href') ?? '').replace(/\/$/, '') === 'https://github.com/lbrswne/NetSage');
  if (!repositoryLink) addIssue('truthfulness', 'NetSage page is missing the verified repository link');

  const projects = htmlByName.get(pageFiles.get('Projects')) ?? '';
  const projectsText = visibleText(projects);
  if (!/assets\/images\/scenic-guide-visitor\.webp/i.test(projects)) {
    addIssue('assets', 'Projects page is missing the Scenic Guide visitor-interface preview');
  }
  if (/scenic-visual/i.test(projects)) {
    addIssue('design', 'Projects page still contains the obsolete Scenic Guide placeholder visual');
  }
  if ((projectsText.match(/\bno award\b/gi) ?? []).length !== 1) {
    addIssue('truthfulness', 'Scenic Guide no-award boundary must appear exactly once on the Projects page');
  }
  if ((projectsText.match(/production deployment/gi) ?? []).length !== 1) {
    addIssue('truthfulness', 'Scenic Guide production boundary must appear exactly once on the Projects page');
  }

  const jensenHtml = htmlByName.get(pageFiles.get('Jensen Polynomials research')) ?? '';
  const jensenText = visibleText(jensenHtml);
  if (!/Submitted to the International Journal of Number Theory/i.test(jensenText)) {
    addIssue('truthfulness', 'Jensen page must use the verified status: Submitted to the International Journal of Number Theory');
  }
  if (/\b(?:under review|accepted|published)\b/i.test(jensenText)) {
    addIssue('truthfulness', 'Jensen page exposes an unsupported publication status');
  }
  const jensenPdfLinks = (jensenHtml.match(/<a\b[^>]*>/gi) ?? [])
    .map((tag) => attribute(tag, 'href') ?? '')
    .filter((href) => /\.pdf(?:[?#]|$)/i.test(href));
  if (!jensenPdfLinks.some((href) => href.endsWith('assets/documents/subcritical-hyperbolicity-jensen-polynomials-riemann-xi.pdf'))) {
    addIssue('research', 'Jensen page is missing the approved submitted-manuscript PDF link');
  }

  const hypergraphHtml = htmlByName.get(pageFiles.get('Hypergraph Tensor research')) ?? '';
  const hypergraphText = visibleText(hypergraphHtml);
  if (!/Manuscript in preparation/i.test(hypergraphText)) {
    addIssue('truthfulness', 'Hypergraph Tensor page must use the verified status: Manuscript in preparation');
  }
  if (/\b(?:submitted|under review|accepted|published)\b/i.test(hypergraphText)) {
    addIssue('truthfulness', 'Hypergraph Tensor page exposes an unsupported publication status');
  }
  if (/\.pdf(?:[?#]|$)/i.test(hypergraphHtml)) {
    addIssue('privacy', 'Hypergraph Tensor page must not expose a manuscript PDF');
  }
}

function checkProfileLinks(pageFiles, htmlByName) {
  const requiredAccounts = [
    ['lbrswne', 'https://github.com/lbrswne'],
    ['ruoquecheng-eng', 'https://github.com/ruoquecheng-eng'],
  ];
  const home = htmlByName.get(pageFiles.get('Home')) ?? '';
  const resume = htmlByName.get(pageFiles.get('Resume')) ?? '';

  for (const [label, url] of requiredAccounts) {
    for (const [pageLabel, html] of [['Home footer', home], ['Resume', resume]]) {
      const hasLink = (html.match(/<a\b[^>]*>/gi) ?? []).some((tag) =>
        (attribute(tag, 'href') ?? '').replace(/\/$/, '') === url);
      if (!hasLink) addIssue('profile', `${pageLabel} is missing GitHub account ${label}`);
    }
  }

  const resumeText = visibleText(resume);
  if (!/NetSage and original project repositories/i.test(resumeText)) {
    addIssue('profile', 'Resume does not identify the purpose of the lbrswne account');
  }
  if (!/Portfolio source repository and GitHub Pages hosting/i.test(resumeText)) {
    addIssue('profile', 'Resume does not identify the purpose of the ruoquecheng-eng account');
  }
}

async function main() {
  try {
    const canonicalDist = await realpath(distRoot);
    const info = await stat(canonicalDist);
    if (!info.isDirectory()) throw new Error('not a directory');
  } catch {
    console.error(`QA failed: build output not found at ${distRoot}. Run npm run build first.`);
    process.exitCode = 1;
    return;
  }

  const files = await walk(distRoot);
  const fileNames = files.map(relativeName);
  const fileSet = new Set(fileNames);
  const pageFiles = new Map();

  for (const [label, candidates] of requiredPages) {
    const found = firstExisting(candidates, fileSet);
    if (!found) addIssue('pages', `Missing required page: ${label} (${candidates.join(' or ')})`);
    else pageFiles.set(label, found);
  }

  for (const [label, candidates] of requiredAssets) {
    if (!firstExisting(candidates, fileSet)) {
      addIssue('assets', `Missing required asset: ${label} (${candidates.join(' or ')})`);
    }
  }

  const forbiddenFile = /(?:^|\/)(?:content\/evidence|evidence)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|SOURCES\.json$|\.(?:db|sqlite\d*|log|bak|pem|key|p12|pfx)$/i;
  for (const name of fileNames) {
    if (forbiddenFile.test(name)) addIssue('privacy', `Forbidden or private file in dist: ${name}`);
    if (/\.pdf$/i.test(name) && !allowedPublicPdfs.has(name)) {
      addIssue('privacy', `Unapproved PDF in dist: ${name}`);
    }
  }

  const readableExtensions = new Set(['.css', '.html', '.js', '.json', '.mjs', '.svg', '.txt', '.webmanifest', '.xml']);
  const htmlByName = new Map();
  for (const file of files) {
    const name = relativeName(file);
    if (!readableExtensions.has(path.extname(name).toLowerCase())) continue;
    const content = await readFile(file, 'utf8');
    checkSensitiveContent(name, content);
    if (name.toLowerCase().endsWith('.html')) htmlByName.set(name, content);
  }

  for (const [name, html] of htmlByName) {
    const file = path.resolve(distRoot, ...name.split('/'));
    checkMetadata(file, html);
    checkLinks(file, html, fileSet, htmlByName);
    for (const reference of extractReferences(html)) {
      if (/\.pdf(?:[?#]|$)/i.test(reference.value)) {
        const resolved = targetCandidates(file, reference.value);
        if (!resolved.candidates.some((candidate) => allowedPublicPdfs.has(candidate))) {
          addIssue('privacy', `${name}: unapproved public PDF link: ${reference.value}`);
        }
      }
    }
  }

  checkResearchAndProjectFacts(pageFiles, htmlByName);
  checkProfileLinks(pageFiles, htmlByName);

  const css = [...fileSet]
    .filter((name) => name.toLowerCase().endsWith('.css'))
    .map((name) => files[fileNames.indexOf(name)]);
  const combinedCss = (await Promise.all(css.map((file) => readFile(file, 'utf8')))).join('\n');
  if (!/@media\s+print\b/i.test(combinedCss)) addIssue('css', 'Missing @media print styles');
  if (!/prefers-reduced-motion/i.test(combinedCss)) addIssue('css', 'Missing prefers-reduced-motion handling');

  if (issues.length) {
    console.error(`QA failed with ${issues.length} issue${issues.length === 1 ? '' : 's'}:`);
    for (const issue of issues) console.error(`- [${issue.group}] ${issue.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`QA passed: ${htmlByName.size} HTML pages and ${files.length} public files checked.`);
}

main().catch((error) => {
  console.error(`QA crashed: ${error.stack ?? error.message}`);
  process.exitCode = 1;
});
