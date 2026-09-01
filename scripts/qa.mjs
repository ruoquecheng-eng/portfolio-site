import { readdir, readFile, realpath, stat } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const distRoot = path.resolve(projectRoot, process.env.QA_DIST ?? 'dist');
const execFileAsync = promisify(execFile);
const issues = [];
const sourceFiles = {
  profile: 'content/facts/profile.json',
  education: 'content/facts/education.json',
  netsage: 'content/facts/projects/netsage.json',
  battery: 'content/facts/projects/battery-rul.json',
  rail: 'content/facts/projects/high-speed-rail.json',
  scenic: 'content/facts/projects/scenic-guide.json',
  connected: 'content/facts/research/connected-diagram-expansions.json',
  cubic: 'content/facts/research/critical-cubic-crossover.json',
  hypergraph: 'content/facts/research/hypergraph-tensor.json',
};
const [siteConfig, publicClaimsData, sourceRecords] = await Promise.all([
  readFile(path.join(projectRoot, 'site.config.json'), 'utf8').then(JSON.parse),
  readFile(path.join(projectRoot, 'content', 'public-claims.json'), 'utf8').then(JSON.parse),
  Promise.all(Object.entries(sourceFiles).map(async ([key, file]) => [key, JSON.parse(await readFile(path.join(projectRoot, file), 'utf8'))])).then(Object.fromEntries),
]);
const siteBaseUrl = `${siteConfig.canonicalOrigin}${siteConfig.basePath}`;
const defaultOgUrl = `${siteBaseUrl}assets/images/og-portfolio.png`;
const allowedPublicPdfs = new Set([
  'assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf',
  'assets/documents/beyond-vertex-profiles-nonuniform-hypergraph-tensors.pdf',
]);

const requiredPages = new Map([
  ['Home', ['index.html']],
  ['Projects', ['projects/index.html', 'projects.html']],
  ['NetSage case study', ['projects/netsage/index.html', 'projects/netsage.html']],
  ['Battery RUL case study', ['projects/battery-rul/index.html', 'projects/battery-rul.html']],
  ['High-speed rail project', ['projects/high-speed-rail/index.html', 'projects/high-speed-rail.html']],
  ['EngineerPlus interactive demo', ['projects/high-speed-rail/demo/index.html']],
  ['Research', ['research/index.html', 'research.html']],
  ['Connected-diagram research', ['research/connected-diagram-expansions/index.html', 'research/connected-diagram-expansions.html']],
  ['Critical cubic crossover research', ['research/critical-cubic-crossover/index.html', 'research/critical-cubic-crossover.html']],
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
  ['EngineerPlus demo stylesheet', ['styles/engineerplus-demo.css']],
  ['EngineerPlus demo script', ['scripts/engineerplus-demo.js']],
  ['NetSage icon', ['assets/images/netsage-icon.webp']],
  ['NetSage v0.2 app dashboard', ['assets/images/netsage-app-v020-home.webp']],
  ['NetSage v0.2 quick checkup', ['assets/images/netsage-app-v020-checkup.webp']],
  ['NetSage v0.2 active result', ['assets/images/netsage-app-v020-result.webp']],
  ['NetSage diagnosis input', ['assets/images/netsage-app-diagnosis-input.webp']],
  ['NetSage diagnosis history', ['assets/images/netsage-app-history.webp']],
  ['NetSage scenario library', ['assets/images/netsage-app-scenarios.webp']],
  ['battery RUL parity figure', ['assets/images/battery-rul-parity.webp']],
  ['battery compatibility figure', ['assets/images/battery-compatibility-graph.webp']],
  ['battery strategy figure', ['assets/images/battery-strategy-comparison.webp']],
  ['battery modeling paper cover', ['assets/images/battery-modeling-paper-cover.webp']],
  ['battery modeling paper', ['assets/documents/lithium-ion-battery-rul-cascade-utilization-modeling.pdf']],
  ['high-speed rail image', ['assets/images/high-speed-carriage.webp']],
  ['EngineerPlus overview', ['assets/images/engineerplus-overview.webp']],
  ['EngineerPlus capital pooling module', ['assets/images/engineerplus-capital-pooling.webp']],
  ['EngineerPlus risk simulator module', ['assets/images/engineerplus-risk-simulator.webp']],
  ['EngineerPlus compliance module', ['assets/images/engineerplus-compliance-hub.webp']],
  ['EngineerPlus impact dashboard module', ['assets/images/engineerplus-impact-dashboard.webp']],
  ['Scenic Guide visitor interface', ['assets/images/scenic-guide-visitor.webp']],
  ['Scenic Guide sanitized source package', ['assets/downloads/Scenic-Guide-Digital-Human-Source-v0.1.0.zip']],
  ['Hypergraph manuscript title page', ['assets/images/hypergraph-manuscript-title-page.png']],
  ['Hypergraph submitted manuscript', ['assets/documents/beyond-vertex-profiles-nonuniform-hypergraph-tensors.pdf']],
  ['Portfolio Open Graph image', ['assets/images/og-portfolio.png']],
]);

