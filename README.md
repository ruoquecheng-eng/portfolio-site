# Wanzheng Ning Portfolio

Static technical and academic portfolio, published at [ruoquecheng-eng.github.io/portfolio-site](https://ruoquecheng-eng.github.io/portfolio-site/).

## GitHub accounts

- [`lbrswne`](https://github.com/lbrswne) - NetSage and original project repositories
- [`ruoquecheng-eng`](https://github.com/ruoquecheng-eng) - Portfolio source repository and GitHub Pages hosting

## Commands

```powershell
npm run build
npm run pdf
npm test
npm run qa
npm run test:browser
npm run serve
```

The local preview is served from `dist/`.

PDF export uses the pinned Playwright Chromium browser plus `pdfinfo` and
`pdftotext`. Install Chromium with `npx playwright install chromium` when setting
up a new checkout. CI also installs Chinese fonts and Poppler. The two current
resume downloads are generated at `dist/assets/documents/resume-en.pdf` and
`dist/assets/documents/resume-zh.pdf`; export checks their page count, key content
and public link destinations.

`npm run test:browser` checks every localized route at 360, 768 and 1440px, followed
by interaction checks. Set `QA_SCREENSHOTS` to a directory outside the repository
to retain screenshots. The older Python checker and `output/pdf/` artifact are
legacy tooling, not the current release pipeline.

## Browsing features

- Local bilingual search supports result types, matching excerpts, keyword
  highlighting, suggested queries, and URL-restored query/filter state.
- Long articles expose section navigation, shareable section links and a
  keyboard-accessible return to the top.
- `/materials/` and `/zh/materials/` collect approved public downloads with
  their source pages. Document contents are not added to the search index.
- Resume download links carry a content/style version so subsequent updates
  request the newly generated PDF while retaining stable public filenames.

## Content rules

- Public facts live in `content/facts/`.
- Private source paths and hashes live in `content/evidence/` and are ignored by Git.
- The build only renders facts with `status: verified` and `public: true`.
- Do not copy source repositories, datasets, logs, databases, or environment files into this project.
- Manuscript PDFs may be public only when the user explicitly approves the exact file and the build QA allowlists that exact path.

## Deployment configuration

`site.config.json` contains the production GitHub Pages origin and `/portfolio-site/` base path. Pushes to `main` run `.github/workflows/deploy-pages.yml`; deployment proceeds after the build, both PDF exports, unit tests, static QA and browser checks succeed.
