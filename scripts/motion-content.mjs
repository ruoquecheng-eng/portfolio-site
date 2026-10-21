// Progressive enhancement: every panel is readable before motion.js initializes.
const image = (file, alt, width=1440, height=1000) => `<img src="../../assets/images/${file}.webp" width="${width}" height="${height}" alt="${alt}" loading="lazy" decoding="async">`;
const tabs = (id, labels) => `<div class="showcase-tabs" data-showcase-controls hidden aria-label="Choose a view">${labels.map((label,i)=>`<button type="button" id="${id}-tab-${i}" data-showcase-tab="${i}"><span class="showcase-number" aria-hidden="true">0${i+1}</span><span>${label}</span></button>`).join('')}</div>`;
const panel = (id,i,body,classes='') => `<div class="showcase-panel ${classes}" id="${id}-panel-${i}" data-panel="${i}">${body}</div>`;

export const homeWorkbench = `<figure class="hero-visual hero-workbench">
  <div class="workbench-window"><div class="workbench-caption"><span>CommLab</span><span>OFDM · v3.7.1</span></div><img src="assets/images/commlab-ofdm-link.webp" width="1440" height="1000" alt="Running CommLab OFDM link laboratory with local controls, BER, EVM, and a received constellation" fetchpriority="high"></div>
  <div class="workbench-phone"><img src="assets/images/netsage-app-v020-home.webp" width="1080" height="2400" alt="NetSage 0.2.0 Android dashboard describing its local-first and serverless diagnostic boundary"><span>NetSage · Android</span></div>
  <div class="workbench-trace" aria-hidden="true"><span></span><i></i><i></i><i></i></div>
  <figcaption>Independent projects. Real interfaces.</figcaption>
</figure>`;

const netSteps = [
  ['Input and target','netsage-app-input','A local starting point','Paste a log, load a bundled sample, or choose a target for a direct device check. The two entry paths remain distinct.','NetSage log diagnosis workspace with text input, input quality guidance, a sample shortcut, and local file import'],
  ['On-device checks','netsage-app-v020-checkup','Observe each network layer','Direct Android checks collect DNS, TCP, TLS, and HTTP evidence. Probe availability depends on the device and current network.','NetSage on-device network check interface'],
  ['Evidence and hypotheses','netsage-app-log-result','Make the reasoning inspectable','Rule-based analysis links observations to ranked hypotheses, matched and conflicting evidence, and suggested repair actions.','NetSage rule-based diagnostic result with evidence and repair guidance'],
  ['Retest and report','netsage-app-history','Keep a reproducible record','Retest after a change, inspect retained local sessions, and export Markdown or JSON reports with privacy controls.','NetSage local diagnostic session history']
];
export const netsageShowcase = `<section class="section motion-showcase netsage-showcase" id="workflow-explorer" data-showcase>
  <div class="section-heading"><p>Explore the workflow</p><h2 id="netsage-workflow-heading">Follow the evidence, step by step.</h2></div>
  <p class="section-lead">Four views of the existing Android workflow. These are recorded screens from NetSage 0.2.0, not a live diagnosis.</p>
  ${tabs('netsage',netSteps.map(s=>s[0]))}
  <div class="showcase-stage">${netSteps.map(([label,file,title,copy,alt],i)=>panel('netsage',i,`<figure class="showcase-device">${image(file,alt,1080,2400)}<figcaption>${label}</figcaption></figure><div class="showcase-copy"><p class="project-type">NetSage · 0.2.0</p><h3>${title}</h3><p>${copy}</p><a class="text-link" href="#app-walkthrough">See all eleven verified screens <span aria-hidden="true">↓</span></a></div>`)).join('')}</div>
  <div class="probe-sequence" data-probe-sequence>
    <div class="probe-heading"><div><strong>DNS → TCP → TLS → HTTP</strong><p>Conceptual sequence only. No network requests or new results are generated.</p></div><button class="button-secondary" type="button" data-sequence-play aria-pressed="false" hidden>Play sequence</button></div>
    <ol class="probe-steps" aria-label="Illustrative probe order">${['DNS','TCP','TLS','HTTP'].map(s=>`<li data-probe-step><span class="probe-dot" aria-hidden="true"></span><strong>${s}</strong></li>`).join('')}</ol>
    <div class="probe-track" aria-hidden="true"><span data-probe-progress></span></div><p class="probe-status" data-probe-status role="status">Conceptual sequence</p>
  </div>
</section>`;

