export function radioCase({ radio, summary, local, escapeHtml, figure }) {
  const pdf = local(2, `assets/${radio.paper}`);
  const support = local(2, `assets/${radio.support}`);
  const formalRows = radio.formal.map(({ question, runs }) => {
    const sources = runs.reduce((sum, run) => sum + run.sources, 0);
    const seconds = runs.reduce((sum, run) => sum + run.virtualSeconds, 0);
    return `<tr><th scope="row">${question}</th><td><span class="radio-cell-label">Fully cleared runs</span>${runs.length} / ${runs.length}</td><td><span class="radio-cell-label">Sources cleared</span>${sources}</td><td><span class="radio-cell-label">Weighted seconds / source</span>${(seconds / sources).toFixed(3)}</td></tr>`;
  }).join("");
  const offlineRows = radio.offline.map((row) => `<tr><th scope="row">${row.question}</th><td><span class="radio-cell-label">Fully cleared cases</span>${row.complete} / ${row.cases}</td><td><span class="radio-cell-label">Baseline s / source</span>${row.baselineSecondsPerSource.toFixed(2)}</td><td><span class="radio-cell-label">Final s / source</span>${row.finalSecondsPerSource.toFixed(2)}</td><td><span class="radio-cell-label">Time reduction</span>${((1 - row.finalSecondsPerSource / row.baselineSecondsPerSource) * 100).toFixed(1)}%</td></tr>`).join("");
  return `
  <article class="case-study radio-case">
    <header class="case-hero radio-hero">
      <div class="case-title">
        <p class="hero-kicker">${escapeHtml(radio.type)}</p>
        <h1>${escapeHtml(radio.title)}</h1>
        <p>${escapeHtml(summary)}</p>
        <div class="manuscript-actions"><a class="button" href="#results">Explore the results</a><a class="button-secondary" href="${pdf}" target="_blank" rel="noopener">View full paper <span aria-hidden="true">↗</span></a></div>
      </div>
    </header>
    <nav class="radio-section-nav" aria-label="Case study sections"><a href="#method">Method</a><a href="#results">Results</a><a href="#materials">Paper and code</a></nav>
    <section class="section" id="method">
      <div class="section-heading"><p>Four connected questions</p><h2>From a bearing interval to the next action.</h2></div>
      <p class="radio-intro">The task combines a ±1° bearing-error bound with an unknown reception radius. A mobile robot must discover, locate, and clear all sources while minimizing virtual mission time.</p>
      ${figure({depth:2,src:"images/radio-overview.webp",width:1143,height:570,alt:"Original paper figure connecting Q1 set geometry, Q2 robust sensing, Q3 omnidirectional clearance, and Q4 directional-source scheduling",caption:"Figure 1 from the paper. The original Chinese diagram summarizes the four-question method; it is a conceptual overview."})}
      <ol class="radio-methods">
        <li><span>Q1</span><div><h3>Keep every feasible source position</h3><p>Intersect bearing wedges as half-planes. Use rotating calipers to measure the region diameter, then audit coverage with the Thales test and a minimum enclosing circle.</p></div></li>
        <li><span>Q2</span><div><h3>Choose the next measurement robustly</h3><p>Model source position and reception radius jointly. Within the guaranteed-signal region, minimize the worst remaining diameter and retain a near-optimal set of candidate stations.</p></div></li>
        <li><span>Q3</span><div><h3>Switch between sensing and optical coverage</h3><p>A seven-station layout discovers omnidirectional sources. Positive and negative observations update the feasible set; estimated remaining time determines whether to measure again or cover a narrow region optically.</p></div></li>
        <li><span>Q4</span><div><h3>Replan after each observed response</h3><p>Directional blind spots make a missing signal ambiguous. A 21-station layout, shared local measurements, and a mixed scan/source task pool support conservative updates and rolling route improvement.</p></div></li>
      </ol>
      ${figure({depth:2,src:"images/radio-controller.webp",width:1143,height:540,alt:"Original Q3 controller diagram showing observation, feasible-set update, cost estimation, action selection, execution, and feedback",caption:"Figure 6 from the paper. Observations constrain the feasible set; estimated costs rank the next action. Original Chinese labels are retained."})}
    </section>
    <section class="section radio-results" id="results">
      <div class="section-heading"><p>Recorded results</p><h2>Complete clearance across the tested scenarios.</h2></div>
      <p>All times below are simulator virtual seconds per cleared source. The weighted mean is total virtual time divided by the total number of cleared sources.</p>
      <h3>Official simulator tests</h3>
      <div class="radio-table-scroll" tabindex="0" role="region" aria-label="Official simulator results table"><table class="radio-table"><caption>All six formal runs are included.</caption><thead><tr><th scope="col">Question</th><th scope="col">Fully cleared runs</th><th scope="col">Sources cleared</th><th scope="col">Weighted seconds / source</th></tr></thead><tbody>${formalRows}</tbody></table></div>
      <p class="radio-note">The paper reports zero HTTP errors and retries in all six runs. Each question has three formal runs, so these results describe the tested cases.</p>
      <h3>Matched offline comparisons</h3>
      <div class="radio-table-scroll" tabindex="0" role="region" aria-label="Offline benchmark results table"><table class="radio-table"><caption>Baseline and final model use the same scenarios within each question.</caption><thead><tr><th scope="col">Question</th><th scope="col">Fully cleared cases</th><th scope="col">Baseline s / source</th><th scope="col">Final s / source</th><th scope="col">Time reduction</th></tr></thead><tbody>${offlineRows}</tbody></table></div>
      ${figure({depth:2,src:"images/radio-results.webp",width:1080,height:450,alt:"Paper figure showing the distributions of 120 Q3 and 100 Q4 offline cases alongside all three formal tests for each question",caption:"Figure 11 from the paper. Light points show offline cases; blue diamonds show official simulator tests. Horizontal lines mark source-weighted means."})}
      <details class="radio-details"><summary>Read the validation details</summary><p>Q1 checks 1,000 random convex regions: rotating calipers and exhaustive diameter search agree, the two coverage tests agree, and no Jung-bound violation is recorded.</p><p>The Q4 offline audit records zero feasible-set containment violations. Its main time saving comes from combining scan and source-service tasks; additional route improvement reduces the weighted time from 477.73 to 472.26 seconds per source.</p><p>These are competition simulator results. Q2 uses numerical constraint generation and discrete checks; Q3 uses an approximate finite-horizon value function. Transfer to physical radio equipment requires separate validation.</p></details>
    </section>
    <section class="section manuscript-feature radio-materials" id="materials" aria-labelledby="radio-paper-heading">
      <figure class="manuscript-preview"><a href="${pdf}" target="_blank" rel="noopener" aria-label="Open the complete radio-localization paper PDF"><img src="${local(2,"assets/images/radio-paper-cover.webp")}" width="795" height="1124" alt="Title and abstract of the radio-interference localization paper" loading="lazy" decoding="async"></a><figcaption>Original paper, including the complete code appendix.</figcaption></figure>
      <div class="manuscript-copy"><p class="manuscript-label">Final competition paper</p><h2 id="radio-paper-heading" lang="zh-CN">有界测向误差下无线电干扰源的集合定位、主动测向与多源滚动清除</h2><p class="project-type">Chinese · 299 pages · 20-page main text · 9.6 MB PDF</p><p>Read the methods, derivations, comparisons, and retained results. The public supporting package includes 161 original files: code, result summaries, evidence indexes, and the AI-use statement.</p><div class="manuscript-actions"><a class="button" href="${pdf}" target="_blank" rel="noopener">View full paper <span aria-hidden="true">↗</span></a><a class="text-link" href="${pdf}" download>Download PDF <span aria-hidden="true">↓</span></a></div><p><a class="text-link" href="${support}" download>Download supporting materials · ZIP · 1.1 MB <span aria-hidden="true">↓</span></a></p><p class="radio-note">The public package omits six encrypted logs containing the team identifier. Original results and code are preserved; its README explains dependencies and source-path adjustments for reproduction.</p></div>
    </section>
    <section class="section final-link"><a class="button-secondary" href="${local(2,"projects/")}">Back to projects</a></section>
  </article>`;
}
