import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const factsRoot = path.join(root, "content", "facts");

const readJson = async (...segments) => JSON.parse(await readFile(path.join(root, ...segments), "utf8"));

const [config, profile, education, netsage, battery, rail, scenic, jensen, hypergraph] = await Promise.all([
  readJson("site.config.json"),
  readJson("content", "facts", "profile.json"),
  readJson("content", "facts", "education.json"),
  readJson("content", "facts", "projects", "netsage.json"),
  readJson("content", "facts", "projects", "battery-rul.json"),
  readJson("content", "facts", "projects", "high-speed-rail.json"),
  readJson("content", "facts", "projects", "scenic-guide.json"),
  readJson("content", "facts", "research", "jensen-polynomials.json"),
  readJson("content", "facts", "research", "hypergraph-tensor.json")
]);

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const publicFacts = (record) => (record.facts || []).filter((fact) => fact.public === true && fact.status === "verified" && fact.publicText);
const publicLinks = (profile.links || []).filter((link) => link.public === true && link.status === "verified" && link.label && link.url);
const prefix = (depth) => "../".repeat(depth);
const local = (depth, target = "") => `${prefix(depth)}${target}`;
const canonical = (route) => `${config.canonicalOrigin}${config.basePath.replace(/\/$/, "")}${route}`;

const factList = (record, className = "fact-list") => `
  <ul class="${className}">
    ${publicFacts(record).map((fact) => `<li><span>${escapeHtml(fact.publicText)}</span><small>Verified ${escapeHtml(fact.lastVerified)}</small></li>`).join("")}
  </ul>`;

const textList = (items, className = "plain-list") => `
  <ul class="${className}">${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;

const status = (text) => `<span class="status">${escapeHtml(text)}</span>`;

const figure = ({ depth, src, width, height, alt, caption, eager = false, className = "figure" }) => `
  <figure class="${className}">
    <img src="${local(depth, `assets/${src}`)}" width="${width}" height="${height}" alt="${escapeHtml(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">
    <figcaption>${caption}</figcaption>
  </figure>`;

const nav = (depth, active) => {
  const items = [
    ["projects", "Projects", "projects/"],
    ["research", "Research", "research/"],
    ["resume", "Resume", "resume/"]
  ];
  return `
    <a class="brand" href="${local(depth)}" aria-label="Wanzheng Ning home">
      <span class="brand-mark" aria-hidden="true">WN</span>
      <span class="brand-text">Wanzheng Ning</span>
    </a>
    <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="site-nav">Menu</button>
    <nav class="site-nav" id="site-nav" aria-label="Primary navigation">
      ${items.map(([key, label, href]) => `<a href="${local(depth, href)}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`).join("")}
      <a href="${local(depth, "resume/#github-accounts")}">GitHub accounts</a>
      <button class="theme-toggle" type="button" aria-label="Switch color theme" title="Switch color theme"><span aria-hidden="true">◐</span><span class="sr-only">Switch color theme</span></button>
    </nav>`;
};

const jsonLd = (value) => value ? `<script type="application/ld+json">${JSON.stringify(value).replaceAll("<", "\\u003c")}</script>` : "";

const page = ({ title, description, route, depth, active, body, schema, bodyClass = "" }) => {
  const fullTitle = title === config.title ? title : `${title} | Wanzheng Ning`;
  const url = canonical(route);
  return `<!doctype html>
<html lang="${config.language}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="color-scheme" content="light dark">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${escapeHtml(fullTitle)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(`${config.canonicalOrigin}${config.basePath}assets/visuals/og-system.svg`)}">
  <meta property="og:image:alt" content="A restrained network and signal diagram for Wanzheng Ning's technical portfolio">
  <meta name="twitter:card" content="summary_large_image">
  <link rel="icon" href="${local(depth, "assets/favicon.svg")}" type="image/svg+xml">
  <link rel="stylesheet" href="${local(depth, "styles/main.css")}">
  <script>try{const t=localStorage.getItem("portfolio-theme");if(t)document.documentElement.dataset.theme=t}catch{}</script>
  ${jsonLd(schema)}
</head>
<body class="${bodyClass}">
  <a class="skip-link" href="#main">Skip to content</a>
  <div class="reading-progress" aria-hidden="true"><span></span></div>
  <header class="site-header"><div class="header-inner">${nav(depth, active)}</div></header>
  <main id="main">${body}</main>
  <footer class="site-footer">
    <div><strong>Wanzheng Ning</strong><p>Communication engineering, network diagnostics, modeling, and research.</p></div>
    <div>
      <a href="${local(depth, "projects/")}">Projects</a>
      <a href="${local(depth, "research/")}">Research</a>
      <a href="${local(depth, "resume/")}">Resume</a>
      ${publicLinks.map((link) => `<a href="${escapeHtml(link.url)}" rel="me noopener">GitHub · ${escapeHtml(link.label)}</a>`).join("")}
    </div>
    <p class="footer-note">Facts last reviewed 22 August 2026. Maintained as a verified static portfolio.</p>
  </footer>
  <script src="${local(depth, "scripts/main.js")}" defer></script>
