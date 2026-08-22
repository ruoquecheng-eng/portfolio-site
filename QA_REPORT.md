# Portfolio V1 QA Report

Verified: 22 August 2026

## Result

Pass. The current local build has no known structural, browser, responsive, interaction, image-loading, console, or print-layout defects in the tested scope.

## Build and structural checks

- `npm run build`: passed; generated eight routes plus `404.html`.
- `npm run qa`: passed; checked nine HTML pages and the complete public output, including the single allowlisted manuscript PDF.
- Internal route targets, required metadata, manifest, sitemap, asset references, and expected output files passed.
- `content/evidence/` is excluded from the public build.
- The public output was checked for private Windows source paths, placeholder text, and unsupported publication wording.

## Browser matrix

All eight public routes were exercised at:

- 360 x 800 (mobile)
- 768 x 900 (tablet)
- 1024 x 900 (laptop)
- 1440 x 1000 (desktop)

Automated browser result: `issues: []`.

The checks covered:

- successful HTTP responses and non-empty page titles
- horizontal overflow
- lazy-loaded and broken images
- browser console errors
- mobile menu visibility and `aria-expanded`
- keyboard skip-link as the first focus target
- system/light/dark theme switching
- reduced-motion behavior
- print header suppression

Desktop and mobile screenshots for Home, Projects, NetSage, Battery RUL, Research, Jensen manuscript, and Resume are stored in the Git-ignored `qa-artifacts/` directory for local review.

## Manual visual review

Reviewed the generated desktop and mobile captures for hierarchy, spacing, legibility, card alignment, research-status labels, long technical titles, and footer consistency.

Issues found and corrected during review:

- NetSage mobile flow overflow
- long code/evidence strings that could exceed narrow containers
- research-page section padding overridden by a list utility rule
- repeated resume entries falling into the wrong desktop grid column
- print button appearing in PDF output
- Chromium print pagination breaking resume grid items into narrow fragments

## PDF verification

The Resume route was exported by headless Chrome and verified with `pdfinfo` plus Poppler PNG rendering.

- File: `output/pdf/wanzheng-ning-resume.pdf`
- Format: A4
- Pages: 1
- Encryption: none
- Visual result: no clipping, overlap, broken columns, orphaned sections, printed controls, or duplicate URL text

## Content and claim boundaries

- Battery data is explicitly described as fully simulated with semi-empirical generation assumptions; no measured experimental rows are claimed.
- Battery metrics are framed as internal simulation/holdout results, not deployment performance.
- NetSage is described as local-first and rule-based, not as an ML/LLM system.
- Research status is separated from acceptance/publication.
- The Jensen PDF is the exact 22-page first submitted version approved by the user; its page link and PDF response are tested, while other PDFs remain blocked by an explicit allowlist.
- No award is claimed for the Scenic Guide project.
- High-speed rail work is identified as a five-person course-team concept with the user's role stated as `Proposed Design`; no train-level energy saving is claimed.

## Remaining pre-publication blockers

These are content-release blockers, not local implementation defects:

- public reuse permission for the battery result figures
- public reuse/authorship confirmation for the rail prototype image
- final canonical domain/repository path
- optional personal contact and academic metrics after verification
- any additional manuscript download not explicitly approved and allowlisted

GitHub Pages deployment was subsequently enabled at `https://ruoquecheng-eng.github.io/portfolio-site/`; the published routes and static assets returned HTTP 200 after deployment.
