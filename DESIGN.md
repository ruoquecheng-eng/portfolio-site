# Design system: light editorial portfolio

The portfolio helps admissions readers and recruiters understand direction,
contribution, research status, and supporting evidence. English and Chinese
share the same structure. Formal paper titles are not translated.

## Visual system

- White reading surfaces, pale gray sections, navy text and blue interactive
  accents. Light mode has no large navy hero panel.
- Maximum content width: 1160px. Body text: 16px with generous line spacing.
- Homepage heading: 36–48px desktop, 28–34px mobile. Long research titles use
  a smaller scale and wrap naturally without truncation.
- Flat sections, restrained borders and small corner radii. Real screenshots,
  charts and paper previews carry the visual identity.
- `src/styles/refinement.css` owns shared screen presentation, organized by
  component and breakpoint. Base structural and print rules remain in
  `main.css`; the demo uses a compatible token-based stylesheet.
- Dark mode preserves readable surfaces and the saved theme. Reduced-motion
  users retain complete functionality.

## Structure and components

Home: name and direction → NetSage, CommLab, radio localization, battery
modeling → research overview → resume. Internship stays on projects/resume.

Projects use single-choice category filters with a visible result count.
Internship is outside the filter. Without JavaScript all projects stay visible.
The selected category persists in the URL for reload and return navigation.
Mobile navigation remains visible without JavaScript; enhanced menus close
when keyboard focus leaves. Breadcrumbs, footer and article links have generous
touch targets. Mobile metadata uses a minimum 14px reading size.
Research separates the complete title, journal, review status and authorship.
Case studies retain problem, method, contribution, results and evidence.

Material links share clear labels and actual file format/size. Only approved,
existing documents are linked; restricted manuscripts have no download button.
Figure enlargement uses a native dialog, Escape dismissal and focus return.
Long articles retain a contents menu separate from material links.

Search is local to the browser and current language. Static indexes include
public text and bilingual keyword aliases, never PDF contents or certificate
identifiers. Every term must match; titles outrank keywords, summaries and body.
The query persists in `q`. Initial, loading, empty and retry states are explicit.

## Resume and print

Screen resumes share the editorial system. Print remains independent, black
and white, A4, one page; proof thumbnails are hidden. HTML and downloadable
PDFs share content. The screen header groups compact primary-download and
secondary-print actions. Pinned Playwright Chromium renders both languages in
CI with CJK fonts. PDF page count and key text are release gates. Battery modeling
remains one entry; existing verified claims and awards must not change.

## Verification

Run build, PDF export, unit tests, static QA and browser QA before release.
Check every localized route at 360, 768 and 1440px for overflow and broken
images. Exercise filters, search/retry/history, no-JS fallback, dark mode,
keyboard focus, figure dialogs and document links. Inspect both one-page PDFs.
Only explicitly allowlisted public PDFs may enter the deployment artifact.
