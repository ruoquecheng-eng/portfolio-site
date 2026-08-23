# Portfolio QA Report

Verified commit: `c12dd149ce5477de75cf21d8b2332b3c054d7608`

Verified date: 23 August 2026

Generated routes: 10 public routes plus `404.html`

Public assets: 39 files in `dist/`, including 11 HTML files and two allowlisted PDFs

## Result

Pass. Static QA and the latest browser QA completed with zero reported issues in the tested scope. Representative desktop and mobile captures were also reviewed manually.

## Commands executed

```powershell
npm run build
npm run qa
.\.venv\Scripts\python.exe .\tests\browser_qa.py
pdfinfo output/pdf/wanzheng-ning-resume.pdf
pdftoppm -png -r 144 output/pdf/wanzheng-ning-resume.pdf tmp/pdfs/resume-check/resume
```

Additional syntax and repository checks:

```powershell
node --check scripts/build.mjs
node --check scripts/qa.mjs
.\.venv\Scripts\python.exe -m py_compile tests/browser_qa.py
git diff --check
```

## Build and static QA

- `npm run build`: passed; generated ten routes plus `404.html`.
- `npm run qa`: passed; checked 11 HTML pages and 39 public files.
- Required pages, images, CSS, JavaScript, manifest, sitemap, robots, PDF allowlist, internal links, fragments, canonical URLs, Open Graph metadata, and GitHub Pages base-path references passed.
- The tracked-repository privacy scan passed for forbidden files, credentials, private keys, and prohibited local paths.
- The generated `dist/` privacy scan passed for credentials, databases, backups, logs, evidence paths, and Windows source paths.

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
- `/research/jensen-polynomials/`
- `/research/hypergraph-tensor/`
- `/resume/`

Latest automated browser result: `issues: []`.

Coverage included:

- HTTP responses, titles, broken images, console errors, and horizontal overflow
- desktop and mobile navigation
- keyboard focus and skip links
- system light and dark rendering
- reduced-motion behavior
- Jensen and Battery PDF links and response content types
- Scenic Guide public-copy boundary
- High-Speed Rail contribution boundary and module links
- EngineerPlus hash navigation, browser history, capital form, session storage isolation, risk sliders, compliance workflow, impact filters, SVG keyboard selection, reset behavior, and absence of external requests
- Open Graph PNG loading and 1200 x 630 browser dimensions
- `robots.txt` and sitemap browser responses
- Resume print stylesheet and A4 PDF export

## Resume print result

- File: `output/pdf/wanzheng-ning-resume.pdf`
- Format: A4
- Pages: 1
- Encryption: no
- Poppler render: visually checked
- Result: no clipping, overlap, broken columns, printed controls, orphaned sections, or duplicate URL text

## Facts and truthfulness

- Every protected public `summary`, `role`, `statusText`, and Battery data boundary has an exact binding to a verified public fact in `content/public-claims.json`.
- The build rejects missing, mismatched, non-public, or unverified protected claims.
- Non-public facts with non-empty text are checked against generated HTML.
- Important Battery metrics are present only through verified public fact records and remain framed as simulation/internal holdout output.
- Battery RUL visibly retains `Fully simulated data with semi-empirical generation assumptions` near the start of the page.
- NetSage remains local-first and rule-based, not ML/LLM, and retains verified commit `ed692cba`.
- High-Speed Rail preserves the five-person team / `Proposed Design` boundary and the independent EngineerPlus front-end contribution.
- Scenic Guide remains a contributed competition prototype; `no award` is retained internally as `public: false` and is absent from the public project and Resume copy.
- Jensen remains `Submitted to the International Journal of Number Theory`; Hypergraph Tensor remains `Manuscript in preparation`.
- The approved Jensen PDF remains public; no Hypergraph Tensor PDF is present.

## Footer verification date

The footer displays `Facts last reviewed 23 August 2026.` This date is generated from the maximum `lastVerified` date among all verified public facts and public profile links. Static QA checks every standard page footer against the source maximum.

## Robots, sitemap, canonical, and Open Graph

`dist/robots.txt` was verified as exactly:

```text
User-agent: *
Allow: /
Sitemap: https://ruoquecheng-eng.github.io/portfolio-site/sitemap.xml
```

- Sitemap: ten canonical public routes, all under `https://ruoquecheng-eng.github.io/portfolio-site/`.
- Manifest: `start_url` equals `/portfolio-site/`.
- Canonical and `og:url`: absolute, matching, and inside the configured origin/base path.
- Shared social image: `assets/images/og-portfolio.png`, PNG, 1200 x 630.
- EngineerPlus demo social image: project-specific WebP, 1440 x 900.

## Deployment workflow

The Pages build job runs:

1. Build static site
2. Run portfolio QA
3. Configure GitHub Pages
4. Upload Pages artifact

The deploy job depends on the successful build job. A failed `npm run qa` prevents artifact upload and deployment.

## Remaining issues outside this maintenance pass

- Long-term public-use permission and authorship context for source-backed course-project images should be reconfirmed if their release status changes.
- GPA, IELTS, rank, contact details, future awards, and new manuscript links remain unpublished until verified and explicitly approved.
- Browser QA is local and deterministic; third-party social crawlers may cache older Open Graph previews temporarily after deployment.
