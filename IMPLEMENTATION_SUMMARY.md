# Portfolio Implementation Summary

Reviewed: 30 August 2026

## Outcome

The existing static portfolio design and information architecture remain intact. This maintenance pass corrected the research-status presentation, added a current Hypergraph manuscript preview, tightened the printable Resume to a real one-page A4 document, refined two scoped project visuals, and strengthened QA without changing global typography or spacing.

The build generates ten public routes plus `404.html`, a printable one-page A4 Resume, a canonical sitemap, a three-line `robots.txt`, and the shared 1200 x 630 Open Graph image.

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

## Research status and authorship

- Home keeps one short research-positioning sentence followed by a status sentence derived from the verified research facts.
- The current derived sentence says that two manuscripts are submitted: one to the International Journal of Number Theory and one to Linear and Multilinear Algebra.
- Hypergraph is no longer described as `in preparation` anywhere in the generated public site.
- The LMA manuscript preserves Wanzheng Ning as first and corresponding author and Qianzhi Ao as second author, with four shared third authors.
- Submitted/public manuscript access is not presented as acceptance or publication.
- Both research pages show title-page previews rendered from their current public PDFs.

## Scoped visual and print changes

- The NetSage project-card icon is constrained to a maximum of `12rem`, preserves its natural aspect ratio, and is not cropped.
- The Battery evidence gallery becomes one large figure plus two smaller figures on desktop and remains a single column below the desktop breakpoint.
- Resume compaction is print-only. The public site typography and spacing system is unchanged.
- The checked Resume export is one A4 page with no clipping or overlap.

## Fact and publication governance

- `publicFacts()` exposes only `public: true` and `status: verified` facts.
- `content/public-claims.json` binds important public summaries, roles, statuses, and the Battery data boundary to exact verified facts.
- The build rejects missing, mismatched, non-public, or unverified protected claims.
- Static QA constructs the expected Home research status from the source facts instead of accepting a hard-coded claim.
- The footer review date is computed from the newest `lastVerified` value among verified public facts and public profile links.
- The mathematical modeling result is published as a university-level second prize while the fully simulated-data boundary remains explicit.

## Public documents

- `subcritical-hyperbolicity-jensen-polynomials-riemann-xi.pdf`
- `beyond-vertex-profiles-nonuniform-hypergraph-tensors.pdf`
- `lithium-ion-battery-rul-cascade-utilization-modeling.pdf`

The Hypergraph title-page preview is `hypergraph-manuscript-title-page.png`, rendered from the current 27-page public LMA submission PDF at 1241 x 1754 pixels.

## QA changes

- Static QA requires the Hypergraph preview and submitted manuscript PDF.
- Static QA checks the exact dynamic Home research summary and rejects stale `in preparation` wording.
- Browser QA checks the Home summary, Hypergraph preview dimensions, NetSage icon bounds, and Resume page count.
- Resume page count is a hard gate: `pdfinfo` must report exactly one page.
- Current detailed results and the browser-runtime limitation are recorded in `QA_REPORT.md`.

## Known follow-up items

- Add 3-5 current NetSage app screenshots when a verified public screenshot set is available. No fabricated screenshots or placeholder app UI should be published.
- Rerun the full Playwright viewport matrix when Chromium installation is available in the execution environment.
- Reconfirm long-term public-use permission and authorship context for source-backed course-project images if their release status changes.
- Add contact details, academic metrics, future awards, or new manuscript links only after verification and an explicit public-release decision.