</body>
</html>`;
};

const projectRow = ({ depth, href, index, type, title, summary, meta, visual }) => `
  <article class="project-row">
    <div class="project-index" aria-hidden="true">${index}</div>
    <div class="project-copy">
      <p class="project-type">${escapeHtml(type)}</p>
      <h2><a href="${local(depth, href)}">${escapeHtml(title)}</a></h2>
      <p>${escapeHtml(summary)}</p>
      <p class="project-meta">${escapeHtml(meta)}</p>
      <a class="text-link" href="${local(depth, href)}">Read case study <span aria-hidden="true">→</span></a>
    </div>
    ${visual || ""}
  </article>`;

const homeBody = `
  <section class="hero hero-home">
    <div class="hero-grid">
      <div class="hero-copy">
        <p class="hero-kicker">Communication Engineering</p>
        <h1>${escapeHtml(profile.hero.title)}</h1>
        <p class="hero-summary">${escapeHtml(profile.hero.summary)}</p>
        <div class="hero-actions">
          <a class="button" href="projects/">View projects</a>
          <a class="button-secondary" href="research/">View research</a>
          <a class="text-link text-link-on-dark" href="resume/">Open resume</a>
        </div>
      </div>
      <div class="hero-visual">
        <img src="assets/visuals/signal-field.svg" width="880" height="640" alt="Conceptual signal field connecting diagnostics, systems, modeling, and research" fetchpriority="high">
      </div>
    </div>
    <div class="hero-foot" aria-label="Focus areas"><span>Network diagnostics</span><span>Engineering software</span><span>Mathematical modeling</span><span>Spectral research</span></div>
  </section>
  <section class="section section-intro">
    <div class="section-heading">
      <p>Selected work</p>
      <h2>Systems that can be inspected.</h2>
    </div>
    <p class="section-lead">The primary work below shows implementation, modeling choices, validation boundaries, and limitations. Supporting projects remain available in the full project index.</p>
  </section>
  <section class="section selected-work">
    ${projectRow({
      depth: 0,
      href: "projects/netsage/",
      index: "01",
      type: netsage.type,
      title: netsage.title,
      summary: netsage.summary,
      meta: "Kotlin · Jetpack Compose · rule engine · offline-first",
      visual: `<div class="project-visual project-visual-netsage"><img src="assets/images/netsage-icon.webp" width="216" height="216" alt="NetSage application icon" loading="lazy"></div>`
    })}
    ${projectRow({
      depth: 0,
      href: "projects/battery-rul/",
      index: "02",
      type: `${battery.type} · ${battery.dataBoundary}`,
      title: battery.title,
      summary: battery.summary,
      meta: "Change-point regression · Weibull AFT · compatibility graph · MILP",
      visual: `<div class="project-visual project-visual-battery"><img src="assets/visuals/battery-workflow.svg" width="1240" height="650" alt="Conceptual four-stage battery modeling workflow" loading="lazy"></div>`
    })}
    <article class="project-row research-preview">
      <div class="project-index" aria-hidden="true">03</div>
      <div class="project-copy">
        <p class="project-type">Mathematical research</p>
        <h2><a href="research/">Two research lines in real-rootedness and tensor spectra</a></h2>
        <p>One manuscript is submitted to the International Journal of Number Theory. A second manuscript on edge-local information in nonuniform hypergraph tensors is in preparation.</p>
        <a class="text-link" href="research/">View research <span aria-hidden="true">→</span></a>
      </div>
      <div class="research-mini-list">
        <a href="research/jensen-polynomials/"><span>${escapeHtml(jensen.statusText)}</span><strong>Jensen polynomials and the Riemann xi-function</strong></a>
        <a href="research/hypergraph-tensor/"><span>${escapeHtml(hypergraph.statusText)}</span><strong>Edge-local spectra of nonuniform hypergraph tensors</strong></a>
      </div>
    </article>
  </section>
  <section class="section system-logic">
    <div class="section-heading"><p>Working method</p><h2>Define, build, validate, delimit.</h2></div>
    <ol class="method-flow">
      <li><span>Define</span><p>Turn an open engineering or mathematical question into an explicit object and scope.</p></li>
      <li><span>Build</span><p>Implement a system, model, proof structure, or reproducible analysis chain.</p></li>
      <li><span>Validate</span><p>Use tests, holdouts, source files, and exact statements to support the result.</p></li>
      <li><span>Delimit</span><p>State what remains simulated, unmeasured, unpublished, or outside the current implementation.</p></li>
    </ol>
  </section>`;

const projectsBody = `
  <section class="page-hero page-hero-dark">
    <div><p class="hero-kicker">Engineering and modeling</p><h1>Projects</h1><p>Two full case studies, followed by concise evidence-safe summaries of supporting work.</p></div>
  </section>
  <section class="section project-index-page">
    ${projectRow({depth: 1, href: "projects/netsage/", index: "01", type: netsage.type, title: netsage.title, summary: netsage.summary, meta: "Primary engineering case study", visual: `<div class="project-visual"><img src="${local(1, "assets/images/netsage-icon.webp")}" width="216" height="216" alt="NetSage application icon" loading="lazy"></div>`})}
    ${projectRow({depth: 1, href: "projects/battery-rul/", index: "02", type: `${battery.type} · ${battery.dataBoundary}`, title: battery.title, summary: battery.summary, meta: "Primary modeling case study", visual: `<div class="project-visual"><img src="${local(1, "assets/visuals/battery-workflow.svg")}" width="1240" height="650" alt="Conceptual Q1 to Q4 battery modeling workflow" loading="lazy"></div>`})}
  </section>
  <section class="section supporting-projects">
    <div class="section-heading"><p>Supporting work</p><h2>Engineering design and competition software</h2></div>
    <div class="support-grid">
      <article class="project-card">
        ${figure({depth: 1, src: "images/high-speed-carriage.webp", width: 1400, height: 900, alt: "Digital 3D prototype of a high-speed rail carriage", caption: "Real project material: a digital carriage prototype. No measured train-level energy result is claimed.", className: "card-figure"})}
        <div><p class="project-type">${escapeHtml(rail.type)}</p><h2>${escapeHtml(rail.title)}</h2><p>${escapeHtml(rail.summary)}</p>${status(rail.role)}${factList(rail, "fact-list compact")}</div>
      </article>
      <article class="project-card scenic-card">
        ${figure({depth: 1, src: "images/scenic-guide-visitor.webp", width: 1440, height: 900, alt: "Scenic Guide visitor interface showing the female digital guide and a five-stop route preview", caption: "Real project interface: female guide mode with route planning, text questions, voice input, and answer playback.", className: "card-figure scenic-figure"})}
        <div><p class="project-type">${escapeHtml(scenic.type)}</p><h2>${escapeHtml(scenic.title)}</h2><p>${escapeHtml(scenic.summary)}</p></div>
      </article>
    </div>
  </section>`;

const netsageBody = `
  <article class="case-study">
    <header class="case-hero netsage-hero">
      <div class="case-title">
        <p class="hero-kicker">Primary engineering case study</p>
        <h1>${escapeHtml(netsage.title)}</h1>
        <p>${escapeHtml(netsage.summary)}</p>
        <div class="case-meta">${status("Rule-based, not machine learning")}${status("Android · local-first")}${status("Verified commit ed692cba")}</div>
        <a class="button" href="${escapeHtml(netsage.repository)}" rel="noopener">Open GitHub repository</a>
      </div>
      <img class="case-icon" src="${local(2, "assets/images/netsage-icon.webp")}" width="216" height="216" alt="NetSage application icon">
    </header>
    <section class="section case-overview" id="overview">
      <div class="section-heading"><p>Overview</p><h2>From a symptom to a testable next action</h2></div>
      <p class="section-lead">NetSage organizes common network symptoms into an explainable diagnostic sequence. Instead of hiding a conclusion behind a model score, it exposes the matched evidence, ranked causes, and actions that a user can attempt and retest.</p>
      ${factList(netsage)}
    </section>
    <section class="section split-section" id="problem">
      <div><h2>Problem</h2><p>Network failures often arrive as partial logs, ambiguous browser errors, DNS symptoms, TLS failures, or intermittent packet loss. A useful diagnostic tool has to turn that fragmented evidence into a bounded set of hypotheses without pretending certainty.</p></div>
      <div><h2>Diagnosis philosophy</h2><p>The engine uses explicit rules and evidence matching. Confidence is a ranking aid within the rule system, not a probability produced by a trained machine-learning model.</p></div>
    </section>
    <section class="section section-dark" id="pipeline">
      <div class="section-heading"><p>Conceptual diagnostic flow</p><h2>The rule engine stays visible.</h2></div>
      ${figure({depth: 2, src: "visuals/netsage-diagnostic-flow.svg", width: 1280, height: 520, alt: "Conceptual NetSage diagnostic flow from log input through rule matching, ranked causes, evidence, recommendations, actions, and retest", caption: "Conceptual Diagnostic Flow. This diagram represents the implemented rule sequence; it is not a measured network topology.", className: "flow-figure"})}
    </section>
    <section class="section architecture" id="architecture">
      <div class="section-heading"><p>Architecture</p><h2>Local Android workflow with retained service endpoints</h2></div>
      <div class="evidence-grid">
        <div><h3>Presentation</h3><p>Jetpack Compose screens handle symptom input, diagnosis results, scenario browsing, saved reports, history, and settings.</p></div>
        <div><h3>Diagnosis</h3><p>Rules map features and keywords to candidate causes, evidence, confidence values, and remediation actions.</p></div>
        <div><h3>Persistence</h3><p>SharedPreferences and Gson store local history, favorites, reports, and user settings.</p></div>
        <div><h3>Service boundary</h3><p>The Android client supports an offline-capable workflow; the repository also retains FastAPI health and diagnosis endpoints.</p></div>
      </div>
    </section>
    <section class="section split-section" id="explainability">
      <div><h2>Explainability</h2><p>A diagnosis is presented as a set of candidate causes rather than a single opaque answer. Each candidate can carry confidence, matched evidence, and a repair suggestion.</p></div>
      <div><h2>Action flow</h2><p>Checklists, action branches, command templates, and offline references help a user move from explanation to a concrete test, then retest after a change.</p></div>
    </section>
    <section class="section" id="implementation">
      <div class="section-heading"><p>Engineering implementation</p><h2>Verified capabilities in the current source</h2></div>
      <div class="two-column-lists"><div><h3>Product capabilities</h3>${textList(netsage.features)}</div><div><h3>Implementation evidence</h3>${textList(netsage.implementation)}</div></div>
    </section>
    <section class="section evidence-section" id="evidence">
      <div class="section-heading"><p>Evidence</p><h2>Repository state and visual boundary</h2></div>
      <dl class="evidence-ledger">
        <div><dt>Repository</dt><dd><a href="${escapeHtml(netsage.repository)}">github.com/lbrswne/NetSage</a></dd></div>
        <div><dt>Verified main commit</dt><dd><code>${escapeHtml(netsage.commit)}</code></dd></div>
        <div><dt>Published visual</dt><dd>Application icon and an original conceptual diagnostic flow</dd></div>
      </dl>
    </section>
    <section class="section limitations" id="limitations">
      <div class="section-heading"><p>Limitations</p><h2>Claims intentionally left outside the page</h2></div>
      ${textList(netsage.limitations)}
    </section>
    <section class="section final-link"><p>Inspect the current source and branch history on GitHub.</p><a class="button" href="${escapeHtml(netsage.repository)}" rel="noopener">View NetSage source</a></section>
  </article>`;

const batteryFigures = `
  <div class="figure-stack">
    ${figure({depth: 2, src: "images/battery-rul-parity.webp", width: 2160, height: 833, alt: "Three-panel original model output showing RUL predictions, interval coverage by degradation stage, and interval width", caption: "Real model output. The original Chinese labels show observed versus predicted RUL, nominal 90% interval coverage, and interval width. Results use fully simulated data generated with semi-empirical assumptions."})}
    ${figure({depth: 2, src: "images/battery-compatibility-graph.webp", width: 2520, height: 1890, alt: "Four-panel original model output showing retired-cell grades, gate failures, compatibility graph density, and one complete group", caption: "Real model output. The compatibility graph is generated after scenario-specific hard gates. The displayed group is evidence from the simulated candidate pool, not a physical battery assembly."})}
    ${figure({depth: 2, src: "images/battery-strategy-comparison.webp", width: 2134, height: 1615, alt: "Four-panel original model output comparing nominal, adaptive, and robust strategies across six stress scenarios", caption: "Real model output. Strategy comparison covers expected value, constraint risk, utilization, and lower-tail lifetime under six simulated stress scenarios."})}
  </div>`;

const batteryBody = `
  <article class="case-study battery-case">
    <header class="case-hero battery-hero">
      <div class="case-title">
        <p class="hero-kicker">Primary modeling case study</p>
        <h1>${escapeHtml(battery.title)}</h1>
        <p>${escapeHtml(battery.summary)}</p>
        <div class="case-meta">${status(battery.type)}${status(battery.dataBoundary)}${status("Internal holdout results")}</div>
      </div>
      <img class="case-wide-visual" src="${local(2, "assets/visuals/battery-workflow.svg")}" width="1240" height="650" alt="Conceptual workflow connecting Q1 degradation analysis, Q2 prediction, Q3 grouping, and Q4 robust stress testing">
    </header>
    <section class="section notice-section" aria-label="Data boundary">
      <strong>Data boundary</strong><p>Every numerical result on this page comes from fully simulated data generated with semi-empirical assumptions. No row is measured experimental data. The project does not claim an experimental battery platform, industrial validation, or real-world deployment.</p>
    </section>
    <section class="section" id="problem">
      <div class="section-heading"><p>Problem</p><h2>Connect prediction to a constrained second-life decision</h2></div>
      <p class="section-lead">The workflow treats prediction and grouping as one chain. Degradation stages inform SOH and RUL estimates; their uncertainty then affects compatibility, grouping, value, and stress-scenario risk.</p>
      ${factList(battery, "fact-list metric-list")}
    </section>
    <section class="section section-dark" id="workflow">
      <div class="section-heading"><p>Q1 to Q4 workflow</p><h2>A staged modeling and audit sequence</h2></div>
      ${figure({depth: 2, src: "visuals/battery-workflow.svg", width: 1240, height: 650, alt: "Conceptual four-stage battery modeling workflow", caption: "Conceptual modeling workflow derived from the executed Q1 to Q4 pipeline.", className: "flow-figure"})}
      <ol class="workflow-list">${battery.workflow.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>
    </section>
    <section class="section split-section" id="models">
      <div><h2>Degradation stage detection</h2><p>A continuous three-segment change-point regression represents slow, accelerated, and post-knee degradation. The median detected knee and its error are reported only for the simulated population.</p></div>
      <div><h2>SOH and RUL modeling</h2><p>Ridge regression estimates current SOH. A Weibull accelerated failure time model handles right-censored lifetimes for RUL prediction and interval construction.</p></div>
    </section>
    <section class="section split-section" id="optimization">
      <div><h2>Compatibility graph</h2><p>Scenario gates remove unsuitable candidates before graph construction. Edges encode pairwise compatibility under the stated predicted attributes and scenario rules.</p></div>
      <div><h2>Screening and optimization</h2><p>Complete groups are enumerated under candidate-generation rules, then an epsilon-constraint MILP explores utilization, inconsistency, and relative economic value.</p></div>
    </section>
    <section class="section" id="robustness">
      <div class="section-heading"><p>Robust strategy</p><h2>Freeze decisions before opening the final holdout</h2></div>
      <p class="section-lead">Probability compatibility, six stress scenarios, and CVaR-based comparisons test whether a nominal grouping remains useful when prediction error and shared stress propagate to the group level.</p>
    </section>
    <section class="section figure-section" id="figures">
      <div class="section-heading"><p>Evidence</p><h2>Three figures from the frozen modeling output</h2></div>
      ${batteryFigures}
    </section>
    <section class="section" id="validation">
      <div class="section-heading"><p>Validation and reproducibility</p><h2>Information boundaries are part of the model</h2></div>
      <div class="evidence-grid">${battery.validation.map((item, index) => `<div><span>${String(index + 1).padStart(2, "0")}</span><p>${escapeHtml(item)}</p></div>`).join("")}</div>
      <p class="repro-note">The source package records deterministic seeds, frozen outputs, figure generation, LaTeX assembly, and clean-package verification. The full dataset and paper are not published from this portfolio.</p>
    </section>
    <section class="section limitations" id="limitations">
      <div class="section-heading"><p>Limitations</p><h2>Simulation is not field validation</h2></div>
      ${textList(battery.limitations)}
    </section>
  </article>`;

const researchItem = ({ depth, href, record, question }) => `
  <article class="research-item">
    <div>${status(record.statusText)}<p class="project-type">Single-author manuscript</p></div>
    <div><h2><a href="${local(depth, href)}">${escapeHtml(record.title)}</a></h2><p>${escapeHtml(question)}</p><p>${escapeHtml(record.summary)}</p><a class="text-link" href="${local(depth, href)}">Read research summary <span aria-hidden="true">→</span></a></div>
  </article>`;

const researchBody = `
  <section class="page-hero research-hero">
    <div><p class="hero-kicker">Mathematical research</p><h1>Research</h1><p>Two single-author manuscripts on real-rooted polynomials and spectral information in nonuniform hypergraph tensors.</p></div>
    <div class="spectral-mark" aria-hidden="true"><span>ξ</span><span>ρ</span><span>H</span></div>
  </section>
  <section class="section research-list">
    ${researchItem({depth: 1, href: "research/jensen-polynomials/", record: jensen, question: "How far can effective hyperbolicity of xi-associated Jensen polynomials be pushed toward the cubic endpoint scale?"})}
    ${researchItem({depth: 1, href: "research/hypergraph-tensor/", record: hypergraph, question: "What spectral information is carried by the arrangement of vertex profiles inside nonuniform hyperedges?"})}
  </section>
  <section class="section research-policy"><div class="section-heading"><p>Publication policy</p><h2>Status is stated at the lowest verified level.</h2></div><p>Submitted does not mean accepted or published. Manuscript in preparation does not imply submission. Only files explicitly approved for public release are linked; the first submitted Jensen manuscript is available, while the hypergraph draft remains private.</p></section>`;

const manuscriptFeature = (record) => {
  const manuscript = record.manuscript;
  if (!manuscript || manuscript.public !== true || manuscript.status !== "verified") return "";
  const manuscriptHref = local(2, `assets/${manuscript.file}`);
  const previewHref = local(2, `assets/${manuscript.preview}`);
  const downloadName = path.posix.basename(manuscript.file);
  return `
      <section class="section manuscript-feature" aria-labelledby="manuscript-heading">
        <figure class="manuscript-preview">
          <a href="${manuscriptHref}" aria-label="Open the submitted manuscript PDF">
            <img src="${previewHref}" width="${manuscript.previewWidth}" height="${manuscript.previewHeight}" alt="Title page of the submitted Jensen polynomial manuscript" loading="lazy" decoding="async">
          </a>
          <figcaption>Title page from the first submitted version.</figcaption>
        </figure>
        <div class="manuscript-copy">
          <p class="manuscript-label">Submitted manuscript · ${escapeHtml(manuscript.date)}</p>
          <h2 id="manuscript-heading">Read the first submitted version.</h2>
          <p>This ${escapeHtml(manuscript.pages)}-page file documents the work as submitted. Making it available here does not indicate peer-review acceptance or publication.</p>
          <div class="manuscript-actions">
            <a class="button" href="${manuscriptHref}" target="_blank" rel="noopener">View manuscript <span aria-hidden="true">↗</span></a>
            <a class="text-link" href="${manuscriptHref}" download="${escapeHtml(downloadName)}">Download PDF <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </section>`;
};

const researchDetailBody = (record, kind) => {
  const isJensen = kind === "jensen";
  const question = isJensen
    ? "Can one prove a polynomial-scale effective real-rootedness range for Jensen polynomials associated with the Riemann xi-function?"
    : "Do complete vertex edge-size profiles determine the spectral behavior of a weighted nonuniform hypergraph tensor, or does edge-local arrangement add information?";
  const formula = isJensen
    ? `<div class="formula" role="img" aria-label="Jensen polynomial definition and subcritical hyperbolicity scale"><span>J<sub>γ</sub><sup>d,n</sup>(X) = Σ<sub>j=0</sub><sup>d</sup> C(d,j) γ(n+j) X<sup>j</sup></span><strong>M = n + d ≥ C<sub>ε</sub>d<sup>3+ε</sup></strong></div>`
    : `<div class="formula" role="img" aria-label="Neighbor profile spectral bound"><span>ρ(A<sup>η</sup>(H)) ≤ B<sub>np</sub><sup>η</sup>(H) ≤ max<sub>i</sub> R<sub>i</sub><sup>η</sup></span><strong>vertex profiles → edge-local arrangement → spectral information</strong></div>`;
  const contribution = isJensen
    ? "The submitted manuscript presents a proof of a subcritical criterion for every positive epsilon, combines exact Hermite reconstruction with finite-difference and shifted-saddle estimates, and explicitly leaves the endpoint M comparable to d cubed untreated."
    : "The current draft develops profile-explicit row sums, a neighbor-profile bound, examples separating equal vertex profiles by edge-local arrangement, a defect and equality analysis, an equitable quotient condition, and loose-star scaling laws.";
  return `
    <article class="research-paper">
      <header class="paper-hero">
        <div>${status(record.statusText)}<p class="project-type">Single-author research manuscript</p><h1>${escapeHtml(record.title)}</h1><p>Wanzheng Ning</p></div>
      </header>
      ${manuscriptFeature(record)}
      <section class="section paper-question"><div class="section-heading"><p>Research question</p><h2>${escapeHtml(question)}</h2></div>${formula}</section>
      <section class="section split-section"><div><h2>Non-specialist summary</h2><p>${escapeHtml(record.summary)}</p></div><div><h2>Current contribution</h2><p>${escapeHtml(contribution)}</p></div></section>
      <section class="section"><div class="two-column-lists"><div><h2>Mathematical objects</h2>${textList(record.objects)}</div><div><h2>Core techniques</h2>${textList(record.techniques)}</div></div></section>
      <section class="section keyword-section"><h2>Keywords</h2><ul class="keyword-list">${record.keywords.map((keyword) => `<li>${escapeHtml(keyword)}</li>`).join("")}</ul></section>
      <section class="section limitations paper-access"><div><h2>Access and status boundary</h2><p>${isJensen ? "The first submitted version is available above. Its public availability does not change the verified submission status or imply acceptance or publication." : "The portfolio does not provide a manuscript download. The status above is the lowest level supported by the current file evidence and should not be read as acceptance or publication."}</p></div><a class="button-secondary" href="${local(2, "research/")}">Back to research</a></section>
    </article>`;
};

const resumeBody = `
  <article class="resume">
    <header class="resume-header">
      <div><p class="hero-kicker">HTML resume</p><h1>${escapeHtml(profile.hero.name)}</h1><p>Communication Engineering · Network Diagnostics · Mathematical Modeling · Mathematical Research</p></div>
      <button class="button print-button" type="button" onclick="window.print()">Print or save as PDF</button>
    </header>
    <section class="resume-section"><h2>Education</h2><div class="resume-entry"><div><strong>${escapeHtml(publicFacts(education).find((fact) => fact.id === "education.institution")?.publicText || "")}</strong><span>Qinhuangdao, China</span></div><p>${escapeHtml(publicFacts(education).find((fact) => fact.id === "education.program")?.publicText || "")}</p></div></section>
    <section class="resume-section"><h2>Research</h2><div class="resume-entry"><div><strong>${escapeHtml(jensen.title)}</strong><span>${escapeHtml(jensen.statusText)}</span></div><p>Single-author work on effective hyperbolicity, Hermite reconstruction, finite differences, and shifted-saddle analysis.</p></div><div class="resume-entry"><div><strong>${escapeHtml(hypergraph.title)}</strong><span>${escapeHtml(hypergraph.statusText)}</span></div><p>Single-author work on edge-local information, nonnegative tensor bounds, quotient reduction, and loose-star asymptotics.</p></div></section>
    <section class="resume-section"><h2>Projects</h2><div class="resume-entry"><div><strong>NetSage</strong><span>Kotlin · Jetpack Compose · FastAPI</span></div><p>Local-first, rule-based Android network diagnosis with ranked causes, matched evidence, repair suggestions, history, favorites, and troubleshooting references.</p></div><div class="resume-entry"><div><strong>Battery RUL and cascade utilization modeling</strong><span>Python · survival modeling · graph optimization</span></div><p>Q1 to Q4 workflow on fully simulated data generated with semi-empirical assumptions, covering degradation stages, SOH/RUL, compatibility graphs, MILP grouping, and robust stress testing.</p></div><div class="resume-entry"><div><strong>Recycled carbon fiber high-speed rail carriage</strong><span>Five-person course team · Proposed Design</span></div><p>Team concept for selected non-critical carbody components, layered composite structures, and a digital prototype. No train-level energy saving is established.</p></div></section>
    <section class="resume-section"><h2>Competitions</h2><div class="resume-entry"><div><strong>Mathematical modeling project</strong><span>Competition modeling project</span></div><p>Four-part battery reliability and utilization workflow on fully simulated data generated with semi-empirical assumptions.</p></div><div class="resume-entry"><div><strong>Scenic Guide Digital Human</strong><span>Competition software project</span></div><p>Tourism guide prototype to which I contributed, with conversational and voice interaction, route guidance, narration, and knowledge management. No award is claimed.</p></div></section>
    <section class="resume-section"><h2>Technical skills</h2><dl class="skills-context"><div><dt>Network and mobile</dt><dd>Kotlin, Jetpack Compose, Android, network diagnostics, DNS/TLS/HTTP troubleshooting concepts</dd></div><div><dt>Modeling and research</dt><dd>Python, change-point regression, survival modeling, graph methods, mathematical optimization, asymptotic analysis, LaTeX</dd></div><div><dt>Software</dt><dd>FastAPI, JSON, Git</dd></div></dl></section>
    <section class="resume-section"><h2>Languages</h2><p>Chinese</p></section>
    <section class="resume-section resume-contact" id="github-accounts">
      <h2>GitHub accounts</h2>
      <dl class="skills-context account-list">
        ${publicLinks.map((link) => `<div><dt><a href="${escapeHtml(link.url)}" rel="me noopener">${escapeHtml(link.label)}</a></dt><dd>${escapeHtml(link.purpose)}</dd></div>`).join("")}
      </dl>
    </section>
  </article>`;

const routes = [
  {
    file: "index.html",
    route: "/",
    html: page({
      title: config.title,
      description: config.description,
      route: "/",
      depth: 0,
      active: "home",
      body: homeBody,
      bodyClass: "home-page",
      schema: {"@context": "https://schema.org", "@type": "Person", name: profile.hero.name, affiliation: {"@type": "CollegeOrUniversity", name: "Northeastern University at Qinhuangdao"}, url: canonical("/"), sameAs: publicLinks.map((link) => link.url), knowsAbout: ["Communication engineering", "Network diagnostics", "Mathematical modeling", "Hypergraph tensors"]}
    })
  },
  {
    file: "projects/index.html",
    route: "/projects/",
    html: page({title: "Projects", description: "Engineering software, network diagnostics, mathematical modeling, and interdisciplinary design projects.", route: "/projects/", depth: 1, active: "projects", body: projectsBody})
  },
  {
    file: "projects/netsage/index.html",
    route: "/projects/netsage/",
    html: page({title: "NetSage Network Diagnostics", description: "Case study of NetSage, a local-first rule-based Android network diagnostics application.", route: "/projects/netsage/", depth: 2, active: "projects", body: netsageBody, schema: {"@context": "https://schema.org", "@type": "SoftwareSourceCode", name: "NetSage", codeRepository: netsage.repository, programmingLanguage: ["Kotlin", "Python"], description: netsage.summary}})
  },
  {
    file: "projects/battery-rul/index.html",
    route: "/projects/battery-rul/",
    html: page({title: "Battery RUL Modeling", description: "A fully simulated competition modeling case study for battery RUL prediction, compatibility graphs, and robust utilization screening.", route: "/projects/battery-rul/", depth: 2, active: "projects", body: batteryBody, schema: {"@context": "https://schema.org", "@type": "CreativeWork", name: battery.title, description: battery.summary, keywords: ["battery RUL", "survival modeling", "compatibility graph", "robust optimization"]}})
  },
  {
    file: "research/index.html",
    route: "/research/",
    html: page({title: "Research", description: "Research by Wanzheng Ning on Jensen polynomial hyperbolicity and nonuniform hypergraph tensor spectra.", route: "/research/", depth: 1, active: "research", body: researchBody})
  },
  {
    file: "research/jensen-polynomials/index.html",
    route: "/research/jensen-polynomials/",
    html: page({title: "Jensen Polynomials and the Riemann Xi-Function", description: "Research summary for a submitted single-author manuscript on subcritical hyperbolicity of xi-associated Jensen polynomials.", route: "/research/jensen-polynomials/", depth: 2, active: "research", body: researchDetailBody(jensen, "jensen"), schema: {"@context": "https://schema.org", "@type": "ScholarlyArticle", headline: jensen.title, author: {"@type": "Person", name: jensen.author}, keywords: jensen.keywords.join(", "), description: jensen.summary}})
  },
  {
    file: "research/hypergraph-tensor/index.html",
    route: "/research/hypergraph-tensor/",
    html: page({title: "Edge-Local Spectra of Nonuniform Hypergraph Tensors", description: "Research summary for a manuscript in preparation on edge-local spectral information and size-dependent scaling.", route: "/research/hypergraph-tensor/", depth: 2, active: "research", body: researchDetailBody(hypergraph, "hypergraph"), schema: {"@context": "https://schema.org", "@type": "ScholarlyArticle", headline: hypergraph.title, author: {"@type": "Person", name: hypergraph.author}, keywords: hypergraph.keywords.join(", "), description: hypergraph.summary}})
  },
  {
    file: "resume/index.html",
    route: "/resume/",
    html: page({title: "Resume", description: "HTML resume for Wanzheng Ning, covering education, research, projects, competitions, and technical skills.", route: "/resume/", depth: 1, active: "resume", body: resumeBody, bodyClass: "resume-page"})
  }
];

const notFound = page({
  title: "Page not found",
  description: "The requested portfolio page could not be found.",
  route: "/404.html",
  depth: 0,
  active: "",
  body: `<section class="not-found"><p class="hero-kicker">404</p><h1>Signal not found.</h1><p>The requested route is outside this portfolio build.</p><a class="button" href="./">Return home</a></section>`
});

const assertSourceFacts = () => {
  const records = [profile, education, netsage, battery, rail, scenic, jensen, hypergraph];
  for (const record of records) {
    for (const fact of record.facts || []) {
      if (!fact.id || !fact.status || !fact.sourceType || !fact.lastVerified || typeof fact.public !== "boolean") {
        throw new Error(`Invalid fact record in ${record.slug || "profile"}: ${JSON.stringify(fact)}`);
      }
      if (fact.public && fact.status !== "verified") {
        throw new Error(`Only verified facts may be public: ${fact.id}`);
      }
    }
  }
};

assertSourceFacts();
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const route of routes) {
  const output = path.join(dist, route.file);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, route.html, "utf8");
}

await Promise.all([
  cp(path.join(root, "src", "styles"), path.join(dist, "styles"), { recursive: true }),
  cp(path.join(root, "src", "scripts"), path.join(dist, "scripts"), { recursive: true }),
  cp(path.join(root, "src", "assets"), path.join(dist, "assets"), { recursive: true })
]);

await writeFile(path.join(dist, "404.html"), notFound, "utf8");
await writeFile(path.join(dist, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${canonical("/sitemap.xml")}\n`, "utf8");
await writeFile(path.join(dist, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${routes.map(({ route }) => `  <url><loc>${escapeHtml(canonical(route))}</loc></url>`).join("\n")}\n</urlset>\n`, "utf8");
await writeFile(path.join(dist, "manifest.webmanifest"), JSON.stringify({name: config.title, short_name: "WN Portfolio", start_url: config.basePath, display: "standalone", background_color: "#ffffff", theme_color: "#14243a", icons: []}, null, 2), "utf8");

console.log(`Built ${routes.length} pages plus 404 into ${path.relative(root, dist)}.`);
