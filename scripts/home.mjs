// Homepage markup. Every claim comes from verified facts passed in by build.mjs;
// the signal stage is a labelled in-browser simulation, not measured data.
const img = (file, alt, width, height, extra = '') => `<img src="assets/images/${file}" width="${width}" height="${height}" alt="${alt}" loading="lazy" decoding="async"${extra}>`;

const chapter = ({ index, href, type, title, summary, proof, tags, media, mediaClass = '', category }) => `
    <article class="chapter" data-reveal data-project-category="${category}">
      <a class="chapter-media ${mediaClass}" href="${href}" tabindex="-1" aria-hidden="true">${media}</a>
      <div class="chapter-copy">
        <p class="chapter-index" aria-hidden="true">${index}</p>
        <p class="chapter-type">${type}</p>
        <h3><a href="${href}">${title}</a></h3>
        <p class="chapter-summary">${summary}</p>
        <ul class="chapter-proof">${proof.map((item) => `<li>${item}</li>`).join('')}</ul>
        <p class="chapter-tags">${tags}</p>
        <a class="chapter-link" href="${href}">Read case study <span aria-hidden="true">→</span></a>
      </div>
    </article>`;

export function homeBody(d) {
  const e = d.escape;
  const research = [
    ['research/connected-diagram-expansions/', d.connectedStatus, d.connectedJournal, 'Connected-diagram expansions for Hermite–Jensen multipliers'],
    ['research/critical-cubic-crossover/', d.cubicStatus, d.cubicJournal, 'Critical cubic crossover in Riemann-xi Jensen polynomials'],
    ['research/hypergraph-tensor/', d.hypergraphStatus, d.hypergraphVenue, 'Edge-local spectra of nonuniform hypergraph tensors'],
  ];
  return `
  <section class="stage" aria-labelledby="stage-name">
    <canvas class="stage-canvas" aria-hidden="true" data-signal-canvas></canvas>
    <div class="stage-inner">
      <div class="stage-copy">
        <p class="stage-meta"><span>Communication Engineering</span><span>${e(d.institution)}</span></p>
        <h1 class="stage-name" id="stage-name">${e(d.name)}</h1>
        <p class="stage-lede">I build network diagnostic tools and communication simulations, and study mathematical models.</p>
        <div class="stage-actions">
          <a class="button button-stage" href="projects/">View projects <span aria-hidden="true">→</span></a>
          <a class="button-ghost" href="resume/">Open resume</a>
          ${d.email ? `<a class="stage-mail" href="mailto:${e(d.email)}">${e(d.email)}</a>` : ''}
        </div>
      </div>
      <aside class="stage-readout" aria-label="Live signal simulation">
        <p class="readout-title"><span class="readout-dot" aria-hidden="true"></span>Live 16-QAM link · in-browser simulation</p>
        <dl>
          <div><dt>SNR</dt><dd data-readout="snr">20.0 dB</dd></div>
          <div><dt>EVM</dt><dd data-readout="evm">10.0%</dd></div>
          <div><dt>Symbols</dt><dd data-readout="symbols">0</dd></div>
        </dl>
        <p class="readout-hint">Move across the field to change the channel SNR.</p>
      </aside>
    </div>
    <ul class="stage-focus" aria-label="Focus areas"><li>Network diagnostics</li><li>Wireless systems</li><li>Edge intelligence</li><li>Mathematical modeling</li><li>Spectral research</li></ul>
  </section>

  <section class="home-section home-work" aria-labelledby="work-heading">
    <header class="home-heading" data-reveal>
      <p class="home-eyebrow">Selected work</p>
      <h2 id="work-heading">Engineering and modeling, with the evidence attached.</h2>
      <a class="text-link" href="projects/">All projects <span aria-hidden="true">→</span></a>
    </header>
    ${chapter({
      index: '01', category: 'engineering', href: 'projects/netsage/', type: e(d.netsageType), title: 'NetSage', summary: e(d.netsageSummary),
      proof: ['135 JVM tests passed', '17 Android emulator tests', 'Rule-based, not machine learning'],
      tags: 'Kotlin · Jetpack Compose · rule engine · offline-first', mediaClass: 'chapter-media-phones',
      media: img('netsage-app-v020-home.webp', 'NetSage 0.2.0 Android dashboard describing its local-first and serverless diagnostic boundary', 1080, 2400) + img('netsage-app-log-result.webp', 'NetSage local diagnostic result for a bundled DNS NXDOMAIN sample with evidence and repair steps', 1080, 2400),
    })}
    ${chapter({
      index: '02', category: 'engineering', href: 'projects/commlab/', type: e(d.commlabType), title: 'CommLab', summary: e(d.commlabSummary),
      proof: ['130 interactive labs', '322 tests passed for v3.8.1', 'Windows release on GitHub'],
      tags: 'Python · Streamlit · wireless systems · edge intelligence',
      media: img('commlab-ofdm-link.webp', 'Running CommLab OFDM link laboratory with local controls, BER, EVM, and a received constellation', 1440, 1000),
    })}
    ${chapter({
      index: '03', category: 'modeling', href: 'projects/radio-localization/', type: '2026 CUMCM · Problem B', title: e(d.radioTitle), summary: e(d.radioSummary),
      proof: [`<strong>${e(d.radioCompetitionResult)}</strong>`, 'All sources cleared in six official simulator runs'],
      tags: 'Bounded-error geometry · robust active sensing · rolling scheduling', mediaClass: 'chapter-media-figure',
      media: img('radio-overview.webp', 'Original paper figure connecting Q1 set geometry, Q2 robust sensing, Q3 omnidirectional clearance, and Q4 directional-source scheduling', 1143, 570),
    })}
    ${chapter({
      index: '04', category: 'modeling', href: 'projects/battery-rul/', type: e(d.batteryType), title: e(d.batteryTitle), summary: e(d.batterySummary),
      proof: [e(d.batteryCompetitionResult), e(d.batteryDataBoundary)],
      tags: 'Change-point regression · Weibull AFT · compatibility graph · MILP', mediaClass: 'chapter-media-figure',
      media: img('battery-compatibility-graph.webp', 'Four-panel original model output showing retired-cell grades, gate failures, compatibility graph density, and one complete group', 2520, 1890),
    })}
  </section>

  <section class="home-section home-research" aria-labelledby="research-heading">
    <header class="home-heading" data-reveal>
      <p class="home-eyebrow">Mathematical research</p>
      <h2 id="research-heading">Asymptotic analysis and tensor spectra.</h2>
      <p class="research-status-summary">${e(d.homeResearchStatusSummary)}</p>
    </header>
    <ol class="paper-list" data-reveal>
      ${research.map(([href, status, journal, title]) => `<li><a href="${href}"><span class="paper-status">${e(status)}</span><span class="paper-journal">${e(journal)}</span><strong>${title}</strong><span class="paper-arrow" aria-hidden="true">→</span></a></li>`).join('')}
    </ol>
    <a class="text-link" href="research/">View research <span aria-hidden="true">→</span></a>
  </section>

  <section class="home-section home-record" aria-labelledby="record-heading">
    <header class="home-heading" data-reveal>
      <p class="home-eyebrow">Record</p>
      <h2 id="record-heading">Education and experience.</h2>
    </header>
    <dl class="record-ledger" data-reveal>
      <div><dt>Education</dt><dd><strong>${e(d.institution)}</strong><span>${e(d.program)}</span><span>${e(d.educationPeriod)}</span></dd></div>
      <div><dt>GPA</dt><dd><strong class="record-figure">${e(d.educationGpa)}</strong><span>Current GPA</span></dd></div>
      <div><dt>Rank</dt><dd><strong class="record-figure">${e(d.educationRank)}</strong><span>Current rank</span></dd></div>
      <div><dt>Experience</dt><dd><strong>${e(d.internshipTitle)}</strong><span>${e(d.internshipOrganization)}</span><span>${e(d.internshipDates)}</span></dd></div>
    </dl>
  </section>

  <section class="home-section home-resume home-contact-band" aria-labelledby="contact-heading">
    <div data-reveal>
      <p class="home-eyebrow">Resume and contact</p>
      <h2 id="contact-heading">The complete record, in one place.</h2>
      ${d.email ? `<p class="home-contact"><a class="contact-mail" href="mailto:${e(d.email)}">${e(d.email)}</a></p>` : ''}
    </div>
    <div class="contact-actions" data-reveal>
      <a class="button button-stage" href="resume/">Open resume <span aria-hidden="true">→</span></a>
      <a class="button-ghost" href="materials/">Public materials</a>
    </div>
  </section>`;
}
