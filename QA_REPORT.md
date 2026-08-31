# Portfolio QA Report

Verified source state: research-record and NetSage screenshot update prepared for deployment

Verified date: 31 August 2026

Generated routes: 11 public routes plus `404.html`

Public assets: 45 files in `dist/`, including 12 HTML files and two allowlisted PDFs

## Result

Pass after the final test run. Build, static QA, four-viewport browser QA, visual review, and one-page Resume export completed in the local Windows environment.

## Commands executed

```powershell
npm run build
npm run qa
.\.venv\Scripts\python.exe .\tests\browser_qa.py
node --check scripts/build.mjs
node --check scripts/qa.mjs
.\.venv\Scripts\python.exe -m py_compile tests/browser_qa.py
pdfinfo output/pdf/wanzheng-ning-resume.pdf
git diff --check
```

## Build and static QA

- `npm run build`: generated eleven routes plus `404.html`.
- `npm run qa`: checked 12 HTML pages and 45 public files.
- Required pages, WebP screenshots, CSS, JavaScript, manifest, sitemap, robots, two-PDF allowlist, internal links, canonical URLs, Open Graph metadata, and GitHub Pages base-path references passed.
- Generated and tracked-file privacy scans passed.
- The private submission screenshots, email address, article identifier, portal controls, and removed Jensen manuscript do not enter `dist/`.

## Browser QA

Tested viewports:

- 360 x 800
- 768 x 900
- 1024 x 900
- 1440 x 1000

Tested routes:

- `/`
- `/projects/`
- `/projects/netsage/`
- `/projects/battery-rul/`
- `/projects/high-speed-rail/`
- `/projects/high-speed-rail/demo/`
- `/research/`
- `/research/connected-diagram-expansions/`
- `/research/critical-cubic-crossover/`
- `/research/hypergraph-tensor/`
- `/resume/`

Coverage includes HTTP responses, titles, image loading, horizontal overflow, console errors, navigation, theme switching, reduced motion, EngineerPlus interactions, Battery and Hypergraph PDFs, research access boundaries, and Resume print output.

## NetSage screenshot verification

- Five distinct WebP files are present and referenced once each on the case-study page.
- Every file has natural dimensions of 720 x 1600.
- Desktop uses three columns, intermediate widths use two columns, and 360 px mobile uses one column.
- Captions identify dashboard, diagnosis input, diagnosis report, history center, and scenario library functions.
- Runtime context says NetSage 0.1.2, Android Studio emulator, and 31 August 2026.
- The report caption and surrounding copy preserve the rule-based/non-ML confidence boundary.

## Research truthfulness

- Connected-diagram manuscript: `Under review`, *Advances in Mathematics*, submitted 31 August 2026.
- Critical cubic crossover manuscript: `Under review`, *Journal of the London Mathematical Society*, submitted 31 August 2026.
- Neither reviewed record includes a manuscript download or private submission evidence.
- Hypergraph Tensor remains `Submitted to Linear and Multilinear Algebra`; its approved PDF, preview, author order, and first/corresponding-author role remain intact.
- No reviewed/submitted record is represented as accepted or published.

## Other preserved facts

- Mathematical modeling retains the verified university-level second prize.
- Battery data remains fully simulated with semi-empirical generation assumptions.
- NetSage remains local-first and rule-based, not ML/LLM.
- High-Speed Rail preserves the five-person team / `Proposed Design` boundary and independent EngineerPlus contribution.
- Scenic Guide remains a contributed competition prototype.

## Resume print result

- File: `output/pdf/wanzheng-ning-resume.pdf`
- Format: A4
- Pages: 1
- Encryption: no
- Result: no second-page spill after adding the two reviewed research records.

## Deployment

The Pages workflow runs `npm run build` followed by `npm run qa`; a QA failure prevents deployment. Live URL verification is performed after the final push.