const sitemapRoutes = [
  '/',
  '/projects/',
  '/projects/netsage/',
  '/projects/battery-rul/',
  '/projects/high-speed-rail/',
  '/projects/high-speed-rail/demo/',
  '/research/',
  '/research/connected-diagram-expansions/',
  '/research/critical-cubic-crossover/',
  '/research/hypergraph-tensor/',
  '/resume/',
];

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
  } else if (!canonicalHref.startsWith(siteBaseUrl)) {
    addIssue('metadata', `${name}: canonical URL is outside configured GitHub Pages base path`);
  }

  for (const property of ['og:title', 'og:description', 'og:type', 'og:url', 'og:image', 'og:image:width', 'og:image:height']) {
    if (!metaByProperty.get(property)) addIssue('metadata', `${name}: missing Open Graph ${property}`);
  }
  if (canonicalHref && metaByProperty.get('og:url') !== canonicalHref) {
    addIssue('metadata', `${name}: og:url does not match canonical URL`);
  }
  const ogImage = metaByProperty.get('og:image') ?? '';
  const isEngineerPlusDemo = name === 'projects/high-speed-rail/demo/index.html';
  const expectedOgImage = isEngineerPlusDemo ? `${siteBaseUrl}assets/images/engineerplus-overview.webp` : defaultOgUrl;
  const expectedOgSize = isEngineerPlusDemo ? ['1440', '900'] : ['1200', '630'];
  if (ogImage !== expectedOgImage) addIssue('metadata', `${name}: unexpected Open Graph image URL`);
  if (metaByProperty.get('og:image:width') !== expectedOgSize[0] || metaByProperty.get('og:image:height') !== expectedOgSize[1]) {
    addIssue('metadata', `${name}: incorrect Open Graph image dimensions`);
  }
  if (metaByName.get('twitter:card') !== 'summary_large_image' || metaByName.get('twitter:image') !== expectedOgImage) {
    addIssue('metadata', `${name}: incomplete Twitter large-image metadata`);
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
  const homeHtml = htmlByName.get(pageFiles.get('Home')) ?? '';
  const homeResearchSummaryMatch = homeHtml.match(/<p\s+class=["']research-status-summary["'][^>]*>([\s\S]*?)<\/p>/i);
  const homeResearchSummary = visibleText(homeResearchSummaryMatch?.[1] ?? '');
  const submittedVenue = (statusText) => statusText.match(/^Submitted to\s+(.+)$/i)?.[1] ?? null;
  const hypergraphVenue = submittedVenue(sourceRecords.hypergraph.statusText);
  const expectedHomeResearchSummary = `Two single-author manuscripts are under review. The hypergraph-tensor collaboration is ${hypergraphVenue ? `submitted to ${hypergraphVenue}` : sourceRecords.hypergraph.statusText}.`;
  if (homeResearchSummary !== expectedHomeResearchSummary) {
    addIssue('truthfulness', 'Home research status summary is not synchronized with verified research statuses');
  }
  if (/^Submitted\b/i.test(sourceRecords.hypergraph.statusText) && /hypergraph[\s\S]{0,180}in preparation|in preparation[\s\S]{0,180}hypergraph/i.test(visibleText(homeHtml))) {
    addIssue('truthfulness', 'Home still describes the submitted Hypergraph manuscript as in preparation');
  }

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
  if (!/University-level Second Prize in the Mathematical Modeling Competition/i.test(batteryText)) {
    addIssue('truthfulness', 'Battery RUL page must state the verified university-level second prize');
  }

  const netsage = htmlByName.get(pageFiles.get('NetSage case study')) ?? '';
  if (!/ba30a5c/i.test(visibleText(netsage))) {
    addIssue('truthfulness', 'NetSage page is missing verified commit ba30a5c');
  }
  const repositoryLink = (netsage.match(/<a\b[^>]*>/gi) ?? []).some((tag) =>
    (attribute(tag, 'href') ?? '').replace(/\/$/, '') === 'https://github.com/lbrswne/NetSage');
  if (!repositoryLink) addIssue('truthfulness', 'NetSage page is missing the verified repository link');
  const netsageScreens = (netsage.match(/<img\b[^>]*>/gi) ?? [])
    .map((tag) => attribute(tag, 'src') ?? '')
    .filter((src) => /assets\/images\/netsage-app-[^/]+\.webp$/i.test(src));
  if (new Set(netsageScreens).size !== 6) {
    addIssue('projects', 'NetSage page must publish six distinct verified Android screenshots');
  }
  if (!/captured from NetSage 0\.2\.0 on an Android 36\.1 emulator on 1 September 2026/i.test(visibleText(netsage))) {
    addIssue('truthfulness', 'NetSage screenshots are missing their verified build and capture context');
  }

  const projects = htmlByName.get(pageFiles.get('Projects')) ?? '';
  const projectsText = visibleText(projects);
  if (!/assets\/images\/scenic-guide-visitor\.webp/i.test(projects)) {
    addIssue('assets', 'Projects page is missing the Scenic Guide visitor-interface preview');
  }
  if (/scenic-visual/i.test(projects)) {
    addIssue('design', 'Projects page still contains the obsolete Scenic Guide placeholder visual');
  }
  if (/\bno award\b|production deployment/i.test(projectsText)) {
    addIssue('copy', 'Scenic Guide supporting-work copy must not foreground award or deployment disclaimers');
  }
  const scenicSourcePath = 'assets/downloads/Scenic-Guide-Digital-Human-Source-v0.1.0.zip';
  if (!projects.includes(scenicSourcePath) || !/Download sanitized source package/i.test(projectsText)) {
    addIssue('projects', 'Projects page is missing the Scenic Guide sanitized-source download link');
  }
  if (!/excludes credentials, runtime data, logs, and third-party Live2D assets/i.test(projectsText)) {
    addIssue('truthfulness', 'Scenic Guide source download must disclose its excluded credentials, runtime data, logs, and third-party Live2D assets');
  }

  const railHtml = htmlByName.get(pageFiles.get('High-speed rail project')) ?? '';
  const railText = visibleText(railHtml);
  if (!/five-person course team/i.test(railText) || !/Proposed Design/i.test(railText)) {
    addIssue('truthfulness', 'High-speed rail page must preserve the team context and recorded Proposed Design role');
  }
  if (!/independently designed and implemented the five EngineerPlus front-end pages/i.test(railText)) {
    addIssue('truthfulness', 'High-speed rail page must state the independent EngineerPlus contribution precisely');
  }
  if ((railText.match(/Illustrative interface data/gi) ?? []).length !== 0 || !/interaction, not to report operating results/i.test(railText)) {
    addIssue('copy', 'EngineerPlus limitations should be stated once at section level instead of repeated in every module caption');
  }
  if (/\$12\.8B|\b119%\b|\b30%\b/i.test(railText)) {
    addIssue('truthfulness', 'Demo headline values must not be repeated as public page claims');
  }
  if (!/does not connect to a blockchain/i.test(railText) || !/no backend, authentication, persistence, or production deployment/i.test(railText)) {
    addIssue('truthfulness', 'EngineerPlus service and deployment limitations must remain visible');
  }
  if (/cdn\.tailwindcss\.com|cdn\.jsdelivr\.net|cdnjs\.cloudflare\.com|fonts\.googleapis\.com|unpkg\.com/i.test(railHtml)) {
    addIssue('privacy', 'High-speed rail page must use local captures instead of original prototype CDN dependencies');
  }
  const railDemoLinks = (railHtml.match(/<a\b[^>]*>/gi) ?? [])
    .map((tag) => attribute(tag, 'href') ?? '')
    .filter((href) => /projects\/high-speed-rail\/demo\//i.test(href));
  if (railDemoLinks.length < 9 || !railDemoLinks.some((href) => href.endsWith('/demo/'))) {
    addIssue('projects', 'High-speed rail page must provide the primary demo action and two deep links for each module');
  }

  const demoHtml = htmlByName.get(pageFiles.get('EngineerPlus interactive demo')) ?? '';
  const demoText = visibleText(demoHtml);
  if (!/Interactive concept prototype/i.test(demoText) || !/Illustrative data only/i.test(demoText)) {
    addIssue('truthfulness', 'EngineerPlus demo must display both prototype-boundary labels');
  }
  for (const module of ['overview', 'capital', 'risk', 'compliance', 'impact']) {
    if (!new RegExp(`id=["']${module}["']`, 'i').test(demoHtml) || !new RegExp(`href=["']#${module}["']`, 'i').test(demoHtml)) {
      addIssue('projects', `EngineerPlus demo is missing the #${module} module target or navigation link`);
    }
  }
  if (!/Back to case study/i.test(demoText) || !/Reset demo/i.test(demoText)) {
    addIssue('projects', 'EngineerPlus demo is missing its case-study return or reset control');
  }
  if (/type=["']file["']/i.test(demoHtml)) addIssue('privacy', 'EngineerPlus demo must not expose a file upload control');
  if (/\$12\.8B|\b119%\b|\b30%\b|\bLive Data\b|\bAPI Access\b|\bLogin\b/i.test(demoText)) {
    addIssue('truthfulness', 'EngineerPlus demo contains an unsupported original-prototype headline or control');
  }
  if (/cdn\.|fonts\.googleapis|openstreetmap|leaflet|chart\.js|tailwind/i.test(demoHtml)) {
    addIssue('privacy', 'EngineerPlus demo must not depend on an external resource or service');
  }

  for (const [pageName, journal] of [
    ['Connected-diagram research', 'Advances in Mathematics'],
    ['Critical cubic crossover research', 'Journal of the London Mathematical Society'],
  ]) {
    const manuscriptHtml = htmlByName.get(pageFiles.get(pageName)) ?? '';
    const manuscriptText = visibleText(manuscriptHtml);
    if (!/Under review/i.test(manuscriptText) || !manuscriptText.includes(journal) || !/31 August 2026/i.test(manuscriptText)) {
      addIssue('truthfulness', `${pageName} must expose the verified journal, submission date, and Under review status`);
    }
    if (!/submission agreement restricts public sharing/i.test(manuscriptText) || !/does not mean accepted or published/i.test(manuscriptText)) {
      addIssue('truthfulness', `${pageName} is missing the manuscript access and review-status boundary`);
    }
    if (/\.pdf(?:[?#]|$)/i.test(manuscriptHtml)) {
      addIssue('privacy', `${pageName} must not expose a manuscript PDF`);
    }
    if (/ruoquecheng@gmail\.com|260831-Ning|Withdraw this Article|Upload a Revised Version/i.test(manuscriptHtml)) {
      addIssue('privacy', `${pageName} exposes private submission-portal material`);
    }
  }

  const hypergraphHtml = htmlByName.get(pageFiles.get('Hypergraph Tensor research')) ?? '';
  const hypergraphText = visibleText(hypergraphHtml);
  if (!/Submitted to Linear and Multilinear Algebra/i.test(hypergraphText)) {
    addIssue('truthfulness', 'Hypergraph Tensor page must use the verified status: Submitted to Linear and Multilinear Algebra');
  }
  if (/\b(?:under review|accepted|published)\b/i.test(hypergraphText)) {
    addIssue('truthfulness', 'Hypergraph Tensor page exposes an unsupported publication status');
  }
  if (!hypergraphText.includes(sourceRecords.hypergraph.authorshipText)) {
    addIssue('truthfulness', 'Hypergraph Tensor page must state the verified author order and roles');
  }
  const hypergraphPdfLinks = (hypergraphHtml.match(/<a\b[^>]*>/gi) ?? [])
    .map((tag) => attribute(tag, 'href') ?? '')
    .filter((href) => /\.pdf(?:[?#]|$)/i.test(href));
  const hypergraphPdfPath = 'assets/documents/beyond-vertex-profiles-nonuniform-hypergraph-tensors.pdf';
  if (hypergraphPdfLinks.filter((href) => href.endsWith(hypergraphPdfPath)).length < 2) {
    addIssue('research', 'Hypergraph Tensor page must link the approved manuscript from its view and download actions');
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
  if (!/independently developed a five-page front-end prototype/i.test(resumeText)) {
    addIssue('profile', 'Resume is missing the bounded EngineerPlus contribution');
  }
}

function valueAt(record, field) {
  return field.split('.').reduce((value, key) => value?.[key], record);
}

function checkFactGovernance(pageFiles, htmlByName) {
  const requiredBindings = new Set([
    'profile.hero.name', 'profile.hero.summary', 'netsage.summary', 'battery.dataBoundary', 'battery.summary', 'battery.competitionResult',
    'rail.summary', 'rail.role', 'rail.components.engineeringDesign.context', 'rail.components.engineeringDesign.role',
    'rail.components.engineeringDesign.summary', 'rail.components.engineerPlus.context', 'rail.components.engineerPlus.role',
    'rail.components.engineerPlus.summary', 'scenic.summary', 'connected.statusText', 'connected.summary', 'connected.accessText',
    'cubic.statusText', 'cubic.summary', 'cubic.accessText',
    'hypergraph.statusText', 'hypergraph.summary', 'hypergraph.title', 'hypergraph.authorshipText',
  ]);
  const seenBindings = new Set();

  for (const binding of publicClaimsData.claims ?? []) {
    const key = `${binding.record}.${binding.field}`;
    if (seenBindings.has(key)) addIssue('governance', `Duplicate public claim binding: ${key}`);
    seenBindings.add(key);
    const record = sourceRecords[binding.record];
    const value = valueAt(record, binding.field);
    const fact = (record?.facts ?? []).find((candidate) => candidate.id === binding.factId);
    if (!record || typeof value !== 'string' || !value.trim()) {
      addIssue('governance', `Public claim field is missing: ${key}`);
    } else if (!fact || fact.public !== true || fact.status !== 'verified' || fact.publicText !== value) {
      addIssue('governance', `Public claim is not backed by an exact verified public fact: ${key}`);
    }
  }
  for (const key of requiredBindings) {
    if (!seenBindings.has(key)) addIssue('governance', `Required public claim binding is missing: ${key}`);
  }

  const renderedText = [...htmlByName.values()].map(visibleText).join(' ').toLowerCase();
  for (const record of Object.values(sourceRecords)) {
    for (const fact of record.facts ?? []) {
      if (fact.public === true && fact.status !== 'verified') {
        addIssue('governance', `Public fact is not verified: ${fact.id}`);
      }
      if (fact.public === false && fact.publicText?.trim() && renderedText.includes(fact.publicText.toLowerCase())) {
        addIssue('governance', `Non-public fact appears in generated HTML: ${fact.id}`);
      }
    }
  }

  const batteryText = visibleText(htmlByName.get(pageFiles.get('Battery RUL case study')) ?? '');
  for (const fact of sourceRecords.battery.facts.filter((candidate) => /^battery\.(?:data\.scale|q[1-4]\.result)$/.test(candidate.id))) {
    if (fact.public !== true || fact.status !== 'verified' || !batteryText.includes(fact.publicText)) {
      addIssue('governance', `Battery metric is not rendered from its verified public fact: ${fact.id}`);
    }
  }

  const reviewDates = [
    ...Object.values(sourceRecords).flatMap((record) => (record.facts ?? []).filter((fact) => fact.public === true && fact.status === 'verified').map((fact) => fact.lastVerified)),
    ...(sourceRecords.profile.links ?? []).filter((link) => link.public === true && link.status === 'verified').map((link) => link.lastVerified),
  ].filter(Boolean).sort();
  const latestDate = reviewDates.at(-1);
  const formattedDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${latestDate}T00:00:00Z`));
  const expectedFooter = `Facts last reviewed ${formattedDate}.`;
  for (const [name, html] of htmlByName) {
    if (/class=["'][^"']*site-footer/i.test(html) && !visibleText(html).includes(expectedFooter)) {
      addIssue('governance', `${name}: footer review date does not match latest verified public fact/link date`);
    }
  }
}

async function checkSeoFiles(fileSet) {
  const expectedRobots = `User-agent: *\nAllow: /\nSitemap: ${siteBaseUrl}sitemap.xml\n`;
  const robots = await readFile(path.join(distRoot, 'robots.txt'), 'utf8');
  if (robots !== expectedRobots) addIssue('seo', 'robots.txt must contain three exact newline-separated directives using the configured sitemap URL');

  const sitemap = await readFile(path.join(distRoot, 'sitemap.xml'), 'utf8');
  const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  const expectedLocations = sitemapRoutes.map((route) => `${siteConfig.canonicalOrigin}${siteConfig.basePath.replace(/\/$/, '')}${route}`);
  if (locations.length !== expectedLocations.length || expectedLocations.some((url) => !locations.includes(url))) {
    addIssue('seo', 'sitemap.xml does not exactly cover the generated canonical routes');
  }

  const manifest = JSON.parse(await readFile(path.join(distRoot, 'manifest.webmanifest'), 'utf8'));
  if (manifest.start_url !== siteConfig.basePath) addIssue('seo', 'manifest start_url does not match configured basePath');

  const ogPath = 'assets/images/og-portfolio.png';
  if (fileSet.has(ogPath)) {
    const png = await readFile(path.join(distRoot, ...ogPath.split('/')));
    const isPng = png.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const width = isPng ? png.readUInt32BE(16) : 0;
    const height = isPng ? png.readUInt32BE(20) : 0;
    if (!isPng || width !== 1200 || height !== 630) addIssue('seo', 'Shared Open Graph image must be a 1200x630 PNG');
  }
}

async function checkTrackedRepository() {
  const { stdout } = await execFileAsync('git', ['ls-files', '-z'], {
    cwd: projectRoot,
    encoding: 'utf8',
    env: { ...process.env, GIT_CONFIG_NOSYSTEM: '1' },
    maxBuffer: 10 * 1024 * 1024,
  });
  const tracked = stdout.split('\0').filter(Boolean);
  const forbiddenTracked = /(?:^|\/)(?:content\/evidence|evidence)(?:\/|$)|(?:^|\/)\.env(?:\.|$)|SOURCES\.json$|\.(?:db|sqlite\d*|log|bak|pem|key|p12|pfx)$|(?:signed|identity)[-_ ]?(?:document|record)/i;
  const readable = new Set(['.css', '.html', '.js', '.json', '.md', '.mjs', '.py', '.svg', '.txt', '.webmanifest', '.xml', '.yaml', '.yml']);
  const leakPatterns = [
    ['user profile path', /C:[\\/]Users[\\/]/i],
    ['Agent workspace path', /C:[\\/]Agent[\\/]/i],
    ['private NetSage source path', /C:[\\/]new project-test[\\/]/i],
    ['private key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
    ['credential assignment', /\b(?:api[_-]?key|client[_-]?secret|password|passwd|access[_-]?token|auth[_-]?token)\b\s*[:=]\s*["']?[a-z0-9_./+@=-]{8,}/i],
    ['credential token', /\b(?:sk|ghp|github_pat|xox[baprs])[-_][a-z0-9_-]{12,}\b/i],
  ];

  for (const name of tracked) {
    if (forbiddenTracked.test(name)) addIssue('privacy', `Forbidden private file tracked by Git: ${name}`);
    if (!readable.has(path.extname(name).toLowerCase())) continue;
    let content;
    try {
      content = await readFile(path.join(projectRoot, ...name.split('/')), 'utf8');
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    for (const [label, pattern] of leakPatterns) {
      if (pattern.test(content)) addIssue('privacy', `${name}: tracked source leaks ${label}`);
    }
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
    if (/(?:Capital Pooling|Compliance Hub|Impact Dashboard|Risk Simulator|engineerplus\/home)\.html$/i.test(name)) {
      addIssue('privacy', `Original EngineerPlus prototype HTML must not be public: ${name}`);
    }
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
  checkFactGovernance(pageFiles, htmlByName);
  await checkSeoFiles(fileSet);
  await checkTrackedRepository();

  const css = [...fileSet]
    .filter((name) => name.toLowerCase().endsWith('.css'))
    .map((name) => files[fileNames.indexOf(name)]);
  const combinedCss = (await Promise.all(css.map((file) => readFile(file, 'utf8')))).join('\n');
  if (!/@media\s+print\b/i.test(combinedCss)) addIssue('css', 'Missing @media print styles');
  if (!/prefers-reduced-motion/i.test(combinedCss)) addIssue('css', 'Missing prefers-reduced-motion handling');

  const demoScript = await readFile(path.join(distRoot, 'scripts', 'engineerplus-demo.js'), 'utf8');
  if (!/sessionStorage/.test(demoScript) || !/engineerplus-demo-v1/.test(demoScript)) {
    addIssue('projects', 'EngineerPlus demo must use versioned sessionStorage state');
  }
  if (/\b(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/.test(demoScript)) {
    addIssue('privacy', 'EngineerPlus demo script must not make network requests');
  }
  if (/Math\.random|setInterval\s*\(/.test(demoScript)) {
    addIssue('truthfulness', 'EngineerPlus demo must use fixed, deterministic illustrative data');
  }

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