const labSteps = [
  ['OFDM link','commlab-ofdm-link','From symbols to receiver evidence','Compare QPSK symbols, channel impairments, BER, RMS EVM, and the received constellation within one local experiment.','Running CommLab OFDM link laboratory with local controls, BER, EVM, and a received constellation'],
  ['Sensing / ISAC','commlab-isac','Read a range-Doppler view','A normalized monostatic simulation connects waveform settings to a range-Doppler map and CFAR detections.','Running CommLab ISAC laboratory with local controls, metrics, and a range-Doppler result'],
  ['Resilience budget','commlab-resilience','Compare cross-layer decisions','Radio duplication, replica execution, and proactive migration share an illustrative decision budget. Physical metrics stay separate.','Running CommLab unified resilience-budget laboratory showing cross-layer controls and deadline metrics'],
  ['Robust OPE','commlab-ope','Keep the negative result visible','The selected odds envelope fails row-wise coverage under the displayed hidden-confounding stress. The warning is part of the evidence.','Running CommLab propensity-robust policy evaluation laboratory showing uncertainty and a failed coverage warning']
];
export const commlabShowcase = `<div class="motion-showcase commlab-showcase" data-showcase>${tabs('commlab',labSteps.map(s=>s[0]))}<div class="showcase-stage">${labSteps.map(([label,file,title,copy,alt],i)=>panel('commlab',i,`<figure class="commlab-figure showcase-lab">${image(file,alt)}<figcaption>${label} · Dashboard v3.7.1</figcaption></figure><div class="showcase-copy"><h3>${title}</h3><p>${copy}</p></div>`)).join('')}</div></div>`;

function methodDiagram(kind, active) {
  const radio=kind==='radio';
  const labels=radio?['Observe','Constrain','Choose','Update']:['Q1','Q2','Q3','Q4'];
  return `<svg class="method-diagram" viewBox="0 0 600 220" role="img" aria-label="${radio?'Conceptual localization decision loop':'Conceptual Q1 to Q4 modeling pipeline'}"><path class="method-connector" d="M80 110H520"/>${labels.map((label,i)=>`<g class="method-node ${i===active?'is-current':''}"><rect x="${20+i*150}" y="65" width="110" height="90" rx="10"/><text x="${75+i*150}" y="119" text-anchor="middle">${label}</text></g>`).join('')}${radio?'<path class="method-return" d="M525 160V190H75V160"/>':''}</svg>`;
}
const methodSteps = {
  radio:[
    ['Observations','Start from bounded observations','Bearing intervals and signal presence or absence restrict possible source positions. This schematic does not show a measured radio scene.'],
    ['Feasible region','Retain the feasible set','Intersect geometric constraints while accounting for the unknown reception radius. A missing signal can remain ambiguous for directional sources.'],
    ['Next station','Choose the next action','Use robust active sensing and estimated remaining costs to choose another measurement or optical coverage action.'],
    ['Rolling update','Observe, then replan','Update the candidate set after each observed response and replan the remaining scan and clearance tasks.']
  ],
  battery:[
    ['Q1 · Degradation','Detect degradation stages','Continuous three-segment regression represents slow, accelerated, and post-knee degradation in the simulated trajectories.'],
    ['Q2 · SOH / RUL','Predict with uncertainty','Ridge regression estimates SOH; a Weibull accelerated failure time model handles right-censored lifetimes and RUL intervals.'],
    ['Q3 · Compatibility','Screen the candidate pool','Apply scenario-specific hard gates and construct a compatibility graph using predicted attributes and scenario rules.'],
    ['Q4 · Optimization','Compare feasible groupings','An epsilon-constraint MILP explores utilization, inconsistency, and relative economic value. Stress scenarios test the frozen decisions.']
  ]
};
export function methodShowcase(kind) {
  const radio=kind==='radio', id=radio?'radio-method':'battery-method', steps=methodSteps[kind];
  return `<section class="section motion-showcase method-showcase" id="${id}-explorer" data-showcase><div class="section-heading"><p>Explore the method</p><h2 id="${id}-heading">${radio?'How an observation becomes the next action.':'How Q1 to Q4 connect.'}</h2></div><p class="section-lead">${radio?'Conceptual explanation of the competition simulator workflow. Original figures and retained results remain below.':'Conceptual explanation using fully simulated data generated with semi-empirical assumptions. Original model outputs remain below.'}</p>${tabs(id,steps.map(s=>s[0]))}<div class="showcase-stage">${steps.map(([label,title,copy],i)=>panel(id,i,`${methodDiagram(kind,i)}<div class="showcase-copy"><p class="project-type">${label}</p><h3>${title}</h3><p>${copy}</p><a class="text-link" href="#${radio?'method':'workflow'}">Read the complete method <span aria-hidden="true">↓</span></a></div>`)).join('')}</div></section>`;
}
