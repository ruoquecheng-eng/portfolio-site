# Wanzheng Ning Portfolio

Local-first static portfolio for technical and academic work.

## Commands

```powershell
npm run build
npm run qa
npm run serve
```

The local preview is served from `dist/`. No deployment command is included in this version.

For full browser QA, use the project-local Python environment:

```powershell
.\.venv\Scripts\python.exe .\tests\browser_qa.py
```

That check also regenerates `output/pdf/wanzheng-ning-resume.pdf` from the print stylesheet.

## Content rules

- Public facts live in `content/facts/`.
- Private source paths and hashes live in `content/evidence/` and are ignored by Git.
- The build only renders facts with `status: verified` and `public: true`.
- Do not copy source repositories, manuscript PDFs, datasets, logs, databases, or environment files into this project.

## Deployment configuration

`site.config.json` contains a provisional GitHub Pages origin and `/` base path. Confirm the final repository path before any public deployment, then update `canonicalOrigin` and `basePath` and rebuild.
