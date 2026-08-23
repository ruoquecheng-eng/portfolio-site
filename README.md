# Wanzheng Ning Portfolio

Static technical and academic portfolio, published at [ruoquecheng-eng.github.io/portfolio-site](https://ruoquecheng-eng.github.io/portfolio-site/).

## GitHub accounts

- [`lbrswne`](https://github.com/lbrswne) - NetSage and original project repositories
- [`ruoquecheng-eng`](https://github.com/ruoquecheng-eng) - Portfolio source repository and GitHub Pages hosting

## Commands

```powershell
npm run build
npm run qa
npm run serve
```

The local preview is served from `dist/`.

For full browser QA, use the project-local Python environment:

```powershell
.\.venv\Scripts\python.exe .\tests\browser_qa.py
```

That check also regenerates `output/pdf/wanzheng-ning-resume.pdf` from the print stylesheet.

## Content rules

- Public facts live in `content/facts/`.
- Private source paths and hashes live in `content/evidence/` and are ignored by Git.
- The build only renders facts with `status: verified` and `public: true`.
- Do not copy source repositories, datasets, logs, databases, or environment files into this project.
- Manuscript PDFs may be public only when the user explicitly approves the exact file and the build QA allowlists that exact path.

## Deployment configuration

`site.config.json` contains the production GitHub Pages origin and `/portfolio-site/` base path. Pushes to `main` run `.github/workflows/deploy-pages.yml`; deployment proceeds only after both `npm run build` and `npm run qa` succeed.
