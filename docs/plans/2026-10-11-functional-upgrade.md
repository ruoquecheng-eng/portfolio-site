# Portfolio functional upgrade

Baseline: published `bcf84302e0a6747f05962ca445c9972c8b6a6ec8`.
Audience: admissions reviewers and engineering recruiters.
Coordinator: parent agent. Implementation workers: GPT-6.1 Sol.

## Deliverables

1. Search: current-language result-type filters, relevant text excerpts, safe
   query highlighting, suggested queries, clear action, IME-aware input, and
   shareable/restorable query and type state. Preserve every-term matching.
2. Reading: active-section navigation, copyable section links, accessible copy
   feedback/fallback, and a back-to-top control with reduced-motion support.
3. Materials: `/materials/` and `/zh/materials/`, reachable from global navigation,
   with approved existing public papers, source/support packages, design documents,
   internship certificate and the current-language resume. Show purpose, file format,
   size when known, source-page links, and suitable open/download actions.
4. Download freshness and presentation: content/style-derived resume PDF version
   query parameters, consistent screen controls at 360/768/1440px, dark mode,
   visible focus, and print exclusions for browsing controls.

Preserve all approved claims, public files and existing routes. CUMCM provincial
second prize remains prominently styled; battery modeling retains its separate
university-level prize. Both resume PDFs remain exactly one A4 page.

## Ownership

- Search worker: `src/scripts/browse.js`, `scripts/editorial.mjs`,
  `scripts/upgrade.test.mjs`.
- Reading worker: `src/scripts/main.js`.
- Materials worker: `scripts/materials.mjs`, `scripts/build.mjs`, `scripts/qa.mjs`.
- Presentation worker: `src/styles/refinement.css`, `src/styles/main.css`.
- Coordinator: localization integration, `scripts/browser-qa.mjs`, documentation,
  final build/PDF validation, diff review, and publication.

Workers edit only their owned files and do not publish or rebuild shared `dist`.
Temporary translation maps and diagnostic scripts stay outside the repository.

## Component contracts

- Search: `.search-tools`, `.search-type-filters`, `.search-suggestions`,
  `.search-clear`, `.search-result-type`, `.search-result-snippet`, and `mark`.
  Keep existing `#search-form`, `#search-query`, `#search-status`, `#search-results`,
  and `#search-retry`; new filters use `type=all|projects|research|resume|materials|pages`.
- Reading: `.page-contents`, `.radio-section-nav`, links with
  `aria-current="location"`, `.section-copy`, `.section-copy-status`,
  `.section-copy-fallback`, `.back-to-top`. Never add duplicate directories.
- Materials: `.materials-intro`, `.materials-list`, `.material-card`,
  `.material-meta`, `.material-actions`, `.material-source`.
- Search metadata: documents gain a `type` derived from route; the materials route
  has type `materials`. Binary document contents and personal identifiers are excluded.

## Acceptance and release

- Run build, PDF export, unit tests, static QA, and existing browser QA.
- Add focused functional checks for combined query/type filtering, highlighted
  excerpts, clearing, IME composition, history and language state, active contents,
  copy feedback/fallback, top navigation, and material links.
- Check all localized routes at 360/768/1440px, keyboard focus, dark mode and
  no-JavaScript content access. Inspect representative rendered screens.
- Validate both generated PDFs: exactly one page, key claims and links intact,
  prominent provincial award, and no browsing widgets in print.
- Publish only the reviewed diff on top of the unchanged remote baseline; wait for
  Pages success, then verify current live HTML, public files, and PDF downloads.
