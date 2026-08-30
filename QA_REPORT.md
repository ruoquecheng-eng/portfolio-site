# Portfolio QA Report

Verified implementation commit: `42a67edb6fe500b5ee39afc9b72104e550cf2c27`

Verified date: 30 August 2026

Generated routes: 10 public routes plus `404.html`

Public assets: 41 files in `dist/`, including 11 HTML files and three allowlisted PDFs

## Result

Pass for the build, static QA, live desktop route checks, and independent one-page A4 Resume export. The browser QA runner now hard-fails unless the exported Resume has exactly one page.

The complete local Playwright viewport matrix was not rerun in this environment because the Chromium download endpoint repeatedly returned a truncated zero-byte archive. This limitation is recorded here rather than reporting an unexecuted `issues: []` result. Live GitHub Pages checks were completed in the authenticated cloud browser at 1363 x 936, and responsive behavior remains covered by the repository's browser QA script.

## Commands executed

```bash
npm run build
npm run qa
node --check scripts/build.mjs
node --check scripts/qa.mjs
python3 -m py_compile tests/browser_qa.py
git diff --check
weasyprint dist/resume/index.html output/pdf/wanzheng-ning-resume.pdf
pdfinfo output/pdf/wanzheng-ning-resume.pdf
pdftoppm -png -r 144 output/pdf/wanzheng-ning-resume.pdf tmp/pdfs/resume-check/resume
```

## Build and static QA

- `npm run build`: passed; generated ten routes plus `404.html`.
- `npm run qa`: passed; checked 11 HTML pages and 41 public files.
- Required pages, images, CSS, JavaScript, manifest, sitemap, robots, PDF allowlist, internal links, fragments, canonical URLs, Open Graph metadata, and GitHub Pages base-path references passed.
- Static research QA derives the Home status sentence from the verified Jensen and Hypergraph records and rejects a submitted Hypergraph manuscript described as `in preparation`.
- The Hypergraph title-page preview and submitted manuscript PDF are required assets.
- The tracked-repository and generated-`dist/` privacy scans passed.

## Browser QA

Live route checks were run against `https://ruoquecheng-eng.github.io/portfolio-site/` at 1363 x 936 for:

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

Results:

- All ten routes loaded with the expected page titles.
- No horizontal overflow was found.
- No broken images were found, including lazy-loaded Battery and High-Speed Rail images after scrolling them into view.
- Home displays the exact derived sentence: `Two manuscripts are currently submitted: one to the International Journal of Number Theory and one to Linear and Multilinear Algebra.`
- Home does not contain the stale Hypergraph `in preparation` sentence.
- The NetSage project icon renders at 192 x 192 pixels on the checked desktop viewport, from a 216 x 216 source, without stretching or cropping.
- The Hypergraph research page displays the submitted LMA status, a real 1241 x 1754 title-page preview, and working view/download links to the public PDF.
- The Battery evidence gallery uses one full-width figure followed by two compact side-by-side figures at the checked desktop viewport. Its mobile CSS retains a single-column flow.

The local `tests/browser_qa.py` matrix remains configured for 360 x 800, 768 x 900, 1024 x 900, and 1440 x 1000. It now additionally checks the exact derived Home research status, absence of stale wording, Hypergraph preview dimensions, NetSage icon bounds, and `pdfinfo` page count.

## Resume print result

- File: `output/pdf/wanzheng-ning-resume.pdf`
- Renderer used in this environment: WeasyPrint 69.0
- Format: A4, 595.276 x 841.89 points
- Pages: 1
- Encryption: no
- Poppler render: visually checked
- Result: no clipping, overlap, broken columns, printed controls, orphaned sections, or duplicate URL text
- Content check: both submitted research records, first/second-author ordering for the LMA manuscript, the university-level mathematical modeling second prize, and the fully simulated-data boundary are visible.

## Facts and truthfulness

- Jensen remains `Submitted to the International Journal of Number Theory`.
- Hypergraph Tensor is `Submitted to Linear and Multilinear Algebra`, not accepted or published.
- Wanzheng Ning is shown as first and corresponding author; Qianzhi Ao is shown as second author.
- Both approved manuscript PDFs are public, and both research pages use title-page previews rendered from their current public PDFs.
- The mathematical modeling competition is shown as passed with a university-level second prize.
- Battery modeling remains explicitly framed as fully simulated data generated with semi-empirical assumptions.
- NetSage remains local-first and rule-based, not ML/LLM.
- High-Speed Rail preserves the five-person team / `Proposed Design` boundary and the independent EngineerPlus front-end contribution.
- Scenic Guide remains a contributed competition prototype; the non-public no-award record remains absent from public copy.

## Footer verification date

The footer displays `Facts last reviewed 29 August 2026.` This is generated from the maximum `lastVerified` date among verified public facts and public profile links. Static QA checks every standard page footer against the source maximum.

## Deployment

Implementation commit `42a67edb6fe500b5ee39afc9b72104e550cf2c27` was deployed successfully by GitHub Pages workflow run `33293865842` before the live browser checks above.

The Pages build job runs `npm run build` followed by `npm run qa`; a static QA failure prevents artifact upload and deployment.

## Remaining issues outside this maintenance pass

- Run the full local Playwright viewport matrix when a usable Chromium binary is available; the current environment's browser archive download was incomplete.
- Add 3-5 verified current NetSage app screenshots when a public screenshot set is available; no placeholder or fabricated UI captures were added.
- Reconfirm long-term public-use permission and authorship context for source-backed course-project images if their release status changes.
- Keep manuscript status and competition outcomes synchronized with new verified evidence.
