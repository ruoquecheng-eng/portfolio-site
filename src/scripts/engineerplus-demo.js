(() => {
  "use strict";

  const STORAGE_KEY = "engineerplus-demo-v1";
  const MODULES = ["overview", "capital", "risk", "compliance", "impact"];
  const CAPITAL_TYPES = ["public", "institutional", "green"];
  const DEFAULT_STATE = {
    version: 1,
    capital: {
      total: 4200,
      investors: 24,
      submissions: 0,
      allocations: { public: 1780, institutional: 1470, green: 950 },
      trend: [3250, 3460, 3690, 3890, 4050, 4200]
    },
    risk: { guarantee: 120, climate: 3 },
    compliance: { projectId: "", status: "idle", completedStep: -1 },
    impact: { region: "all", scenario: "baseline" }
  };

  const IMPACT_BASE = {
    all: { label: "All regions", access: 64, carbon: 58, regional: 61 },
    nsw: { label: "New South Wales", access: 72, carbon: 61, regional: 68 },
    vic: { label: "Victoria", access: 69, carbon: 64, regional: 65 },
    qld: { label: "Queensland", access: 57, carbon: 52, regional: 59 },
    sa: { label: "South Australia", access: 51, carbon: 55, regional: 54 }
  };
  const IMPACT_SCENARIOS = {
    baseline: { label: "Baseline concept", access: 0, carbon: 0, regional: 0 },
    operations: { label: "Efficient operations", access: 5, carbon: 9, regional: 3 },
    lightweight: { label: "Lightweight materials", access: 1, carbon: 13, regional: 4 }
  };

  const cloneDefaults = () => JSON.parse(JSON.stringify(DEFAULT_STATE));
  const clamp = (value, min, max) => Math.min(max, Math.max(min, Number(value)));
  const validChoice = (value, choices, fallback) => choices.includes(value) ? value : fallback;

  function loadState() {
    try {
      const stored = JSON.parse(sessionStorage.getItem(STORAGE_KEY));
      if (!stored || stored.version !== DEFAULT_STATE.version) return cloneDefaults();
      const clean = cloneDefaults();
      clean.capital.total = clamp(stored.capital?.total, 1, 100000);
      clean.capital.investors = clamp(stored.capital?.investors, 1, 10000);
      clean.capital.submissions = clamp(stored.capital?.submissions, 0, 10000);
      for (const type of CAPITAL_TYPES) clean.capital.allocations[type] = clamp(stored.capital?.allocations?.[type], 0, 100000);
      const trend = Array.isArray(stored.capital?.trend) ? stored.capital.trend.map((value) => clamp(value, 0, 100000)).slice(-8) : [];
      clean.capital.trend = trend.length >= 2 ? trend : [...DEFAULT_STATE.capital.trend];
      clean.risk.guarantee = clamp(stored.risk?.guarantee, 100, 150);
      clean.risk.climate = clamp(stored.risk?.climate, 1, 5);
      clean.compliance.projectId = String(stored.compliance?.projectId || "").slice(0, 32);
      clean.compliance.status = stored.compliance?.status === "complete" ? "complete" : "idle";
      clean.compliance.completedStep = clean.compliance.status === "complete" ? 3 : -1;
      clean.impact.region = validChoice(stored.impact?.region, Object.keys(IMPACT_BASE), "all");
      clean.impact.scenario = validChoice(stored.impact?.scenario, Object.keys(IMPACT_SCENARIOS), "baseline");
      return clean;
    } catch {
      return cloneDefaults();
    }
  }

  let state = loadState();
  let complianceTimers = [];

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const saveState = () => sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  const announce = (message) => {
    const target = $("[data-global-status]");
    target.textContent = "";
    requestAnimationFrame(() => { target.textContent = message; });
  };

  function activeModule() {
    const requested = location.hash.slice(1).toLowerCase();
    return MODULES.includes(requested) ? requested : "overview";
  }

  function showModule({ focus = false } = {}) {
    const module = activeModule();
    $$('[data-module]').forEach((panel) => { panel.hidden = panel.dataset.module !== module; });
    $$('[data-module-link]').forEach((link) => {
      if (link.dataset.moduleLink === module) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
    document.title = `${$("#" + module + " h1")?.textContent || "EngineerPlus"} | EngineerPlus Demo`;
    if (focus) {
      $("#" + module)?.scrollIntoView({ block: "start" });
      $("#" + module + " h1")?.setAttribute("tabindex", "-1");
      $("#" + module + " h1")?.focus({ preventScroll: true });
    }
  }

  function capitalPoints(values) {
    const width = 565;
    const height = 171;
    const min = Math.min(...values) * 0.96;
    const max = Math.max(...values) * 1.04;
    const span = Math.max(max - min, 1);
    return values.map((value, index) => ({
      x: 50 + (index * width) / Math.max(values.length - 1, 1),
      y: 206 - ((value - min) / span) * height
    }));
  }

  function renderCapital() {
    const capital = state.capital;
    $("[data-capital-total]").textContent = `$${capital.total.toLocaleString()}M`;
    $("[data-capital-investors]").textContent = capital.investors.toLocaleString();
    $("[data-capital-submissions]").textContent = capital.submissions.toLocaleString();

    const total = CAPITAL_TYPES.reduce((sum, type) => sum + capital.allocations[type], 0);
    const labels = { public: "Public capital", institutional: "Institutional", green: "Green bond" };
    const bar = $("[data-allocation-bar]");
    bar.innerHTML = CAPITAL_TYPES.map((type) => {
      const percentage = total ? (capital.allocations[type] / total) * 100 : 0;
      return `<span style="width:${percentage.toFixed(2)}%" title="${labels[type]} ${percentage.toFixed(1)}%"></span>`;
    }).join("");
    bar.setAttribute("aria-label", CAPITAL_TYPES.map((type) => `${labels[type]} ${capital.allocations[type]} million`).join(", "));
    $("[data-allocation-legend]").innerHTML = CAPITAL_TYPES.map((type) => `<li><span class="legend-swatch ${type}"></span>${labels[type]}<strong>$${capital.allocations[type].toLocaleString()}M</strong></li>`).join("");

    const points = capitalPoints(capital.trend);
    const line = points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");
    $("[data-capital-line]").setAttribute("d", line);
    $("[data-capital-area]").setAttribute("d", `${line} L${points.at(-1).x.toFixed(1)} 206 L50 206 Z`);
    $("[data-capital-points]").innerHTML = points.map((point) => `<circle cx="${point.x.toFixed(1)}" cy="${point.y.toFixed(1)}" r="5"></circle>`).join("");
  }

  function renderRisk() {
    const guarantee = state.risk.guarantee;
    const climate = state.risk.climate;
    const coverage = Math.round((guarantee - climate * 10) * 10) / 10;
    const buffered = coverage >= 85;
    const guaranteeInput = $('[name="guarantee"]');
    const climateInput = $('[name="climate"]');
    guaranteeInput.value = guarantee;
    climateInput.value = climate;
    $("[data-guarantee-output]").textContent = guarantee;
    $("[data-climate-output]").textContent = climate.toFixed(1);
    $("[data-risk-coverage]").textContent = coverage.toFixed(coverage % 1 ? 1 : 0);
    $("[data-risk-state]").textContent = buffered ? "Illustrative buffer" : "Review required";
    $("[data-risk-explanation]").textContent = buffered
      ? "The simplified output remains above the demonstration review threshold."
      : "The simplified output falls below the demonstration threshold and would be flagged for review.";
    const meter = $(".risk-meter");
    meter.setAttribute("aria-valuenow", coverage);
    $("[data-risk-meter]").style.width = `${clamp(((coverage - 50) / 90) * 100, 0, 100)}%`;
    $("[data-risk-meter]").style.backgroundColor = buffered ? "var(--success)" : "var(--warning)";
  }

  function clearComplianceTimers() {
    complianceTimers.forEach(clearTimeout);
    complianceTimers = [];
  }

  function renderCompliance() {
    const complete = state.compliance.status === "complete";
    $$('[data-compliance-step]').forEach((step, index) => {
      step.classList.toggle("is-complete", complete || index <= state.compliance.completedStep);
      step.classList.toggle("is-active", !complete && index === state.compliance.completedStep + 1);
    });
    const progress = complete ? 100 : Math.max(0, ((state.compliance.completedStep + 1) / 4) * 100);
    $("[data-compliance-progress]").style.width = `${progress}%`;
    $(".progress-track").setAttribute("aria-valuenow", progress);
    $('[name="projectId"]').value = state.compliance.projectId;
    $("[data-compliance-rerun]").hidden = !complete;
    $("[data-compliance-status]").textContent = complete
      ? `Simulated workflow complete for ${state.compliance.projectId}. No external verification occurred.`
      : "Ready for an example project ID.";
  }

  function runCompliance(projectId) {
    clearComplianceTimers();
    state.compliance = { projectId, status: "running", completedStep: -1 };
    saveState();
    const status = $("[data-compliance-status]");
    const button = $('[data-compliance-form] button[type="submit"]');
    button.disabled = true;
    $("[data-compliance-rerun]").hidden = true;
    const messages = ["Initializing local example…", "Simulating participant confirmations…", "Applying fixed demonstration checks…", "Completing local interface state…"];
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 20 : 650;
    messages.forEach((message, index) => {
      complianceTimers.push(setTimeout(() => {
        state.compliance.completedStep = index;
        status.textContent = message;
        $$('[data-compliance-step]').forEach((step, stepIndex) => {
          step.classList.toggle("is-complete", stepIndex < index);
          step.classList.toggle("is-active", stepIndex === index);
        });
        const progress = ((index + 1) / 4) * 100;
        $("[data-compliance-progress]").style.width = `${progress}%`;
        $(".progress-track").setAttribute("aria-valuenow", progress);
        if (index === messages.length - 1) {
          state.compliance.status = "complete";
          state.compliance.completedStep = 3;
          saveState();
          button.disabled = false;
          $("[data-compliance-rerun]").hidden = false;
          status.textContent = `Simulated workflow complete for ${projectId}. No external verification occurred.`;
          renderCompliance();
        }
      }, delay * (index + 1)));
    });
  }

  function impactValues() {
    const base = IMPACT_BASE[state.impact.region];
    const modifier = IMPACT_SCENARIOS[state.impact.scenario];
    return {
      label: `${base.label} · ${modifier.label}`,
      access: clamp(base.access + modifier.access, 0, 100),
      carbon: clamp(base.carbon + modifier.carbon, 0, 100),
      regional: clamp(base.regional + modifier.regional, 0, 100)
    };
  }

  function renderImpact() {
    const values = impactValues();
    $("[data-impact-region]").value = state.impact.region;
    $("[data-impact-scenario]").value = state.impact.scenario;
    $("[data-impact-label]").textContent = values.label;
    for (const metric of ["access", "carbon", "regional"]) {
      $(`[data-impact-${metric}]`).textContent = values[metric];
      $(`[data-impact-bar="${metric}"]`).style.width = `${values[metric]}%`;
      $(`[data-impact-bar-label="${metric}"]`).textContent = values[metric];
    }
    $$('[data-map-region]').forEach((region) => {
      const selected = region.dataset.mapRegion === state.impact.region;
      region.classList.toggle("is-selected", selected);
      region.setAttribute("aria-pressed", String(selected));
    });
  }

  function bindEvents() {
    addEventListener("hashchange", () => showModule({ focus: true }));

    $('[name="esg"]').addEventListener("input", (event) => { $("[data-esg-output]").textContent = event.target.value; });
    $("[data-capital-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      const form = event.currentTarget;
      if (!form.checkValidity()) { form.reportValidity(); return; }
      const data = new FormData(form);
      const amount = clamp(data.get("amount"), 1, 500);
      const type = validChoice(data.get("type"), CAPITAL_TYPES, "public");
      state.capital.total += amount;
      state.capital.investors += 1;
      state.capital.submissions += 1;
      state.capital.allocations[type] += amount;
      state.capital.trend = [...state.capital.trend.slice(-7), state.capital.total];
      saveState();
      renderCapital();
      $("[data-capital-status]").textContent = `${data.get("investor")} added as an illustrative ${type} entry. No data left this tab.`;
      form.elements.investor.value = "";
      form.elements.investor.focus();
    });

    $("[data-risk-form]").addEventListener("input", (event) => {
      if (event.target.name === "guarantee") state.risk.guarantee = clamp(event.target.value, 100, 150);
      if (event.target.name === "climate") state.risk.climate = clamp(event.target.value, 1, 5);
      saveState();
      renderRisk();
    });

    $("[data-compliance-form]").addEventListener("submit", (event) => {
      event.preventDefault();
      if (!event.currentTarget.checkValidity()) { event.currentTarget.reportValidity(); return; }
      runCompliance(event.currentTarget.elements.projectId.value.trim());
    });
    $("[data-compliance-rerun]").addEventListener("click", () => runCompliance($('[name="projectId"]').value.trim() || "HSR-DEMO-001"));

    $("[data-impact-region]").addEventListener("change", (event) => {
      state.impact.region = validChoice(event.target.value, Object.keys(IMPACT_BASE), "all");
      saveState();
      renderImpact();
    });
    $("[data-impact-scenario]").addEventListener("change", (event) => {
      state.impact.scenario = validChoice(event.target.value, Object.keys(IMPACT_SCENARIOS), "baseline");
      saveState();
      renderImpact();
    });
    $$('[data-map-region]').forEach((region) => {
      const selectRegion = () => {
        state.impact.region = region.dataset.mapRegion;
        saveState();
        renderImpact();
      };
      region.addEventListener("click", selectRegion);
      region.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRegion(); }
      });
    });

    $("[data-reset-demo]").addEventListener("click", () => {
      clearComplianceTimers();
      sessionStorage.removeItem(STORAGE_KEY);
      state = cloneDefaults();
      $('[data-capital-form]').reset();
      $("[data-esg-output]").textContent = "72";
      $("[data-capital-status]").textContent = "";
      renderCapital();
      renderRisk();
      renderCompliance();
      renderImpact();
      saveState();
      announce("Demo reset. All modules have returned to their initial illustrative state.");
    });
  }

  if (location.hash && !MODULES.includes(location.hash.slice(1))) history.replaceState(null, "", "#overview");
  renderCapital();
  renderRisk();
  renderCompliance();
  renderImpact();
  bindEvents();
  showModule();
})();
