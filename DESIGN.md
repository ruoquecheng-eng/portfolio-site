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
Result types persist in `type`. Suggestions and clear controls use ordinary
buttons; Chinese composition must finish before it triggers a search. Matching
excerpts and text-node highlighting expose why a result matched without turning
query text into markup. Explicit committed state changes support browser history.

Materials has its own bilingual navigation destination. Cards group the approved
file with its purpose, format/known size, source page, and open/download actions.
Generated resume sizes are not guessed. Resume links use a content/style version
query to request updated PDFs without renaming the public files.

Long-page directories mark the current section with `aria-current="location"`.
Section-copy actions provide localized feedback and a selectable URL fallback.
The back-to-top control appears after scrolling, restores useful keyboard focus,
and respects reduced motion. These reading controls are omitted from print.

## Motion and interactive showcases

Motion explains a project or confirms an action. The shared white, gray, navy
and blue palette remains the source of color; screenshots carry the visual
weight. Reading text, formal paper titles, research status, authorship, awards
and numerical evidence remain stable. No continuous background animation,
scroll hijacking, automatic screenshot carousel or simulated live metrics.

The screen tokens in `refinement.css` are `--duration-fast: 160ms`,
`--duration: 240ms`, `--motion-press: 120ms`, `--motion-select: 200ms`, and
`--motion-gallery: 260ms`. Motion uses the existing
`--ease-out: cubic-bezier(0.23, 1, 0.32, 1)` from `main.css`; small color and
border changes use `ease`. Pointer and touch presses scale to 0.98 in 100ms;
link arrows move 3px, project images scale to 1.018 and enlargement triggers
to 1.01. These hover movements require hover, fine pointer and no reduced
motion. Touch selection is immediate and does not require hover.

The homepage workbench uses the actual CommLab OFDM capture and NetSage
Android dashboard. The window enters in 720ms with at most 12px of travel;
the phone follows after 60ms. The trace draws in 700ms after a 100ms delay
(800ms total). Text and links are already readable and operable. The intro
plays once per browser-tab session across both languages, tracked by
`portfolio-intro-v1` in session storage. Back/forward restoration skips it;
storage failure leaves the final static composition. On narrow screens the
phone becomes a separate column rather than an overlapping screenshot.

A shared showcase pairs four keyboard-selectable steps with real screenshots
or an explicitly conceptual SVG. NetSage exposes input/target, device checks,
evidence/hypotheses and retest/report. Offline rule-based log diagnosis and
direct device probes are distinct entry paths, with no machine-learning claim.
All eleven original v0.2.0 screens remain in the complete walkthrough below.
The optional DNS/TCP/TLS/HTTP sequence lasts 1600ms, plays once per explicit
action, and supports pause, resume and replay. It makes no network request and
creates no diagnostic evidence.

CommLab retains all four v3.7.1 dashboard captures: OFDM, ISAC, resilience
budget and robust OPE. The current project release remains v3.8.1; screenshot
and release versions must be labeled separately. The failed row-wise coverage
under hidden-confounding stress remains a negative result in both languages.
Radio localization uses a conceptual competition-simulator decision loop.
Battery Q1–Q4 uses fully simulated data generated with semi-empirical
assumptions. Original figures and retained results remain outside the tabs.

Pointer-triggered panel entry uses 220ms, opacity 0.7 to 1 and 6px travel.
Keyboard selection skips this entry; keyboard input also suppresses press
transforms and dialog/menu transitions via `html[data-input="keyboard"]`. Local browse/search feedback uses 180ms
and 4px travel; selected project previews may enter once in 420ms and 8px.
The longer first-view preview is occasional presentation, not a delay on an
input or navigation action. Image dialogs use 200ms, 6px and scale 0.98;
Escape dismissal and focus return belong to the existing dialog controller.
Rapid changes settle the previous animation and expose the latest selection.
No layout dimensions are animated and no continuous animation loop is needed.

Tab controls expose `tablist`, `tab`, `tabpanel`, `aria-controls`,
`aria-labelledby` and `aria-selected`. Left/Right wrap through tabs, Home/End
select the first/last tab, and Tab reaches the selected panel. Focus outlines
stay visible. The original screenshot enlargement and complete-method links
remain available. Chinese strings are static dictionary entries, including
SVG text and accessible names; product names, formal English paper titles,
protocol abbreviations and version numbers retain their identity. Do not mutate
the translation dictionary at build or runtime: it participates in PDF hashes.

Without JavaScript, every panel is visible in document order and unused tab
and playback controls stay hidden. Reduced motion shows the final homepage,
switches panels immediately, exposes the static probe order and hides playback.
Changing that preference settles active animation. Hidden tabs, page exit and
printing cancel transient entries and pause the probe sequence; leaving the
sequence viewport pauses it without an automatic restart. No prose is hidden
while waiting for a scroll observer. Print shows every panel, restores opacity
and transforms, and hides tab/playback controls and progress; print behavior
must not depend on animation completing. Homepage decoration is omitted by
the existing print rules. Screen refinement remains isolated from resume print
typography and the one-page bilingual PDF contract.

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
