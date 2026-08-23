# Portfolio Implementation Summary

Reviewed: 23 August 2026

## Outcome

The existing static portfolio design and information architecture remain intact. This maintenance pass strengthened publication governance, deployment safety, SEO metadata, and current QA coverage without modifying NetSage, battery-modeling, railway, Scenic Guide, or manuscript source repositories.

The build now generates ten public routes plus `404.html`, a printable one-page A4 resume, a three-line `robots.txt`, a canonical sitemap, and a shared 1200 x 630 PNG Open Graph image.

## Public routes

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

The generated `404.html` is tested separately and is not included in the sitemap.

## Structure

```text
portfolio-site/
|-- content/
|   |-- facts/                  Structured fact records
|   |-- public-claims.json      Verified bindings for public summaries, roles, and statuses
|   `-- evidence/               Private evidence map; Git-ignored and never copied to dist
|-- scripts/
|   |-- build.mjs               Static build and public-claim gate
|   |-- qa.mjs                  Structural, SEO, privacy, and governance QA
|   `-- serve.mjs               Local static server
|-- src/
|   |-- assets/documents/       Two explicitly approved public PDFs
|   |-- assets/images/          Project previews and raster Open Graph image
|   |-- assets/visuals/         Site diagrams retained for in-page use
|   |-- scripts/                Site and EngineerPlus interaction code
|   `-- styles/                 Main, responsive, demo, and print styles
|-- tests/browser_qa.py         Browser, interaction, SEO, theme, and print QA
|-- dist/                       Generated public site
|-- output/pdf/                 Generated resume PDF
|-- QA_REPORT.md                Current verification record
`-- .github/workflows/          QA-gated GitHub Pages deployment
```

## Fact and publication governance

- `publicFacts()` continues to expose only `public: true` and `status: verified` facts.
- `content/public-claims.json` binds every important public `summary`, `role`, `statusText`, and battery data boundary to an exact verified public fact.
- The build fails if a binding is missing, mismatched, non-public, or not verified.
- The build also rejects any non-public fact with non-empty text if that text appears in generated HTML.
- Important battery metrics remain rendered from verified public fact records.
- The footer review date is computed from the newest `lastVerified` value among verified public facts and public profile links; it is no longer hard-coded.
- Fact verification dates are kept in source governance data rather than repeated beside every public fact on the page.

Research wording remains unchanged in substance: Jensen is `Submitted to the International Journal of Number Theory`; Hypergraph Tensor is `Manuscript in preparation`. The approved Jensen PDF remains public, and no Hypergraph Tensor PDF is included.

## SEO and deployment

- Ordinary pages use `assets/images/og-portfolio.png`, a 1200 x 630 PNG with absolute Open Graph and Twitter image URLs.
- The EngineerPlus demo keeps its project-specific 1440 x 900 WebP preview.
- Open Graph width and height metadata are emitted and QA-checked.
- Canonical URLs, `og:url`, sitemap entries, manifest start URL, internal references, and GitHub Pages `/portfolio-site/` base-path behavior are checked.
- `robots.txt` is generated as three newline-separated directives and verified against the configured canonical origin and base path.
- GitHub Pages runs `npm run build` followed by `npm run qa`; artifact upload and deployment cannot run if QA fails.

## Public-copy adjustment

Scenic Guide remains a contributed competition prototype. The internal no-award record remains `public: false`, while the public project card and Resume no longer foreground `no award` or `production deployment` disclaimers. EngineerPlus boundaries are consolidated at section level while the interactive demo continues to display `Interactive concept prototype` and `Illustrative data only`.

## Visual and document assets

Published source-backed previews include NetSage, battery-modeling figures and paper cover, high-speed rail and EngineerPlus captures, Scenic Guide, and the Jensen manuscript title page. The original in-page SVG system artwork remains available, but it is no longer the default social-sharing image.

The approved public documents remain:

- `subcritical-hyperbolicity-jensen-polynomials-riemann-xi.pdf`
- `lithium-ion-battery-rul-cascade-utilization-modeling.pdf`

## Local verification

```powershell
cd portfolio-site
npm run build
npm run qa
npm run serve
```

Then run:

```powershell
.\.venv\Scripts\python.exe .\tests\browser_qa.py
```

## Known follow-up items

- Reconfirm long-term public-use permission and authorship context for source-backed course-project images if their release status changes.
- Add contact details, academic metrics, awards, or new manuscript links only after verification and an explicit public-release decision.
- Keep manuscript status and competition outcomes synchronized with new evidence; no status was upgraded in this pass.
